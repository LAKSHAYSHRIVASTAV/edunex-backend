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

// Gemini Study Plan Service
const { generateSmartStudyPlan } = require("../services/geminiService");

// AI Study Plan Model
const AIStudyPlan = require("../models/AIStudyPlan");
// Quiz History Model
const QuizHistory = require("../models/QuizHistory");

/* ======================================================
   EXISTING AI ROUTES
====================================================== */

router.post("/summary", authMiddleware, generateSummary);
router.post("/quiz", authMiddleware, generateQuiz);
router.post("/flashcards", authMiddleware, generateFlashcards);
router.post("/score-quiz", authMiddleware, scoreQuiz);
router.post("/chat", authMiddleware, aiChat);

/* ======================================================
   AI STUDY PLAN GENERATOR
====================================================== */

router.post("/generate-plan", authMiddleware, async (req, res) => {
  try {
    const { subject, topics, examDate, hoursPerDay } = req.body;

    if (!subject || !topics || !examDate || !hoursPerDay) {
      return res.status(400).json({
        error: "subject, topics, examDate, and hoursPerDay are required",
      });
    }

    // 🔥 Call Gemini
    const planText = await generateSmartStudyPlan({
      subject,
      topics,
      examDate,
      hoursPerDay,
    });

    // 🔥 Clean markdown formatting if Gemini adds it
   // ✅ Ensure Gemini response is extracted properly
// 🔥 Call Gemini
const parsedPlan = await generateSmartStudyPlan({
  subject,
  topics,
  examDate,
  hoursPerDay,
});

// 🚨 Safety check
if (!parsedPlan) {
  return res.status(500).json({
    error: "AI returned empty response",
  });
}

    // 🔥 Save to Database
    const savedPlan = await AIStudyPlan.create({
      user: req.user.id,
      subjects: subject,
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


/* ======================================================
   QUIZ HISTORY FETCH
====================================================== */

router.get("/quiz/history", authMiddleware, async (req, res) => {
  try {
    const history = await QuizHistory.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(history);
  } catch (error) {
    console.error("❌ Quiz History Error:", error);
    res.status(500).json({ error: "Failed to fetch quiz history" });
  }
});

module.exports = router;


