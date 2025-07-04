
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const studentController = require('../controllers/studentController');

// @route   GET /api/student/average-grade
// @desc    Get average grade for a student
// @access  Private (Student)
router.get('/average-grade', auth, studentController.getAverageGrade);

module.exports = router;
