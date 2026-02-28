const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });

        if (user && user.isVerified) {
            return res.status(400).json({ success: false, error: 'User already exists' });
        }

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        if (user && !user.isVerified) {
            // Check resend limit (1 minute)
            if (user.lastVerificationSent && (Date.now() - user.lastVerificationSent < 60 * 1000)) {
                return res.status(429).json({
                    success: false,
                    error: 'Please wait 1 minute before requesting a new code'
                });
            }

            // Update existing unverified user
            user.username = username;
            user.password = password;
            user.verificationCode = verificationCode;
            user.verificationCodeExpire = verificationCodeExpire;
            user.unverifiedExpire = verificationCodeExpire; // TTL field
            user.lastVerificationSent = Date.now();
            await user.save();
        } else {
            // Create new unverified user
            user = await User.create({
                username,
                email,
                password,
                verificationCode,
                verificationCodeExpire,
                unverifiedExpire: verificationCodeExpire,
                lastVerificationSent: Date.now()
            });
        }

        try {
            await sendEmail({
                email: user.email,
                subject: 'Gamonk - E-postanızı Onaylayın',
                message: `Kaydolduğunuz için teşekkürler! Doğrulama kodunuz: ${verificationCode}. Bu kod 10 dakika geçerlidir.`
            });

            res.status(201).json({
                success: true,
                message: 'Verification code sent to email',
                email: user.email
            });
        } catch (err) {
            // If email fails, we should delete the unverified user so they can try again
            // and we don't have ghost records in the DB
            await User.findByIdAndDelete(user._id);
            return res.status(500).json({ success: false, error: 'Email could not be sent' });
        }
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

        // Check resend limit (1 minute)
        if (user.lastVerificationSent && (Date.now() - user.lastVerificationSent < 60 * 1000)) {
            return res.status(429).json({
                success: false,
                error: 'Please wait 1 minute before requesting a new code'
            });
        }

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        user.verificationCode = verificationCode;
        user.verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
        user.lastVerificationSent = Date.now();
        await user.save();

        try {
            await sendEmail({
                email: user.email,
                subject: 'Gamonk - Giriş Doğrulama Kodu',
                message: `Giriş yapmak için doğrulama kodunuz: ${verificationCode}. Bu kod 10 dakika geçerlidir.`
            });

            res.status(200).json({
                success: true,
                message: 'Verification code sent to email',
                email: user.email
            });
        } catch (err) {
            user.verificationCode = undefined;
            user.verificationCodeExpire = undefined;
            await user.save();

            return res.status(500).json({ success: false, error: 'Email could not be sent' });
        }
    } catch (err) {
        next(err);
    }
};

// @desc    Verify OTP code
// @route   POST /api/v1/auth/verify
// @access  Public
exports.verifyOTP = async (req, res, next) => {
    try {
        const { email, code } = req.body;

        const user = await User.findOne({
            email,
            verificationCode: code,
            verificationCodeExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid or expired code' });
        }

        // Clear verification fields and TTL
        user.verificationCode = undefined;
        user.verificationCodeExpire = undefined;
        user.unverifiedExpire = undefined; // Stop TTL deletion
        user.isVerified = true;

        // Record Login History
        const useragent = require('useragent');
        const geoip = require('geoip-lite');

        const agent = useragent.parse(req.headers['user-agent']);
        const ip = req.ip === '::1' || req.ip === '127.0.0.1' ? '82.194.16.0' : (req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress);
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

        user.loginHistory.unshift(loginData);
        if (user.loginHistory.length > 10) user.loginHistory.pop();

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
            returnDocument: 'after',
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
// @desc    Resend OTP code
// @route   POST /api/v1/auth/resend-code
// @access  Public
exports.resendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
        }

        // Check resend limit (1 minute)
        if (user.lastVerificationSent && (Date.now() - user.lastVerificationSent < 60 * 1000)) {
            const timeLeft = Math.ceil((60 * 1000 - (Date.now() - user.lastVerificationSent)) / 1000);
            return res.status(429).json({
                success: false,
                error: `Lütfen yeni bir kod için ${timeLeft} saniye bekleyin.`
            });
        }

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        user.verificationCode = verificationCode;
        user.verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
        user.lastVerificationSent = Date.now();
        await user.save();

        try {
            await sendEmail({
                email: user.email,
                subject: 'Gamonk - Doğrulama Kodunuz',
                message: `Yeni doğrulama kodunuz: ${verificationCode}. Bu kod 10 dakika geçerlidir.`
            });

            res.status(200).json({
                success: true,
                message: 'Doğrulama kodu tekrar gönderildi.'
            });
        } catch (err) {
            return res.status(500).json({ success: false, error: 'E-posta gönderilemedi.' });
        }
    } catch (err) {
        next(err);
    }
};
