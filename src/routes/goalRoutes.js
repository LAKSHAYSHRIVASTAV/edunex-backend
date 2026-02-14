const express = require("express");
const router = express.Router();
const {
  setWeeklyGoal,
  getWeeklyGoalProgress,
  updateWeeklyGoal   // 👈 add this
} = require("../controllers/goalController");

const authMiddleware = require("../middleware/authMiddleware");

// 🎯 Set Goal (first time create)
router.post("/", authMiddleware, setWeeklyGoal);

// ✏️ Update Existing Goal
router.put("/update", authMiddleware, updateWeeklyGoal);  // 👈 new route

// 📊 Get Goal Progress
router.get("/progress", authMiddleware, getWeeklyGoalProgress);

module.exports = router;

