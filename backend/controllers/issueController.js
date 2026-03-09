const Issue = require('../models/Issue');

// @desc    Get all issues (To display on the Dhaka map)
// @route   GET /api/issues
// @access  Public
const getIssues = async (req, res) => {
    try {
        // We fetch all issues and "populate" the user field so we can see the name of whoever posted it
        const issues = await Issue.find().populate('user', 'name');
        res.status(200).json(issues);
    } catch (error) {
        console.error("Error fetching issues:", error);
        res.status(500).json({ message: 'Server error while fetching issues' });
    }
};

// @desc    Create a new issue report
// @route   POST /api/issues
// @access  Private (Requires Login)
const createIssue = async (req, res) => {
    try {
        // Because of FormData, our location data comes in as flat strings now
        const { type, description, lat, lng, address } = req.body;

        if (!type || !description || !lat || !lng || !address) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Check if multer successfully caught an uploaded file
        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

        const newIssue = await Issue.create({
            user: req.user._id,
            type,
            description,
            location: { lat, lng, address }, // Re-pack it into an object for MongoDB
            image: imagePath // Save the file path!
        });

        res.status(201).json(newIssue);
    } catch (error) {
        console.error("Error creating issue:", error);
        res.status(500).json({ message: 'Server error while saving issue' });
    }
};

module.exports = { getIssues, createIssue };