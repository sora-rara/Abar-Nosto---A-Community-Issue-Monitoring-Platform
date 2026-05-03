const AdminActivity = require('../models/AdminActivity');
const Report = require('../models/Report');
const User = require('../models/User');
const AdminIssue = require('../models/AdminIssue');
const mongoose = require('mongoose');

// ===========================================
// GET ADMIN ACTIVITY FEED WITH ADVANCED FILTERS
// ===========================================
exports.getAdminActivityFeed = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            type,
            priority,
            isRead,
            isFlagged,
            dateFrom,
            dateTo,
            category,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const query = {};

        // Type filter
        if (type && type !== 'all') {
            query.type = type;
        }

        // Priority filter
        if (priority && priority !== 'all') {
            query.priority = priority;
        }

        // Read status filter
        if (isRead === 'true') query.isRead = true;
        if (isRead === 'false') query.isRead = false;

        // Flagged filter
        if (isFlagged === 'true') query.isFlagged = true;

        // Date range
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }

        // Category filter
        if (category && category !== 'all') {
            query.issueCategory = category;
        }

        // Text search
        if (search && search.trim()) {
            query.$or = [
                { issueTitle: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { userName: { $regex: search, $options: 'i' } }
            ];
        }

        // Sorting
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [activities, total, unreadCount, flaggedCount] = await Promise.all([
            AdminActivity.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('user', 'name email')
                .populate('flaggedBy', 'name'),
            
            AdminActivity.countDocuments(query),
            AdminActivity.countDocuments({ isRead: false }),
            AdminActivity.countDocuments({ isFlagged: true })
        ]);

        // Analytics
        const analytics = {
            totalActivities: total,
            unreadCount,
            flaggedCount,
            byType: await AdminActivity.aggregate([
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ]),
            byPriority: await AdminActivity.aggregate([
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ]),
            recentActivityCount: await AdminActivity.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }),
            userEngagement: await AdminActivity.aggregate([
                { $group: { 
                    _id: '$user', 
                    activityCount: { $sum: 1 },
                    avgEngagementScore: { $avg: '$analytics.engagementScore' }
                }},
                { $sort: { activityCount: -1 } },
                { $limit: 10 },
                { $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userDetails'
                }},
                { $unwind: '$userDetails' },
                { $project: {
                    userName: '$userDetails.name',
                    activityCount: 1,
                    avgEngagementScore: 1
                }}
            ])
        };

        res.json({
            success: true,
            data: activities,
            analytics,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get admin activity feed error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ===========================================
// MARK ACTIVITIES AS READ (BULK)
// ===========================================
exports.markAsRead = async (req, res) => {
    try {
        const { activityIds, markAll } = req.body;

        if (markAll) {
            await AdminActivity.updateMany(
                { isRead: false },
                { $set: { isRead: true } }
            );
            return res.json({ success: true, message: 'All activities marked as read' });
        }

        if (activityIds && Array.isArray(activityIds)) {
            await AdminActivity.updateMany(
                { _id: { $in: activityIds } },
                { $set: { isRead: true } }
            );
            return res.json({ success: true, message: `${activityIds.length} activities marked as read` });
        }

        res.status(400).json({ success: false, message: 'Please provide activityIds or markAll' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ===========================================
// FLAG/UNFLAG ACTIVITY (TOGGLE)
// ===========================================
exports.toggleFlag = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const activity = await AdminActivity.findById(id);
        if (!activity) {
            return res.status(404).json({ success: false, message: 'Activity not found' });
        }

        // Toggle flag state
        activity.isFlagged = !activity.isFlagged;
        
        if (activity.isFlagged) {
            // Flagging
            activity.flaggedBy = req.user.id;
            activity.flaggedReason = reason || 'Flagged for review';
        } else {
            // Unflagging
            activity.flaggedBy = null;
            activity.flaggedReason = null;
        }

        await activity.save();

        res.json({
            success: true,
            message: activity.isFlagged ? 'Activity flagged for review' : 'Activity unflagged',
            data: {
                _id: activity._id,
                isFlagged: activity.isFlagged,
                flaggedBy: activity.isFlagged ? req.user.name : null,
                flaggedReason: activity.isFlagged ? activity.flaggedReason : null
            }
        });
    } catch (error) {
        console.error('Toggle flag error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ===========================================
// UPDATE PRIORITY
// ===========================================
exports.updatePriority = async (req, res) => {
    try {
        const { id } = req.params;
        const { priority } = req.body;

        if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
            return res.status(400).json({ success: false, message: 'Invalid priority level' });
        }

        const activity = await AdminActivity.findById(id);
        if (!activity) {
            return res.status(404).json({ success: false, message: 'Activity not found' });
        }

        const oldPriority = activity.priority;
        activity.priority = priority;
        await activity.save();

        // Also update related issue priority if exists
        if (activity.issue) {
            await AdminIssue.findOneAndUpdate(
                { originalReportId: activity.issue },
                { $set: { priority: priority } }
            );
        }

        res.json({
            success: true,
            message: `Priority updated from ${oldPriority} to ${priority}`,
            data: {
                _id: activity._id,
                oldPriority,
                newPriority: priority
            }
        });
    } catch (error) {
        console.error('Update priority error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ===========================================
// BULK ACTIONS
// ===========================================
exports.bulkAction = async (req, res) => {
    try {
        const { action, activityIds, data } = req.body;

        if (!activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide activity IDs' });
        }

        let result;
        let message = '';

        switch (action) {
            case 'markRead':
                result = await AdminActivity.updateMany(
                    { _id: { $in: activityIds } },
                    { $set: { isRead: true } }
                );
                message = `${result.modifiedCount} activities marked as read`;
                break;

            case 'markUnread':
                result = await AdminActivity.updateMany(
                    { _id: { $in: activityIds } },
                    { $set: { isRead: false } }
                );
                message = `${result.modifiedCount} activities marked as unread`;
                break;

            case 'flag':
                result = await AdminActivity.updateMany(
                    { _id: { $in: activityIds } },
                    { 
                        $set: { 
                            isFlagged: true,
                            flaggedBy: req.user.id,
                            flaggedReason: data?.reason || 'Bulk flagged'
                        } 
                    }
                );
                message = `${result.modifiedCount} activities flagged`;
                break;

            case 'unflag':
                result = await AdminActivity.updateMany(
                    { _id: { $in: activityIds } },
                    { 
                        $set: { 
                            isFlagged: false,
                            flaggedBy: null,
                            flaggedReason: null
                        } 
                    }
                );
                message = `${result.modifiedCount} activities unflagged`;
                break;

            case 'delete':
                result = await AdminActivity.deleteMany({ _id: { $in: activityIds } });
                message = `${result.deletedCount} activities deleted`;
                break;

            case 'updatePriority':
                if (!data?.priority) {
                    return res.status(400).json({ success: false, message: 'Priority is required' });
                }
                result = await AdminActivity.updateMany(
                    { _id: { $in: activityIds } },
                    { $set: { priority: data.priority } }
                );
                message = `${result.modifiedCount} activities updated to ${data.priority} priority`;
                break;

            default:
                return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        res.json({
            success: true,
            message,
            result
        });
    } catch (error) {
        console.error('Bulk action error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ===========================================
// GET ANALYTICS
// ===========================================
exports.getAnalytics = async (req, res) => {
    try {
        const { period = '7d' } = req.query;

        let dateFrom;
        const now = new Date();

        switch (period) {
            case '24h':
                dateFrom = new Date(now - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                dateFrom = new Date(now - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                dateFrom = new Date(now - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                dateFrom = new Date(now - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                dateFrom = new Date(now - 7 * 24 * 60 * 60 * 1000);
        }

        const analytics = {
            period,
            totalActivities: await AdminActivity.countDocuments({ createdAt: { $gte: dateFrom } }),
            
            activityByType: await AdminActivity.aggregate([
                { $match: { createdAt: { $gte: dateFrom } } },
                { $group: { _id: '$type', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),

            activityByHour: await AdminActivity.aggregate([
                { $match: { createdAt: { $gte: dateFrom } } },
                { $group: {
                    _id: { $hour: '$createdAt' },
                    count: { $sum: 1 }
                }},
                { $sort: { _id: 1 } }
            ]),

            activityByDay: await AdminActivity.aggregate([
                { $match: { createdAt: { $gte: dateFrom } } },
                { $group: {
                    _id: { 
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } 
                    },
                    count: { $sum: 1 }
                }},
                { $sort: { _id: 1 } }
            ]),

            topCategories: await AdminActivity.aggregate([
                { $match: { createdAt: { $gte: dateFrom }, issueCategory: { $exists: true, $ne: null } } },
                { $group: { _id: '$issueCategory', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),

            mostActiveUsers: await AdminActivity.aggregate([
                { $match: { createdAt: { $gte: dateFrom }, user: { $exists: true } } },
                { $group: { _id: '$user', activityCount: { $sum: 1 } } },
                { $sort: { activityCount: -1 } },
                { $limit: 10 },
                { $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userDetails'
                }},
                { $unwind: '$userDetails' },
                { $project: {
                    userName: '$userDetails.name',
                    email: '$userDetails.email',
                    activityCount: 1
                }}
            ]),

            priorityDistribution: await AdminActivity.aggregate([
                { $match: { createdAt: { $gte: dateFrom } } },
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ]),

            flaggedCount: await AdminActivity.countDocuments({ 
                createdAt: { $gte: dateFrom }, 
                isFlagged: true 
            }),

            avgResponseTime: await AdminActivity.aggregate([
                { $match: { 
                    createdAt: { $gte: dateFrom },
                    'analytics.responseTime': { $gt: 0 }
                }},
                { $group: {
                    _id: null,
                    avgResponse: { $avg: '$analytics.responseTime' }
                }}
            ]),

            engagementTrend: await AdminActivity.aggregate([
                { $match: { createdAt: { $gte: dateFrom } } },
                { $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    avgEngagement: { $avg: '$analytics.engagementScore' },
                    total: { $sum: 1 }
                }},
                { $sort: { _id: 1 } }
            ])
        };

        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ===========================================
// MODERATE COMMENT (Delete/Edit)
// ===========================================
exports.moderateComment = async (req, res) => {
    try {
        const { issueId, commentId } = req.params;
        const { action, newText } = req.body;

        const db = mongoose.connection.db;
        const collection = db.collection('reports');
        const reportObjectId = new mongoose.Types.ObjectId(issueId);
        const commentObjectId = new mongoose.Types.ObjectId(commentId);

        const report = await collection.findOne({
            _id: reportObjectId,
            'comments._id': commentObjectId
        });

        if (!report) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        const comment = report.comments.find(c => c._id.toString() === commentId);

        if (action === 'delete') {
            await collection.updateOne(
                { _id: reportObjectId },
                {
                    $pull: { comments: { _id: commentObjectId } },
                    $inc: { commentCount: -1 }
                }
            );

            return res.json({ success: true, message: 'Comment deleted successfully' });
        }

        if (action === 'edit') {
            if (!newText || !newText.trim()) {
                return res.status(400).json({ success: false, message: 'New text is required' });
            }

            await collection.updateOne(
                { _id: reportObjectId, 'comments._id': commentObjectId },
                {
                    $set: {
                        'comments.$.text': newText.trim(),
                        'comments.$.isEdited': true,
                        'comments.$.editedAt': new Date()
                    }
                }
            );

            return res.json({ success: true, message: 'Comment edited successfully' });
        }

        res.status(400).json({ success: false, message: 'Invalid action. Use "delete" or "edit"' });
    } catch (error) {
        console.error('Moderate comment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ===========================================
// GET USER ACTIVITY DETAILS
// ===========================================
exports.getUserActivityDetails = async (req, res) => {
    try {
        const { userId } = req.params;

        const [userActivities, userInfo] = await Promise.all([
            AdminActivity.find({ user: userId })
                .sort({ createdAt: -1 })
                .limit(50),
            User.findById(userId).select('name email reputation createdAt')
        ]);

        if (!userInfo) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const analytics = {
            totalActivities: await AdminActivity.countDocuments({ user: userId }),
            byType: await AdminActivity.aggregate([
                { $match: { user: new mongoose.Types.ObjectId(userId) } },
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ]),
            lastActive: userActivities.length > 0 ? userActivities[0].createdAt : null,
            flaggedCount: await AdminActivity.countDocuments({ user: userId, isFlagged: true }),
            avgEngagementScore: await AdminActivity.aggregate([
                { $match: { user: new mongoose.Types.ObjectId(userId) } },
                { $group: { _id: null, avg: { $avg: '$analytics.engagementScore' } } }
            ])
        };

        res.json({
            success: true,
            user: userInfo,
            activities: userActivities,
            analytics: {
                totalActivities: analytics.totalActivities,
                byType: analytics.byType,
                lastActive: analytics.lastActive,
                flaggedCount: analytics.flaggedCount,
                avgEngagementScore: analytics.avgEngagementScore[0]?.avg || 0
            }
        });
    } catch (error) {
        console.error('Get user activity details error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ===========================================
// CREATE SYSTEM ACTIVITY (Internal use)
// ===========================================
exports.createSystemActivity = async (type, data) => {
    try {
        const validTypes = [
            'new_issue',
            'new_comment',
            'status_update',
            'issue_resolved',
            'upvote',
            'downvote',
            'upvote_removed',
            'downvote_removed',
            'user_registered',
            'report_flagged',
            'bulk_action',
            'comment_moderated',
            'issue_prioritized',
            'user_warning',
            'system_alert'
        ];

        if (!validTypes.includes(type)) {
            console.warn(`Invalid activity type: ${type}. Skipping.`);
            return;
        }

        await AdminActivity.create({
            type,
            ...data,
            priority: data.priority || 'low',
            createdAt: new Date()
        });
    } catch (error) {
        console.error('Create system activity error:', error);
    }
};