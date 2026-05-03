const express = require('express');
const router = express.Router();
const {
    toggleUpvote,
    toggleDownvote,
    getUpvoters,
    addComment,
    editComment,
    deleteComment,
    getActivityFeed,
    getIssueActivities,
    getIssues,
    getIssue,
    requestReopen,
    getIssueStats,
    requestUpdate           // <-- Added from second file
} = require('../controllers/issueController');
const { protect } = require('../middleware/authMiddleware');

// PUBLIC ROUTES - No authentication required
router.get('/activities/feed', getActivityFeed);
router.get('/stats', protect, getIssueStats);
router.get('/', getIssues);
router.get('/:id', getIssue);

// PROTECTED ROUTES - Authentication required
router.post('/:id/upvote', protect, toggleUpvote);
router.post('/:id/downvote', protect, toggleDownvote);
router.get('/:id/upvotes', protect, getUpvoters);
router.get('/:id/activities', protect, getIssueActivities);

// COMMENT ROUTES
router.post('/:id/comments', protect, addComment);
router.put('/:id/comments/:commentId', protect, editComment);
router.delete('/:id/comments/:commentId', protect, deleteComment);

router.post('/:id/request-reopen', protect, requestReopen);

// ---- Added from second file ----
// UPDATE ROUTES
router.post('/:id/request-update', protect, requestUpdate);
// -------------------------------

module.exports = router;