
const mongoose = require('mongoose');

const QuizResultSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  answers: [
    {
      questionIndex: {
        type: Number,
        required: true,
      },
      selectedOptionIndex: {
        type: Number,
        required: true,
      },
    },
  ],
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('QuizResult', QuizResultSchema);
