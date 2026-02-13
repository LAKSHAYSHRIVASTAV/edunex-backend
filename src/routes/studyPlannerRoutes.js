const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getStudyPlan,
} = require("../controllers/studyPlannerController");

router.get("/", authMiddleware, getStudyPlan);

module.exports = router;
