
const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  inviteCode: {
    type: String,
    required: true,
    unique: true,
  },
  // We will add resources later
  // resources: [{
  //   name: String,
  //   url: String,
  // }]
}, { timestamps: true });

module.exports = mongoose.model('Class', ClassSchema);
