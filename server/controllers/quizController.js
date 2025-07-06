
const Quiz = require('../models/Quiz');
const Class = require('../models/Class');
const QuizResult = require('../models/QuizResult');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// @desc    Create a new quiz
// @route   POST /api/quizzes
// @access  Private (Teacher)
exports.createQuiz = async (req, res) => {
  const { classId, title, questions, dueDate, dueTime, topic, difficulty } = req.body;

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
      } else {
        // If no specific time is provided, set to end of the day
        dueDateTime.setHours(23, 59, 59, 999);
      }
    }

    const newQuiz = new Quiz({
      class: classId,
      title,
      topic,
      difficulty,
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
    const quizzes = await Quiz.find({ class: req.params.classId }).populate('createdBy', 'name email').select('+difficulty');
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
    const quizResults = await QuizResult.find({ quiz: req.params.quizId }).populate('student', 'name email').select('+createdAt +isLate'); // Select createdAt and isLate
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

// @desc    Get a specific quiz attempt by ID
// @route   GET /api/quizzes/result/:quizId/attempt/:attemptId
// @access  Private (Teacher/Student)
exports.getQuizAttemptById = async (req, res) => {
  try {
    const quizResult = await QuizResult.findById(req.params.attemptId).populate('student', 'name email');

    if (!quizResult) {
      return res.status(404).json({ msg: 'Quiz result not found' });
    }

    // Ensure user has access to the quiz's class
    const quiz = await Quiz.findById(quizResult.quiz);
    const userClass = await Class.findOne({
      _id: quiz.class,
      $or: [{ teacher: req.user.id }, { students: req.user.id }],
    });

    if (!userClass) {
      return res.status(403).json({ msg: 'Not authorized to access this quiz result' });
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
  console.log('Received request to generate MCQs with body:', req.body);
  const { topic, numQuestions, difficulty, gradeLevel } = req.body;

  if (req.user.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can generate quizzes' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert quiz creator. Generate ${numQuestions} multiple-choice questions about ${topic} for a ${gradeLevel} grade level from CBSE syllabus, with a difficulty of ${difficulty}. Each question must have exactly 4 options. Your response must be a valid, parsable JSON array of objects. Each object in the array must have the following properties and types: 'questionText' (string), 'options' (an array of exactly 4 objects, each with a 'text' property of type string), 'correctAnswer' (the 0-based index of the correct option, must be a number between 0 and 3), and 'explanation' (a brief explanation for why the correct answer is correct). Return ONLY the JSON array. Do not include any extra text, explanations, or formatting outside of the JSON array.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Attempt to clean the response by removing markdown code block formatting
    if (text.startsWith('```json') && text.endsWith('```')) {
      text = text.substring(7, text.length - 3).trim();
    } else if (text.startsWith('```') && text.endsWith('```')) {
      // Fallback for generic code blocks
      text = text.substring(3, text.length - 3).trim();
    }

    let generatedQuestions;
    try {
      generatedQuestions = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", parseError);
      console.error("Raw Gemini response:", text);
      return res.status(500).json({ msg: "Failed to generate questions: Invalid JSON response from AI." });
    }

    // Validate the structure of the generated questions
    if (!Array.isArray(generatedQuestions)) {
      return res.status(500).json({ msg: "Failed to generate questions: AI response is not a JSON array." });
    }

    for (const question of generatedQuestions) {
      if (
        !question.explanation ||
        !question.questionText ||
        !Array.isArray(question.options) ||
        question.options.length !== 4 ||
        typeof question.correctAnswer !== 'number' ||
        question.correctAnswer < 0 ||
        question.correctAnswer > 3
      ) {
        return res.status(500).json({ msg: "Failed to generate questions: AI response does not match the expected schema." });
      }
    }

    res.json({ questions: generatedQuestions });
  } catch (err) {
    console.error('Error generating MCQs:', err);
    res.status(500).send('Server error');
  }
};

// @desc    Get all quiz results for a student in a specific class
// @route   GET /api/quizzes/my-results/:classId
// @access  Private (Student)
exports.getStudentQuizResultsInClass = async (req, res) => {
  if (req.user.role !== 'Student') {
    return res.status(403).json({ msg: 'Only students can view their own quiz results' });
  }

  try {
    const quizResults = await QuizResult.find({ student: req.user.id }).select('+isLate').populate({
      path: 'quiz',
      match: { class: req.params.classId },
      select: 'title questions topic difficulty dueDate', // Select necessary quiz fields including dueDate
    });

    // Filter out results where the quiz field is null (due to the match condition)
    const filteredResults = quizResults.filter(result => result.quiz !== null);

    res.json(filteredResults);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
