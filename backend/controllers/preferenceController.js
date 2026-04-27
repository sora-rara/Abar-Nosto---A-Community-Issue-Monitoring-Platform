const NotificationPreference = require('../models/NotificationPreference');

exports.getPreferences = async (req, res) => {
    let prefs = await NotificationPreference.findOne({ user: req.user.id });
    if (!prefs) prefs = { user: req.user.id, enableAll: true };
    res.json({ success: true, data: prefs });
};

exports.updatePreferences = async (req, res) => {
    try {
        const { enableAll, onFollowedUpdate, onNearbyIssue, onStatusChange, onNewComment, nearbyRadius, savedLocation } = req.body;
        let prefs = await NotificationPreference.findOne({ user: req.user.id });
        if (!prefs) prefs = new NotificationPreference({ user: req.user.id });

        Object.assign(prefs, { enableAll, onFollowedUpdate, onNearbyIssue, onStatusChange, onNewComment, nearbyRadius, savedLocation });
        await prefs.save();
        res.json({ success: true, data: prefs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};