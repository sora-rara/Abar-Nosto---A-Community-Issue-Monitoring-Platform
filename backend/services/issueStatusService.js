const mongoose = require('mongoose');
const Report = require('../models/Report');
const AdminIssue = require('../models/AdminIssue');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { notifyFollowers, notifyAuthor } = require('./notificationService');

function getExpectedPreviousStatus(newStatus) {
    const transitions = {
        // Admins can archive from any active state
        archived: ['reported', 'in_progress', 'resolved'],
        // Reactivation only from archived
        reported: ['archived'],
        // Can move to in_progress from reported or resolved (e.g. re-opened work)
        in_progress: ['reported', 'resolved'],
        // Can resolve from in_progress or reported (e.g. quick fix)
        resolved: ['in_progress', 'reported']
    };
    return transitions[newStatus] || [];
}

/**
 * Update status of both Report and AdminIssue atomically
 * Falls back to non-transactional update if sessions are unavailable (e.g. standalone MongoDB)
 */
async function updateIssueStatus(reportId, newStatus, userId, userName, comment = '') {
    let session = null;
    let useSession = true;

    try {
        session = await mongoose.startSession();
        session.startTransaction();
    } catch (sessionErr) {
        console.warn('⚠️ MongoDB sessions unavailable, falling back to non-transactional update:', sessionErr.message);
        useSession = false;
        session = null;
    }

    const sessionOpt = useSession && session ? { session } : {};

    try {
        const expectedPrev = getExpectedPreviousStatus(newStatus);

        // First, find the report by ID regardless of status
        let report = await Report.findById(reportId, null, sessionOpt);
        if (!report) throw new Error('Issue not found');

        // Check if the AdminIssue exists and use it to resolve sync mismatches
        const adminIssue = await AdminIssue.findOne({ originalReportId: reportId }, null, sessionOpt);

        // If report status doesn't match expected previous state, check if AdminIssue has the right status
        if (!expectedPrev.includes(report.status)) {
            // If AdminIssue status IS a valid previous state, sync the report to match
            if (adminIssue && expectedPrev.includes(adminIssue.status)) {
                console.log(`⚠️ Status sync: Report has '${report.status}' but AdminIssue has '${adminIssue.status}'. Syncing report to match AdminIssue before transition.`);
                report.status = adminIssue.status;
            } else {
                throw new Error(`Invalid state transition: cannot move from '${report.status}' to '${newStatus}'`);
            }
        }

        const oldStatus = report.status;
        report.status = newStatus;

        let historyStatus = newStatus;
        if (newStatus === 'reported' && oldStatus === 'archived') {
            historyStatus = 'reopened';
        }
        report.statusHistory.push({
            status: historyStatus,
            at: new Date(),
            updatedBy: userId,
            updatedByName: userName,
            comment
        });

        if (newStatus === 'archived') {
            report.archivedAt = new Date();
            report.reopenRequested = false;
        }
        if (newStatus === 'reported' && oldStatus === 'archived') {
            report.reactivatedAt = new Date();
            report.reopenRequested = false;
        }

        await report.save(useSession && session ? { session } : {});

        if (adminIssue) {
            adminIssue.status = newStatus;
            adminIssue.statusHistory.push({
                status: historyStatus,
                at: new Date(),
                updatedBy: userId,
                updatedByName: userName,
                comment
            });
            if (newStatus === 'archived') adminIssue.archivedAt = new Date();
            if (newStatus === 'reported' && oldStatus === 'archived') adminIssue.reactivatedAt = new Date();
            adminIssue.reopenRequested = false;
            await adminIssue.save(useSession && session ? { session } : {});
        }

        if (useSession && session) {
            await session.commitTransaction();
        }

        // 📢 Send notifications based on the nature of the change
        let notifType = '';
        let notifTitle = '';
        let notifMessage = '';
        if (newStatus === 'archived') {
            notifType = 'issue_archived';
            notifTitle = `Issue archived: ${report.title}`;
            notifMessage = comment || `This issue has been archived by admin.`;
        } else if (newStatus === 'reported' && oldStatus === 'archived') {
            notifType = 'issue_reactivated';
            notifTitle = `Issue reactivated: ${report.title}`;
            notifMessage = comment || `This issue has been reactivated by admin.`;
        } else {
            notifType = 'status_change';
            notifTitle = `Issue ${newStatus}: ${report.title}`;
            notifMessage = comment || `Status changed from ${oldStatus} to ${newStatus}.`;
        }

        // Notify followers (including author if they follow)
        await notifyFollowers(reportId, userId, {
            type: notifType,
            title: notifTitle,
            message: notifMessage,
            relatedIssue: reportId,
            metadata: { oldStatus, newStatus }
        });

        // Notify author explicitly (in case they don't follow their own issue)
        await notifyAuthor(reportId, userId, {
            type: notifType,
            title: notifTitle,
            message: notifMessage,
            relatedIssue: reportId,
            metadata: { oldStatus, newStatus }
        });

        return { report, adminIssue };
    } catch (error) {
        if (useSession && session) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        if (session) {
            session.endSession();
        }
    }
}

/**
 * User requests to reopen an archived issue
 */
async function requestReopen(reportId, userId, userName, io) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log(`🔍 requestReopen: reportId=${reportId}, userId=${userId}, userName=${userName}`);

        const report = await Report.findOne({ _id: reportId, status: 'archived' }).session(session);
        if (!report) throw new Error('Only archived issues can be requested for reopening');
        if (report.reopenRequested) throw new Error('Reopen request already sent');

        // ✅ Add history entry
        report.statusHistory.push({
            status: 'reopen_requested',
            at: new Date(),
            updatedBy: userId,
            updatedByName: userName,
            comment: 'User requested reopening of this archived issue'
        });
        report.reopenRequested = true;
        await report.save({ session });

        const adminIssue = await AdminIssue.findOne({ originalReportId: reportId }).session(session);
        if (adminIssue) {
            adminIssue.statusHistory.push({
                status: 'reopen_requested',
                at: new Date(),
                updatedBy: userId,
                updatedByName: userName,
                comment: 'User requested reopening'
            });
            adminIssue.reopenRequested = true;
            await adminIssue.save({ session });
        }

        await session.commitTransaction();

        // Real-time admin notification
        io.to('admins').emit('notification', {
            type: 'reopen_request',
            title: 'Reopen Request',
            message: `User requested to reopen issue: ${report.title}`,
            relatedIssue: reportId,
            metadata: { userId }
        });

        // Persistent notification for all admins
        const adminUsers = await User.find({ role: 'admin' }).select('_id');
        const notifications = adminUsers.map(admin => ({
            user: admin._id,
            type: 'reopen_request',
            title: 'Reopen Request',
            message: `User requested to reopen issue: ${report.title}`,
            relatedIssue: reportId,
            read: false,
            createdAt: new Date()
        }));
        if (notifications.length) await Notification.insertMany(notifications);

        return { success: true };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

module.exports = { updateIssueStatus, requestReopen };