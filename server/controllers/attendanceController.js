
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');

// @desc    Take or update attendance for a class on a specific date
// @route   POST /api/attendance/:classId
// @access  Private (Teacher)
exports.takeAttendance = async (req, res) => {
  const { date, records } = req.body;
  const classId = req.params.classId;

  // Check if user is a teacher
  if (req.user.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can take attendance' });
  }

  try {
    // Verify the class exists and the teacher owns it
    const existingClass = await Class.findOne({ _id: classId, teacher: req.user.id });
    if (!existingClass) {
      return res.status(404).json({ msg: 'Class not found or you do not have permission to take attendance for this class' });
    }

    // Check if attendance for this date already exists
    let attendance = await Attendance.findOne({ class: classId, date });

    if (attendance) {
      // Update existing attendance records
      attendance.records = records;
    } else {
      // Create new attendance records
      attendance = new Attendance({
        class: classId,
        date,
        records,
      });
    }

    await attendance.save();
    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get attendance for a class on a specific date
// @route   GET /api/attendance/:classId/:date
// @access  Private (Teacher)
exports.getAttendance = async (req, res) => {
  const { classId, date } = req.params;

  // Check if user is a teacher
  if (req.user.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can view attendance' });
  }

  try {
    // Verify the class exists and the teacher owns it
    const existingClass = await Class.findOne({ _id: classId, teacher: req.user.id });
    if (!existingClass) {
      return res.status(404).json({ msg: 'Class not found or you do not have permission to view attendance for this class' });
    }

    const attendance = await Attendance.findOne({ class: classId, date }).populate('records.student', 'name email');

    if (!attendance) {
      return res.status(404).json({ msg: 'Attendance not found for this date' });
    }

    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
