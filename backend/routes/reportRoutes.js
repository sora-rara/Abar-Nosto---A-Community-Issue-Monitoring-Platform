const express = require('express');
const router = express.Router();
const imagekit = require('../config/imagekit');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { verifyCaptcha } = require('../middleware/captchaMiddleware');
const {
    createReport,
    getNearbyReports,
    checkDuplicate,
    getMyReports,
    getReportById,
    upvoteReport
} = require('../controllers/reportController');

// All routes are protected (require authentication)
router.use(protect);

// @route   POST /api/reports
// @desc    Create a new report with photos and CAPTCHA verification
// @access  Private
router.post('/',
    upload.array('photos', 5),  // Handle photo uploads first (max 5)
    verifyCaptcha,              // Then verify CAPTCHA
    createReport                // Finally create the report
);

// @route   GET /api/reports/nearby
// @desc    Get nearby reports
// @access  Private
router.get('/nearby', getNearbyReports);

// @route   POST /api/reports/check-duplicate
// @desc    Check for duplicate reports at a location
// @access  Private
router.post('/check-duplicate', checkDuplicate);

// @route   GET /api/reports/my-reports
// @desc    Get current user's reports
// @access  Private
router.get('/my-reports', getMyReports);

// @route   GET /api/reports/:id
// @desc    Get single report by ID
// @access  Private
router.get('/:id', getReportById);

// @route   PUT /api/reports/:id/upvote
// @desc    Upvote/unupvote a report
// @access  Private
router.put('/:id/upvote', upvoteReport);

module.exports = router;