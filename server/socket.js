const socketio = require('socket.io');
const { createPoll, voteOnPoll, endPoll } = require('./controllers/pollController');

module.exports = function(server) {
  const io = socketio(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('joinClass', (classId) => {
      socket.join(classId);
      console.log(`Socket ${socket.id} joined class ${classId}`);
    });

    socket.on('createPoll', async (data) => {
      try {
        const poll = await createPoll(data);
        io.to(data.classId).emit('pollCreated', poll);
      } catch (error) {
        console.error('Error creating poll via socket:', error);
        // Optionally, emit an error back to the client
        socket.emit('pollError', { message: 'Failed to create poll.' });
      }
    });

    socket.on('vote', async (data) => {
      const poll = await voteOnPoll(data);
      if (poll) {
        io.to(poll.class.toString()).emit('pollUpdated', poll);
      }
    });

    socket.on('endPoll', async (pollId) => {
      const poll = await endPoll(pollId);
      if (poll) {
        io.to(poll.class.toString()).emit('pollEnded', poll);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
};