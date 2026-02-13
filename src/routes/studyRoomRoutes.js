const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getRooms,
  getMessages,
  sendMessage,
} = require("../controllers/studyRoomController");

router.get("/", authMiddleware, getRooms);
router.get("/:roomId/messages", authMiddleware, getMessages);
router.post("/:roomId/messages", authMiddleware, sendMessage);

module.exports = router;
