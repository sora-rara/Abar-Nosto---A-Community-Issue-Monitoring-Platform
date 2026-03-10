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

// All routes require authentication and admin privileges
router.use(protect, admin);

// Dashboard stats
router.get('/stats', getStats);

// Sync reports to admin issues
router.post('/sync', syncReports);

// Issue management
router.get('/issues', getAllIssues);
router.get('/issues/:id', getIssueDetails);
router.put('/issues/:id/status', updateStatus);
router.post('/issues/:id/final-update', publishFinalUpdate);

module.exports = router;