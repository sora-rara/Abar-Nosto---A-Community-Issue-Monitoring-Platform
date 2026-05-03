const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getServices,
    getAllServicesAdmin,
    createService,
    updateService,
    deleteService
} = require('../controllers/govServiceController');

// Public routes
router.get('/', getServices);

// Admin routes
router.get('/admin/all', protect, admin, getAllServicesAdmin);
router.post('/', protect, admin, createService);
router.put('/:id', protect, admin, updateService);
router.delete('/:id', protect, admin, deleteService);

module.exports = router;