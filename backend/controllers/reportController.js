const Report = require('../models/Report');
const imagekit = require('../config/imagekit');
const { findNearbyUsers, notifyUser, getDistanceFromLatLonInMeters } = require('../services/notificationService');
const User = require('../models/User');
const Activity = require('../models/Activity');
const AdminIssue = require('../models/AdminIssue');
const mongoose = require('mongoose');

// Helper function to sync report to admin collection
const syncToAdminCollection = async (reportId) => {
    try {
        const report = await Report.findById(reportId)
            .populate('user', 'name email');

        if (!report) return;

        await AdminIssue.findOneAndUpdate(
            { originalReportId: reportId },
            {
                title: report.title,
                description: report.description,
                category: report.category,
                location: {
                    address: report.location?.address || 'Unknown',
                    lat: report.location?.lat || 0,
                    lng: report.location?.lng || 0
                },
                photos: report.photos || [],
                reportedBy: report.user?._id || report.user,
                reporterName: report.user?.name || 'Unknown',
                reporterEmail: report.user?.email || '',
                upvoteCount: report.upvoteCount || 0,
                downvoteCount: report.downvoteCount || 0,
                commentCount: report.commentCount || 0,
                viewCount: report.viewCount || 0,
                status: report.status || 'reported',
                lastActivityAt: report.lastActivityAt || new Date(),
                updatedAt: new Date()
            },
            { upsert: true }
        );
        console.log(`✅ Synced report ${reportId} to admin collection`);
    } catch (error) {
        console.error(`Error syncing report ${reportId} to admin:`, error);
    }
};

