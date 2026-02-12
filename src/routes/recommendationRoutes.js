const express = require("express");
const router = express.Router();
const { getRecommendation } = require("../controllers/recommendationController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getRecommendation);

module.exports = router;
