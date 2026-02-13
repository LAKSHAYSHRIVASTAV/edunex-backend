const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  addFriend,
  getFriends,
} = require("../controllers/friendController");

router.post("/add", authMiddleware, addFriend);
router.get("/", authMiddleware, getFriends);

module.exports = router;
