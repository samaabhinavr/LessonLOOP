const Poll = require('../models/Poll');
const Class = require('../models/Class');
const Notification = require('../models/Notification');
const User = require('../models/User');

exports.createPoll = async (data) => {
  const { classId, question, options, correctAnswer, userId } = data;
  const newPoll = new Poll({
    class: classId,
    question,
    options: options.map(option => ({ text: option, votes: 0 })),
    correctAnswer,
    createdBy: userId,
    isActive: true,
  });
  const poll = await newPoll.save();

  // Notify students in the class
  const currentClass = await Class.findById(classId);
  if (currentClass && currentClass.students.length > 0) {
    const notifications = currentClass.students.map(studentId => ({
      recipient: studentId,
      type: 'newPoll',
      message: `A new live poll has started in ${currentClass.name}.`,
      link: `/class/${classId}`, // Link to the class page where live poll is active
    }));
    await Notification.insertMany(notifications);
  }

  return poll;
};

exports.voteOnPoll = async (data) => {
  const { pollId, optionIndex, userId } = data;
  const poll = await Poll.findById(pollId);
  if (poll && poll.isActive) {
    // Prevent duplicate votes from the same user
    if (poll.votedUsers.includes(userId)) {
      return null; // User has already voted
    }

    poll.options[optionIndex].votes++;
    poll.votedUsers.push(userId);
    await poll.save();
    return poll;
  }
  return null;
};

exports.endPoll = async (pollId) => {
  const poll = await Poll.findById(pollId);
  if (poll) {
    poll.isActive = false;
    await poll.save();
    return poll;
  }
  return null;
};

exports.getActivePoll = async (req, res) => {
  try {
    const { classId } = req.params;
    const poll = await Poll.findOne({ class: classId, isActive: true });
    res.json(poll);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};