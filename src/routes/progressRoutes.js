const express = require("express");
const router = express.Router();
const StudyProgress = require("../models/StudyProgress");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {

  try {

    const { topic, difficulty, completed } = req.body;

    let score = 0;

    if (difficulty === "easy") score = 2;
    if (difficulty === "medium") score = 1;
    if (difficulty === "hard") score = -1;

    const progress = await StudyProgress.create({

      user: req.user.id,
      topic,
      difficulty,
      completed,
      score

    });

    res.json(progress);

  } catch (error) {

    res.status(500).json({
      message: "Failed to save study progress"
    });

  }

});

module.exports = router;