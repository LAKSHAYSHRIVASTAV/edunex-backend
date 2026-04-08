const express = require("express");
const router = express.Router();

const rlController = require("../controllers/rlController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/update", authMiddleware, rlController.updateReward);

module.exports = router;
