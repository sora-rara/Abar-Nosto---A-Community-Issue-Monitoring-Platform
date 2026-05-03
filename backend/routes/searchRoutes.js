const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    searchIssues,
    getIssueByPublicId,
    incrementShareCount
} = require('../controllers/searchController');

// Public routes (no auth required for sharing)
router.get('/public/:publicId', getIssueByPublicId);
router.post('/public/:publicId/share', incrementShareCount);

// Protected routes
router.get('/', protect, searchIssues);

module.exports = router;