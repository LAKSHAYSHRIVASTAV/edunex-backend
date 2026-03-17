const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  addFriend,
  getFriends,
  removeFriend,
  getLeaderboard,
} = require("../controllers/friendController");

/* ================= FRIEND ROUTES ================= */

// ➕ Add Friend
router.post("/add", authMiddleware, addFriend);

// 📋 Get All Friends
router.get("/", authMiddleware, getFriends);

// ❌ Remove Friend (NEW - IMPRESSIVE)
router.delete("/remove/:id", authMiddleware, removeFriend);

// 🏆 Leaderboard (NEW - VERY IMPPRESSIVE)
router.get("/leaderboard", authMiddleware, getLeaderboard);

module.exports = router;