// @desc    Create a new report
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res) => {
    try {
        const { title, description, category, location } = req.body;
        const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;

        if (!title || !description || !category || !parsedLocation) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Upload photos to ImageKit
        const uploadedPhotos = [];
        if (req.files && req.files.length > 0) {
            if (req.files.length > 5) {
                return res.status(400).json({ success: false, message: 'Maximum 5 photos allowed' });
            }
            for (const file of req.files) {
                try {
                    const fileName = `report-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
                    const result = await imagekit.files.upload({
                        file: file.buffer.toString('base64'),   // convert buffer to base64 string
                        fileName: fileName,
                        folder: '/abar-nosto/reports',
                        tags: ['report', category],
                        transformation: {
                            post: [{ type: 'transformation', value: 'w-800,h-600,fit-maintain' }]
                        }
                    });
                    const thumbnailUrl = result.url.replace('/upload/', '/upload/tr:w-300/');
                    uploadedPhotos.push({
                        url: result.url,
                        fileId: result.fileId,
                        thumbnailUrl: thumbnailUrl
                    });
                } catch (uploadError) {
                    console.error('ImageKit upload error:', uploadError);
                }
            }
        }

        // Check for nearby duplicate reports
        const lat = parseFloat(parsedLocation.lat);
        const lng = parseFloat(parsedLocation.lng);
        const latDelta = 0.0045;
        const lngDelta = 0.0045;

        const duplicateReports = await Report.find({
            'location.lat': { $gte: lat - latDelta, $lte: lat + latDelta },
            'location.lng': { $gte: lng - lngDelta, $lte: lng + lngDelta },
            category: category,
            status: { $in: ['reported', 'in_progress'] },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        })
            .populate('user', 'name')
            .select('title description location createdAt upvoteCount status')
            .limit(10);

        // Create the report
        const report = await Report.create({
            user: req.user.id,
            title: title.trim(),
            description: description.trim(),
            category,
            location: {
                lat: parsedLocation.lat,
                lng: parsedLocation.lng,
                address: parsedLocation.address || 'Location captured'
            },
            photos: uploadedPhotos
        });
        report.statusHistory = [{
            status: 'reported',
            at: new Date(),
            updatedBy: report.user,
            updatedByName: req.user.name,
            comment: 'Issue reported'
        }];
        await report.save();
        await report.populate('user', 'name');

        // ========== ACTIVITY CREATION ==========
        try {
            console.log('Creating activity for new issue...');
            await Activity.create({
                type: 'new_issue',
                issue: report._id,
                issueTitle: report.title,
                issueCategory: report.category,
                user: req.user.id,
                userName: req.user.name,
                content: `New issue reported: ${report.title}`,
                importance: 'high',
                createdAt: new Date()
            });
            console.log(`✅ Activity created for new issue: ${report.title}`);
            // Also create in AdminActivity for admin feed
            const AdminActivity = require('../models/AdminActivity');
            await AdminActivity.create({
                type: 'new_issue',
                issue: report._id,
                issueTitle: report.title,
                issueCategory: report.category,
                user: req.user.id,
                userName: req.user.name,
                content: `New issue reported: ${report.title}`,
                priority: 'high',
                metadata: {},
                createdAt: new Date()
            });
            console.log(`✅ AdminActivity created for new issue: ${report.title}`);


        } catch (activityError) {
            console.error('Activity creation failed:', activityError.message);
        }

        // ========== REPUTATION AWARD FOR CREATING REPORT (+10) ==========
        try {
            console.log('Awarding reputation for report creation...');
            const userId = new mongoose.Types.ObjectId(req.user.id);
            const reportId = new mongoose.Types.ObjectId(report._id);

            const result = await User.updateOne(
                { _id: userId },
                {
                    $inc: { reputation: 10 },
                    $push: {
                        reputationHistory: {
                            change: 10,
                            reason: `Reported a new issue: ${report.title}`,
                            issueId: reportId,
                            createdAt: new Date()
                        }
                    }
                }
            );

            if (result.modifiedCount === 0) {
                console.error(`❌ Reputation NOT updated for user ${req.user.id} – user not found`);
            } else {
                const updatedUser = await User.findById(userId).select('reputation name');
                if (updatedUser) {
                    console.log(`✅ +10 reputation to ${updatedUser.name} (Total: ${updatedUser.reputation})`);
                }
            }
        } catch (repError) {
            console.error('Reputation award failed:', repError.message);
        }

        // ========== ADMIN SYNC ==========
        try {
            const existingAdminIssue = await AdminIssue.findOne({ originalReportId: report._id });
            if (!existingAdminIssue) {
                const adminIssueData = {
                    originalReportId: report._id,
                    title: report.title,
                    description: report.description,
                    category: report.category,
                    location: {
                        address: report.location.address || 'Unknown',
                        lat: report.location.lat || 0,
                        lng: report.location.lng || 0
                    },
                    photos: report.photos || [],
                    reportedBy: report.user,
                    reporterName: req.user.name || 'Unknown',
                    reporterEmail: req.user.email || '',
                    upvoteCount: 0,
                    downvoteCount: 0,
                    commentCount: 0,
                    viewCount: 0,
                    status: 'reported',
                    resolutionTimeline: { reportedAt: new Date() },
                    lastActivityAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await AdminIssue.create(adminIssueData);
                console.log(`✅ Auto-synced new report ${report._id} to admin collection`);
            }
        } catch (adminSyncError) {
            console.error('Error syncing to admin collection:', adminSyncError);
        }

        // ========== NEARBY USER NOTIFICATIONS ==========
        let nearbyUsers = await findNearbyUsers(parsedLocation.lat, parsedLocation.lng, 5000);
        nearbyUsers = nearbyUsers.filter(u => u.userId.toString() !== req.user.id);
        console.log(`📍 Found ${nearbyUsers.length} nearby users (excluding reporter) for location (${parsedLocation.lat}, ${parsedLocation.lng})`);

        if (nearbyUsers.length === 0) {
            console.log('ℹ️ No nearby users with saved location and matching radius');
        } else {
            console.log(`📢 Will notify ${nearbyUsers.length} users`);
            await Promise.allSettled(
                nearbyUsers.map(async ({ userId, preference }) => {
                    const distance = getDistanceFromLatLonInMeters(
                        parsedLocation.lat, parsedLocation.lng,
                        preference.savedLocation.coordinates[1],
                        preference.savedLocation.coordinates[0]
                    );
                    console.log(`📡 Notifying user ${userId} at distance ${Math.round(distance)}m`);
                    return notifyUser(userId, {
                        type: 'nearby_issue',
                        title: `New issue near you: ${title}`,
                        message: `${category} reported ${Math.round(distance)}m away`,
                        relatedIssue: report._id,
                        metadata: { distance }
                    });
                })
            );
        }

        // Response
        res.status(201).json({
            success: true,
            report,
            duplicates: duplicateReports,
            hasDuplicates: duplicateReports.length > 0,
            message: duplicateReports.length > 0 ? 'Similar issues found nearby' : 'Report created successfully'
        });

    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error while creating report'
        });
    }
};

// @desc    Get nearby reports
// @route   GET /api/reports/nearby
// @access  Private
exports.getNearbyReports = async (req, res) => {
    try {
        const { lat, lng, radius = 500, category } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Please provide latitude and longitude'
            });
        }

        const radiusInKm = parseFloat(radius) / 1000;
        const latDelta = radiusInKm * 0.009;
        const lngDelta = radiusInKm * 0.009;

        const query = {
            'location.lat': { $gte: parseFloat(lat) - latDelta, $lte: parseFloat(lat) + latDelta },
            'location.lng': { $gte: parseFloat(lng) - lngDelta, $lte: parseFloat(lng) + lngDelta }
        };
        if (category) query.category = category;

        const reports = await Report.find(query)
            .populate('user', 'name')
            .select('title description location category status upvoteCount createdAt')
            .sort('-createdAt')
            .limit(20);

        res.json({ success: true, count: reports.length, reports });
    } catch (error) {
        console.error('Get nearby reports error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};

// @desc    Check for duplicate reports
// @route   POST /api/reports/check-duplicate
// @access  Private
exports.checkDuplicate = async (req, res) => {
    try {
        const { lat, lng, category } = req.body;
        if (!lat || !lng || !category) {
            return res.status(400).json({ success: false, message: 'Please provide location and category' });
        }

        const latDelta = 0.0045;
        const lngDelta = 0.0045;

        const nearbyReports = await Report.find({
            'location.lat': { $gte: parseFloat(lat) - latDelta, $lte: parseFloat(lat) + latDelta },
            'location.lng': { $gte: parseFloat(lng) - lngDelta, $lte: parseFloat(lng) + lngDelta },
            category: category,
            status: { $in: ['reported', 'in_progress'] },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        })
            .populate('user', 'name')
            .select('title description location createdAt upvoteCount status')
            .limit(10);

        res.json({ success: true, count: nearbyReports.length, duplicates: nearbyReports, hasDuplicates: nearbyReports.length > 0 });
    } catch (error) {
        console.error('Check duplicate error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};

// @desc    Get user's reports
// @route   GET /api/reports/my-reports
// @access  Private
exports.getMyReports = async (req, res) => {
    try {
        const reports = await Report.find({ user: req.user.id }).sort('-createdAt').select('-__v');
        res.json({ success: true, count: reports.length, reports });
    } catch (error) {
        console.error('Get my reports error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};

// @desc    Get single report by ID
// @route   GET /api/reports/:id
// @access  Private
exports.getReportById = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id).populate('user', 'name').select('-__v');
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }
        const reportObj = report.toObject();
        reportObj.hasUpvoted = report.upvotes.includes(req.user.id);
        res.json({ success: true, report: reportObj });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};

// @desc    Upvote a report
// @route   PUT /api/reports/:id/upvote
// @access  Private
exports.upvoteReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        const hasUpvoted = report.upvotes.includes(req.user.id);

        if (hasUpvoted) {
            // Remove upvote
            report.upvotes = report.upvotes.filter(id => id.toString() !== req.user.id);
            console.log('Upvote removed');

            await Activity.create({
                type: 'upvote_removed',
                issue: report._id,
                issueTitle: report.title,
                issueCategory: report.category,
                user: req.user.id,
                userName: req.user.name,
                content: `${req.user.name} removed their upvote`,
                importance: 'low'
            });
        } else {
            // Add upvote
            report.upvotes.push(req.user.id);
            console.log('Upvote added');

            await Activity.create({
                type: 'upvote',
                issue: report._id,
                issueTitle: report.title,
                issueCategory: report.category,
                user: req.user.id,
                userName: req.user.name,
                content: `${req.user.name} upvoted this issue`,
                importance: 'normal'
            });

            // Award reputation to report owner (+1) - Excluding self-upvotes
            if (report.user.toString() !== req.user.id) {
                try {
                    console.log(`Awarding reputation to report owner: ${report.user}`);
                    const ownerId = new mongoose.Types.ObjectId(report.user);
                    const reportId = new mongoose.Types.ObjectId(report._id);

                    const result = await User.updateOne(
                        { _id: ownerId },
                        {
                            $inc: { reputation: 1 },
                            $push: {
                                reputationHistory: {
                                    change: 1,
                                    reason: `Received an upvote on report: ${report.title}`,
                                    issueId: reportId,
                                    createdAt: new Date()
                                }
                            }
                        }
                    );

                    if (result.modifiedCount === 0) {
                        console.error(`❌ Reputation NOT updated for owner ${report.user} – user not found`);
                    } else {
                        const updatedOwner = await User.findById(ownerId).select('reputation name');
                        if (updatedOwner) {
                            console.log(`✅ +1 reputation to ${updatedOwner.name} (Total: ${updatedOwner.reputation})`);
                        }
                    }
                } catch (repError) {
                    console.error('Reputation award failed:', repError.message);
                }
            } else {
                console.log('Self-upvote - no reputation awarded');
            }
        }

        report.upvoteCount = report.upvotes.length;
        await report.save();

        // Sync to admin collection
        await syncToAdminCollection(report._id);
        try {
            await AdminIssue.findOneAndUpdate(
                { originalReportId: report._id },
                {
                    upvoteCount: report.upvoteCount,
                    downvoteCount: report.downvoteCount,
                    commentCount: report.commentCount,
                    lastActivityAt: new Date()
                }
            );
            console.log(`✅ Updated admin collection for report ${report._id}`);
        } catch (adminUpdateError) {
            console.error('Error updating admin collection:', adminUpdateError);
        }

        res.json({
            success: true,
            upvoteCount: report.upvoteCount,
            hasUpvoted: !hasUpvoted
        });

    } catch (error) {
        console.error('Upvote error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};