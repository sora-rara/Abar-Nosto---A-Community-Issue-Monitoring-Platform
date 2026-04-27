const Comment = require('../models/Comment');
const Issue = require('../models/Issue');

// Add comment to issue
exports.addComment = async (req, res) => {
    try {
        const { content, attachments } = req.body;
        
        const comment = new Comment({
            content,
            issue: req.params.issueId,
            author: req.user.id,
            attachments
        });

        await comment.save();

        const populatedComment = await comment.populate('author', 'name');

        // Emit socket event
        const io = req.app.get('io');
        io.emit('newComment', {
            issueId: req.params.issueId,
            comment: populatedComment
        });

        res.status(201).json({
            success: true,
            data: populatedComment
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Get comments for an issue
exports.getIssueComments = async (req, res) => {
    try {
        const comments = await Comment.find({ issue: req.params.issueId })
            .populate('author', 'name')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: comments
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};