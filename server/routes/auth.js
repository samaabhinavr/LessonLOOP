
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// @route   POST api/auth/register-profile
// @desc    Register user profile in MongoDB after Firebase registration
// @access  Public (or protected if you pass Firebase ID token here)
router.post('/register-profile', authController.registerProfile);

// @route   GET api/auth/profile
// @desc    Get user profile from MongoDB using Firebase UID
// @access  Private
router.get('/profile', auth, authController.getUserProfile);

// @route   POST api/auth/upload-profile-picture
// @desc    Upload a profile picture
// @access  Private
router.post('/upload-profile-picture', auth, upload.single('profilePicture'), authController.uploadProfilePicture);



module.exports = router;
