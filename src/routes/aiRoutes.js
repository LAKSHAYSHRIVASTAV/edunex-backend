console.log("✅ AI ROUTES FILE LOADED");

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  generateSummary,
  generateQuiz,
  generateFlashcards,
  scoreQuiz, // ✅ ADD THIS
} = require("../controllers/aiController");

router.post("/summary", authMiddleware, generateSummary);
router.post("/quiz", authMiddleware, generateQuiz);
router.post("/flashcards", authMiddleware, generateFlashcards);
router.post("/quiz/score", authMiddleware, scoreQuiz); // ✅ NOW IT WORKS

module.exports = router;

