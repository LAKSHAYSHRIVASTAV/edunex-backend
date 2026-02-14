console.log("✅ AI ROUTES FILE LOADED");

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// Existing AI Controllers
const {
  generateSummary,
  generateQuiz,
  generateFlashcards,
  scoreQuiz,
  aiChat,
} = require("../controllers/aiController");

// 🔥 NEW: Gemini Study Plan Service
const { generateSmartStudyPlan } = require("../services/geminiService");

// 🔥 NEW: AI Study Plan Model
const AIStudyPlan = require("../models/AIStudyPlan");

// ===============================
// 📚 Existing AI Routes
// ===============================

router.post("/summary", authMiddleware, generateSummary);
router.post("/quiz", authMiddleware, generateQuiz);
router.post("/flashcards", authMiddleware, generateFlashcards);
router.post("/quiz/score", authMiddleware, scoreQuiz);
router.post("/chat", authMiddleware, aiChat);

// ===============================
// 🧠 NEW: AI Study Plan Generator
// ===============================

router.post("/generate-plan", authMiddleware, async (req, res) => {
  try {
    const { subjects, examDate, hoursPerDay } = req.body;

    if (!subjects || !examDate || !hoursPerDay) {
      return res.status(400).json({
        error: "Subjects, examDate, and hoursPerDay are required",
      });
    }

    // 🔥 Call Gemini Service
    const planText = await generateSmartStudyPlan({
      subjects,
      examDate,
      hoursPerDay,
    });

    // 🔥 Clean possible markdown formatting
    const cleaned = planText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsedPlan = JSON.parse(cleaned);

    // 🔥 Save to Database
    const savedPlan = await AIStudyPlan.create({
      user: req.user.id,
      subjects,
      examDate,
      hoursPerDay,
      generatedPlan: parsedPlan,
    });

    res.status(200).json(savedPlan);

  } catch (error) {
    console.error("❌ AI Study Plan Error:", error);
    res.status(500).json({
      error: "AI study plan generation failed",
    });
  }
});

module.exports = router;

