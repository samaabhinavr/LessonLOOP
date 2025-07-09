const QuizResult = require('../firestore/models/QuizResult');
const Quiz = require('../firestore/models/Quiz');

exports.getAnalytics = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.dbUser.id;
    const userRole = req.user.dbUser.role;

    let results;
    const quizzesInClass = await Quiz.getQuizzesForClass(classId);
    const quizIds = quizzesInClass.map(q => q.id);

    if (userRole === 'Teacher') {
      results = await QuizResult.getResultsForQuizzes(quizIds);
    } else {
      results = await QuizResult.getResultsForStudentInQuizzes(userId, quizIds);
    }
    const quizMap = new Map(quizzesInClass.map(q => [q.id, q]));

    const topicScores = {};
    for (const result of results) {
      const quiz = quizMap.get(result.quiz);
      if (quiz) {
        const { topic } = quiz;
        const score = (result.score / result.totalQuestions) * 100;
        if (!topicScores[topic]) {
          topicScores[topic] = [];
        }
        topicScores[topic].push(score);
      }
    }

    const analytics = Object.keys(topicScores).map(topic => {
      const scores = topicScores[topic];
      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
      return { topic, average, quizzes: scores.length };
    });

    const strongest = analytics.filter(t => t.average >= 80).sort((a, b) => b.average - a.average);
    const weakest = analytics.filter(t => t.average < 50).sort((a, b) => a.average - b.average);
    const almostMastered = analytics.filter(t => t.average >= 50 && t.average < 80).sort((a, b) => b.average - a.average);

    res.json({ strongest, weakest, almostMastered });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error: Failed to fetch analytics data.' });
  }
};