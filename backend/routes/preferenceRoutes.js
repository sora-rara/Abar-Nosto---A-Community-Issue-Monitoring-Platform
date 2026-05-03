const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getPreferences, updatePreferences } = require('../controllers/preferenceController');

router.use(protect);
router.get('/', getPreferences);
router.put('/', updatePreferences);

module.exports = router;