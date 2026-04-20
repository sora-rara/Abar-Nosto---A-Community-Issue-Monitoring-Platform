const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Hardcoded admin emails
const ADMIN_EMAILS = [
    'farahadmin@example.com',
    'tasneemadmin@example.com',
    'pretomadmin@example.com',
    'princeadmin@example.com',
    'admin@test.com',
    'ad@test.com'
];

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key-change-in-production', {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
    try {
        console.log('='.repeat(50));
        console.log('📝 REGISTER ENDPOINT HIT');
        console.log('='.repeat(50));
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            console.log('❌ Missing fields:', { name, email, password });
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password'
            });
        }

        console.log('✅ Validation passed');

        // Check MongoDB connection
        console.log('MongoDB connection state:', mongoose.connection.readyState);

        // Check if user already exists
        console.log('Checking for existing user with email:', email);
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('❌ User already exists:', email);
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }
        console.log('✅ No existing user found');

        // Determine role based on email
        const role = ADMIN_EMAILS.includes(email) ? 'admin' : 'user';
        console.log('Role determined:', role);

        // Create user
        console.log('Creating new user with data:', { name, email, role });
        
        const user = new User({
            name,
            email,
            password,
            role
        });

        console.log('User object created, about to save...');
        await user.save();
        console.log('✅ User saved successfully with ID:', user._id);

        // Generate token
        const token = generateToken(user._id);
        console.log('✅ Token generated');

        // Return user data with token
        console.log('Sending success response');
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isAdmin: user.role === 'admin',
                token: token
            }
        });
    } catch (err) {
        console.log('='.repeat(50));
        console.log('❌ ERROR IN REGISTRATION');
        console.log('='.repeat(50));
        console.log('Error name:', err.name);
        console.log('Error message:', err.message);
        console.log('Error stack:', err.stack);
        
        if (err.code) {
            console.log('Error code:', err.code);
        }
        
        if (err.errors) {
            console.log('Validation errors:', JSON.stringify(err.errors, null, 2));
        }

        // Handle validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        
        // Handle duplicate key error
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    try {
        console.log('='.repeat(50));
        console.log('🔑 LOGIN ENDPOINT HIT');
        console.log('='.repeat(50));
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            console.log('❌ Missing fields:', { email, password });
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        console.log('✅ Validation passed');

        // Find user with password field
        console.log('Finding user with email:', email);
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        console.log('✅ User found:', user._id);
        console.log('User role:', user.role);

        // Check password
        console.log('Comparing passwords...');
        const isPasswordValid = await user.comparePassword(password);
        
        if (!isPasswordValid) {
            console.log('❌ Invalid password');
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        console.log('✅ Password valid');

        // Generate token
        const token = generateToken(user._id);
        console.log('✅ Token generated');

        // Return user data with token
        console.log('Sending success response');
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isAdmin: user.role === 'admin',
                token: token
            }
        });
    } catch (err) {
        console.log('='.repeat(50));
        console.log('❌ ERROR IN LOGIN');
        console.log('='.repeat(50));
        console.log('Error name:', err.name);
        console.log('Error message:', err.message);
        console.log('Error stack:', err.stack);
        
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                reputation: user.reputation || 0,
                reputationHistory: user.reputationHistory || [],
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};