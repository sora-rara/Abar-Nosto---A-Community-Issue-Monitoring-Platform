const Report = require('../models/Report');
const imagekit = require('../config/imagekit');

// @desc    Create a new report
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res) => {
    try {
        const { title, description, category, location } = req.body;

        // Parse location if it's sent as string
        const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;

        // Validate required fields
        if (!title || !description || !category || !parsedLocation) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Upload photos to ImageKit if any
        const uploadedPhotos = [];

        if (req.files && req.files.length > 0) {
            // Check if trying to upload more than 5 photos
            if (req.files.length > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum 5 photos allowed'
                });
            }

            // Upload each photo
            for (const file of req.files) {
                try {
                    // Generate unique filename
                    const fileName = `report-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;

                    // Upload to ImageKit
                    const result = await imagekit.upload({
                        file: file.buffer,
                        fileName: fileName,
                        folder: '/abar-nosto/reports',
                        tags: ['report', category],
                        transformation: {
                            post: [
                                {
                                    type: 'transformation',
                                    value: 'w-800,h-600,fit-maintain'
                                }
                            ]
                        }
                    });

                    // Generate thumbnail URL (300px width)
                    const thumbnailUrl = result.url.replace('/upload/', '/upload/tr:w-300/');

                    uploadedPhotos.push({
                        url: result.url,
                        fileId: result.fileId,
                        thumbnailUrl: thumbnailUrl
                    });
                } catch (uploadError) {
                    console.error('ImageKit upload error:', uploadError);
                    // Continue with other photos even if one fails
                }
            }
        }

        // 🔥 IMPORTANT: Check for nearby duplicate reports (within ~500m radius)
        const lat = parseFloat(parsedLocation.lat);
        const lng = parseFloat(parsedLocation.lng);
        const latDelta = 0.0045; // Approximately 500m in latitude degrees
        const lngDelta = 0.0045; // Approximately 500m in longitude degrees

        const nearbyReports = await Report.find({
            'location.lat': {
                $gte: lat - latDelta,
                $lte: lat + latDelta
            },
            'location.lng': {
                $gte: lng - lngDelta,
                $lte: lng + lngDelta
            },
            category: category, // Same category
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
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

        // Populate user info for response
        await report.populate('user', 'name');

        // 🔥 Return the nearby reports to frontend
        res.status(201).json({
            success: true,
            report,
            duplicates: nearbyReports, // Send similar issues to frontend
            hasDuplicates: nearbyReports.length > 0,
            message: nearbyReports.length > 0
                ? 'Similar issues found nearby'
                : 'Report created successfully'
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

        // Convert radius from meters to approximate degree deltas
        // 1 degree lat ≈ 111 km, so radius/1000 * 0.009
        const radiusInKm = parseFloat(radius) / 1000;
        const latDelta = radiusInKm * 0.009;
        const lngDelta = radiusInKm * 0.009;

        // Build query
        const query = {
            'location.lat': {
                $gte: parseFloat(lat) - latDelta,
                $lte: parseFloat(lat) + latDelta
            },
            'location.lng': {
                $gte: parseFloat(lng) - lngDelta,
                $lte: parseFloat(lng) + lngDelta
            }
        };

        // Add category filter if provided
        if (category) {
            query.category = category;
        }

        const reports = await Report.find(query)
            .populate('user', 'name')
            .select('title description location category status upvoteCount createdAt')
            .sort('-createdAt')
            .limit(20);

        res.json({
            success: true,
            count: reports.length,
            reports
        });

    } catch (error) {
        console.error('Get nearby reports error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Check for duplicate reports
// @route   POST /api/reports/check-duplicate
// @access  Private
exports.checkDuplicate = async (req, res) => {
    try {
        const { lat, lng, category } = req.body;

        if (!lat || !lng || !category) {
            return res.status(400).json({
                success: false,
                message: 'Please provide location and category'
            });
        }

        const latDelta = 0.0045; // ~500m
        const lngDelta = 0.0045;

        const nearbyReports = await Report.find({
            'location.lat': {
                $gte: parseFloat(lat) - latDelta,
                $lte: parseFloat(lat) + latDelta
            },
            'location.lng': {
                $gte: parseFloat(lng) - lngDelta,
                $lte: parseFloat(lng) + lngDelta
            },
            category: category,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        })
            .populate('user', 'name')
            .select('title description location createdAt upvoteCount status')
            .limit(10);

        res.json({
            success: true,
            count: nearbyReports.length,
            duplicates: nearbyReports,
            hasDuplicates: nearbyReports.length > 0
        });

    } catch (error) {
        console.error('Check duplicate error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};


// @desc    Get user's reports
// @route   GET /api/reports/my-reports
// @access  Private
exports.getMyReports = async (req, res) => {
    try {
        const reports = await Report.find({ user: req.user.id })
            .sort('-createdAt')
            .select('-__v');

        res.json({
            success: true,
            count: reports.length,
            reports
        });

    } catch (error) {
        console.error('Get my reports error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Get single report by ID
// @route   GET /api/reports/:id
// @access  Private
exports.getReportById = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id)
            .populate('user', 'name')
            .select('-__v');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Add virtual field for upvote status
        const reportObj = report.toObject();
        reportObj.hasUpvoted = report.upvotes.includes(req.user.id);

        res.json({
            success: true,
            report: reportObj
        });

    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Upvote a report
// @route   PUT /api/reports/:id/upvote
// @access  Private
exports.upvoteReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Check if user already upvoted
        const hasUpvoted = report.upvotes.includes(req.user.id);

        if (hasUpvoted) {
            // Remove upvote
            report.upvotes = report.upvotes.filter(
                id => id.toString() !== req.user.id
            );
        } else {
            // Add upvote
            report.upvotes.push(req.user.id);
        }

        // Update upvote count
        report.upvoteCount = report.upvotes.length;
        await report.save();

        res.json({
            success: true,
            upvoteCount: report.upvoteCount,
            hasUpvoted: !hasUpvoted
        });

    } catch (error) {
        console.error('Upvote error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};