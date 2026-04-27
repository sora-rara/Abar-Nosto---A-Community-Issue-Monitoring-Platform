const Report = require('../models/Report');
const AdminIssue = require('../models/AdminIssue');

// Helper function to extract ward/area from address
const extractWardFromAddress = (address) => {
    if (!address) return 'Unknown';
    // Try to extract ward number from address (e.g., "Ward 12, Gulshan")
    const wardMatch = address.match(/ward\s*(\d+)/i);
    if (wardMatch) return `Ward ${wardMatch[1]}`;
    
    // Try to extract area name
    const areas = ['Gulshan', 'Banani', 'Dhanmondi', 'Uttara', 'Mirpur', 'Mohakhali', 'Bashundhara', 'Baridhara', 'Old Dhaka', 'Motijheel', 'Paltan', 'Ramna', 'Shahbag', 'Khilgaon', 'Malibagh', 'Rampura', 'Badda', 'Tejgaon'];
    for (const area of areas) {
        if (address.toLowerCase().includes(area.toLowerCase())) {
            return area;
        }
    }
    return 'Other Area';
};

// @desc    Get ward/area statistics
// @route   GET /api/admin/stats/wards
// @access  Private/Admin
exports.getWardStats = async (req, res) => {
    try {
        const { period = 'all', startDate, endDate } = req.query;
        
        let dateFilter = {};
        if (period === 'week') {
            dateFilter = { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
        } else if (period === 'month') {
            dateFilter = { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
        } else if (period === 'quarter') {
            dateFilter = { createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } };
        } else if (startDate && endDate) {
            dateFilter = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
        }
        
        // Get all reports with location
        const reports = await Report.find(dateFilter).lean();
        
        // Group by ward/area
        const wardMap = new Map();
        
        for (const report of reports) {
            const address = report.location?.address || '';
            const ward = extractWardFromAddress(address);
            
            if (!wardMap.has(ward)) {
                wardMap.set(ward, {
                    ward,
                    totalReports: 0,
                    resolvedCount: 0,
                    inProgressCount: 0,
                    reportedCount: 0,
                    totalUpvotes: 0,
                    totalResolutionTime: 0,
                    resolvedIssues: [],
                    categories: {
                        pothole: 0,
                        broken_light: 0,
                        drainage: 0,
                        flooding: 0,
                        garbage: 0,
                        debris: 0,
                        hazard: 0,
                        other: 0
                    }
                });
            }
            
            const wardData = wardMap.get(ward);
            wardData.totalReports++;
            
            // Count by status
            if (report.status === 'resolved') {
                wardData.resolvedCount++;
                if (report.createdAt && report.updatedAt) {
                    const resolutionTime = (new Date(report.updatedAt) - new Date(report.createdAt)) / (1000 * 60 * 60 * 24); // in days
                    wardData.totalResolutionTime += resolutionTime;
                    wardData.resolvedIssues.push({
                        id: report._id,
                        title: report.title,
                        resolutionTime
                    });
                }
            } else if (report.status === 'in_progress') {
                wardData.inProgressCount++;
            } else {
                wardData.reportedCount++;
            }
            
            // Count upvotes
            wardData.totalUpvotes += (report.upvoteCount || 0);
            
            // Count by category
            const category = report.category || 'other';
            if (wardData.categories.hasOwnProperty(category)) {
                wardData.categories[category]++;
            }
        }
        
        // Calculate average resolution time and prepare final data
        const wardStats = Array.from(wardMap.values()).map(ward => ({
            ...ward,
            averageResolutionTime: ward.resolvedCount > 0 ? (ward.totalResolutionTime / ward.resolvedCount).toFixed(1) : 0,
            resolutionRate: ward.totalReports > 0 ? ((ward.resolvedCount / ward.totalReports) * 100).toFixed(1) : 0,
            activeIssues: ward.inProgressCount + ward.reportedCount,
            engagementScore: ward.totalReports > 0 ? ((ward.totalUpvotes / ward.totalReports) * 10).toFixed(1) : 0
        }));
        
        // Sort by total reports (descending)
        wardStats.sort((a, b) => b.totalReports - a.totalReports);
        
        // Calculate overall averages
        const totalReports = wardStats.reduce((sum, w) => sum + w.totalReports, 0);
        const totalResolved = wardStats.reduce((sum, w) => sum + w.resolvedCount, 0);
        const overallResolutionRate = totalReports > 0 ? ((totalResolved / totalReports) * 100).toFixed(1) : 0;
        const overallAvgResolutionTime = wardStats.reduce((sum, w) => sum + (parseFloat(w.averageResolutionTime) || 0), 0) / wardStats.length;
        
        res.json({
            success: true,
            data: {
                wards: wardStats,
                summary: {
                    totalWards: wardStats.length,
                    totalReports,
                    totalResolved,
                    overallResolutionRate,
                    overallAvgResolutionTime: overallAvgResolutionTime.toFixed(1)
                },
                lastUpdated: new Date()
            }
        });
        
    } catch (error) {
        console.error('Get ward stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get comparative statistics between wards
// @route   GET /api/admin/stats/comparison
// @access  Private/Admin
exports.getComparativeStats = async (req, res) => {
    try {
        const { wards, period = 'all' } = req.query;
        const selectedWards = wards ? wards.split(',') : [];
        
        let dateFilter = {};
        if (period === 'week') {
            dateFilter = { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
        } else if (period === 'month') {
            dateFilter = { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
        } else if (period === 'quarter') {
            dateFilter = { createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } };
        }
        
        const reports = await Report.find(dateFilter).lean();
        
        // Group by ward
        const wardMap = new Map();
        
        for (const report of reports) {
            const address = report.location?.address || '';
            const ward = extractWardFromAddress(address);
            
            if (selectedWards.length > 0 && !selectedWards.includes(ward)) {
                continue;
            }
            
            if (!wardMap.has(ward)) {
                wardMap.set(ward, {
                    ward,
                    weeklyReports: [0, 0, 0, 0, 0, 0, 0],
                    monthlyReports: [],
                    resolutionTimes: [],
                    statusCounts: { reported: 0, in_progress: 0, resolved: 0 }
                });
            }
            
            const wardData = wardMap.get(ward);
            
            // Track weekly trend
            if (report.createdAt) {
                const date = new Date(report.createdAt);
                const dayOfWeek = date.getDay();
                wardData.weeklyReports[dayOfWeek]++;
                
                // Monthly trend (last 4 weeks)
                const weekNumber = Math.floor((Date.now() - date) / (7 * 24 * 60 * 60 * 1000));
                if (weekNumber < 4) {
                    if (!wardData.monthlyReports[weekNumber]) wardData.monthlyReports[weekNumber] = 0;
                    wardData.monthlyReports[weekNumber]++;
                }
            }
            
            // Track resolution time
            if (report.status === 'resolved' && report.createdAt && report.updatedAt) {
                const resolutionTime = (new Date(report.updatedAt) - new Date(report.createdAt)) / (1000 * 60 * 60 * 24);
                wardData.resolutionTimes.push(resolutionTime);
            }
            
            wardData.statusCounts[report.status || 'reported']++;
        }
        
        // Prepare comparison data
        const comparisonData = Array.from(wardMap.values()).map(ward => ({
            ward: ward.ward,
            weeklyTrend: ward.weeklyReports,
            monthlyTrend: ward.monthlyReports.reverse(),
            avgResolutionTime: ward.resolutionTimes.length > 0 
                ? (ward.resolutionTimes.reduce((a, b) => a + b, 0) / ward.resolutionTimes.length).toFixed(1) 
                : 0,
            statusBreakdown: ward.statusCounts,
            totalIssues: ward.statusCounts.reported + ward.statusCounts.in_progress + ward.statusCounts.resolved
        }));
        
        res.json({
            success: true,
            data: {
                wards: comparisonData,
                period,
                generatedAt: new Date()
            }
        });
        
    } catch (error) {
        console.error('Get comparative stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get detailed ward performance metrics
// @route   GET /api/admin/stats/wards/:wardName/details
// @access  Private/Admin
exports.getWardDetails = async (req, res) => {
    try {
        const { wardName } = req.params;
        const { limit = 20 } = req.query;
        
        // Find all reports in this ward
        const reports = await Report.find()
            .populate('user', 'name email')
            .sort('-createdAt')
            .limit(parseInt(limit));
        
        // Filter reports for this ward
        const wardReports = [];
        for (const report of reports) {
            const address = report.location?.address || '';
            const ward = extractWardFromAddress(address);
            if (ward === wardName) {
                wardReports.push(report);
            }
        }
        
        // If not enough reports, get more without limit
        let allWardReports = wardReports;
        if (allWardReports.length < parseInt(limit)) {
            const moreReports = await Report.find()
                .populate('user', 'name email')
                .sort('-createdAt');
            
            for (const report of moreReports) {
                if (allWardReports.length >= parseInt(limit) * 2) break;
                const address = report.location?.address || '';
                const ward = extractWardFromAddress(address);
                if (ward === wardName && !allWardReports.find(r => r._id.toString() === report._id.toString())) {
                    allWardReports.push(report);
                }
            }
        }
        
        // Calculate metrics
        const resolvedReports = allWardReports.filter(r => r.status === 'resolved');
        const totalResolutionTime = resolvedReports.reduce((sum, r) => {
            if (r.createdAt && r.updatedAt) {
                return sum + ((new Date(r.updatedAt) - new Date(r.createdAt)) / (1000 * 60 * 60 * 24));
            }
            return sum;
        }, 0);
        
        // Category breakdown
        const categoryBreakdown = {};
        for (const report of allWardReports) {
            const cat = report.category || 'other';
            categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
        }
        
        // Monthly trend (last 6 months)
        const monthlyTrend = {};
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        for (const report of allWardReports) {
            if (report.createdAt >= sixMonthsAgo) {
                const month = report.createdAt.toLocaleString('default', { month: 'short', year: 'numeric' });
                monthlyTrend[month] = (monthlyTrend[month] || 0) + 1;
            }
        }
        
        res.json({
            success: true,
            data: {
                ward: wardName,
                summary: {
                    totalReports: allWardReports.length,
                    resolvedCount: resolvedReports.length,
                    inProgressCount: allWardReports.filter(r => r.status === 'in_progress').length,
                    reportedCount: allWardReports.filter(r => r.status === 'reported').length,
                    averageResolutionTime: resolvedReports.length > 0 ? (totalResolutionTime / resolvedReports.length).toFixed(1) : 0,
                    resolutionRate: allWardReports.length > 0 ? ((resolvedReports.length / allWardReports.length) * 100).toFixed(1) : 0,
                    totalUpvotes: allWardReports.reduce((sum, r) => sum + (r.upvoteCount || 0), 0)
                },
                categoryBreakdown,
                monthlyTrend,
                recentReports: allWardReports.slice(0, 10).map(r => ({
                    id: r._id,
                    title: r.title,
                    status: r.status,
                    createdAt: r.createdAt,
                    upvoteCount: r.upvoteCount
                }))
            }
        });
        
    } catch (error) {
        console.error('Get ward details error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Export ward statistics as CSV
// @route   GET /api/admin/stats/export
// @access  Private/Admin
exports.exportWardStats = async (req, res) => {
    try {
        const reports = await Report.find().lean();
        
        const wardMap = new Map();
        
        for (const report of reports) {
            const address = report.location?.address || '';
            const ward = extractWardFromAddress(address);
            
            if (!wardMap.has(ward)) {
                wardMap.set(ward, {
                    ward,
                    totalReports: 0,
                    resolvedCount: 0,
                    inProgressCount: 0,
                    reportedCount: 0,
                    totalResolutionTime: 0
                });
            }
            
            const wardData = wardMap.get(ward);
            wardData.totalReports++;
            
            if (report.status === 'resolved') {
                wardData.resolvedCount++;
                if (report.createdAt && report.updatedAt) {
                    wardData.totalResolutionTime += (new Date(report.updatedAt) - new Date(report.createdAt)) / (1000 * 60 * 60 * 24);
                }
            } else if (report.status === 'in_progress') {
                wardData.inProgressCount++;
            } else {
                wardData.reportedCount++;
            }
        }
        
        // Create CSV
        const headers = ['Ward/Area', 'Total Reports', 'Resolved', 'In Progress', 'Reported', 'Resolution Rate (%)', 'Avg Resolution Time (days)', 'Active Issues'];
        const rows = Array.from(wardMap.values()).map(ward => [
            ward.ward,
            ward.totalReports,
            ward.resolvedCount,
            ward.inProgressCount,
            ward.reportedCount,
            ward.totalReports > 0 ? ((ward.resolvedCount / ward.totalReports) * 100).toFixed(1) : 0,
            ward.resolvedCount > 0 ? (ward.totalResolutionTime / ward.resolvedCount).toFixed(1) : 0,
            ward.inProgressCount + ward.reportedCount
        ]);
        
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=ward-stats-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvContent);
        
    } catch (error) {
        console.error('Export stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};