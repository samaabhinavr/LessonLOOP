const Class = require('../models/Class');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const Attendance = require('../models/Attendance');
const { nanoid } = require('nanoid');

// @desc    Create a class
exports.createClass = async (req, res) => {
  // Only teachers can create classes
  if (req.user.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can create classes' });
  }

  const { name } = req.body;

  try {
    const newClass = new Class({
      name,
      teacher: req.user.id,
      inviteCode: nanoid(8), // Generate a unique 8-character code
    });

    const savedClass = await newClass.save();
    res.json(savedClass);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get all classes for a user
exports.getClasses = async (req, res) => {
  try {
    let classes;
    if (req.user.role === 'Teacher') {
      // Find classes where the user is the teacher
      classes = await Class.find({ teacher: req.user.id }).populate('students', 'name email');
    } else {
      // Find classes where the user is a student
      classes = await Class.find({ students: req.user.id }).populate('teacher', 'name email');
    }
    res.json(classes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get a single class by ID
exports.getClassById = async (req, res) => {
  try {
    console.log("Backend: getClassById - Received ID:", req.params.id);
    console.log("Backend: getClassById - Attempting to find class and populate...");
    const classItem = await Class.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('students', 'name email');
    console.log("Backend: getClassById - Class found (or not):", classItem ? classItem._id : 'null');

    if (!classItem) {
      console.log('Class not found for id:', req.params.id);
      return res.status(404).json({ msg: 'Class not found' });
    }

    // Check if the user is either the teacher or a student in the class
    const isTeacher = classItem.teacher._id.toString() === req.user.id;
    const isStudent = classItem.students.some(student => student._id.toString() === req.user.id);
    console.log('isTeacher:', isTeacher, 'isStudent:', isStudent);

    if (!isTeacher && !isStudent) {
      console.log('User not authorized for this class:', req.user.id);
      return res.status(403).json({ msg: 'Not authorized to access this class' });
    }
    console.log("Backend: getClassById - Sending response...");
    res.json(classItem);
  } catch (err) {
    console.error('Error in getClassById:', err);
    res.status(500).send('Server error');
  }
};

// @desc    Join a class
exports.joinClass = async (req, res) => {
  // Only students can join classes
  if (req.user.role !== 'Student') {
    return res.status(403).json({ msg: 'Only students can join classes' });
  }

  const { inviteCode } = req.body;

  try {
    const course = await Class.findOne({ inviteCode });
    if (!course) {
      return res.status(404).json({ msg: 'Class not found' });
    }

    // Add student to class if not already enrolled
    if (!course.students.includes(req.user.id)) {
      course.students.push(req.user.id);
      await course.save();
    }

    res.json(course);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};


// @desc    Get gradebook for a class
exports.getGradebook = async (req, res) => {
  try {
    const classId = req.params.id;
    console.log("Backend: getGradebook - Received classId:", classId);

    // Ensure user is authorized (teacher of the class or a student in the class)
    const classItem = await Class.findById(classId).populate('students', 'name email');
    console.log("Backend: getGradebook - Class found (or not):", classItem ? classItem._id : 'null');

    if (!classItem) {
      return res.status(404).json({ msg: 'Class not found' });
    }

    const isTeacher = classItem.teacher.toString() === req.user.id;
    const isStudent = classItem.students.some(student => student._id.toString() === req.user.id);
    console.log('isTeacher:', isTeacher, 'isStudent:', isStudent);

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ msg: 'Not authorized to access this gradebook' });
    }

    // Get all quizzes for this class
    console.log("Backend: getGradebook - Fetching quizzes for class...");
    const quizzesInClass = await Quiz.find({ class: classId });
    const quizIds = quizzesInClass.map(quiz => quiz._id);
    console.log("Backend: getGradebook - Found quizzes:", quizIds.length);

    // Get all quiz results for these quizzes
    console.log("Backend: getGradebook - Fetching quiz results...");
    const allQuizResults = await QuizResult.find({
      quiz: { $in: quizIds },
      student: { $in: classItem.students.map(s => s._id) }
    }).populate('student', 'name email');
    console.log("Backend: getGradebook - Found quiz results:", allQuizResults.length);

    // Calculate average scores for each student
    const gradebook = classItem.students.map(student => {
      const studentResults = allQuizResults.filter(result =>
        result.student._id.toString() === student._id.toString()
      );

      let totalPointsScored = 0;
      let totalPointsPossible = 0;

      studentResults.forEach(result => {
        totalPointsScored += result.score;
        totalPointsPossible += result.totalQuestions;
      });

      const averageScore = totalPointsPossible > 0 ? (totalPointsScored / totalPointsPossible) * 100 : 0;

      return {
        id: student._id,
        name: student.name,
        email: student.email,
        averageScore: parseFloat(averageScore.toFixed(2)), // Round to 2 decimal places
      };
    });
    console.log("Backend: getGradebook - Gradebook calculated. Sending response...");
    res.json(gradebook);
  } catch (err) {
    console.error('Error in getGradebook:', err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get a student's grades for a specific class
// @route   GET /api/classes/:id/my-grades
// @access  Private (Student)
exports.getMyGrades = async (req, res) => {
  try {
    const classId = req.params.id;
    const studentId = req.user.id;

    // Ensure the user is a student in this class
    const classItem = await Class.findOne({ _id: classId, students: studentId });
    if (!classItem) {
      return res.status(403).json({ msg: 'Not authorized to view grades for this class' });
    }

    // Get all quizzes for this class
    const quizzesInClass = await Quiz.find({ class: classId }).select('_id title');
    const quizIds = quizzesInClass.map(quiz => quiz._id);

    // Get all quiz results for this student for these quizzes
    const studentQuizResults = await QuizResult.find({
      quiz: { $in: quizIds },
      student: studentId
    }).populate('quiz', 'title');

    const myGrades = studentQuizResults.map(result => ({
      quizId: result.quiz._id,
      quizTitle: result.quiz.title,
      score: (result.score / result.totalQuestions) * 100,
      isLate: result.isLate || false,
    }));

    res.json(myGrades);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get a student's attendance summary across all their classes
// @route   GET /api/classes/my-attendance-summary
// @access  Private (Student)
exports.getStudentAttendanceSummary = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Find all classes the student is enrolled in
    const enrolledClasses = await Class.find({ students: studentId }).select('_id');
    const classIds = enrolledClasses.map(cls => cls._id);

    // Find all attendance records for these classes where the student is present or absent
    const attendanceRecords = await Attendance.find({
      class: { $in: classIds },
      'records.student': studentId,
    });

    let totalPresent = 0;
    let totalRecords = 0;

    attendanceRecords.forEach(attendance => {
      attendance.records.forEach(record => {
        if (record.student.toString() === studentId.toString()) {
          totalRecords++;
          if (record.status === 'Present') {
            totalPresent++;
          }
        }
      });
    });

    res.json({ totalPresent, totalRecords });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
