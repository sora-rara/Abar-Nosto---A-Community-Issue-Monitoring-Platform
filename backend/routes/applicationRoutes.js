const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveApplicationDraft, getApplicationDraft, deleteApplicationDraft, submitApplication } = require('../controllers/applicationController');

router.use(protect);
router.post('/draft', saveApplicationDraft);
router.get('/draft', getApplicationDraft);
router.delete('/draft/:authorityId', deleteApplicationDraft);
router.post('/:authorityId/submit', submitApplication);

module.exports = router;