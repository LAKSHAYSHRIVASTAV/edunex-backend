const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["quiz", "summary", "flashcard"],
      required: true,
    },

    subject: {
      type: String,
      default: "General",
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    score: {
      type: Number,
      default: 0,
    },

    durationMinutes: {
      type: Number,
      default: 5, // estimated time spent
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserActivity", userActivitySchema);
