
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
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
app.use('/api/auth', require('./routes/auth'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/quizzes', require('./routes/quizzes'));
app.use('/api/student', require('./routes/student'));


// Basic Route
app.get('/', (req, res) => {
  res.send('LessonLoop server is running!');
});

// Connect to MongoDB and start server
mongoose.connect("mongodb://127.0.0.1:27017/lessonloop")
  .then(() => {
    console.log('MongoDB connected successfully');
    console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'Yes' : 'No');
    app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Could not connect to MongoDB:', err);
    process.exit(1);
  });
