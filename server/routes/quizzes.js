
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const quizController = require('../controllers/quizController');

// @route   POST /api/quizzes
// @desc    Create a new quiz
// @access  Private (Teacher)
router.post('/', auth, authorize('Teacher'), quizController.createQuiz);

// @route   GET /api/quizzes/:classId
// @desc    Get quizzes for a specific class
// @access  Private (Teacher/Student)
router.get('/:classId', auth, quizController.getQuizzes);

// @route   GET /api/quizzes/quiz/:id
// @desc    Get a single quiz by ID
// @access  Private (Teacher/Student)
router.get('/quiz/:id', auth, quizController.getQuizById);

// @route   PUT /api/quizzes/quiz/:id
// @desc    Update a quiz
// @access  Private (Teacher)
router.put('/quiz/:id', auth, authorize('Teacher'), quizController.updateQuiz);

// @route   DELETE /api/quizzes/quiz/:id
// @desc    Delete a quiz
// @access  Private (Teacher)
router.delete('/quiz/:id', auth, authorize('Teacher'), quizController.deleteQuiz);

// @route   PUT /api/quizzes/publish/:id
// @desc    Publish a quiz
// @access  Private (Teacher)
router.put('/publish/:id', auth, authorize('Teacher'), quizController.publishQuiz);

// @route   POST /api/quizzes/submit/:id
// @desc    Submit a quiz (student)
// @access  Private (Student)
router.post('/submit/:id', auth, authorize('Student'), quizController.submitQuiz);

// @route   GET /api/quizzes/results/:quizId
// @desc    Get all results for a specific quiz (Teacher)
// @access  Private (Teacher)
router.get('/results/:quizId', auth, authorize('Teacher'), quizController.getQuizResultsForQuiz);

// @route   GET /api/quizzes/result/:quizId
// @desc    Get a student's result for a specific quiz
// @access  Private (Student)
router.get('/result/:quizId', auth, authorize('Student'), quizController.getQuizResultForStudent);

// @route   GET /api/quizzes/result/:quizId/attempt/:attemptId
// @desc    Get a specific quiz attempt by ID
// @access  Private (Teacher/Student)
router.get('/result/:quizId/attempt/:attemptId', auth, quizController.getQuizAttemptById);

// @route   GET /api/quizzes/my-results/:classId
// @desc    Get all quiz results for a student in a specific class
// @access  Private (Student)
router.get('/my-results/:classId', auth, authorize('Student'), quizController.getStudentQuizResultsInClass);


// @route   POST /api/quizzes/generate-mcq
// @desc    Generate MCQs using AI
// @access  Private (Teacher)
router.post('/generate-mcq', auth, authorize('Teacher'), quizController.generateMCQ);

module.exports = router;
