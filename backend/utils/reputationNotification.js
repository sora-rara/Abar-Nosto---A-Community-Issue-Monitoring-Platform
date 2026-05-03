const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');

const sendReputationNotification = async (userId, title, message, relatedIssueId = null) => {
    try {
   
        const prefs = await NotificationPreference.findOne({ user: userId });
        if (prefs && prefs.enableAll === false) return; // User disable notifications

        await Notification.create({
            user: userId,
            type: 'reputation_change',
            title,
            message,
            relatedIssue: relatedIssueId,
            createdAt: new Date()
        });
    } catch (error) {
        console.error('Failed to send reputation notification:', error.message);
    }
};

module.exports = { sendReputationNotification };