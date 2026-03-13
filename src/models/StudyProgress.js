const mongoose = require("mongoose");

const studyProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  subject: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  progress: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("StudyProgress", studyProgressSchema);