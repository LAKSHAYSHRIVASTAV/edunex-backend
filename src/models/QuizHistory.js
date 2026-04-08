const mongoose = require("mongoose");

const QuizHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  subject: {
    type: String,
    required: true,
  },

  topic: {
    type: String,
    required: true,
  },

  questions: Array,
  userAnswers: Array,

  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium",
  },

  score: Number,
  totalQuestions: Number,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("QuizHistory", QuizHistorySchema);

