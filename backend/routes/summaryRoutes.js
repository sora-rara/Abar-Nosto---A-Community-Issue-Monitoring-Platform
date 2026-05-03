const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getIssueSummary } = require('../controllers/summaryController');

router.get('/issues/:id/summary', protect, admin, getIssueSummary);

module.exports = router;