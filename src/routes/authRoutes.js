const express = require('express');
const { register, login, getMe, updateUserDetails, verifyOTP, resendOTP, decrementGameLimit, getRecentlyPlayed, addGameToLibrary } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validator');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/verify', verifyOTP);
router.post('/resend-code', resendOTP);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateUserDetails);
router.post('/decrement-limit', protect, decrementGameLimit);
router.get('/recent-games', protect, getRecentlyPlayed);
router.post('/library/add', protect, addGameToLibrary);

module.exports = router;
