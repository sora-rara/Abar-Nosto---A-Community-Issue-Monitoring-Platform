const ApplicationDraft = require('../models/ApplicationDraft');

exports.saveApplicationDraft = async (req, res) => {
    try {
        const { authorityId, subject, message, contactName, contactEmail, contactPhone } = req.body;
        const draft = await ApplicationDraft.findOneAndUpdate(
            { user: req.user.id, authorityId, status: 'draft' },
            { subject, message, contactName, contactEmail, contactPhone, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        res.json({ success: true, data: draft });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getApplicationDraft = async (req, res) => {
    try {
        const { authorityId } = req.query;
        const draft = await ApplicationDraft.findOne({ user: req.user.id, authorityId, status: 'draft' });
        res.json({ success: true, data: draft });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteApplicationDraft = async (req, res) => {
    try {
        await ApplicationDraft.findOneAndDelete({ user: req.user.id, authorityId: req.params.authorityId, status: 'draft' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.submitApplication = async (req, res) => {
    try {
        // For now just delete draft and return success; real email notification could be added later
        const { authorityId } = req.params;
        await ApplicationDraft.findOneAndDelete({ user: req.user.id, authorityId, status: 'draft' });
        res.json({ success: true, message: 'Application submitted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};