const Report = require('../models/Report');
const Activity = require('../models/Activity');
const mongoose = require('mongoose');
const User = require('../models/User');
const AdminIssue = require('../models/AdminIssue');
const { notifyFollowers, notifyAuthor, notifyUser, notifyAdmins } = require('../services/notificationService');
const { requestReopen: requestReopenService } = require('../services/issueStatusService');
// ---- Added from second file ----
const { sendReputationNotification } = require('../utils/reputationNotification');
const Notification = require('../models/Notification');
// -------------------------------

// ===========================================
// HELPER – Sync to Admin Collection
// ===========================================
const syncToAdminCollection = async (reportId) => {
    try {
        const report = await Report.findById(reportId).populate('user', 'name email');
        if (!report) return;
        await AdminIssue.findOneAndUpdate(
            { originalReportId: reportId },
            {
                title: report.title,
                description: report.description,
                category: report.category,
                location: {
                    address: report.location?.address || 'Unknown',
                    lat: report.location?.lat || 0,
                    lng: report.location?.lng || 0
                },
                photos: report.photos || [],
                reportedBy: report.user?._id || report.user,
                reporterName: report.user?.name || 'Unknown',
                reporterEmail: report.user?.email || '',
                upvoteCount: report.upvoteCount || 0,
                downvoteCount: report.downvoteCount || 0,
                commentCount: report.commentCount || 0,
                viewCount: report.viewCount || 0,
                status: report.status || 'reported',
                lastActivityAt: report.lastActivityAt || new Date(),
                updatedAt: new Date()
            },
            { upsert: true }
        );
        console.log(`✅ Synced report ${reportId} to admin collection`);
    } catch (error) {
        console.error(`Error syncing report ${reportId} to admin:`, error);
    }
};

