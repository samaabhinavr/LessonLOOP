
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authController.registerUser);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authController.loginUser);

// @route   POST api/auth/upload-profile-picture
// @desc    Upload a profile picture
// @access  Private
router.post('/upload-profile-picture', auth, upload.single('profilePicture'), authController.uploadProfilePicture);

// @route   POST api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', auth, authController.changePassword);

module.exports = router;
