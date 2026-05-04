const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const adminRoutes = require('./routes/adminRoutes');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

// Load environment variables FIRST
dotenv.config();

// Import imagekit AFTER env vars are loaded
let imagekit = null;
try {
    if (process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT) {
        imagekit = require('./config/imagekit');
        console.log('✅ ImageKit initialized');
    } else {
        console.log('⚠️ ImageKit not configured - missing environment variables');
    }
} catch (error) {
    console.error('❌ ImageKit initialization failed:', error.message);
}

// Now import other modules
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const issueRoutes = require('./routes/issueRoutes');
const followRoutes = require('./routes/followRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const preferenceRoutes = require('./routes/preferenceRoutes');
const searchRoutes = require('./routes/searchRoutes');

// ========== ADDED: statsRoutes from previous merge ==========
const statsRoutes = require('./routes/statsRoutes');
// ===========================================================

// ===== NEW: Routes from second file =====
const authorityRoutes = require('./routes/authorityRoutes');
const draftRoutes = require('./routes/draftRoutes');
const summaryRoutes = require('./routes/summaryRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const govServiceRoutes = require('./routes/govServiceRoutes');
// =========================================

// Connect to database
connectDB();

const syncExistingReports = async () => {
    try {
        const Report = require('./models/Report');
        const AdminIssue = require('./models/AdminIssue');

        console.log('Checking for unsynced reports...');

        const allReports = await Report.find().populate('user', 'name email');
        let synced = 0;
        let skipped = 0;

        for (const report of allReports) {
            const existing = await AdminIssue.findOne({ originalReportId: report._id });

            if (!existing) {
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

                await AdminIssue.create({
                    originalReportId: report._id,
                    title: report.title || 'Untitled',
                    description: report.description || 'No description provided',
                    category: report.category || 'other',
                    location: locationData,
                    photos: report.photos || [],
                    reportedBy: report.user?._id || report.user,
                    reporterName: report.user?.name || report.reporterName || 'Unknown',
                    reporterEmail: report.user?.email || '',
                    upvoteCount: report.upvoteCount || 0,
                    downvoteCount: report.downvoteCount || 0,
                    commentCount: report.commentCount || 0,
                    viewCount: report.viewCount || 0,
                    status: report.status || 'reported',
                    resolutionTimeline: {
                        reportedAt: report.createdAt || new Date()
                    },
                    lastActivityAt: report.lastActivityAt || new Date(),
                    createdAt: report.createdAt,
                    updatedAt: report.updatedAt
                });
                synced++;
                console.log(`Auto-synced: ${report.title}`);
            } else {
                skipped++;
            }
        }

        if (synced > 0) {
            console.log(`Auto-sync complete: ${synced} new reports synced, ${skipped} already exist`);
        } else {
            console.log(`All reports are already synced (${skipped} total)`);
        }

    } catch (error) {
        console.error('Auto-sync error:', error);
    }
};

// ========== ADDED: syncAdminActivities from previous merge ==========
const syncAdminActivities = async () => {
    try {
        const AdminActivity = require('./models/AdminActivity');
        const Activity = require('./models/Activity');
        const Report = require('./models/Report');

        console.log('🔄 Syncing activities to admin feed...');

        // First, create AdminActivity for reports that don't have one
        const reports = await Report.find()
            .populate('user', 'name')
            .sort('-createdAt')
            .limit(100);

        let reportSyncCount = 0;
        for (const report of reports) {
            try {
                const exists = await AdminActivity.findOne({
                    issue: report._id,
                    type: 'new_issue'
                });
                if (!exists) {
                    await AdminActivity.create({
                        type: 'new_issue',
                        issue: report._id,
                        issueTitle: report.title,
                        issueCategory: report.category,
                        user: report.user?._id || report.user,
                        userName: report.user?.name || report.reporterName || 'Unknown',
                        content: `New issue reported: ${report.title}`,
                        priority: 'high',
                        metadata: {},
                        createdAt: report.createdAt || new Date()
                    });
                    reportSyncCount++;
                }
            } catch (err) {
                // skip errors for individual reports
            }
        }
        if (reportSyncCount > 0) {
            console.log(`✅ Synced ${reportSyncCount} reports to admin activities`);
        }

        // Then sync existing Activity entries
        const existingActivities = await Activity.find()
            .sort({ createdAt: -1 })
            .limit(500);

        const validTypes = [
            'new_issue', 'new_comment', 'status_update', 'issue_resolved',
            'upvote', 'downvote', 'upvote_removed', 'downvote_removed',
            'user_registered', 'report_flagged', 'bulk_action',
            'comment_moderated', 'issue_prioritized', 'user_warning', 'system_alert'
        ];

        let synced = 0;
        let skipped = 0;

        for (const activity of existingActivities) {
            if (!validTypes.includes(activity.type)) {
                skipped++;
                continue;
            }

            try {
                const exists = await AdminActivity.findOne({
                    type: activity.type,
                    issue: activity.issue,
                    user: activity.user,
                    createdAt: activity.createdAt
                });

                if (!exists) {
                    let priority = 'low';
                    if (activity.type === 'new_issue' || activity.type === 'issue_resolved') {
                        priority = 'high';
                    } else if (activity.type === 'new_comment' || activity.type === 'status_update') {
                        priority = 'medium';
                    }

                    await AdminActivity.create({
                        type: activity.type,
                        issue: activity.issue,
                        issueTitle: activity.issueTitle,
                        issueCategory: activity.issueCategory,
                        user: activity.user,
                        userName: activity.userName,
                        content: activity.content,
                        priority: priority,
                        metadata: {},
                        createdAt: activity.createdAt
                    });
                    synced++;
                } else {
                    skipped++;
                }
            } catch (err) {
                skipped++;
            }
        }

        console.log(`✅ Admin activities sync: ${reportSyncCount} reports, ${synced} activities new, ${skipped} skipped/already exist`);
    } catch (error) {
        console.error('❌ Admin activities sync error:', error.message);
    }
};
// ===================================================================

const app = express();

app.locals.imagekit = imagekit;

// CORS
app.use(cors({
    origin: ['http://localhost:5173',
        'http://localhost:5174',
        process.env.CORS_ORIGIN
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// Request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ============================================
// ROUTES
// ============================================

// ⚠️ IMPORTANT: statsRoutes MUST be mounted before adminRoutes
// because adminRoutes catches ALL /api/admin/* paths first.
app.use('/api/admin/stats', statsRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/preferences', preferenceRoutes);

// ===== NEW: Added routes from second file =====
app.use('/api/authorities', authorityRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/gov-services', govServiceRoutes);
// =============================================

// ============================================
// TEMPORARY SYNC ROUTE - KEEP EXACTLY AS IS
// ============================================
const { protect, admin } = require('./middleware/authMiddleware');
const Report = require('./models/Report');
const AdminIssue = require('./models/AdminIssue');

app.post('/api/admin/sync', protect, admin, async (req, res) => {
    try {
        console.log('Starting admin sync...');
        const reports = await Report.find().populate('user', 'name email');
        let synced = 0;
        let skipped = 0;
        let errors = 0;

        for (const report of reports) {
            try {
                const existing = await AdminIssue.findOne({ originalReportId: report._id });

                if (!existing) {
                    await AdminIssue.create({
                        originalReportId: report._id,
                        title: report.title,
                        description: report.description,
                        category: report.category,
                        location: report.location,
                        photos: report.photos || [],
                        reportedBy: report.user?._id || report.user,
                        reporterName: report.user?.name || 'Unknown',
                        reporterEmail: report.user?.email,
                        upvoteCount: report.upvoteCount || 0,
                        downvoteCount: report.downvoteCount || 0,
                        commentCount: report.commentCount || 0,
                        viewCount: report.viewCount || 0,
                        createdAt: report.createdAt,
                        resolutionTimeline: {
                            reportedAt: report.createdAt
                        },
                        lastActivityAt: report.lastActivityAt || new Date(),
                        updatedAt: report.updatedAt
                    });
                    synced++;
                } else {
                    skipped++;
                }
            } catch (err) {
                errors++;
                console.error(`Error syncing report ${report._id}:`, err.message);
            }
        }

        console.log(`Sync completed: ${synced} synced, ${skipped} skipped, ${errors} errors`);
        res.json({
            success: true,
            message: 'Sync completed',
            data: { synced, skipped, errors, total: reports.length }
        });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// TEST ROUTES
// ============================================
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        message: 'Server is running'
    });
});

app.get('/', (req, res) => {
    res.json({
        success: true,
        name: 'Abar Nosto API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            reports: '/api/reports',
            issues: '/api/issues',
            admin: '/api/admin',
            test: '/api/test',
            health: '/health'
        }
    });
});

// ========== SOCKET.IO SETUP ==========
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:5174', process.env.CORS_ORIGIN].filter(Boolean),
        credentials: true
    }
});
app.set('io', io);

// Socket auth middleware (keep original first‑file logic)
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
        const user = await User.findById(decoded.id).select('role');
        if (!user) return next(new Error('User not found'));
        socket.userId = decoded.id;
        socket.userRole = user.role;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.userId);
    socket.join(`user_${socket.userId}`);
    if (socket.userRole === 'admin') {
        socket.join('admins');
    }
    socket.on('disconnect', () => console.log('User disconnected'));
});

// 🔔 NEW: inject socket instance into notification service
const { setSocketInstance } = require('./services/notificationService');
setSocketInstance(io);

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

// 404 handler
app.use((req, res) => {
    console.log('404 - Route not found:', req.url);
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log('\n=================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Test: http://localhost:${PORT}/api/test`);
    console.log(`📍 Auth: http://localhost:${PORT}/api/auth`);
    console.log(`📍 Reports: http://localhost:${PORT}/api/reports`);
    console.log(`📍 Issues: http://localhost:${PORT}/api/issues`);
    console.log(`📍 Admin: http://localhost:${PORT}/api/admin`);
    console.log(`📍 Search: http://localhost:${PORT}/api/search`);
    console.log('=================================\n');
});

setTimeout(() => {
    syncExistingReports();
    // ========== ADDED: call to admin activity sync ==========
    syncAdminActivities();
    // ========================================================
}, 3000);

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});

// Existing duplicate test listener – left intact as requested
io.on('connection', (socket) => {
    socket.on('test', (data) => {
        io.to(`user_${socket.userId}`).emit('notification', { title: 'Test', message: 'Works!' });
    });
});