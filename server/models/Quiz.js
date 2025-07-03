
const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  questions: [
    {
      questionText: {
        type: String,
        required: true,
      },
      options: [
        {
          text: { type: String, required: true },
        },
      ],
      correctAnswer: {
        type: Number, // Index of the correct option in the options array
        required: true,
      },
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Archived'],
    default: 'Draft',
  },
  dueDate: {
    type: Date,
    required: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('Quiz', QuizSchema);
