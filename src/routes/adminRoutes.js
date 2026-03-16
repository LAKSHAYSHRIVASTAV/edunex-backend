const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const { getAdminStats } = require("../controllers/adminController");
const analyticsController = require("../controllers/analyticsController");

router.get("/stats", authMiddleware, getAdminStats);

router.get(
  "/progress-overview",
  authMiddleware,
  analyticsController.getProgressOverview
);

module.exports = router;
