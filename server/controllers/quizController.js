
const Quiz = require('../models/Quiz');
const Class = require('../models/Class');
const QuizResult = require('../models/QuizResult');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI('AIzaSyDTmhvGQv0G4jr6v4ABeuGxejppVuC3PeU');

// @desc    Create a new quiz
// @route   POST /api/quizzes
// @access  Private (Teacher)
exports.createQuiz = async (req, res) => {
  const { classId, title, questions, dueDate, dueTime } = req.body;

  // Check if user is a teacher
  if (req.user.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can create quizzes' });
  }

  try {
    // Verify the class exists and the teacher owns it
    const existingClass = await Class.findOne({ _id: classId, teacher: req.user.id });
    if (!existingClass) {
      return res.status(404).json({ msg: 'Class not found or you do not have permission to create quizzes for this class' });
    }

    let dueDateTime;
    if (dueDate) {
      dueDateTime = new Date(dueDate);
      if (dueTime) {
        const [hours, minutes] = dueTime.split(':');
        dueDateTime.setHours(hours);
        dueDateTime.setMinutes(minutes);
      }
    }

    const newQuiz = new Quiz({
      class: classId,
      title,
      questions,
      createdBy: req.user.id,
      dueDate: dueDateTime,
    });

    const quiz = await newQuiz.save();
    res.status(201).json(quiz);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get quizzes for a specific class
// @route   GET /api/quizzes/:classId
// @access  Private (Teacher/Student)
exports.getQuizzes = async (req, res) => {
  try {
    console.log("Backend: getQuizzes - Received classId:", req.params.classId);
    console.log("Backend: getQuizzes - Attempting to find quizzes and populate createdBy...");
    const quizzes = await Quiz.find({ class: req.params.classId }).populate('createdBy', 'name email');
    console.log("Backend: getQuizzes - Found quizzes:", quizzes.length);
    res.json(quizzes);
  } catch (err) {
    console.error('Error in getQuizzes:', err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get a single quiz by ID
// @route   GET /api/quizzes/quiz/:id
// @access  Private (Teacher/Student)
exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('createdBy', 'name email');

    if (!quiz) {
      return res.status(404).json({ msg: 'Quiz not found' });
    }

    // Ensure user has access to the quiz's class
    const userClass = await Class.findOne({
      _id: quiz.class,
      $or: [{ teacher: req.user.id }, { students: req.user.id }],
    });

    if (!userClass) {
      return res.status(403).json({ msg: 'Not authorized to access this quiz' });
    }

    res.json(quiz);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Update a quiz
// @route   PUT /api/quizzes/quiz/:id
// @access  Private (Teacher)
exports.updateQuiz = async (req, res) => {
  const { title, questions, dueDate, dueTime, status } = req.body;

  // Check if user is a teacher
  if (req.user.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can update quizzes' });
  }

  try {
    let quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ msg: 'Quiz not found' });
    }

    // Ensure teacher created this quiz
    if (quiz.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to update this quiz' });
    }

    quiz.title = title || quiz.title;
    quiz.questions = questions || quiz.questions;
    quiz.status = status || quiz.status;

    if (dueDate) {
      let dueDateTime = new Date(dueDate);
      if (dueTime) {
        const [hours, minutes] = dueTime.split(':');
        dueDateTime.setHours(hours);
        dueDateTime.setMinutes(minutes);
      }
      quiz.dueDate = dueDateTime;
    } else {
      quiz.dueDate = null;
    }

    await quiz.save();
    res.json(quiz);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Delete a quiz
// @route   DELETE /api/quizzes/quiz/:id
// @access  Private (Teacher)
exports.deleteQuiz = async (req, res) => {
  // Check if user is a teacher
  if (req.user.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can delete quizzes' });
  }

  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ msg: 'Quiz not found' });
    }

    // Ensure teacher created this quiz
    if (quiz.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this quiz' });
    }

    await quiz.deleteOne();
    res.json({ msg: 'Quiz removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Publish a quiz
// @route   PUT /api/quizzes/publish/:id
// @access  Private (Teacher)
exports.publishQuiz = async (req, res) => {
  // Check if user is a teacher
  if (req.user.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can publish quizzes' });
  }

  try {
    let quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ msg: 'Quiz not found' });
    }

    // Ensure teacher created this quiz
    if (quiz.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to publish this quiz' });
    }

    quiz.status = 'Published';
    await quiz.save();
    res.json(quiz);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Submit a quiz (student)
// @route   POST /api/quizzes/submit/:id
// @access  Private (Student)
exports.submitQuiz = async (req, res) => {
  const { answers } = req.body;

  // Check if user is a student
  if (req.user.role !== 'Student') {
    return res.status(403).json({ msg: 'Only students can submit quizzes' });
  }

  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ msg: 'Quiz not found' });
    }

    if (quiz.status !== 'Published') {
      return res.status(400).json({ msg: 'Quiz is not published or available for submission' });
    }

    // Check if student has already submitted this quiz
    const existingResult = await QuizResult.findOne({ quiz: quiz._id, student: req.user.id });
    if (existingResult) {
      return res.status(400).json({ msg: 'You have already submitted this quiz' });
    }

    // Basic scoring logic (can be expanded)
    let score = 0;
    const studentAnswers = [];
    for (let i = 0; i < quiz.questions.length; i++) {
      const selectedOptionIndex = answers[i];
      studentAnswers.push({
        questionIndex: i,
        selectedOptionIndex: selectedOptionIndex,
      });
      if (selectedOptionIndex !== undefined && selectedOptionIndex === quiz.questions[i].correctAnswer) {
        score++;
      }
    }

    // Check for late submission
    const isLate = quiz.dueDate && new Date() > new Date(quiz.dueDate);

    // Save the quiz result
    const quizResult = new QuizResult({
      quiz: quiz._id,
      student: req.user.id,
      answers: studentAnswers,
      score: score,
      totalQuestions: quiz.questions.length,
      isLate: isLate,
    });

    await quizResult.save();

    res.json({ score, totalQuestions: quiz.questions.length, quizResultId: quizResult._id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get all results for a specific quiz (Teacher)
// @route   GET /api/quizzes/results/:quizId
// @access  Private (Teacher)
exports.getQuizResultsForQuiz = async (req, res) => {
  if (req.user.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can view all quiz results' });
  }

  try {
    const quizResults = await QuizResult.find({ quiz: req.params.quizId }).populate('student', 'name email');
    res.json(quizResults);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get a student's result for a specific quiz
// @route   GET /api/quizzes/result/:quizId
// @access  Private (Student)
exports.getQuizResultForStudent = async (req, res) => {
  if (req.user.role !== 'Student') {
    return res.status(403).json({ msg: 'Only students can view their own quiz results' });
  }

  try {
    const quizResult = await QuizResult.findOne({ quiz: req.params.quizId, student: req.user.id });

    if (!quizResult) {
      return res.status(404).json({ msg: 'Quiz result not found for this student' });
    }

    res.json(quizResult);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Generate MCQs using AI
// @route   POST /api/quizzes/generate-mcq
// @access  Private (Teacher)
exports.generateMCQ = async (req, res) => {
  const { topic, numQuestions, difficulty, gradeLevel } = req.body;

  if (req.user.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can generate quizzes' });
  }

  try {
    console.log("GEMINI_API_KEY loaded:", process.env.GEMINI_API_KEY ? "Yes" : "No");
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Generate ${numQuestions} multiple-choice questions about ${topic} for a ${gradeLevel} grade level, with a difficulty of ${difficulty}. Each question should have 4 options. Provide the output as a JSON array of objects, where each object has 'questionText' (string), 'options' (an array of objects, each with a 'text'), and 'correctAnswer' (the 0-based index of the correct option). Ensure the JSON is valid and can be directly parsed.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Attempt to parse the JSON response
    let generatedQuestions;
    try {
      generatedQuestions = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", parseError);
      console.error("Gemini raw response:", text);
      return res.status(500).json({ msg: "Failed to generate questions: Invalid JSON response from AI." });
    }

    res.json({ questions: generatedQuestions });
  } catch (err) {
    console.error('Error generating MCQs:', err);
    res.status(500).send('Server error');
  }
};
