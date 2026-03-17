const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  saveFlashcardProgress,
} = require("../controllers/flashcardController");

router.post("/save", authMiddleware, saveFlashcardProgress);

module.exports = router;