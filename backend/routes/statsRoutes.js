const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getWardStats,
    getComparativeStats,
    getWardDetails,
    exportWardStats
} = require('../controllers/statsController');

// All routes require admin authentication
router.use(protect, admin);

router.get('/wards', getWardStats);
router.get('/comparison', getComparativeStats);
router.get('/wards/:wardName/details', getWardDetails);
router.get('/export', exportWardStats);

module.exports = router;