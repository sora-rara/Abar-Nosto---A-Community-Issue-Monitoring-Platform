const Report = require('../models/Report'); // This now points to the 'reports' collection
const Activity = require('../models/Activity');
const mongoose = require('mongoose');
const User = require('../models/User');

// ===========================================
// READ-ONLY ACCESS (for displaying reports)
// ===========================================

// @desc    Get all reports
// @route   GET /api/issues
const getIssues = async (req, res) => {
    try {
        const { category, status, sort, exclude_resolved } = req.query;
        let query = {};

        // Apply dashboard filters if they exist
        if (category && category !== 'all') query.category = category;
        if (status && status !== 'all') query.status = status;
        
        // Map specific filter to hide resolved issues
        if (exclude_resolved === 'true') {
            query.status = { $ne: 'resolved' };
        }

        // Apply sorting (defaults to newest first)
        let sortQuery = '-createdAt';
        if (sort === '-upvoteCount') sortQuery = '-upvoteCount';

        const reports = await Report.find(query).sort(sortQuery);
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single report
// @route   GET /api/issues/:id
const getIssue = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ===========================================
// VOTE SYSTEM
// ===========================================

// @desc    Toggle upvote
// @route   POST /api/issues/:id/upvote
const toggleUpvote = async (req, res) => {
    try {
        const reportId = req.params.id;
        const userId = req.user.id;  // From auth middleware

        console.log('Upvote attempt:', { reportId, userId });

        // Find the report
        const report = await Report.findById(reportId);
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Initialize arrays if they don't exist
        if (!report.upvotes) report.upvotes = [];
        if (!report.downvotes) report.downvotes = [];

        // Check if user already upvoted (compare the user field inside vote objects)
        const upvoteIndex = report.upvotes.findIndex(
            v => v.user.toString() === userId.toString()
        );

        // Check if user downvoted
        const downvoteIndex = report.downvotes.findIndex(
            v => v.user.toString() === userId.toString()
        );

        if (upvoteIndex !== -1) {
            // User already upvoted - remove the vote object
            report.upvotes.splice(upvoteIndex, 1);
        } else {
            // Add new upvote object
            report.upvotes.push({
                user: userId,
                createdAt: new Date()
            });

            // Remove from downvotes if exists
            if (downvoteIndex !== -1) {
                report.downvotes.splice(downvoteIndex, 1);
            }
        }

        // Update counts (pre-save hook will also do this)
        report.upvoteCount = report.upvotes.length;
        report.downvoteCount = report.downvotes.length;
        report.lastActivityAt = new Date();

        await report.save();

        res.json({
            success: true,
            upvoteCount: report.upvoteCount,
            downvoteCount: report.downvoteCount,
            hasUpvoted: upvoteIndex === -1, // true if we added, false if we removed
            hasDownvoted: false
        });

    } catch (error) {
        console.error('Upvote error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Toggle downvote
// @route   POST /api/issues/:id/downvote
const toggleDownvote = async (req, res) => {
    try {
        const reportId = req.params.id;
        const userId = req.user.id;

        console.log('Downvote attempt:', { reportId, userId });

        const report = await Report.findById(reportId);
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        if (!report.upvotes) report.upvotes = [];
        if (!report.downvotes) report.downvotes = [];

        // Check if user already downvoted
        const downvoteIndex = report.downvotes.findIndex(
            v => v.user.toString() === userId.toString()
        );

        // Check if user upvoted
        const upvoteIndex = report.upvotes.findIndex(
            v => v.user.toString() === userId.toString()
        );

        if (downvoteIndex !== -1) {
            // User already downvoted - remove the vote object
            report.downvotes.splice(downvoteIndex, 1);
        } else {
            // Add new downvote object
            report.downvotes.push({
                user: userId,
                createdAt: new Date()
            });

            // Remove from upvotes if exists
            if (upvoteIndex !== -1) {
                report.upvotes.splice(upvoteIndex, 1);
            }
        }

        // Update counts
        report.upvoteCount = report.upvotes.length;
        report.downvoteCount = report.downvotes.length;
        report.lastActivityAt = new Date();

        await report.save();

        res.json({
            success: true,
            upvoteCount: report.upvoteCount,
            downvoteCount: report.downvoteCount,
            hasUpvoted: false,
            hasDownvoted: downvoteIndex === -1 // true if we added, false if we removed
        });

    } catch (error) {
        console.error('Downvote error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get upvoters
// @route   GET /api/issues/:id/upvotes
const getUpvoters = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id).populate('upvotes.user', 'name');
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

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
// COMMENT SYSTEM
// ===========================================

// @desc    Add comment
// @route   POST /api/issues/:id/comments
// @desc    Add comment
// @route   POST /api/issues/:id/comments
const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const reportId = req.params.id;
        const userId = req.user.id;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Comment text is required' });
        }

        console.log('Add comment attempt:', { reportId, userId: userId.toString() });

        // 🔥 FIX: Get user name from database
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userName = user.name; // Get the actual user name

        // Get native MongoDB collection - explicitly use 'reports'
        const db = mongoose.connection.db;
        const collection = db.collection('reports');

        // Convert to ObjectId
        const objectId = new mongoose.Types.ObjectId(reportId);
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Create comment object with unique ID
        const comment = {
            _id: new mongoose.Types.ObjectId(),
            user: userObjectId,
            userName: userName, // 🔥 Now using the fetched user name
            text: text.trim(),
            createdAt: new Date(),
            isEdited: false,
            editedAt: null
        };

        // Update using native driver - push comment to array
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

        // Get the report title for activity
        const report = await collection.findOne({ _id: objectId }, { projection: { title: 1 } });

        // Create activity (fire and forget)
        Activity.create({
            type: 'new_comment',
            issue: reportId,
            issueTitle: report?.title || 'Report',
            user: userId,
            userName: userName, // 🔥 Use the fetched user name
            content: text.trim().substring(0, 100)
        }).catch(err => console.error('Activity creation error:', err));

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            comment: {
                ...comment,
                _id: comment._id.toString(),
                user: comment.user.toString(),
                userName: userName // 🔥 Include userName in response
            }
        });

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Edit comment
// @route   PUT /api/issues/:id/comments/:commentId
const editComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { text } = req.body;
        const userId = req.user.id;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Comment text is required' });
        }

        console.log('Edit comment attempt:', { reportId: id, commentId, userId: userId.toString() });

        // Get native MongoDB collection - explicitly use 'reports'
        const db = mongoose.connection.db;
        const collection = db.collection('reports');

        // Convert to ObjectId
        const reportObjectId = new mongoose.Types.ObjectId(id);
        const commentObjectId = new mongoose.Types.ObjectId(commentId);
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Find the report and check if comment exists and belongs to user
        const report = await collection.findOne({
            _id: reportObjectId,
            'comments._id': commentObjectId
        });

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report or comment not found' });
        }

        // Find the specific comment
        const comment = report.comments.find(c => c._id.toString() === commentId);

        // Check if user owns the comment
        if (comment.user.toString() !== userId.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this comment' });
        }

        // Update the comment using $set with positional operator
        const result = await collection.updateOne(
            {
                _id: reportObjectId,
                'comments._id': commentObjectId
            },
            {
                $set: {
                    'comments.$.text': text.trim(),
                    'comments.$.isEdited': true,
                    'comments.$.editedAt': new Date()
                }
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        // Get the updated comment
        const updatedReport = await collection.findOne({ _id: reportObjectId });
        const updatedComment = updatedReport.comments.find(c => c._id.toString() === commentId);

        res.json({
            success: true,
            message: 'Comment updated successfully',
            comment: {
                ...updatedComment,
                _id: updatedComment._id.toString(),
                user: updatedComment.user.toString()
            }
        });

    } catch (error) {
        console.error('Edit comment error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete comment
// @route   DELETE /api/issues/:id/comments/:commentId
const deleteComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const userId = req.user.id;

        console.log('Delete comment attempt:', { reportId: id, commentId, userId: userId.toString() });

        // Get native MongoDB collection - explicitly use 'reports'
        const db = mongoose.connection.db;
        const collection = db.collection('reports');

        // Convert to ObjectId
        const reportObjectId = new mongoose.Types.ObjectId(id);
        const commentObjectId = new mongoose.Types.ObjectId(commentId);
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Find the report and check if comment exists and belongs to user
        const report = await collection.findOne({
            _id: reportObjectId,
            'comments._id': commentObjectId
        });

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report or comment not found' });
        }

        // Find the specific comment
        const comment = report.comments.find(c => c._id.toString() === commentId);

        // Check if user owns the comment
        if (comment.user.toString() !== userId.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
        }

        // Delete the comment using $pull
        const result = await collection.updateOne(
            { _id: reportObjectId },
            {
                $pull: { comments: { _id: commentObjectId } },
                $inc: { commentCount: -1 }
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });

    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===========================================
// ACTIVITY FEED
// ===========================================

// @desc    Get activity feed
// @route   GET /api/issues/activities/feed
const getActivityFeed = async (req, res) => {
    try {
        const { page = 1, limit = 20, type, days = 7 } = req.query;

        const query = {};

        // Filter by date
        if (days) {
            const dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() - parseInt(days));
            query.createdAt = { $gte: dateLimit };
        }

        // Filter by type
        if (type && type !== 'all') {
            query.type = type;
        }

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

// @desc    Get issue activities
// @route   GET /api/issues/:id/activities
const getIssueActivities = async (req, res) => {
    try {
        const activities = await Activity.find({ issue: req.params.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ success: true, data: activities });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ===========================================
// EXPORT ALL FUNCTIONS
// ===========================================

module.exports = {
    // Read-only
    getIssues,
    getIssue,

    // Voting
    toggleUpvote,
    toggleDownvote,
    getUpvoters,

    // Comments
    addComment,
    editComment,
    deleteComment,

    // Activity Feed
    getActivityFeed,
    getIssueActivities
};
