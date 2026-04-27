const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        const filter = { user: req.user.id };
        if (unreadOnly === 'true') filter.read = false;

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('relatedIssue', 'title category');

        const total = await Notification.countDocuments(filter);
        res.json({ success: true, data: notifications, pagination: { page, limit, total } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { read: true });
    res.json({ success: true });
};

exports.markAllRead = async (req, res) => {
    await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
    res.json({ success: true });
};