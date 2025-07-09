const Class = require('../firestore/models/Class');
const User = require('../firestore/models/User');
const Quiz = require('../firestore/models/Quiz');
const QuizResult = require('../firestore/models/QuizResult');

// @desc    Create a class
exports.createClass = async (req, res) => {
  // Only teachers can create classes
  if (req.user.dbUser.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can create classes' });
  }

  const { name } = req.body;

  try {
    const newClass = {
      name,
      teacher: req.user.dbUser.id,
      students: [],
    };

    const savedClass = await Class.create(newClass);
    res.json(savedClass);
  } catch (err) {
    console.error('Error in createClass:', err);
    res.status(500).send('Server error');
  }
};

// @desc    Get all classes for a user
exports.getClasses = async (req, res) => {
  try {
    let classes;
    if (req.user.dbUser.role === 'Teacher') {
      // Find classes where the user is the teacher
      classes = await Class.getClassesForTeacher(req.user.dbUser.id);
    } else {
      // Find classes where the user is a student
      classes = await Class.getClassesForStudent(req.user.dbUser.id);
    }
    res.json(classes);
  } catch (err) {
    console.error('Error in getClasses:', err);
    res.status(500).send('Server error');
  }
};

// @desc    Get a single class by ID
exports.getClassById = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({ msg: 'Class not found' });
    }

    // Check if the user is either the teacher or a student in the class
    const isTeacher = classItem.teacher === req.user.dbUser.id;
    const isStudent = classItem.students.includes(req.user.dbUser.id);

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ msg: 'Not authorized to access this class' });
    }

    res.json(classItem);
  } catch (err) {
    console.error('Error in getClassById:', err);
    res.status(500).send('Server error');
  }
};

// @desc    Join a class
exports.joinClass = async (req, res) => {
  // Only students can join classes
  if (req.user.dbUser.role !== 'Student') {
    return res.status(403).json({ msg: 'Only students can join classes' });
  }

  const { inviteCode } = req.body;

  try {
    const course = await Class.findByInviteCode(inviteCode);
    if (!course) {
      return res.status(404).json({ msg: 'Class not found' });
    }

    // Add student to class if not already enrolled
    if (!course.students.includes(req.user.dbUser.id)) {
      const updatedStudents = [...course.students, req.user.dbUser.id];
      await Class.update(course.id, { students: updatedStudents });
    }

    res.json(course);
  } catch (err) {
    console.error('Error in joinClass:', err);
    res.status(500).send('Server error');
  }
};


// @desc    Get gradebook for a class
exports.getGradebook = async (req, res) => {
  try {
    const classId = req.params.id;

    // Ensure user is authorized (teacher of the class or a student in the class)
    const classItem = await Class.findById(classId);

    if (!classItem) {
      return res.status(404).json({ msg: 'Class not found' });
    }

    const isTeacher = classItem.teacher === req.user.dbUser.id;
    const isStudent = classItem.students.includes(req.user.dbUser.id);

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ msg: 'Not authorized to access this gradebook' });
    }

    // Get all quizzes for this class
    const quizzesInClass = await Quiz.getQuizzesForClass(classId);
    const quizIds = quizzesInClass.map(quiz => quiz.id);

    // Get all quiz results for these quizzes
    const allQuizResults = await QuizResult.getResultsForQuizzes(quizIds);

    // Calculate average scores for each student
    const gradebook = await Promise.all(classItem.students.map(async studentId => {
      const student = await User.findByFirebaseUid(studentId);
      const studentResults = allQuizResults.filter(result =>
        result.student === studentId
      );

      let totalPointsScored = 0;
      let totalPointsPossible = 0;

      studentResults.forEach(result => {
        totalPointsScored += result.score;
        totalPointsPossible += result.totalQuestions;
      });

      const averageScore = totalPointsPossible > 0 ? (totalPointsScored / totalPointsPossible) * 100 : 0;

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        averageScore: parseFloat(averageScore.toFixed(2)), // Round to 2 decimal places
      };
    }));

    res.json(gradebook);
  } catch (err) {
    console.error('Error in getGradebook:', err);
    res.status(500).send('Server error');
  }
};

