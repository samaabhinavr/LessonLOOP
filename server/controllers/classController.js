const Class = require('../models/Class');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
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

exports.exportClassData = async (req, res) => {
  try {
    const classId = req.params.id;

    // Ensure user is authorized (teacher of the class)
    const classItem = await Class.findById(classId).populate('teacher', 'name email').populate('students', 'name email');

    if (!classItem) {
      return res.status(404).json({ msg: 'Class not found' });
    }

    if (classItem.teacher._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to export data for this class' });
    }

    let csvContent = '';

    // Section 1: Class Overview
    csvContent += `Class Name:,${classItem.name}\n`;
    csvContent += `Teacher:,${classItem.teacher.name}\n`;
    csvContent += `Invite Code:,${classItem.inviteCode}\n`;
    csvContent += `Export Date:,${new Date().toLocaleString()}\n\n`;

    // Section 2: Class Performance Summary (Analytics)
    csvContent += 'Class Performance Summary\n';
    csvContent += 'Category,Topic,Average Score (%)\n';

    const quizzesInClass = await Quiz.find({ class: classId });
    const quizIds = quizzesInClass.map(quiz => quiz._id);
    const allQuizResults = await QuizResult.find({ quiz: { $in: quizIds } }).populate('quiz', 'topic');

    const topicScores = {};
    allQuizResults.forEach(result => {
      const { topic } = result.quiz;
      const score = (result.score / result.totalQuestions) * 100;
      if (!topicScores[topic]) {
        topicScores[topic] = [];
      }
      topicScores[topic].push(score);
    });

    const analytics = Object.keys(topicScores).map(topic => {
      const scores = topicScores[topic];
      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
      return { topic, average, quizzes: scores.length };
    });

    const strongest = analytics.filter(t => t.average >= 80).sort((a, b) => b.average - a.average);
    const weakest = analytics.filter(t => t.average < 50).sort((a, b) => a.average - b.average);
    const almostMastered = analytics.filter(t => t.average >= 50 && t.average < 80).sort((a, b) => b.average - a.average);

    strongest.forEach(t => { csvContent += `Strongest,${t.topic},${t.average.toFixed(2)}\n`; });
    weakest.forEach(t => { csvContent += `Weakest,${t.topic},${t.average.toFixed(2)}\n`; });
    almostMastered.forEach(t => { csvContent += `Almost Mastered,${t.topic},${t.average.toFixed(2)}\n`; });
    csvContent += '\n';

    // Section 3: Individual Student Performance
    csvContent += 'Individual Student Performance\n';

    const studentQuizResultsMap = new Map(); // Map<studentId, Map<quizId, score>>
    const studentTotalScores = new Map(); // Map<studentId, { totalScored, totalPossible }>

    allQuizResults.forEach(result => {
      const studentId = result.student.toString();
      const quizId = result.quiz._id.toString();
      const score = (result.score / result.totalQuestions) * 100;

      if (!studentQuizResultsMap.has(studentId)) {
        studentQuizResultsMap.set(studentId, new Map());
      }
      studentQuizResultsMap.get(studentId).set(quizId, score);

      if (!studentTotalScores.has(studentId)) {
        studentTotalScores.set(studentId, { totalScored: 0, totalPossible: 0 });
      }
      const currentTotals = studentTotalScores.get(studentId);
      currentTotals.totalScored += result.score;
      currentTotals.totalPossible += result.totalQuestions;
    });

    // Prepare headers for individual student performance
    let studentHeaders = 'Student Name,Student Email';
    const quizHeaders = quizzesInClass.map(quiz => `${quiz.title} (${quiz.topic})`);
    studentHeaders += ',' + quizHeaders.join(',') + ',Overall Average (%)\n';
    csvContent += studentHeaders;

    // Populate student rows
    classItem.students.forEach(student => {
      let studentRow = `"${student.name}","${student.email}"`;
      const studentResults = studentQuizResultsMap.get(student._id.toString()) || new Map();

      quizIds.forEach(quizId => {
        const score = studentResults.has(quizId.toString()) ? studentResults.get(quizId.toString()).toFixed(2) : 'N/A';
        studentRow += `,${score}`;
      });

      const overallTotals = studentTotalScores.get(student._id.toString());
      const overallAverage = overallTotals && overallTotals.totalPossible > 0
        ? ((overallTotals.totalScored / overallTotals.totalPossible) * 100).toFixed(2)
        : 'N/A';
      studentRow += `,${overallAverage}\n`;
      csvContent += studentRow;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`${classItem.name.replace(/\s/g, '_')}_Class_Report.csv`);
    res.send(csvContent);

  } catch (err) {
    console.error('Error exporting class data:', err.message);
    res.status(500).send('Server error');
  }
};

