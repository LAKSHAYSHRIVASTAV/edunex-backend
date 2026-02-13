const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getAdminStats } = require("../controllers/adminController");

router.get("/stats", authMiddleware, getAdminStats);

module.exports = router;
