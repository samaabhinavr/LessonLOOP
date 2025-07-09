const express = require('express');
const router = express.Router();
const pollController = require('../controllers/pollController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// @route    GET /api/polls/active/:classId
// @desc     Get active poll for a class
// @access   Private
router.get('/active/:classId', auth, pollController.getActivePoll);

// @route    POST /api/polls
// @desc     Create a new poll
// @access   Private (Teacher)
router.post('/', auth, authorize('Teacher'), pollController.createPoll);

// @route    POST /api/polls/vote
// @desc     Vote on an active poll
// @access   Private (Student)
router.post('/vote', auth, authorize('Student'), pollController.voteOnPoll);

// @route    PUT /api/polls/end/:pollId
// @desc     End an active poll
// @access   Private (Teacher)
router.put('/end/:pollId', auth, authorize('Teacher'), pollController.endPoll);

module.exports = router;