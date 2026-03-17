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
const rawText =
  typeof planText === "string"
    ? planText
    : planText?.candidates?.[0]?.content?.parts?.[0]?.text || "";

// ✅ Convert to string safely
const safeText = String(rawText);

// ✅ Clean markdown
const cleaned = safeText
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

// 🚨 Safety check
if (!cleaned) {
  return res.status(500).json({
    error: "AI returned empty response",
  });
}
    let parsedPlan;

    try {
      parsedPlan = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError);
      return res.status(500).json({
        error: "AI returned invalid JSON format",
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

module.exports = router;


