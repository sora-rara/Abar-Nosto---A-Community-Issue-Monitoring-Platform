const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose'); // Add this line
const adminRoutes = require('./routes/adminRoutes');

// Load environment variables FIRST
dotenv.config();

// Import imagekit AFTER env vars are loaded
let imagekit = null;
try {
    if (process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT) {
        const ImageKit = require('imagekit');
        imagekit = new ImageKit({
            publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
            privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
        });
        console.log('✅ ImageKit initialized');
    } else {
        console.log('⚠️ ImageKit not configured');
    }
} catch (error) {
    console.log('⚠️ ImageKit initialization skipped');
}

// Now import other modules
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const issueRoutes = require('./routes/issueRoutes');

// Connect to database
connectDB();

const app = express();

// ============================================
// CORS - FIXED FOR EXPRESS 5
// ============================================
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============================================
// MIDDLEWARE
// ============================================
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
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', adminRoutes);


// ============================================
// TEMPORARY SYNC ROUTE - ADD THIS HERE
// ============================================
const { protect, admin } = require('./middleware/authMiddleware');
const Report = require('./models/Report');
const AdminIssue = require('./models/AdminIssue');

app.post('/api/admin/sync', protect, admin, async (req, res) => {
    try {
        console.log('🔄 Starting admin sync...');
        const reports = await Report.find().populate('user', 'name email');
        
        let synced = 0;
        let skipped = 0;
        
        for (const report of reports) {
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
                    }
                });
                synced++;
            } else {
                skipped++;
            }
        }
        
        console.log(`✅ Sync completed: ${synced} synced, ${skipped} skipped`);
        res.json({
            success: true,
            message: 'Sync completed',
            data: { synced, skipped, total: reports.length }
        });
    } catch (error) {
        console.error('❌ Sync error:', error);
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

app.listen(PORT, () => {
    console.log('\n=================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Test: http://localhost:${PORT}/api/test`);
    console.log(`📍 Auth: http://localhost:${PORT}/api/auth`);
    console.log(`📍 Reports: http://localhost:${PORT}/api/reports`);
    console.log(`📍 Issues: http://localhost:${PORT}/api/issues`);
    console.log(`📍 Admin: http://localhost:${PORT}/api/admin`);
    console.log('=================================\n');
});

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