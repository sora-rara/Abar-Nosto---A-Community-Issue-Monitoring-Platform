const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getAllIssues,
    getIssueDetails,
    updateStatus,
    publishFinalUpdate,
    getStats,
    syncReports
} = require('../controllers/adminController');
const User = require('../models/User');

// All routes require authentication and admin privileges
router.use(protect, admin);

// ============================================
// EXISTING ROUTES (UNCHANGED)
// ============================================

// Dashboard stats
router.get('/stats', getStats);

// Sync reports to admin issues
router.post('/sync', syncReports);

// Issue management
router.get('/issues', getAllIssues);
router.get('/issues/:id', getIssueDetails);
router.put('/issues/:id/status', updateStatus);
router.post('/issues/:id/final-update', publishFinalUpdate);

// ============================================
// REPUTATION MANAGEMENT ROUTES
// ============================================

// @desc    Get all users with reputation
// @route   GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find()
            .select('name email role reputation createdAt')
            .sort('-reputation');
        
        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get single user with reputation details
// @route   GET /api/admin/users/:userId
router.get('/users/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Adjust user reputation manually
// @route   POST /api/admin/users/:userId/reputation
router.post('/users/:userId/reputation', async (req, res) => {
    try {
        const { points, reason } = req.body;
        
        console.log('Adjust reputation request:', { userId: req.params.userId, points, reason });
        
        if (points === undefined || points === null) {
            return res.status(400).json({
                success: false,
                message: 'Points are required'
            });
        }
        
        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Reason is required'
            });
        }
        
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        console.log('User found:', user.name, 'Current reputation:', user.reputation);
        
        // Initialize reputation if not exists
        let currentReputation = user.reputation;
        if (typeof currentReputation !== 'number' || isNaN(currentReputation)) {
            currentReputation = 0;
        }
        
        const pointsInt = parseInt(points);
        const newReputation = currentReputation + pointsInt;
        
        // Update using findOneAndUpdate to avoid validation issues
        const updatedUser = await User.findByIdAndUpdate(
            req.params.userId,
            {
                $set: { reputation: newReputation },
                $push: {
                    reputationHistory: {
                        change: pointsInt,
                        reason: reason.trim(),
                        createdAt: new Date()
                    }
                }
            },
            { new: true, runValidators: false }
        );
        
        console.log('Reputation updated:', updatedUser.name, 'New reputation:', updatedUser.reputation);
        
        res.json({
            success: true,
            message: `Reputation updated by ${pointsInt}`,
            newReputation: updatedUser.reputation,
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                reputation: updatedUser.reputation
            }
        });
    } catch (error) {
        console.error('Adjust reputation error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get user reputation history
// @route   GET /api/admin/users/:userId/history
router.get('/users/:userId/history', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('reputation reputationHistory name');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Sort history by newest first
        const history = (user.reputationHistory || []).sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        res.json({
            success: true,
            user: {
                name: user.name,
                currentReputation: user.reputation || 0
            },
            history: history
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get leaderboard (top users by reputation)
// @route   GET /api/admin/leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const topUsers = await User.find()
            .select('name email reputation')
            .where('reputation').gt(0)
            .sort('-reputation')
            .limit(limit);
        
        res.json({
            success: true,
            leaderboard: topUsers
        });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;