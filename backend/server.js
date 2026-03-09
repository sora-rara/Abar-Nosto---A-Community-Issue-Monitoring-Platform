const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const issueRoutes = require('./routes/issueRoutes');
// const activityRoutes = require('./routes/activityRoutes'); // COMMENT THIS OUT

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes); // This already includes activity feed
// app.use('/api/activities', activityRoutes); // DON'T USE THIS

// Test route
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working',
        routes: {
            activityFeed: '/api/issues/activities/feed',
            issues: '/api/issues',
            auth: '/api/auth'
        }
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 Test API: http://localhost:${PORT}/api/test`);
    console.log(`📍 Activity Feed: http://localhost:${PORT}/api/issues/activities/feed`);
});