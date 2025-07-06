const QuizResult = require('../models/QuizResult');
const Quiz = require('../models/Quiz');

exports.getAnalytics = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let results;
    if (userRole === 'Teacher') {
      const quizzesInClass = await Quiz.find({ class: classId }).select('_id');
      const quizIds = quizzesInClass.map(q => q._id);
      results = await QuizResult.find({ quiz: { $in: quizIds } }).populate('quiz', 'topic');
    } else {
      results = await QuizResult.find({ student: userId })
        .populate({
          path: 'quiz',
          match: { class: classId },
          select: 'topic'
        });
    }

    results = results.filter(r => r.quiz);

    const topicScores = {};
    results.forEach(result => {
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

    res.json({ strongest, weakest, almostMastered });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};