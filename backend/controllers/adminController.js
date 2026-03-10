const AdminIssue = require('../models/AdminIssue');
const Report = require('../models/Report');
const User = require('../models/User');

// @desc    Get all issues for admin dashboard
// @route   GET /api/admin/issues
// @access  Admin
exports.getAllIssues = async (req, res) => {
    try {
        const { status, category, page = 1, limit = 10, sort = '-createdAt' } = req.query;
        
        // Build filter
        const filter = {};
        if (status && status !== 'all') filter.status = status;
        if (category && category !== 'all') filter.category = category;
        
        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Get issues
        const issues = await AdminIssue.find(filter)
            .populate('reportedBy', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));
        
        // Get total count for pagination
        const total = await AdminIssue.countDocuments(filter);
        
        // Get statistics
        const stats = {
            total: await AdminIssue.countDocuments(),
            reported: await AdminIssue.countDocuments({ status: 'reported' }),
            inProgress: await AdminIssue.countDocuments({ status: 'in_progress' }),
            resolved: await AdminIssue.countDocuments({ status: 'resolved' })
        };
        
        res.json({
            success: true,
            data: issues,
            stats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get all issues error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single issue details
// @route   GET /api/admin/issues/:id
// @access  Admin
exports.getIssueDetails = async (req, res) => {
    try {
        const issue = await AdminIssue.findById(req.params.id)
            .populate('reportedBy', 'name email')
            .populate('statusHistory.updatedBy', 'name')
            .populate('finalUpdate.publishedBy', 'name');
        
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }
        
        // Get original report for additional details
        const originalReport = await Report.findById(issue.originalReportId)
            .populate('user', 'name email')
            .populate('comments.user', 'name');
        
        res.json({
            success: true,
            data: {
                issue,
                originalReport
            }
        });
    } catch (error) {
        console.error('Get issue details error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update issue status
// @route   PUT /api/admin/issues/:id/status
// @access  Admin
exports.updateStatus = async (req, res) => {
    try {
        const { status, comment } = req.body;
        
        if (!status || !comment) {
            return res.status(400).json({
                success: false,
                message: 'Please provide status and comment'
            });
        }
        
        const issue = await AdminIssue.findById(req.params.id);
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }
        
        // Add to status history
        issue.statusHistory.push({
            status,
            comment,
            updatedBy: req.user.id,
            updatedByName: req.user.name,
            updatedAt: new Date()
        });
        
        // Update status
        issue.status = status;
        
        // Update resolution timeline
        if (status === 'in_progress' && !issue.resolutionTimeline?.inProgressAt) {
            issue.resolutionTimeline.inProgressAt = new Date();
        } else if (status === 'resolved' && !issue.resolutionTimeline?.resolvedAt) {
            issue.resolutionTimeline.resolvedAt = new Date();
        }
        
        await issue.save();
        
        // Also update the original report status
        await Report.findByIdAndUpdate(issue.originalReportId, {
            status: status,
            updatedAt: new Date()
        });
        
        res.json({
            success: true,
            message: 'Status updated successfully',
            data: issue
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Publish final update
// @route   POST /api/admin/issues/:id/final-update
// @access  Admin
exports.publishFinalUpdate = async (req, res) => {
    try {
        const { statement } = req.body;
        
        if (!statement) {
            return res.status(400).json({
                success: false,
                message: 'Please provide final statement'
            });
        }
        
        const issue = await AdminIssue.findById(req.params.id);
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }
        
        // Ensure issue is resolved
        if (issue.status !== 'resolved') {
            return res.status(400).json({
                success: false,
                message: 'Issue must be resolved before publishing final update'
            });
        }
        
        // Add final update
        issue.finalUpdate = {
            statement,
            publishedBy: req.user.id,
            publishedByName: req.user.name,
            publishedAt: new Date()
        };
        
        await issue.save();
        
        res.json({
            success: true,
            message: 'Final update published successfully',
            data: issue.finalUpdate
        });
    } catch (error) {
        console.error('Publish final update error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Admin
exports.getStats = async (req, res) => {
    try {
        const stats = {
            total: await AdminIssue.countDocuments(),
            reported: await AdminIssue.countDocuments({ status: 'reported' }),
            inProgress: await AdminIssue.countDocuments({ status: 'in_progress' }),
            resolved: await AdminIssue.countDocuments({ status: 'resolved' }),
            
            // Category breakdown
            byCategory: {
                pothole: await AdminIssue.countDocuments({ category: 'pothole' }),
                broken_light: await AdminIssue.countDocuments({ category: 'broken_light' }),
                drainage: await AdminIssue.countDocuments({ category: 'drainage' }),
                flooding: await AdminIssue.countDocuments({ category: 'flooding' }),
                garbage: await AdminIssue.countDocuments({ category: 'garbage' }),
                debris: await AdminIssue.countDocuments({ category: 'debris' }),
                hazard: await AdminIssue.countDocuments({ category: 'hazard' }),
                other: await AdminIssue.countDocuments({ category: 'other' })
            },
            
            // User stats
            totalUsers: await User.countDocuments(),
            adminUsers: await User.countDocuments({ role: 'admin' }),
            
            // Recent activity (last 7 days)
            recentActivity: {
                last7Days: await AdminIssue.countDocuments({
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }),
                resolvedLast7Days: await AdminIssue.countDocuments({
                    status: 'resolved',
                    updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                })
            }
        };
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Sync reports to admin issues
// @route   POST /api/admin/sync
// @access  Admin
exports.syncReports = async (req, res) => {
    try {
        console.log('🔄 Starting admin sync...');
        
        // Get all reports with user information
        const reports = await Report.find().populate('user', 'name email');
        
        console.log(`📊 Found ${reports.length} reports to sync`);
        
        let synced = 0;
        let skipped = 0;
        let errors = 0;
        
        for (const report of reports) {
            try {
                // Check if already synced
                const existing = await AdminIssue.findOne({ originalReportId: report._id });
                
                if (!existing) {
                    // Safely handle location object
                    let locationData = {
                        address: 'Unknown location',
                        lat: 0,
                        lng: 0
                    };
                    
                    if (report.location) {
                        locationData = {
                            address: report.location.address || 'Unknown location',
                            lat: report.location.lat || 0,
                            lng: report.location.lng || 0
                        };
                    }
                    
                    // Prepare the data with all required fields
                    const adminIssueData = {
                        originalReportId: report._id,
                        title: report.title || 'Untitled',
                        description: report.description || 'No description provided',
                        category: report.category || 'other',
                        location: locationData,
                        photos: report.photos || [],
                        reportedBy: report.user?._id || report.user || report.reportedBy,
                        reporterName: report.user?.name || report.reporterName || 'Unknown',
                        reporterEmail: report.user?.email || '',
                        upvoteCount: report.upvoteCount || 0,
                        downvoteCount: report.downvoteCount || 0,
                        commentCount: report.commentCount || 0,
                        viewCount: report.viewCount || 0,
                        status: report.status || 'reported',
                        lastActivityAt: report.lastActivityAt || new Date(),
                        resolutionTimeline: {
                            reportedAt: report.createdAt || new Date()
                        }
                    };
                    
                    // Create new admin issue
                    const newIssue = new AdminIssue(adminIssueData);
                    await newIssue.save();
                    
                    synced++;
                    console.log(`✅ Synced report: ${report._id} - ${report.title}`);
                } else {
                    skipped++;
                    console.log(`⏭️ Already exists: ${report._id} - ${report.title}`);
                }
            } catch (err) {
                errors++;
                console.error(`❌ Error syncing report ${report._id}:`, err.message);
                console.error(err.stack);
            }
        }
        
        console.log(`✅ Sync completed: ${synced} synced, ${skipped} skipped, ${errors} errors`);
        
        res.status(200).json({
            success: true,
            message: 'Sync completed',
            data: { 
                synced, 
                skipped, 
                errors,
                total: reports.length 
            }
        });
        
    } catch (error) {
        console.error('❌ Sync error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Sync failed'
        });
    }
};