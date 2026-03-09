const jwt = require('jsonwebtoken');
const User = require('../models/User'); // We need the User model to verify who the token belongs to

const protect = async (req, res, next) => {
    let token;

    // 1. Check if the request has an authorization header that starts with "Bearer"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 2. Extract the token from the header (Format is "Bearer <token>")
            token = req.headers.authorization.split(' ')[1];

            // 3. Verify the token using your secret key from the .env file
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 4. Find the user in the database based on the ID inside the token
            // We use .select('-password') so we don't accidentally pass the password along!
            req.user = await User.findById(decoded.id).select('-password');

            // 5. Move on to the next piece of middleware or the actual route controller
            next();
        } catch (error) {
            console.error("Token verification failed:", error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    // If there is no token at all, reject the request
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

module.exports = { protect };