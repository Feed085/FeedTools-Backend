const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ success: false, error: 'User already exists' });
        }

        // Create user
        user = await User.create({
            username,
            email,
            password
        });

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            token
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Check for user
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Record Login History
        const useragent = require('useragent');
        const geoip = require('geoip-lite');

        const agent = useragent.parse(req.headers['user-agent']);
        const ip = req.ip === '::1' || req.ip === '127.0.0.1' ? '82.194.16.0' : (req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress); // Fallback to a Baku IP for local testing
        const geo = geoip.lookup(ip);

        const loginData = {
            ip: ip,
            browser: agent.toAgent(),
            os: agent.os.toString(),
            device: agent.device.toString(),
            location: geo ? `${geo.city}, ${geo.country}` : 'Unknown',
            timezone: geo ? geo.timezone : 'UTC',
            date: new Date().toLocaleString('tr-TR', {
                timeZone: geo ? geo.timezone : 'UTC',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        };

        // Add to history (keep only last 10 for performance/size)
        user.loginHistory.unshift(loginData);
        if (user.loginHistory.length > 10) {
            user.loginHistory.pop();
        }

        await user.save();

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            token
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        next(err);
    }
};

const { resolveSteamID, getSteamData } = require('../utils/steam');

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateUserDetails = async (req, res, next) => {
    try {
        const fieldsToUpdate = {};
        if (req.body.username) fieldsToUpdate.username = req.body.username;
        if (req.body.avatar) fieldsToUpdate.avatar = req.body.avatar;
        if (req.body.banner) fieldsToUpdate.banner = req.body.banner;

        // If steamUrl is provided, fetch steam data
        if (req.body.steamUrl !== undefined) {
            fieldsToUpdate.steamUrl = req.body.steamUrl;

            if (req.body.steamUrl) {
                const steamID = await resolveSteamID(req.body.steamUrl);
                if (steamID) {
                    const steamData = await getSteamData(steamID);
                    fieldsToUpdate.steamData = {
                        ...steamData,
                        lastSync: new Date()
                    };
                }
            } else {
                // Clear steam data if url is emptied
                fieldsToUpdate.steamData = { totalGames: 0, totalPlaytime: 0, isPrivate: false, lastSync: new Date() };
            }
        }

        const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        next(err);
    }
};
