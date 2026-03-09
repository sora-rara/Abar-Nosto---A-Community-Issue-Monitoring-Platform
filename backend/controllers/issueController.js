const Report = require('../models/Issue'); // This now points to the 'reports' collection
const Activity = require('../models/Activity');
const mongoose = require('mongoose');

// ===========================================
// READ-ONLY ACCESS (for displaying reports)
// ===========================================

// @desc    Get all reports
// @route   GET /api/issues
const getIssues = async (req, res) => {
    try {
        const reports = await Report.find().sort('-createdAt');
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
        const userId = req.user._id;
        
        console.log('Upvote attempt:', { reportId, userId: userId.toString() });

        // Get native MongoDB collection - explicitly use 'reports'
        const db = mongoose.connection.db;
        const collection = db.collection('reports');
        
        // Convert to ObjectId
        const objectId = new mongoose.Types.ObjectId(reportId);
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Find the report using native driver
        const report = await collection.findOne({ _id: objectId });
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        // Check current vote status
        const userIdStr = userId.toString();
        const hasUpvoted = report.upvotes?.some(v => v.user?.toString() === userIdStr) || false;
        const hasDownvoted = report.downvotes?.some(v => v.user?.toString() === userIdStr) || false;

        // Build update operation
        let updateOp = {};
        
        if (hasUpvoted) {
            // Remove upvote
            updateOp = {
                $pull: { upvotes: { user: userObjectId } }
            };
        } else {
            // Add upvote
            updateOp = {
                $push: { upvotes: { user: userObjectId, createdAt: new Date() } }
            };
            
            // Remove from downvotes if exists
            if (hasDownvoted) {
                updateOp.$pull = { downvotes: { user: userObjectId } };
            }

            // Create activity (fire and forget)
            Activity.create({
                type: 'upvote',
                issue: reportId,
                issueTitle: report.title,
                user: userId,
                userName: req.user.name,
                content: `${req.user.name} upvoted this report`
            }).catch(err => console.error('Activity creation error:', err));
        }

        // Update using native driver
        await collection.updateOne(
            { _id: objectId },
            updateOp
        );

        // Get updated document to return counts
        const updatedReport = await collection.findOne({ _id: objectId });

        res.json({
            success: true,
            upvoteCount: updatedReport?.upvotes?.length || 0,
            downvoteCount: updatedReport?.downvotes?.length || 0,
            hasUpvoted: !hasUpvoted,
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
        const userId = req.user._id;
        
        console.log('Downvote attempt:', { reportId, userId: userId.toString() });

        // Get native MongoDB collection - explicitly use 'reports'
        const db = mongoose.connection.db;
        const collection = db.collection('reports');
        
        // Convert to ObjectId
        const objectId = new mongoose.Types.ObjectId(reportId);
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Find the report using native driver
        const report = await collection.findOne({ _id: objectId });
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        // Check current vote status
        const userIdStr = userId.toString();
        const hasDownvoted = report.downvotes?.some(v => v.user?.toString() === userIdStr) || false;
        const hasUpvoted = report.upvotes?.some(v => v.user?.toString() === userIdStr) || false;

        // Build update operation
        let updateOp = {};
        
        if (hasDownvoted) {
            // Remove downvote
            updateOp = {
                $pull: { downvotes: { user: userObjectId } }
            };
        } else {
            // Add downvote
            updateOp = {
                $push: { downvotes: { user: userObjectId, createdAt: new Date() } }
            };
            
            // Remove from upvotes if exists
            if (hasUpvoted) {
                updateOp.$pull = { upvotes: { user: userObjectId } };
            }

            // Create activity (fire and forget)
            Activity.create({
                type: 'downvote',
                issue: reportId,
                issueTitle: report.title,
                user: userId,
                userName: req.user.name,
                content: `${req.user.name} downvoted this report`
            }).catch(err => console.error('Activity creation error:', err));
        }

        // Update using native driver
        await collection.updateOne(
            { _id: objectId },
            updateOp
        );

        // Get updated document to return counts
        const updatedReport = await collection.findOne({ _id: objectId });

        res.json({
            success: true,
            upvoteCount: updatedReport?.upvotes?.length || 0,
            downvoteCount: updatedReport?.downvotes?.length || 0,
            hasUpvoted: false,
            hasDownvoted: !hasDownvoted
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
const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const reportId = req.params.id;
        const userId = req.user._id;
        
        if (!text || text.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Comment text is required' });
        }

        console.log('Add comment attempt:', { reportId, userId: userId.toString() });

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
            userName: req.user.name,
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
            userName: req.user.name,
            content: text.trim().substring(0, 100)
        }).catch(err => console.error('Activity creation error:', err));

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            comment: {
                ...comment,
                _id: comment._id.toString(),
                user: comment.user.toString()
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
        const userId = req.user._id;
        
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
        const userId = req.user._id;

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