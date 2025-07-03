
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const attendanceController = require('../controllers/attendanceController');

// @route   POST /api/attendance/:classId
// @desc    Take or update attendance for a class on a specific date
// @access  Private (Teacher)
router.post('/:classId', auth, authorize('Teacher'), attendanceController.takeAttendance);

// @route   GET /api/attendance/:classId/:date
// @desc    Get attendance for a class on a specific date
// @access  Private (Teacher)
router.get('/:classId/:date', auth, authorize('Teacher'), attendanceController.getAttendance);

module.exports = router;
