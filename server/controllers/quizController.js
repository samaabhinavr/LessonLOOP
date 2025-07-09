
const Quiz = require('../firestore/models/Quiz');
const Class = require('../firestore/models/Class');
const QuizResult = require('../firestore/models/QuizResult');
const Notification = require('../firestore/models/Notification');
const User = require('../firestore/models/User'); // Import User model
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Create a new quiz
// @route   POST /api/quizzes
// @access  Private (Teacher)
exports.createQuiz = async (req, res) => {
  const { classId, title, questions, dueDate, dueTime, topic, difficulty } = req.body;

  // Check if user is a teacher
  if (req.user.dbUser.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can create quizzes' });
  }

  try {
    // Verify the class exists and the teacher owns it
    const existingClass = await Class.findById(classId);
    if (!existingClass || existingClass.teacher !== req.user.dbUser.id) {
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

    const newQuiz = {
      class: classId,
      title,
      topic,
      difficulty,
      questions,
      createdBy: req.user.dbUser.id,
      dueDate: dueDateTime || null,
      status: 'Draft',
    };

    const quiz = await Quiz.create(newQuiz);

    // Notify students in the class
    if (existingClass && existingClass.students.length > 0) {
      const notifications = existingClass.students.map(studentId => ({
        recipient: studentId,
        type: 'newQuiz',
        message: `A new quiz "${title}" has been posted in ${existingClass.name}.`,
        link: `/class/${classId}`,
      }));
      await Notification.createMany(notifications);
    }

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
    const quizzes = await Quiz.getQuizzesForClass(req.params.classId);
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
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ msg: 'Quiz not found' });
    }

    // Ensure user has access to the quiz's class
    const userClass = await Class.findById(quiz.class);
    const isTeacher = userClass.teacher === req.user.dbUser.id;
    const isStudent = userClass.students.includes(req.user.dbUser.id);

    if (!isTeacher && !isStudent) {
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
  if (req.user.dbUser.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can update quizzes' });
  }

  try {
    let quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ msg: 'Quiz not found' });
    }

    // Ensure teacher created this quiz
    if (quiz.createdBy !== req.user.dbUser.id) {
      return res.status(403).json({ msg: 'Not authorized to update this quiz' });
    }

    const updatedData = {
      title: title || quiz.title,
      questions: questions || quiz.questions,
      status: status || quiz.status,
    };

    if (dueDate) {
      let dueDateTime = new Date(dueDate);
      if (dueTime) {
        const [hours, minutes] = dueTime.split(':');
        dueDateTime.setHours(hours);
        dueDateTime.setMinutes(minutes);
      }
      updatedData.dueDate = dueDateTime;
    } else {
      updatedData.dueDate = null;
    }

    await Quiz.update(req.params.id, updatedData);
    res.json({ ...quiz, ...updatedData });
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
  if (req.user.dbUser.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can delete quizzes' });
  }

  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ msg: 'Quiz not found' });
    }

    // Ensure teacher created this quiz
    if (quiz.createdBy !== req.user.dbUser.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this quiz' });
    }

    await Quiz.delete(req.params.id);
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
  if (req.user.dbUser.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can publish quizzes' });
  }

  try {
    let quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ msg: 'Quiz not found' });
    }

    // Ensure teacher created this quiz
    if (quiz.createdBy !== req.user.dbUser.id) {
      return res.status(403).json({ msg: 'Not authorized to publish this quiz' });
    }

    await Quiz.update(req.params.id, { status: 'Published' });
    res.json({ ...quiz, status: 'Published' });
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
  if (req.user.dbUser.role !== 'Student') {
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
    const existingResult = await QuizResult.findResult(req.params.id, req.user.dbUser.id);
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
    const quizResult = {
      quiz: req.params.id,
      student: req.user.dbUser.id,
      answers: studentAnswers,
      score: score,
      totalQuestions: quiz.questions.length,
      isLate: isLate,
    };

    const newResult = await QuizResult.create(quizResult);

    res.json({ score, totalQuestions: quiz.questions.length, quizResultId: newResult.id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get all results for a specific quiz (Teacher)
// @route   GET /api/quizzes/results/:quizId
// @access  Private (Teacher)
exports.getQuizResultsForQuiz = async (req, res) => {
  if (req.user.dbUser.role !== 'Teacher') {
    return res.status(403).json({ msg: 'Only teachers can view all quiz results' });
  }

  try {
    const quizResults = await QuizResult.getResultsForQuiz(req.params.quizId);

    // Extract unique student IDs
    const studentIds = [...new Set(quizResults.map(result => result.student))];

    // Fetch all unique student details in parallel
    const students = await Promise.all(studentIds.map(id => User.findByFirebaseUid(id)));

    // Create a map for quick lookup
    const studentMap = new Map(students.filter(s => s).map(s => [s.id, { _id: s.id, name: s.name, email: s.email }]));

    // Populate student details for each result
    const populatedResults = quizResults.map(result => ({
      ...result,
      student: studentMap.get(result.student) || null, // Use map for efficient lookup
    }));

    res.json(populatedResults);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get a student's result for a specific quiz
// @route   GET /api/quizzes/result/:quizId
// @access  Private (Student)
exports.getQuizResultForStudent = async (req, res) => {
  if (req.user.dbUser.role !== 'Student') {
    return res.status(403).json({ msg: 'Only students can view their own quiz results' });
  }

  try {
    const quizResult = await QuizResult.findResult(req.params.quizId, req.user.dbUser.id);

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
    const quizResult = await QuizResult.findById(req.params.attemptId);

    if (!quizResult) {
      return res.status(404).json({ msg: 'Quiz result not found' });
    }

    // Ensure user has access to the quiz's class
    const quiz = await Quiz.findById(quizResult.quiz);
    const userClass = await Class.findById(quiz.class);
    const isTeacher = userClass.teacher === req.user.dbUser.id;
    const isStudent = userClass.students.includes(req.user.dbUser.id);

    if (!isTeacher && !isStudent) {
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
  const { topic, numQuestions, difficulty, gradeLevel } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert quiz creator. Generate ${numQuestions} multiple-choice questions about ${topic} for a ${gradeLevel} grade level, with a difficulty of ${difficulty}. Each question must have exactly 4 options. Your response must be a valid, parsable JSON array of objects. Each object in the array must have the following properties and types: 'questionText' (string), 'options' (an array of exactly 4 objects, each with a 'text' property of type string), 'correctAnswer' (the 0-based index of the correct option, must be a number between 0 and 3), and 'explanation' (a brief explanation for why the correct answer is correct). Return ONLY the JSON array. Do not include any extra text, explanations, or formatting outside of the JSON array.`;

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
    res.status(500).json({ msg: 'Failed to generate MCQs: ' + err.message });
  }
};

// @desc    Get all quiz results for a student in a specific class
// @route   GET /api/quizzes/my-results/:classId
// @access  Private (Student)
exports.getStudentQuizResultsInClass = async (req, res) => {
  if (req.user.dbUser.role !== 'Student') {
    return res.status(403).json({ msg: 'Only students can view their own quiz results' });
  }

  try {
    const classId = req.params.classId;
    const studentId = req.user.dbUser.id;

    const quizzesInClass = await Quiz.getQuizzesForClass(classId);
    const quizIds = quizzesInClass.map(quiz => quiz.id);

    const quizResults = await QuizResult.getResultsForStudentInQuizzes(studentId, quizIds);

    const filteredResults = quizResults.map(result => {
      const quiz = quizzesInClass.find(q => q.id === result.quiz);
      return {
        ...result,
        quiz: {
          title: quiz.title,
          topic: quiz.topic,
          difficulty: quiz.difficulty,
          dueDate: quiz.dueDate,
        }
      };
    });

    res.json(filteredResults);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};


