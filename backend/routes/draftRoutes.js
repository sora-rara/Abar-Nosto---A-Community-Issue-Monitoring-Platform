const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveDraftReport, getDraftReport, deleteDraftReport } = require('../controllers/draftController');

router.use(protect);
router.post('/', saveDraftReport);
router.get('/', getDraftReport);
router.delete('/', deleteDraftReport);

module.exports = router;