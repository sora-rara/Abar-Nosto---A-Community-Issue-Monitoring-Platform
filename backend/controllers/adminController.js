const AdminIssue = require('../models/AdminIssue');
const Report = require('../models/Report');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { notifyFollowers, notifyAuthor } = require('../services/notificationService');

exports.getAllIssues = async (req, res) => {
    try {
        const { status, category, page = 1, limit = 10, sort = '-createdAt' } = req.query;

        const filter = {};
        if (status && status !== 'all') filter.status = status;
        if (category && category !== 'all') filter.category = category;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const issues = await AdminIssue.find(filter)
            .populate('reportedBy', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await AdminIssue.countDocuments(filter);

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

        const issue = await AdminIssue.findById(req.params.id);
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }

        const oldStatus = issue.status;

        issue.statusHistory.push({
            status,
            comment,
            updatedBy: req.user.id,
            updatedByName: req.user.name,
            updatedAt: new Date()
        });

        issue.status = status;

        if (status === 'in_progress' && !issue.resolutionTimeline?.inProgressAt) {
            issue.resolutionTimeline.inProgressAt = new Date();
        } else if (status === 'resolved' && !issue.resolutionTimeline?.resolvedAt) {
            issue.resolutionTimeline.resolvedAt = new Date();
        }

        await issue.save();
        await Report.findByIdAndUpdate(issue.originalReportId, {
            status: status,
            updatedAt: new Date()
        });
        await notifyFollowers(
            issue.originalReportId,   // the original report ID (used in follows)
            req.user.id,              // exclude the admin who made the change
            {
                type: 'status_change',
                title: `Issue status updated: ${issue.title}`,
                message: `Status changed from ${oldStatus} to ${status}. ${comment}`,
                relatedIssue: issue.originalReportId,
                metadata: { oldStatus, newStatus: status }
            }
        );

        await notifyAuthor(
            issue.originalReportId,
            req.user.id,
            {
                type: 'status_change',
                title: `Your issue status updated: ${issue.title}`,
                message: `Status changed from ${oldStatus} to ${status}. ${comment}`,
                relatedIssue: issue.originalReportId,
                metadata: { oldStatus, newStatus: status }
            }
        );

        await Report.findByIdAndUpdate(issue.originalReportId, {
            status: status,
            updatedAt: new Date()
        });

        try {
            await Activity.create({
                type: 'status_update',
                issue: issue.originalReportId,
                issueTitle: issue.title,
                issueCategory: issue.category,
                user: req.user.id,
                userName: req.user.name,
                content: `Status changed from ${oldStatus} to ${status}. Comment: ${comment}`,
                importance: 'high',
                createdAt: new Date()
            });
        } catch (activityError) {
            console.error('Activity creation failed:', activityError.message);
        }

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: issue
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
        const stats = {
            total: await AdminIssue.countDocuments(),
            reported: await AdminIssue.countDocuments({ status: 'reported' }),
            inProgress: await AdminIssue.countDocuments({ status: 'in_progress' }),
            resolved: await AdminIssue.countDocuments({ status: 'resolved' }),

            byCategory: {
                pothole: await AdminIssue.countDocuments({ category: 'pothole' }),
                broken_light: await AdminIssue.countDocuments({ category: 'broken_light' }),
                drainage: await AdminIssue.countDocuments({ category: 'drainage' }),
                flooding: await AdminIssue.countDocuments({ category: 'flooding' }),
                garbage: await AdminIssue.countDocuments({ category: 'garbage' }),
                debris: await AdminIssue.countDocuments({ category: 'debris' }),
                hazard: await AdminIssue.countDocuments({ category: 'hazard' }),
                other: await AdminIssue.countDocuments({ category: 'other' })
            },

            totalUsers: await User.countDocuments(),
            adminUsers: await User.countDocuments({ role: 'admin' }),

            recentActivity: {
                last7Days: await AdminIssue.countDocuments({
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }),
                resolvedLast7Days: await AdminIssue.countDocuments({
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