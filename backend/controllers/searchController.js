const Report = require('../models/Report');

// @desc    Search and filter issues with advanced options
// @route   GET /api/search
// @access  Private
exports.searchIssues = async (req, res) => {
    try {
        const {
            query,
            category,
            status,
            area,
            ward,
            road,
            lat,
            lng,
            radius = 5000,
            sortBy = 'relevance',
            page = 1,
            limit = 20,
            dateFrom,
            dateTo,
            minUpvotes,
            hasPhotos
        } = req.query;

        console.log('Search params:', { query, category, status, area, ward, road, lat, lng });

        const searchQuery = {};

        // Text search on title and description
        if (query && query.trim()) {
            searchQuery.$or = [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ];
        }

        // Category filter
        if (category && category !== 'all') {
            searchQuery.category = category;
        }

        // Status filter
        if (status && status !== 'all') {
            searchQuery.status = status;
        }

        // Date range filter
        if (dateFrom || dateTo) {
            searchQuery.createdAt = {};
            if (dateFrom) searchQuery.createdAt.$gte = new Date(dateFrom);
            if (dateTo) searchQuery.createdAt.$lte = new Date(dateTo);
        }

        // Minimum upvotes filter
        if (minUpvotes) {
            searchQuery.upvoteCount = { $gte: parseInt(minUpvotes) };
        }

        // Has photos filter
        if (hasPhotos === 'true') {
            searchQuery['photos.0'] = { $exists: true };
        }

        // Location-based search (area, ward, road) - Improved to search in address field
        if (area || ward || road) {
            const addressConditions = [];
            if (area && area.trim()) {
                addressConditions.push({ 
                    'location.address': { $regex: area.trim(), $options: 'i' } 
                });
            }
            if (ward && ward.trim()) {
                addressConditions.push({ 
                    'location.address': { $regex: ward.trim(), $options: 'i' } 
                });
            }
            if (road && road.trim()) {
                addressConditions.push({ 
                    'location.address': { $regex: road.trim(), $options: 'i' } 
                });
            }
            
            if (addressConditions.length > 0) {
                if (searchQuery.$or) {
                    searchQuery.$or.push(...addressConditions);
                } else {
                    searchQuery.$or = addressConditions;
                }
            }
        }

        // Geo-spatial search (nearby)
        let geoSearchQuery = searchQuery;
        if (lat && lng) {
            const latNum = parseFloat(lat);
            const lngNum = parseFloat(lng);
            const radiusInKm = parseInt(radius) / 1000;
            const latDelta = radiusInKm * 0.009;
            const lngDelta = radiusInKm * 0.009;

            geoSearchQuery = {
                ...searchQuery,
                'location.lat': { $gte: latNum - latDelta, $lte: latNum + latDelta },
                'location.lng': { $gte: lngNum - lngDelta, $lte: lngNum + lngDelta }
            };
        }

        // Sorting
        let sortOption = {};
        switch (sortBy) {
            case 'newest':
                sortOption = { createdAt: -1 };
                break;
            case 'oldest':
                sortOption = { createdAt: 1 };
                break;
            case 'most_upvoted':
                sortOption = { upvoteCount: -1 };
                break;
            case 'most_commented':
                sortOption = { commentCount: -1 };
                break;
            case 'distance':
                // Distance sorting is handled in frontend
                sortOption = { createdAt: -1 };
                break;
            case 'relevance':
            default:
                sortOption = { lastActivityAt: -1, upvoteCount: -1 };
                break;
        }

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        console.log('Final search query:', JSON.stringify(geoSearchQuery, null, 2));

        // Execute search
        const reports = await Report.find(geoSearchQuery)
            .sort(sortOption)
            .skip(skip)
            .limit(limitNum)
            .populate('user', 'name')
            .select('-__v');

        const total = await Report.countDocuments(geoSearchQuery);

        console.log(`Search found ${reports.length} results out of ${total} total`);

        // Calculate distance if location provided
        let reportsWithDistance = reports.map(report => report.toObject());
        if (lat && lng) {
            const latNum = parseFloat(lat);
            const lngNum = parseFloat(lng);
            reportsWithDistance = reports.map(report => {
                const reportObj = report.toObject();
                const distance = calculateDistance(
                    latNum, lngNum,
                    report.location.lat, report.location.lng
                );
                reportObj.distance = distance;
                return reportObj;
            });
            
            // Sort by distance if requested
            if (sortBy === 'distance') {
                reportsWithDistance.sort((a, b) => a.distance - b.distance);
            }
        }

        res.json({
            success: true,
            data: reportsWithDistance,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            },
            filters: {
                query: query || null,
                category: category || null,
                status: status || null,
                location: (lat && lng) ? { lat, lng, radius } : null
            }
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get issue by public ID for sharing
// @route   GET /api/search/public/:publicId
// @access  Public
exports.getIssueByPublicId = async (req, res) => {
    try {
        const { publicId } = req.params;
        
        const report = await Report.findById(publicId)
            .populate('user', 'name')
            .select('-__v');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Increment view count
        report.viewCount = (report.viewCount || 0) + 1;
        await report.save();

        res.json({
            success: true,
            report
        });

    } catch (error) {
        console.error('Get public issue error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Increment share count
// @route   POST /api/search/public/:publicId/share
// @access  Public
exports.incrementShareCount = async (req, res) => {
    try {
        const { publicId } = req.params;
        
        const report = await Report.findById(publicId);
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        report.shareCount = (report.shareCount || 0) + 1;
        await report.save();

        res.json({
            success: true,
            shareCount: report.shareCount
        });

    } catch (error) {
        console.error('Increment share error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Helper function to calculate distance between two points (in meters)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}