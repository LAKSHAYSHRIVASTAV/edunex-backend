const mongoose = require("mongoose");

const quizHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  topic: {
    type: String,
    required: true
  },

  score: {
    type: Number,
    required: true
  },

  totalQuestions: {
    type: Number,
    default: 10
  },

  difficulty: {
    type: String,
    default: "medium"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("QuizHistory", quizHistorySchema);

