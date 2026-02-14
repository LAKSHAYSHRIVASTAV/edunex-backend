const mongoose = require("mongoose");

const aiStudyPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  subjects: String,
  examDate: String,
  hoursPerDay: Number,
  generatedPlan: Object,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("AIStudyPlan", aiStudyPlanSchema);
