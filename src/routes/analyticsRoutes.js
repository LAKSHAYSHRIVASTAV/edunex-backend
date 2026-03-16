const express = require("express");
const router = express.Router();

const {
  getAnalytics,
  getWeeklyPerformance,
  getProgressOverview,
  getLearningInsights,
  getKnowledgeGraph,
} = require("../controllers/analyticsController");

const authMiddleware = require("../middleware/authMiddleware");

// 📊 Main analytics
router.get("/", authMiddleware, getAnalytics);

// 📅 Weekly performance
router.get("/weekly", authMiddleware, getWeeklyPerformance);

// 📊 Progress Overview (Dashboard)
router.get("/progress-overview", authMiddleware, getProgressOverview);

// 🧠 AI Learning Insights
router.get("/learning-insights", authMiddleware, getLearningInsights);

// 📚 Knowledge Graph
router.get("/knowledge-graph", authMiddleware, getKnowledgeGraph);

module.exports = router;
