const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getAuthorities, createAuthority, updateAuthority, deleteAuthority } = require('../controllers/authorityController');

router.get('/', getAuthorities);
router.post('/', protect, admin, createAuthority);
router.put('/:id', protect, admin, updateAuthority);
router.delete('/:id', protect, admin, deleteAuthority);

module.exports = router;