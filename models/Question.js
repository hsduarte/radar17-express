const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isFinalized: {
    type: Boolean,
    default: false
  },
  teamAVotes: {
    type: Number,
    default: 0
  },
  teamBVotes: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isArchived: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Question', QuestionSchema);