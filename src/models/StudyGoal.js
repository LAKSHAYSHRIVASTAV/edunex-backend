const mongoose = require("mongoose");

const studyGoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    weeklyQuizTarget: {
      type: Number,
      required: true,
      default: 5,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudyGoal", studyGoalSchema);