// @desc    Get a student's grades for a specific class
// @route   GET /api/classes/:id/my-grades
// @access  Private (Student)
exports.getMyGrades = async (req, res) => {
  try {
    const classId = req.params.id;
    const studentId = req.user.dbUser.id;

    // Ensure the user is a student in this class
    const classItem = await Class.findById(classId);
    if (!classItem || !classItem.students.includes(studentId)) {
      return res.status(403).json({ msg: 'Not authorized to view grades for this class' });
    }

    // Get all quizzes for this class
    const quizzesInClass = await Quiz.getQuizzesForClass(classId);
    const quizIds = quizzesInClass.map(quiz => quiz.id);

    // Get all quiz results for this student for these quizzes
    const studentQuizResults = await QuizResult.getResultsForStudentInQuizzes(studentId, quizIds);

    const myGrades = studentQuizResults.map(result => ({
      quizId: result.quiz,
      quizTitle: quizzesInClass.find(q => q.id === result.quiz).title,
      score: (result.score / result.totalQuestions) * 100,
      isLate: result.isLate || false,
    }));

    res.json(myGrades);
  } catch (err) {
    console.error('Error in getMyGrades:', err);
    res.status(500).send('Server error');
  }
};

exports.exportClassData = async (req, res) => {
  try {
    const classId = req.params.id;

    // Ensure user is authorized (teacher of the class)
    const classItem = await Class.findById(classId);

    if (!classItem) {
      return res.status(404).json({ msg: 'Class not found' });
    }

    if (classItem.teacher !== req.user.dbUser.id) {
      return res.status(403).json({ msg: 'Not authorized to export data for this class' });
    }

    let csvContent = '';

    // Section 1: Class Overview
    const teacher = await User.findByFirebaseUid(classItem.teacher);
    csvContent += `Class Name:,${classItem.name}\n`;
    csvContent += `Teacher:,${teacher.name}\n`;
    csvContent += `Invite Code:,${classItem.inviteCode}\n`;
    csvContent += `Export Date:,${new Date().toLocaleString()}\n\n`;

    // Section 2: Class Performance Summary (Analytics)
    csvContent += 'Class Performance Summary\n';
    csvContent += 'Category,Topic,Average Score (%)\n';

    const quizzesInClass = await Quiz.getQuizzesForClass(classId);
    const quizIds = quizzesInClass.map(quiz => quiz.id);
    const allQuizResults = await QuizResult.getResultsForQuizzes(quizIds);

    const topicScores = {};
    allQuizResults.forEach(result => {
      const quiz = quizzesInClass.find(q => q.id === result.quiz);
      const { topic } = quiz;
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
      const studentId = result.student;
      const quizId = result.quiz;
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
    await Promise.all(classItem.students.map(async studentId => {
      const student = await User.findByFirebaseUid(studentId);
      let studentRow = `"${student.name}","${student.email}"`;
      const studentResults = studentQuizResultsMap.get(studentId) || new Map();

      quizIds.forEach(quizId => {
        const score = studentResults.has(quizId) ? studentResults.get(quizId).toFixed(2) : 'N/A';
        studentRow += `,${score}`;
      });

      const overallTotals = studentTotalScores.get(studentId);
      const overallAverage = overallTotals && overallTotals.totalPossible > 0
        ? ((overallTotals.totalScored / overallTotals.totalPossible) * 100).toFixed(2)
        : 'N/A';
      studentRow += `,${overallAverage}\n`;
      csvContent += studentRow;
    }));

    res.header('Content-Type', 'text/csv');
    res.attachment(`${classItem.name.replace(/\s/g, '_')}_Class_Report.csv`);
    res.send(csvContent);

  } catch (err) {
    console.error('Error exporting class data:', err);
    res.status(500).send('Server error');
  }
};





