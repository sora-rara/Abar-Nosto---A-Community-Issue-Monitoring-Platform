const User = require('../models/User');
const config = require('../config/reputation');

const updateReputation = async (userId, points, reason, issueId = null) => {
    const user = await User.findById(userId);
    if (!user) return 0;

    user.reputation += points;
    user.reputationHistory.push({
        change: points,
        reason,
        issueId: issueId || undefined,
        createdAt: new Date()
    });
    await user.save();
    return user.reputation;
};

const isAllowedByReputation = (user, action) => {
    if (!user) return true;
    if (user.role === 'admin') return true;
    return true;
};

module.exports = { updateReputation, isAllowedByReputation };