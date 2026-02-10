const { generateContent } = require("../services/geminiService");

// =======================
// AI SUMMARY CONTROLLER
// =======================
const generateSummary = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    const prompt = `
Summarize the following content in simple bullet points:

${text}
`;

    const summary = await generateContent(prompt);

    return res.status(200).json({ summary });
  } catch (error) {
    console.error("AI Summary Error:", error);
    return res.status(500).json({ message: "AI generation failed" });
  }
};

/*************  ✨ Windsurf Command 🌟  *************/
// =======================
// AI QUIZ CONTROLLER
// =======================
const generateQuiz = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    const prompt = `
Create a quiz from the following text.

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A | B | C | D"
    }
  ]
}

Rules:
- Generate exactly 5 questions
- Each question must have 4 clear options
- correctAnswer must exactly match one option
- Do NOT include explanations
- Do NOT include markdown
- Do NOT include extra text outside JSON
/*******  9a684ac9-8096-4280-a971-8c5a4dae3310  *******/

Text:
${text}
`;

    const quizRaw = await generateContent(prompt);

    // Convert AI string output into JSON
    const quiz = JSON.parse(quizRaw);

    return res.status(200).json({ quiz });
  } catch (error) {
    console.error("AI Quiz Error:", error);
    return res.status(500).json({ message: "AI generation failed" });
  }
};
// =======================
// QUIZ SCORING CONTROLLER
// =======================
const QuizHistory = require("../models/QuizHistory");

const scoreQuiz = async (req, res) => {
  try {
    const { questions, userAnswers } = req.body;

    if (!questions || !userAnswers) {
      return res.status(400).json({
        message: "Questions and userAnswers are required",
      });
    }

    let score = 0;
    const results = [];

    questions.forEach((q, index) => {
      const isCorrect = q.correctAnswer === userAnswers[index];
      if (isCorrect) score++;

      results.push({
        question: q.question,
        correctAnswer: q.correctAnswer,
        userAnswer: userAnswers[index],
        isCorrect,
      });
    });

    // ✅ SAVE TO DB
    await QuizHistory.create({
      user: req.user.id,
      questions,
      userAnswers,
      score,
      totalQuestions: questions.length,
    });

    return res.status(200).json({
      totalQuestions: questions.length,
      score,
      results,
    });
  } catch (error) {
    console.error("Quiz Scoring Error:", error);
    return res.status(500).json({ message: "Scoring failed" });
  }
};

// =======================
// AI FLASHCARDS CONTROLLER
// =======================
const generateFlashcards = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    const prompt = `
Create flashcards from the following content.
Return as question and answer pairs.

Content:
${text}
`;

    const flashcards = await generateContent(prompt);

    return res.status(200).json({ flashcards });
  } catch (error) {
    console.error("AI Flashcards Error:", error);
    return res.status(500).json({ message: "AI generation failed" });
  }
};

module.exports = {
  generateSummary,
  generateQuiz,
  generateFlashcards,
   scoreQuiz, 
};
