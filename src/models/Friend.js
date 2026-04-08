const mongoose = require("mongoose");

const friendSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    friend: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    streak: {
      type: Number,
      default: 0,
    },
    studyHours: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Friend", friendSchema);
