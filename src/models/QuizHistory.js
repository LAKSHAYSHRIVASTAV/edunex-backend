const mongoose = require("mongoose");

const quizHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    questions: {
      type: Array,
      required: true,
    },
    userAnswers: {
      type: Array,
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuizHistory", quizHistorySchema);
