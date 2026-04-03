const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

// GET /api/report/summary?period=30d
router.get("/summary", reportController.getReport);

// GET /api/report/periods
router.get("/periods", reportController.getPeriods);

module.exports = router;