const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createChat,
  getAllChats,
  getChatById,
  addMessage,
  deleteChat,
} = require("../controllers/chatHistoryController");

/* ================= ROUTES ================= */

// Create new chat
router.post("/", authMiddleware, createChat);

// Get all chats (for sidebar)
router.get("/", authMiddleware, getAllChats);

// Get single chat (messages)
router.get("/:id", authMiddleware, getChatById);

// Add message to chat
router.post("/:id/message", authMiddleware, addMessage);

// Delete chat
router.delete("/:id", authMiddleware, deleteChat);

module.exports = router;