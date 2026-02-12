const express = require("express");
const router = express.Router();
const {
  getAnalytics,
  getWeeklyPerformance,
} = require("../controllers/analyticsController");
const authMiddleware = require("../middleware/authMiddleware");

// 📊 Main analytics
router.get("/", authMiddleware, getAnalytics);

// 📅 Weekly performance (last 7 days)
router.get("/weekly", authMiddleware, getWeeklyPerformance);

module.exports = router;

