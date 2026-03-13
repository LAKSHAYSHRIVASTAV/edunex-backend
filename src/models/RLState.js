const mongoose = require("mongoose");

const RLStateSchema = new mongoose.Schema({

  user: {

    type: mongoose.Schema.Types.ObjectId,

    ref: "User",

    required: true

  },

  qTable: {

    beginner: {

      easy: Number,

      medium: Number,

      hard: Number

    },

    intermediate: {

      easy: Number,

      medium: Number,

      hard: Number

    },

    advanced: {

      easy: Number,

      medium: Number,

      hard: Number

    }

  }

});

module.exports = mongoose.model("RLState", RLStateSchema);