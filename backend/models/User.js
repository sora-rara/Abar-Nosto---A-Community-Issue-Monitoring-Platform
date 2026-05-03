const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const reputationHistorySchema = new mongoose.Schema({
    change: { type: Number, required: true },
    reason: { type: String, required: true },
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
    createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    reputation: {
        type: Number,
        default: 0
    },
    reputationHistory: [reputationHistorySchema],

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving - ULTRA SIMPLE VERSION
userSchema.pre('save', function (next) {
    console.log('Pre-save middleware triggered');

    // If password not modified, skip hashing
    if (!this.isModified('password')) {
        console.log('Password not modified, skipping hash');
        return next();
    }

    console.log('Hashing password...');

    // Hash the password
    bcrypt.genSalt(10, (err, salt) => {
        if (err) {
            console.error('Salt generation error:', err);
            return next(err);
        }

        bcrypt.hash(this.password, salt, (err, hash) => {
            if (err) {
                console.error('Hash generation error:', err);
                return next(err);
            }

            console.log('Password hashed successfully');
            this.password = hash;
            next();
        });
    });
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

module.exports = mongoose.model('User', userSchema);