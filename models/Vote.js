const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  teamVoted: {
    type: String,
    enum: ['A', 'B'],
    required: true
  },
  clientId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Garantir que cada cliente só vote uma vez por questão
VoteSchema.index({ questionId: 1, clientId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', VoteSchema);