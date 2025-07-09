
const QuizResult = require('../firestore/models/QuizResult');

// @desc    Get average grade for a student
// @route   GET /api/student/average-grade
// @access  Private (Student)
exports.getAverageGrade = async (req, res) => {
  try {
    const studentId = req.user.dbUser.id;

    const results = await QuizResult.getResultsForStudent(studentId);

    if (results.length === 0) {
      return res.json({ averageGrade: 0 });
    }

    const totalScore = results.reduce((acc, result) => acc + (result.score / result.totalQuestions) * 100, 0);
    const averageGrade = totalScore / results.length;

    res.json({ averageGrade });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error: Failed to fetch average grade.' });
  }
};
