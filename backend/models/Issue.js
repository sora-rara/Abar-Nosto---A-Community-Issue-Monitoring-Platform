const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
    // 1. Who posted this issue? (Connects to your User schema)
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // 2. What kind of issue is it? 
    // We use "enum" to strictly limit the options to your 3 categories
    type: {
        type: String,
        enum: ['road', 'accident', 'disaster'],
        required: true
    },
    // 3. The user's text description of the problem
    description: {
        type: String,
        required: true
    },
    // 4. (Optional) A photo URL if the user uploaded an image
    image: {
        type: String,
        default: null
    },
    // 4. The exact location data
    location: {
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        },
        address: {
            type: String,
            required: true
        }
    },
    // 5. Admin tracking (Optional but great for future features!)
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'resolved'],
        default: 'pending' // Every new issue starts as pending
    }
}, { 
    // This automatically adds `createdAt` and `updatedAt` timestamps!
    timestamps: true 
});

module.exports = mongoose.model('Issue', issueSchema);