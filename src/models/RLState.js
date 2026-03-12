const mongoose = require("mongoose");

const rlSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  state: String,

  qValues: {
    easy_quiz: { type: Number, default: 0 },
    medium_quiz: { type: Number, default: 0 },
    hard_quiz: { type: Number, default: 0 },
  },
});

module.exports = mongoose.model("RLState", rlSchema);