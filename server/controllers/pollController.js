const Poll = require('../firestore/models/Poll');
const Class = require('../firestore/models/Class');
const Notification = require('../firestore/models/Notification');

// @desc    Create a new poll
// @route   POST /api/polls
// @access  Private (Teacher)
exports.createPoll = async (req, res) => {
  const { classId, question, options, correctAnswer } = req.body;
  const userId = req.user.dbUser.id;

  try {
    // Verify the class exists and the teacher owns it
    const existingClass = await Class.findById(classId);
    if (!existingClass || existingClass.teacher !== userId) {
      return res.status(404).json({ msg: 'Class not found or you do not have permission to create polls for this class' });
    }

    // Check if there's already an active poll for this class
    const activePoll = await Poll.getActivePollForClass(classId);
    if (activePoll) {
      return res.status(400).json({ msg: 'An active poll already exists for this class. Please end it first.' });
    }

    const newPoll = {
      class: classId,
      question,
      options: options.map(option => ({ text: option, votes: 0 })),
      correctAnswer,
      createdBy: userId,
      isActive: true,
      votedUsers: [],
    };
    const poll = await Poll.create(newPoll);

    // Notify students in the class
    if (existingClass && existingClass.students.length > 0) {
      const notifications = existingClass.students.map(studentId => ({
        recipient: studentId,
        type: 'newPoll',
        message: `A new live poll has started in ${existingClass.name}.`,
        link: `/class/${classId}`,
      }));
      await Notification.createMany(notifications);
    }

    res.status(201).json(poll);
  } catch (err) {
    console.error('Error in createPoll:', err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Vote on an active poll
// @route   POST /api/polls/vote
// @access  Private (Student)
exports.voteOnPoll = async (req, res) => {
  const { pollId, optionIndex } = req.body;
  const userId = req.user.dbUser.id;

  try {
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ msg: 'Poll not found' });
    }
    if (!poll.isActive) {
      return res.status(400).json({ msg: 'Poll is not active' });
    }

    // Prevent duplicate votes from the same user
    if (poll.votedUsers.includes(userId)) {
      return res.status(400).json({ msg: 'You have already voted on this poll' });
    }

    const updatedOptions = [...poll.options];
    updatedOptions[optionIndex].votes++;
    const updatedVotedUsers = [...poll.votedUsers, userId];

    const updatedPoll = await Poll.update(pollId, { options: updatedOptions, votedUsers: updatedVotedUsers });
    res.json(updatedPoll);
  } catch (err) {
    console.error('Error in voteOnPoll:', err.message);
    res.status(500).send('Server error');
  }
};

// @desc    End an active poll
// @route   PUT /api/polls/end/:pollId
// @access  Private (Teacher)
exports.endPoll = async (req, res) => {
  const { pollId } = req.params;
  const userId = req.user.dbUser.id;

  try {
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ msg: 'Poll not found' });
    }
    if (poll.createdBy !== userId) {
      return res.status(403).json({ msg: 'Not authorized to end this poll' });
    }

    const updatedPoll = await Poll.update(pollId, { isActive: false });
    res.json(updatedPoll);
  } catch (err) {
    console.error('Error in endPoll:', err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get active poll for a class
// @route   GET /api/polls/active/:classId
// @access  Private
exports.getActivePoll = async (req, res) => {
  try {
    const { classId } = req.params;
    const activePoll = await Poll.getActivePollForClass(classId);
    res.json(activePoll);
  } catch (err) {
    console.error('Error in getActivePoll:', err.message);
    res.status(500).send('Server Error');
  }
};