const express = require('express');
const { register, login, getMe, updateUserDetails } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validator');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateUserDetails);

module.exports = router;
