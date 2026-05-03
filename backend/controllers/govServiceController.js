const GovService = require('../models/GovService');

exports.getServices = async (req, res) => {
    try {
        const services = await GovService.find({ isActive: true }).sort('order');
        res.json({ success: true, data: services });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllServicesAdmin = async (req, res) => {
    try {
        const services = await GovService.find().sort('order');
        res.json({ success: true, data: services });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createService = async (req, res) => {
    try {
        const service = new GovService({ ...req.body, createdBy: req.user.id });
        await service.save();
        res.status(201).json({ success: true, data: service });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateService = async (req, res) => {
    try {
        const service = await GovService.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        res.json({ success: true, data: service });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteService = async (req, res) => {
    try {
        await GovService.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};