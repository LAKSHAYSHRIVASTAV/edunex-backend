const express = require("express");
const router = express.Router();

const {
  getAnalytics,
  getWeeklyPerformance,
  getLearningInsights
} = require("../controllers/analyticsController");

const authMiddleware = require("../middleware/authMiddleware");

// 📊 Main analytics
router.get("/", authMiddleware, getAnalytics);

// 📅 Weekly performance (last 7 days)
router.get("/weekly", authMiddleware, getWeeklyPerformance);

// 🧠 RL Learning Insights
router.get("/learning-insights", authMiddleware, getLearningInsights);

module.exports = router;

