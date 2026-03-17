const mongoose = require("mongoose");

const flashcardProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  topic: {
    type: String,
    required: true,
  },

  cards: [
    {
      question: String,
      answer: String,
      difficulty: {
        type: String,
        enum: ["easy", "hard"],
      },
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("FlashcardProgress", flashcardProgressSchema);