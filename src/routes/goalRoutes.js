const express = require("express");
const router = express.Router();

const {
  updateWeeklyGoal,
  getWeeklyGoalProgress
} = require("../controllers/goalController");

const authMiddleware = require("../middleware/authMiddleware");

// ✏️ Create or Update Weekly Goal
router.put("/update", authMiddleware, updateWeeklyGoal);

// 📊 Get Goal Progress
router.get("/progress", authMiddleware, getWeeklyGoalProgress);

module.exports = router;


