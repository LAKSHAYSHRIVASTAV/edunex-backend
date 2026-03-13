const mongoose = require("mongoose");

const studyProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  topic: {
    type: String,
    required: true
  },

  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    required: true
  },

  completed: {
    type: Boolean,
    default: false
  },

  score: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

export default mongoose.model("StudyProgress", studyProgressSchema);