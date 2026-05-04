const AdminIssue = require('../models/AdminIssue');
const Report = require('../models/Report');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { notifyFollowers, notifyAuthor } = require('../services/notificationService');
const { updateIssueStatus } = require('../services/issueStatusService');
const AdminActivity = require('../models/AdminActivity');

exports.getAllIssues = async (req, res) => {
    try {
        const { status, category, page = 1, limit = 10, sort = '-createdAt' } = req.query;

        const filter = {};

        // Apply status filter if provided (frontend sends 'archived' for archived tab)
        if (status && status !== 'all') {
            filter.status = status;
        } else {
            // Default: exclude archived issues (show only active)
            filter.status = { $ne: 'archived' };
        }

        if (category && category !== 'all') {
            filter.category = category;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const issues = await AdminIssue.find(filter)
            .populate('reportedBy', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await AdminIssue.countDocuments(filter);

        // Stats: count all issues (including archived) for dashboard cards
        const stats = {
            total: await AdminIssue.countDocuments(),
            reported: await AdminIssue.countDocuments({ status: 'reported' }),
            inProgress: await AdminIssue.countDocuments({ status: 'in_progress' }),
            resolved: await AdminIssue.countDocuments({ status: 'resolved' })
        };

        res.json({
            success: true,
            data: issues,
            stats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get all issues error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getIssueDetails = async (req, res) => {
    try {
        const issue = await AdminIssue.findById(req.params.id)
            .populate('reportedBy', 'name email')
            .populate('statusHistory.updatedBy', 'name')
            .populate('finalUpdate.publishedBy', 'name');

        if (!issue) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }

        const originalReport = await Report.findById(issue.originalReportId)
            .populate('user', 'name email')
            .populate('comments.user', 'name');

        res.json({
            success: true,
            data: {
                issue,
                originalReport
            }
        });
    } catch (error) {
        console.error('Get issue details error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status, comment } = req.body;
        if (!status || !comment) {
            return res.status(400).json({
                success: false,
                message: 'Please provide status and comment'
            });
        }

        const adminIssue = await AdminIssue.findById(req.params.id);
        if (!adminIssue) {
            return res.status(404).json({
                success: false,
                message: 'Admin issue not found'
            });
        }

        const oldStatus = adminIssue.status;

        // Use the service to update both models atomically (includes history)
        await updateIssueStatus(adminIssue.originalReportId, status, req.user.id, req.user.name, comment);

        // ========== Notify followers & author ==========
        await notifyFollowers(
            adminIssue.originalReportId,
            req.user.id,
            {
                type: 'status_change',
                title: `Issue status updated: ${adminIssue.title}`,
                message: `Status changed from ${oldStatus} to ${status}. ${comment}`,
                relatedIssue: adminIssue.originalReportId,
                metadata: { oldStatus, newStatus: status }
            }
        );

        await notifyAuthor(
            adminIssue.originalReportId,
            req.user.id,
            {
                type: 'status_change',
                title: `Your issue status updated: ${adminIssue.title}`,
                message: `Status changed from ${oldStatus} to ${status}. ${comment}`,
                relatedIssue: adminIssue.originalReportId,
                metadata: { oldStatus, newStatus: status }
            }
        );

        // Create regular activity (fire and forget)
        Activity.create({
            type: 'status_update',
            issue: adminIssue.originalReportId,
            issueTitle: adminIssue.title,
            issueCategory: adminIssue.category,
            user: req.user.id,
            userName: req.user.name,
            content: `Status changed from ${oldStatus} to ${status}. Comment: ${comment}`,
            importance: 'high',
            createdAt: new Date()
        }).catch(err => console.error('Activity creation failed:', err.message));

        // ========== AdminActivity with analytics ==========
        try {
            await AdminActivity.create({
                type: 'status_update',
                issue: adminIssue.originalReportId,
                issueTitle: adminIssue.title,
                issueCategory: adminIssue.category,
                user: req.user.id,
                userName: req.user.name,
                content: `Status changed from ${oldStatus} to ${status}. Comment: ${comment}`,
                priority: 'high',
                metadata: { oldStatus, newStatus: status },
                analytics: {
                    responseTime: adminIssue.resolutionTimeline?.reportedAt
                        ? Math.round((new Date() - new Date(adminIssue.resolutionTimeline.reportedAt)) / 60000)
                        : 0
                },
                createdAt: new Date()
            });
        } catch (err) {
            console.error('AdminActivity creation failed:', err.message);
        }

        res.json({
            success: true,
            message: 'Status updated successfully'
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.publishFinalUpdate = async (req, res) => {
    try {
        const { statement } = req.body;

        if (!statement) {
            return res.status(400).json({
                success: false,
                message: 'Please provide final statement'
            });
        }

        const issue = await AdminIssue.findById(req.params.id);
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }

        if (issue.status !== 'resolved') {
            return res.status(400).json({
                success: false,
                message: 'Issue must be resolved before publishing final update'
            });
        }

        issue.finalUpdate = {
            statement,
            publishedBy: req.user.id,
            publishedByName: req.user.name,
            publishedAt: new Date()
        };

        await issue.save();

        try {
            await Activity.create({
                type: 'issue_resolved',
                issue: issue.originalReportId,
                issueTitle: issue.title,
                issueCategory: issue.category,
                user: req.user.id,
                userName: req.user.name,
                content: `Issue resolved: ${statement.substring(0, 100)}`,
                importance: 'high',
                createdAt: new Date()
            });

            // AdminActivity with analytics
            await AdminActivity.create({
                type: 'issue_resolved',
                issue: issue.originalReportId,
                issueTitle: issue.title,
                issueCategory: issue.category,
                user: req.user.id,
                userName: req.user.name,
                content: `Issue resolved: ${statement.substring(0, 100)}`,
                priority: 'high',
                metadata: {},
                analytics: {
                    responseTime: issue.resolutionTimeline?.reportedAt
                        ? Math.round((new Date() - new Date(issue.resolutionTimeline.reportedAt)) / 60000)
                        : 0
                },
                createdAt: new Date()
            });
        } catch (activityError) {
            console.error('Activity creation failed:', activityError.message);
        }

        res.json({
            success: true,
            message: 'Final update published successfully',
            data: issue.finalUpdate
        });
    } catch (error) {
        console.error('Publish final update error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getStats = async (req, res) => {
    try {
        // Use Report as single source of truth so stats match the user dashboard
        const stats = {
            total: await Report.countDocuments(),
            reported: await Report.countDocuments({ status: 'reported' }),
            inProgress: await Report.countDocuments({ status: 'in_progress' }),
            resolved: await Report.countDocuments({ status: 'resolved' }),
            archived: await Report.countDocuments({ status: 'archived' }),

            byCategory: {
                pothole: await Report.countDocuments({ category: 'pothole' }),
                broken_light: await Report.countDocuments({ category: 'broken_light' }),
                drainage: await Report.countDocuments({ category: 'drainage' }),
                flooding: await Report.countDocuments({ category: 'flooding' }),
                garbage: await Report.countDocuments({ category: 'garbage' }),
                debris: await Report.countDocuments({ category: 'debris' }),
                hazard: await Report.countDocuments({ category: 'hazard' }),
                other: await Report.countDocuments({ category: 'other' })
            },

            totalUsers: await User.countDocuments(),
            adminUsers: await User.countDocuments({ role: 'admin' }),

            recentActivity: {
                last7Days: await Report.countDocuments({
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }),
                resolvedLast7Days: await Report.countDocuments({
                    status: 'resolved',
                    updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                })
            }
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.syncReports = async (req, res) => {
    try {
        const reports = await Report.find().populate('user', 'name email');

        let synced = 0;
        let skipped = 0;
        let errors = 0;

        for (const report of reports) {
            try {
                const existing = await AdminIssue.findOne({ originalReportId: report._id });

                if (!existing) {
                    let locationData = {
                        address: 'Unknown location',
                        lat: 0,
                        lng: 0
                    };

                    if (report.location) {
                        locationData = {
                            address: report.location.address || 'Unknown location',
                            lat: report.location.lat || 0,
                            lng: report.location.lng || 0
                        };
                    }

                    const adminIssueData = {
                        originalReportId: report._id,
                        title: report.title || 'Untitled',
                        description: report.description || 'No description provided',
                        category: report.category || 'other',
                        location: locationData,
                        photos: report.photos || [],
                        reportedBy: report.user?._id || report.user || report.reportedBy,
                        reporterName: report.user?.name || report.reporterName || 'Unknown',
                        reporterEmail: report.user?.email || '',
                        upvoteCount: report.upvoteCount || 0,
                        downvoteCount: report.downvoteCount || 0,
                        commentCount: report.commentCount || 0,
                        viewCount: report.viewCount || 0,
                        status: report.status || 'reported',
                        lastActivityAt: report.lastActivityAt || new Date(),
                        resolutionTimeline: {
                            reportedAt: report.createdAt || new Date()
                        }
                    };

                    const newIssue = new AdminIssue(adminIssueData);
                    await newIssue.save();

                    synced++;
                    console.log(`✅ Synced report: ${report._id} - ${report.title}`);
                } else {
                    skipped++;
                    console.log(`⏭️ Already exists: ${report._id} - ${report.title}`);
                }
            } catch (err) {
                errors++;
                console.error('Error syncing report:', err.message);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Sync completed',
            data: { synced, skipped, errors, total: reports.length }
        });

    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ success: false, message: error.message || 'Sync failed' });
    }
};

exports.archiveIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body || {};

        const adminIssue = await AdminIssue.findById(id);
        if (!adminIssue) {
            return res.status(404).json({ success: false, message: 'Admin issue not found' });
        }

        const report = await Report.findById(adminIssue.originalReportId);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Original report not found' });
        }

        // Trust adminIssue.status as the source of truth (same approach as reactivateIssue)
        const activeStatuses = ['reported', 'in_progress', 'resolved'];
        if (!activeStatuses.includes(adminIssue.status)) {
            return res.status(400).json({ success: false, message: 'Only active issues can be archived' });
        }

        // Sync report status to match adminIssue if out of sync
        if (report.status !== adminIssue.status) {
            console.log(`⚠️ Sync before archive: Report has '${report.status}', AdminIssue has '${adminIssue.status}'. Syncing.`);
            report.status = adminIssue.status;
            await report.save();
        }

        await updateIssueStatus(report._id, 'archived', req.user.id, req.user.name, comment || 'Archived by admin');
        res.json({ success: true, message: 'Issue archived' });
    } catch (error) {
        console.error('Archive error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.reactivateIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body || {};

        const adminIssue = await AdminIssue.findById(id);
        if (!adminIssue) {
            return res.status(404).json({ success: false, message: 'Admin issue not found' });
        }

        // ✅ Use adminIssue.status as the authority (what the admin sees)
        if (adminIssue.status !== 'archived') {
            return res.status(400).json({ success: false, message: 'Only archived issues can be reactivated' });
        }

        let report = await Report.findById(adminIssue.originalReportId);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Original report not found' });
        }

        // 🔧 Fix inconsistency: if the report is not archived, force it to match the adminIssue
        if (report.status !== 'archived') {
            console.log(`⚠️ Report ${report._id} has status '${report.status}', but adminIssue is archived. Syncing report to 'archived'...`);
            report.status = 'archived';
            // Also add a history entry to record this sync
            report.statusHistory.push({
                status: 'archived',
                at: new Date(),
                updatedBy: req.user.id,
                updatedByName: req.user.name,
                comment: 'Status synced from admin issue (was inconsistent)'
            });
            await report.save();
        }

        // Now the report is definitely 'archived', so the transition to 'reported' is valid
        await updateIssueStatus(report._id, 'reported', req.user.id, req.user.name, comment || 'Reactivated by admin');
        res.json({ success: true, message: 'Issue reactivated' });
    } catch (error) {
        console.error('Reactivate error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.exportData = async (req, res) => {
    try {
        // Fetch all issues from the Admin database
        const issues = await AdminIssue.find().sort('-createdAt');

        // Build the CSV Header
        let csv = 'Issue ID,Title,Category,Status,Reported By,Email,Upvotes,Date,Address\n';

        // Loop through reports and add rows
        issues.forEach(issue => {
            const id = issue._id;
            const title = `"${(issue.title || '').replace(/"/g, '""')}"`;
            const category = issue.category || 'N/A';
            const status = issue.status || 'N/A';
            const reportedBy = `"${issue.reporterName || 'Unknown'}"`;
            const email = issue.reporterEmail || 'N/A';
            const upvotes = issue.upvoteCount || 0;
            const date = new Date(issue.createdAt).toLocaleDateString();
            const address = `"${(issue.location?.address || '').replace(/"/g, '""')}"`;

            csv += `${id},${title},${category},${status},${reportedBy},${email},${upvotes},${date},${address}\n`;
        });

        // Send back as a downloadable file
        res.header('Content-Type', 'text/csv');
        res.attachment(`abar-nosto-database-export-${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};