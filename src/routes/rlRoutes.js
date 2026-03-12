const express = require("express");
const router = express.Router();

const rlController = require("../controllers/rlController");
const protect = require("../middleware/protectedRoutes");

router.post("/update", protect, rlController.updateReward);

module.exports = router;