const express = require("express");
const router = express.Router();

const reportController = require("../controllers/reportController");

// 🔹 EXISTING ROUTES (KEEP THESE)
router.get("/summary", reportController.getReport);
router.get("/periods", reportController.getPeriods);

// 🔥 NEW SHARE ROUTES (ADD THESE)

// Create shareable report
router.post("/share", reportController.createShareableReport);

// Get shared report by ID
router.get("/share/:id", reportController.getSharedReport);

module.exports = router;