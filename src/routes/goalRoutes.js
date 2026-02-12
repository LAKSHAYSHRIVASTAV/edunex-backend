const express = require("express");
const router = express.Router();
const {
  setWeeklyGoal,
  getWeeklyGoalProgress,
} = require("../controllers/goalController");
const authMiddleware = require("../middleware/authMiddleware");

// 🎯 Set Goal
router.post("/", authMiddleware, setWeeklyGoal);

// 📊 Get Goal Progress
router.get("/progress", authMiddleware, getWeeklyGoalProgress);

module.exports = router;