// ===========================================
// READ-ONLY
// ===========================================
const getIssues = async (req, res) => {
    try {
        const { status, category, page = 1, limit = 10, sort = '-createdAt', exclude_resolved, ward, area } = req.query;

        const filter = {};

        if (status && status !== 'all') filter.status = status;
        if (category && category !== 'all') filter.category = category;
        if (exclude_resolved === 'true') filter.status = { $nin: ['resolved', 'archived'] };

        if (area && area !== 'all') {
            filter['location.address'] = { $regex: area, $options: 'i' };
        } else if (ward && ward !== 'all') {
            filter['location.address'] = { $regex: `Ward ${ward}`, $options: 'i' };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [issues, total] = await Promise.all([
            Report.find(filter)
                .populate('user', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Report.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: issues,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('getIssues error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getIssue = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) return res.status(404).json({ message: 'Report not found' });
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ===========================================
// UPVOTE / DOWNVOTE (with activity, reputation, and notification)
// ===========================================
const toggleUpvote = async (req, res) => {
    try {
        const reportId = req.params.id;
        const userId = req.user.id;

        const report = await Report.findById(reportId);
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

        if (!report.upvotes) report.upvotes = [];
        if (!report.downvotes) report.downvotes = [];

        const upvoteIndex = report.upvotes.findIndex(v => v.user.toString() === userId);
        const downvoteIndex = report.downvotes.findIndex(v => v.user.toString() === userId);
        const wasUpvoted = upvoteIndex !== -1;

        if (upvoteIndex !== -1) {
            // Remove upvote
            report.upvotes.splice(upvoteIndex, 1);
            await Activity.create({
                type: 'upvote_removed',
                issue: reportId,
                issueTitle: report.title,
                issueCategory: report.category,
                user: userId,
                userName: req.user.name,
                content: `${req.user.name} removed their upvote`,
                importance: 'low'
            });
            // Also create in AdminActivity
            try {
                const AdminActivity = require('../models/AdminActivity');
                await AdminActivity.create({
                    type: 'upvote_removed',
                    issue: reportId,
                    issueTitle: report.title,
                    issueCategory: report.category,
                    user: userId,
                    userName: req.user.name,
                    content: `${req.user.name} removed their upvote`,
                    priority: 'low',
                    metadata: {},
                    createdAt: new Date()
                });
            } catch (err) {
                console.error('AdminActivity creation error:', err.message);
            }
        } else {
            // Add upvote
            report.upvotes.push({ user: userId, createdAt: new Date() });
            if (downvoteIndex !== -1) report.downvotes.splice(downvoteIndex, 1);

            await Activity.create({
                type: 'upvote',
                issue: reportId,
                issueTitle: report.title,
                issueCategory: report.category,
                user: userId,
                userName: req.user.name,
                content: `${req.user.name} upvoted this issue`,
                importance: 'normal'
            });

            try {
                const AdminActivity = require('../models/AdminActivity');
                await AdminActivity.create({
                    type: 'upvote',
                    issue: reportId,
                    issueTitle: report.title,
                    issueCategory: report.category,
                    user: userId,
                    userName: req.user.name,
                    content: `${req.user.name} upvoted this issue`,
                    priority: 'low',
                    metadata: {},
                    createdAt: new Date()
                });
            } catch (err) {
                console.error('AdminActivity creation error:', err.message);
            }

            // 🔔 UPVOTE NOTIFICATION: Notify the report owner (if not self-upvote)
            const ownerId = report.user.toString();
            if (ownerId !== userId) {
                await notifyUser(ownerId, {
                    type: 'upvote_received',
                    title: `Someone upvoted your report`,
                    message: `${req.user.name} upvoted "${report.title}"`,
                    relatedIssue: reportId,
                    metadata: { upvoterId: userId }
                });
            }

            // Award reputation to report owner (+1) – skip self-upvote
            if (ownerId !== userId) {
                try {
                    const result = await User.updateOne(
                        { _id: new mongoose.Types.ObjectId(ownerId) },
                        {
                            $inc: { reputation: 1 },
                            $push: {
                                reputationHistory: {
                                    change: 1,
                                    reason: `Received an upvote on report: ${report.title}`,
                                    issueId: new mongoose.Types.ObjectId(reportId),
                                    createdAt: new Date()
                                }
                            }
                        }
                    );
                    if (result.modifiedCount > 0) {
                        const updated = await User.findById(ownerId).select('reputation name');
                        console.log(`✅ +1 reputation to ${updated.name} (Total: ${updated.reputation})`);
                    }
                } catch (err) {
                    console.error('Reputation award failed:', err.message);
                }

                // ---- Added: send reputation notification (from second file) ----
                try {
                    await sendReputationNotification(
                        ownerId,
                        'Reputation Awarded',
                        `You gained +1 reputation from an upvote on "${report.title}"`,
                        reportId
                    );
                } catch (notifError) {
                    console.error('Reputation notification failed:', notifError.message);
                }
                // ----------------------------------------------------------------
            }
        }

        report.upvoteCount = report.upvotes.length;
        report.downvoteCount = report.downvotes.length;
        report.lastActivityAt = new Date();
        await report.save();

        await syncToAdminCollection(reportId);

        res.json({
            success: true,
            upvoteCount: report.upvoteCount,
            downvoteCount: report.downvoteCount,
            hasUpvoted: !wasUpvoted,
            hasDownvoted: false
        });
    } catch (error) {
        console.error('Upvote error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const toggleDownvote = async (req, res) => {
    try {
        const reportId = req.params.id;
        const userId = req.user.id;

        console.log('Downvote attempt:', { reportId, userId });

        const report = await Report.findById(reportId);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        if (!report.upvotes) report.upvotes = [];
        if (!report.downvotes) report.downvotes = [];

        const downvoteIndex = report.downvotes.findIndex(v => v.user.toString() === userId.toString());
        const upvoteIndex = report.upvotes.findIndex(v => v.user.toString() === userId.toString());

        let wasDownvoted = downvoteIndex !== -1;

        if (downvoteIndex !== -1) {
            report.downvotes.splice(downvoteIndex, 1);

            await Activity.create({
                type: 'downvote_removed',
                issue: reportId,
                issueTitle: report.title,
                issueCategory: report.category,
                user: userId,
                userName: req.user.name,
                content: `${req.user.name} removed their downvote`,
                importance: 'low'
            });
        } else {
            report.downvotes.push({ user: userId, createdAt: new Date() });

            await Activity.create({
                type: 'downvote',
                issue: reportId,
                issueTitle: report.title,
                issueCategory: report.category,
                user: userId,
                userName: req.user.name,
                content: `${req.user.name} downvoted this issue`,
                importance: 'normal'
            });

            if (upvoteIndex !== -1) {
                report.upvotes.splice(upvoteIndex, 1);
            }
        }

        report.upvoteCount = report.upvotes.length;
        report.downvoteCount = report.downvotes.length;
        report.lastActivityAt = new Date();
        await report.save();

        await syncToAdminCollection(reportId);

        res.json({
            success: true,
            upvoteCount: report.upvoteCount,
            downvoteCount: report.downvoteCount,
            hasUpvoted: false,
            hasDownvoted: !wasDownvoted
        });
    } catch (error) {
        console.error('Downvote error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getUpvoters = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id).populate('upvotes.user', 'name');
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
        const upvoters = report.upvotes.map(v => ({
            id: v.user._id,
            name: v.user.name,
            upvotedAt: v.createdAt
        }));
        res.json({ success: true, upvoters });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ===========================================
// COMMENTS (with activity, notifications, reputation)
// ===========================================
const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const reportId = req.params.id;
        const userId = req.user.id;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Comment text is required' });
        }

        console.log('Add comment attempt:', { reportId, userId: userId.toString() });

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userName = user.name;
        const db = mongoose.connection.db;
        const collection = db.collection('reports');
        const objectId = new mongoose.Types.ObjectId(reportId);
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const comment = {
            _id: new mongoose.Types.ObjectId(),
            user: userObjectId,
            userName: userName,
            text: text.trim(),
            createdAt: new Date(),
            isEdited: false,
            editedAt: null
        };

        const result = await collection.updateOne(
            { _id: objectId },
            {
                $push: { comments: comment },
                $set: { lastActivityAt: new Date() },
                $inc: { commentCount: 1 }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        const report = await collection.findOne({ _id: objectId }, { projection: { title: 1, category: 1 } });

        // Create activity for new comment
        await Activity.create({
            type: 'new_comment',
            issue: reportId,
            issueTitle: report?.title || 'Report',
            issueCategory: report?.category,
            user: userId,
            userName: userName,
            content: text.trim().substring(0, 100),
            importance: 'normal'
        });

        // -- Added from second file: AdminActivity, notifications, reputation --
        // AdminActivity logging
        try {
            const AdminActivity = require('../models/AdminActivity');
            await AdminActivity.create({
                type: 'new_comment',
                issue: reportId,
                issueTitle: report?.title || 'Report',
                issueCategory: report?.category,
                user: userId,
                userName: userName,
                content: text.trim().substring(0, 100),
                priority: 'medium',
                metadata: { commentId: comment._id },
                createdAt: new Date()
            });
        } catch (err) {
            console.error('AdminActivity comment creation error:', err.message);
        }

        // Notifications
        await notifyFollowers(reportId, userId, {
            type: 'new_comment',
            title: `New comment on "${report?.title || 'Report'}"`,
            message: `${userName} commented: ${text.trim().substring(0, 100)}`,
            relatedIssue: reportId,
            metadata: { commentId: comment._id }
        });
        await notifyAuthor(reportId, userId, {
            type: 'new_comment',
            title: `New comment on your issue: ${report?.title || 'Report'}`,
            message: `${userName} commented: ${text.trim().substring(0, 100)}`,
            relatedIssue: reportId,
            metadata: { commentId: comment._id }
        });

        // Reputation for commenter (+2)
        try {
            const commenterId = new mongoose.Types.ObjectId(userId);
            const issueId = new mongoose.Types.ObjectId(reportId);
            const repResult = await User.updateOne(
                { _id: commenterId },
                {
                    $inc: { reputation: 2 },
                    $push: {
                        reputationHistory: {
                            change: 2,
                            reason: `Added a comment on report: ${report?.title || 'Report'}`,
                            issueId: issueId,
                            createdAt: new Date()
                        }
                    }
                }
            );
            if (repResult.modifiedCount > 0) {
                const updated = await User.findById(commenterId).select('reputation name');
                console.log(`✅ +2 reputation to ${updated.name} (Total: ${updated.reputation})`);
            }
        } catch (err) {
            console.error('Comment reputation error:', err.message);
        }

        // ---- Added: send reputation notification for comment (from second file) ----
        try {
            await sendReputationNotification(
                userId,
                'Reputation Awarded',
                `You gained +2 reputation for commenting on "${report?.title || 'Report'}"`,
                reportId
            );
        } catch (notifError) {
            console.error('Reputation notification failed:', notifError.message);
        }
        // -------------------------------------------------------------------------

        // Sync to admin collection
        await syncToAdminCollection(reportId);

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            comment: {
                ...comment,
                _id: comment._id.toString(),
                user: comment.user.toString(),
                userName: userName
            }
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const editComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { text } = req.body;
        const userId = req.user.id;

        if (!text || !text.trim()) {
            return res.status(400).json({ success: false, message: 'Comment text is required' });
        }

        const db = mongoose.connection.db;
        const collection = db.collection('reports');
        const reportObjectId = new mongoose.Types.ObjectId(id);
        const commentObjectId = new mongoose.Types.ObjectId(commentId);

        const report = await collection.findOne({
            _id: reportObjectId,
            'comments._id': commentObjectId
        });
        if (!report) return res.status(404).json({ success: false, message: 'Report or comment not found' });

        const comment = report.comments.find(c => c._id.toString() === commentId);
        if (comment.user.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await collection.updateOne(
            { _id: reportObjectId, 'comments._id': commentObjectId },
            {
                $set: {
                    'comments.$.text': text.trim(),
                    'comments.$.isEdited': true,
                    'comments.$.editedAt': new Date()
                }
            }
        );
        await syncToAdminCollection(id);

        const updatedReport = await collection.findOne({ _id: reportObjectId });
        const updatedComment = updatedReport.comments.find(c => c._id.toString() === commentId);

        res.json({
            success: true,
            message: 'Comment updated',
            comment: {
                ...updatedComment,
                _id: updatedComment._id.toString(),
                user: updatedComment.user.toString()
            }
        });
    } catch (error) {
        console.error('Edit comment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const userId = req.user.id;

        const db = mongoose.connection.db;
        const collection = db.collection('reports');
        const reportObjectId = new mongoose.Types.ObjectId(id);
        const commentObjectId = new mongoose.Types.ObjectId(commentId);

        const report = await collection.findOne({
            _id: reportObjectId,
            'comments._id': commentObjectId
        });
        if (!report) return res.status(404).json({ success: false, message: 'Report or comment not found' });

        const comment = report.comments.find(c => c._id.toString() === commentId);
        if (comment.user.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await collection.updateOne(
            { _id: reportObjectId },
            {
                $pull: { comments: { _id: commentObjectId } },
                $inc: { commentCount: -1 }
            }
        );
        await syncToAdminCollection(id);

        res.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ===========================================
// ACTIVITY FEED
// ===========================================
const getActivityFeed = async (req, res) => {
    try {
        const { page = 1, limit = 20, type, days = 7 } = req.query;
        const query = {};
        if (days) {
            const dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() - parseInt(days));
            query.createdAt = { $gte: dateLimit };
        }
        if (type && type !== 'all') query.type = type;

        const activities = await Activity.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('issue', 'title category');

        const total = await Activity.countDocuments(query);
        res.json({
            success: true,
            data: activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Activity feed error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getIssueActivities = async (req, res) => {
    try {
        const activities = await Activity.find({ issue: req.params.id }).sort({ createdAt: -1 }).limit(50);
        res.json({ success: true, data: activities });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const requestReopen = async (req, res) => {
    try {
        const { id } = req.params;
        const io = req.app.get('io');
        await requestReopenService(id, req.user.id, req.user.name, io);

        const issue = await Report.findById(id).select('title');
        await notifyAdmins({
            type: 'reopen_request',
            title: `Reactivation requested: ${issue.title}`,
            message: `${req.user.name} requested reactivation of issue #${id.slice(-6)}.`,
            relatedIssue: id,
            metadata: { requestedBy: req.user.id }
        });

        res.json({ success: true, message: 'Reopen request sent to admin' });
    } catch (error) {
        console.error('Request reopen error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ---- Added from second file ----
const requestUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const [user, issue] = await Promise.all([
            User.findById(userId).select('name email'),
            Report.findById(id)
        ]);

        if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        let adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) adminUser = await User.findOne();
        if (!adminUser) throw new Error('No user found to assign notification');

        // Persistent notification for the panel
        await Notification.create({
            user: adminUser._id,
            type: 'update_request',
            title: `Update requested for issue: ${issue.title}`,
            message: `${user.name} (${user.email}) requested the latest update on issue #${id.slice(-6)}.`,
            relatedIssue: id,
            createdAt: new Date()
        });

        await notifyAdmins({
            type: 'update_request',
            title: `Update requested: ${issue.title}`,
            message: `${user.name} (${user.email}) requested the latest update on issue #${id.slice(-6)}.`,
            relatedIssue: id,
            metadata: { requestedBy: userId }
        });

        res.json({ success: true, message: 'Your request has been sent. You will be notified when an update is available.' });
    } catch (error) {
        console.error('Error in requestUpdate:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
// -------------------------------

const getIssueStats = async (req, res) => {
    try {
        console.log('📊 Stats request received');

        const total = await Report.countDocuments();
        console.log(`Total: ${total}`);

        const reported = await Report.countDocuments({ status: 'reported' });
        const inProgress = await Report.countDocuments({ status: 'in_progress' });
        const resolved = await Report.countDocuments({ status: 'resolved' });
        const archived = await Report.countDocuments({ status: 'archived' });

        console.log(`Reported: ${reported}, InProgress: ${inProgress}, Resolved: ${resolved}, Archived: ${archived}`);

        return res.json({
            success: true,
            total,
            reported,
            inProgress,
            resolved,
            archived
        });
    } catch (error) {
        console.error('❌ Stats error:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
            stack: error.stack
        });
    }
};

module.exports = {
    getIssues,
    getIssue,
    getIssueStats,
    toggleUpvote,
    toggleDownvote,
    getUpvoters,
    addComment,
    editComment,
    deleteComment,
    getActivityFeed,
    getIssueActivities,
    requestReopen,
    requestUpdate          // <-- Added
};