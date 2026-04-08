const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const reportController = require("../controllers/reportController");

router.get("/summary", authMiddleware, reportController.getMyReport);
router.get("/report/periods", reportController.getPeriods);
router.get("/periods", reportController.getPeriods);
router.post("/report/share", authMiddleware, reportController.createShareableReport);
router.get("/report/share/:id", reportController.getSharedReport);
router.get("/report/:userId", authMiddleware, reportController.getReport);

module.exports = router;
