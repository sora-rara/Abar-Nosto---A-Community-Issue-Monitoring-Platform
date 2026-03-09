const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getIssues, createIssue } = require('../controllers/issueController');
const { protect } = require('../middleware/authMiddleware'); 

// --- MULTER STORAGE SETUP ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Save files to our new folder
    },
    filename: function (req, file, cb) {
        // Give the file a unique name based on the exact millisecond it was uploaded
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.get('/', getIssues);

// Add upload.single('image') to intercept the picture before it hits the controller
router.post('/', protect, upload.single('image'), createIssue);

module.exports = router;