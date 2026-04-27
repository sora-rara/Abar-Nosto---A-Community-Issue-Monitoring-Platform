const Follow = require('../models/Follow');
const Report = require('../models/Report');
const { notifyAuthor } = require('../services/notificationService');

exports.followIssue = async (req, res) => {
    try {
        const issue = await Report.findById(req.params.issueId);
        if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

        const existing = await Follow.findOne({ user: req.user.id, issue: req.params.issueId });
        if (existing) return res.status(400).json({ success: false, message: 'Already following' });

        await Follow.create({ user: req.user.id, issue: req.params.issueId });

        // Notify author
        await notifyAuthor(
            req.params.issueId,
            req.user.id,
            {
                type: 'followed_issue_update',
                title: `Someone is following your issue`,
                message: `${req.user.name} started following "${issue.title}"`,
                relatedIssue: req.params.issueId,
                metadata: { followerId: req.user.id }
            }
        );

        res.json({ success: true, message: 'Now following this issue' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.unfollowIssue = async (req, res) => {
    await Follow.findOneAndDelete({ user: req.user.id, issue: req.params.issueId });
    res.json({ success: true, message: 'Unfollowed' });
};

exports.getFollowedIssues = async (req, res) => {
    const follows = await Follow.find({ user: req.user.id }).populate('issue', 'title category status');
    res.json({ success: true, data: follows });
};