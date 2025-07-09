console.log('Firebase Function: Starting execution.');
require('dotenv').config();
const { admin, db } = require('./config/firebase');

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
// const http = require('http'); // Commented out for Firebase Functions
// const initializeSocket = require('./socket'); // Commented out for Firebase Functions

const app = express();
// const server = http.createServer(app); // Commented out for Firebase Functions
// initializeSocket(server); // Commented out for Firebase Functions

// const PORT = process.env.PORT || 5000; // Commented out for Firebase Functions

// Custom CORS middleware
app.use(cors({ origin: 'https://lessonloop-633d9.web.app', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/tmp'); // Use /tmp for temporary storage in Cloud Functions
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Make upload available globally
app.use((req, res, next) => {
  req.upload = upload;
  next();
});

// Define Routes
app.use('/auth', require('./routes/auth'));
app.use('/classes', require('./routes/classes'));
app.use('/resources', require('./routes/resources'));
app.use('/quizzes', require('./routes/quizzes'));
app.use('/student', require('./routes/student'));
app.use('/analytics', require('./routes/analytics'));
app.use('/polls', require('./routes/polls'));
app.use('/notifications',require('./routes/notifications'));


// Basic Route
app.get('/', (req, res) => {
  res.send('LessonLoop server is running!');
});

// app.get('/test', (req, res) => {
//   res.send('Test route is working!');
// });

// Export the Express app as a Firebase Function
const functions = require('firebase-functions/v1');
exports.api = functions
  .region('asia-south1')
  .runWith({ timeoutSeconds: 300 })
  .https.onRequest(app);