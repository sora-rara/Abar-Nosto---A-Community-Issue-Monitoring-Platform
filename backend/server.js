require("dotenv").config();

const express = require('express');
//const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const issueRoutes = require('./routes/issueRoutes');

// Load environment variables from the .env file
//dotenv.config();

// Connect to the database
connectDB();

const app = express();

// Middleware to allow cross-origin requests and parse JSON data
app.use(cors());
app.use(express.json());

// Serve uploaded images statically 
app.use('/uploads', require('express').static('uploads'));

// Use the authentication routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', require('./routes/issueRoutes'));

app.use('/api/reports', reportRoutes);

app.use('/api/issues', issueRoutes);
// A simple test route
app.get('/', (req, res) => {
    res.send('Abar Nosto API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Auth routes: http://localhost:${PORT}/api/auth`);
    console.log(`Report routes: http://localhost:${PORT}/api/reports`);
    console.log(`Activity Feed: http://localhost:${PORT}/api/issues/activities/feed`);
});