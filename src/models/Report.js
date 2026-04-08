const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    stats: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    period: {
      type: String,
      default: "30d",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
