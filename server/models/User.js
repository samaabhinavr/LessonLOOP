
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false, // Password is now handled by Firebase Auth, but kept for existing users/data integrity
  },
  role: {
    type: String,
    enum: ['Student', 'Teacher'],
    required: true,
  },
  profilePicture: {
    type: String,
    default: ''
  },
});

module.exports = mongoose.model('User', UserSchema);
