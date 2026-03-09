const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

// Load environment variables from the .env file
dotenv.config();

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

// A simple test route
app.get('/', (req, res) => {
    res.send('Abar Nosto API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});