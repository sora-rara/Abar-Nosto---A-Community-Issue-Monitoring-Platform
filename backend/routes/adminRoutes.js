const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Lazy-load controllers to catch import errors clearly
let adminController, adminActivityController;
try {
    adminController = require('../controllers/adminController');
    console.log('✅ adminController loaded');
} catch (e) {
    console.error('❌ adminController load failed:', e.message);
    process.exit(1);
}
try {
    adminActivityController = require('../controllers/adminActivityController');
    console.log('✅ adminActivityController loaded');
} catch (e) {
    console.error('❌ adminActivityController load failed:', e.message);
    process.exit(1);
}

// Verify all required functions exist
const requiredFunctions = ['getAllIssues', 'getIssueDetails', 'updateStatus', 'publishFinalUpdate', 'getStats', 'syncReports'];
for (const fn of requiredFunctions) {
    if (typeof adminController[fn] !== 'function') {
        console.error(`❌ adminController.${fn} is not a function (${typeof adminController[fn]})`);
        process.exit(1);
    }
}
console.log('✅ All adminController functions verified');

// All routes require authentication and admin privileges
router.use(protect, admin);

// Dashboard & Issue Management
router.get('/stats', adminController.getStats);
router.post('/sync', adminController.syncReports);
router.get('/issues', adminController.getAllIssues);
router.get('/issues/:id', adminController.getIssueDetails);
router.put('/issues/:id/status', adminController.updateStatus);
router.post('/issues/:id/final-update', adminController.publishFinalUpdate);

// Admin Activity Feed
router.get('/activities', adminActivityController.getAdminActivityFeed);
router.put('/activities/read', adminActivityController.markAsRead);
router.put('/activities/:id/flag', adminActivityController.toggleFlag);
router.put('/activities/:id/priority', adminActivityController.updatePriority);
router.post('/activities/bulk', adminActivityController.bulkAction);
router.get('/analytics', adminActivityController.getAnalytics);
router.put('/issues/:issueId/comments/:commentId/moderate', adminActivityController.moderateComment);
router.get('/users/:userId/activity', adminActivityController.getUserActivityDetails);

// Reputation Management
router.get('/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const topUsers = await User.find().select('name email reputation').where('reputation').gt(0).sort('-reputation').limit(limit);
        res.json({ success: true, leaderboard: topUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('name email role reputation createdAt').sort('-reputation');
        res.json({ success: true, count: users.length, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/users/:userId/history', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('reputation reputationHistory name');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const history = (user.reputationHistory || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ success: true, user: { name: user.name, currentReputation: user.reputation || 0 }, history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/users/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/users/:userId/reputation', async (req, res) => {
    try {
        const { points, reason } = req.body;
        if (points === undefined || points === null) return res.status(400).json({ success: false, message: 'Points are required' });
        if (!reason || reason.trim().length === 0) return res.status(400).json({ success: false, message: 'Reason is required' });
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        let currentReputation = user.reputation;
        if (typeof currentReputation !== 'number' || isNaN(currentReputation)) currentReputation = 0;
        const pointsInt = parseInt(points);
        const newReputation = currentReputation + pointsInt;
        const updatedUser = await User.findByIdAndUpdate(
            req.params.userId,
            { $set: { reputation: newReputation }, $push: { reputationHistory: { change: pointsInt, reason: reason.trim(), createdAt: new Date() } } },
            { new: true, runValidators: false }
        );
        res.json({ success: true, message: `Reputation updated by ${pointsInt}`, newReputation: updatedUser.reputation, user: { id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, reputation: updatedUser.reputation } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;