const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};


// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        logger.info(`[${req.id}] Register attempt for email: ${email}`);

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            logger.warn(`[${req.id}] Register failed - email already exists: ${email}`);

            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password
        });

        logger.info(`[${req.id}] User registered successfully: ${user._id}`);


        // Generate token
        const token = generateToken(user._id);

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });
    } catch (error) {
        logger.error(`[${req.id}] Register error: ${error.message}`);
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        logger.info(`[${req.id}] Login attempt for email: ${email}`);

        // Validate email and password
        if (!email || !password) {
            logger.warn(`[${req.id}] Login failed - missing credentials`);
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Find user and include password
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            logger.warn(`[${req.id}] Login failed - invalid credentials (email not found)`);

            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            logger.warn(`[${req.id}] Login failed - account deactivated: ${user._id}`);

            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Check password
        const isPasswordMatch = await user.comparePassword(password);

        if (!isPasswordMatch) {
            logger.warn(`[${req.id}] Login failed - invalid password for user: ${user._id}`);

            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        user.lastLogin = Date.now();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        logger.info(`[${req.id}] Login successful for user: ${user._id}`);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });
    } catch (error) {
        logger.error(`[${req.id}] Login error: ${error.message}`);

        next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            logger.warn(`[${req.id}] User not found for getMe`, {
                userId: req.user.id
            });

            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        logger.info(`[${req.id}] Fetched current user`, {
            userId: user._id
        });


        return res.status(200).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        logger.error(`[${req.id}] Error fetching current user`, error);

        next(error);
    }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
    try {
        const { name, email } = req.body;

        const fieldsToUpdate = {};
        if (name) fieldsToUpdate.name = name;
        if (email) fieldsToUpdate.email = email;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            fieldsToUpdate,
            {
                new: true,
                runValidators: true
            }
        );

        if (!user) {
            logger.warn(`[${req.id}] User not found for updateDetails`, {
                userId: req.user.id
            });

            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        logger.info(`[${req.id}] User details updated`, {
            userId: user._id,
            updatedFields: Object.keys(fieldsToUpdate)
        });

        return res.status(200).json({
            success: true,
            message: 'User details updated successfully',
            data: user
        });
    } catch (error) {
        logger.error(`[${req.id}] Error updating user details`, error);

        next(error);
    }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            logger.warn(`[${req.id}] Missing password fields`, {
                userId: req.user.id
            });

            return res.status(400).json({
                success: false,
                message: 'Please provide current and new password'
            });
        }

        const user = await User.findById(req.user.id).select('+password');

        if (!user) {
            logger.warn(`[${req.id}] User not found for updatePassword`, {
                userId: req.user.id
            });

            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            logger.warn(`[${req.id}] Invalid current password`, {
                userId: user._id
            });

            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        user.password = newPassword;
        await user.save();

        logger.info(`[${req.id}] Password updated successfully`, {
            userId: user._id
        });

        // Generate new token
        const token = generateToken(user._id);

        return res.status(200).json({
            success: true,
            message: 'Password updated successfully',
            data: { token }
        });
    } catch (error) {
        logger.error(`[${req.id}] Error updating password`, error);

        next(error);
    }
};
