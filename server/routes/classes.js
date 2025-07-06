
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const classController = require('../controllers/classController');
const authorize = require('../middleware/authorize');

// @route   POST api/classes
// @desc    Create a class
// @access  Private (Teacher)
router.post('/', auth, authorize('Teacher'), classController.createClass);

// @route   GET api/classes
// @desc    Get all classes for a user (student or teacher)
// @access  Private
router.get('/', auth, classController.getClasses);

// @route   GET api/classes/:id
// @desc    Get a single class by ID
// @access  Private


// @route   GET api/classes/:id
// @desc    Get a single class by ID
// @access  Private
router.get('/:id', auth, classController.getClassById);

// @route   POST api/classes/join
// @desc    Join a class with an invite code
// @access  Private (Student)
router.post('/join', auth, classController.joinClass);

// @route   GET api/classes/:id/gradebook
// @desc    Get gradebook for a class
// @access  Private (Teacher or Student in class)
router.get('/:id/gradebook', auth, classController.getGradebook);

// @route   GET api/classes/:id/my-grades
// @desc    Get a student's grades for a specific class
// @access  Private (Student)
router.get('/:id/my-grades', auth, authorize('Student'), classController.getMyGrades);

// @route   GET api/classes/:id/export-data
// @desc    Export class data (for higher-ups)
// @access  Private (Teacher)
router.get('/:id/export-data', auth, authorize('Teacher'), classController.exportClassData);

module.exports = router;
