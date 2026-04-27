const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { followIssue, unfollowIssue, getFollowedIssues } = require('../controllers/followController');

router.use(protect);
router.post('/:issueId/follow', followIssue);
router.delete('/:issueId/unfollow', unfollowIssue);
router.get('/my-follows', getFollowedIssues);

module.exports = router;