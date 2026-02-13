const express = require("express");
const router = express.Router();

const {
  getLeaderboard,
  getFriendsLeaderboard,
} = require("../controllers/leaderboardController");

const authMiddleware = require("../middleware/authMiddleware");

// 🌍 Global leaderboard
router.get("/", authMiddleware, getLeaderboard);

// 👥 Friends leaderboard
router.get("/friends", authMiddleware, getFriendsLeaderboard);

module.exports = router;
