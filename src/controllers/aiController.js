const ChatHistory = require("../models/ChatHistory");
const { generateContent } = require("../services/geminiService");
const QuizHistory = require("../models/QuizHistory");
const UserActivity = require("../models/UserActivity");

/* ======================================================
   AUTO SUBJECT DETECTION (NO FRONTEND INPUT NEEDED)
====================================================== */
const detectSubject = (text) => {
  const lower = text.toLowerCase();

  if (
    lower.includes("math") ||
    lower.includes("algebra") ||
    lower.includes("equation")
  )
    return "Mathematics";

  if (
    lower.includes("physics") ||
    lower.includes("force") ||
    lower.includes("energy")
  )
    return "Physics";

  if (
    lower.includes("chemistry") ||
    lower.includes("reaction") ||
    lower.includes("molecule")
  )
    return "Chemistry";

  if (
    lower.includes("biology") ||
    lower.includes("cell") ||
    lower.includes("organism")
  )
    return "Biology";

  if (
    lower.includes("english") ||
    lower.includes("grammar") ||
    lower.includes("literature")
  )
    return "English";

  return "General";
};

/* ======================================================
   AI SUMMARY
====================================================== */
const generateSummary = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text)
      return res.status(400).json({ message: "Text is required" });

    const subject = detectSubject(text);

    const prompt = `
Summarize the following content in simple bullet points:

${text}
`;

    const summary = await generateContent(prompt);

    await UserActivity.create({
      user: req.user.id,
      type: "summary",
      subject,
      durationMinutes: 5,
    });

    return res.status(200).json({ summary });

  } catch (error) {
    console.error("AI Summary Error:", error);
    return res.status(500).json({ message: "AI generation failed" });
  }
};

/* ======================================================
   AI QUIZ GENERATION
====================================================== */
const generateQuiz = async (req, res) => {
  try {
    const { text, difficulty = "medium" } = req.body;

    if (!text)
      return res.status(400).json({ message: "Text is required" });

    const subject = detectSubject(text);

    const prompt = `
Create a ${difficulty} level quiz from the following text.

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "string",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Must exactly match one option",
      "explanation": "Short explanation"
    }
  ]
}

Rules:
- Generate exactly 5 questions
- Do NOT include markdown
- Do NOT include extra text outside JSON

Text:
${text}
`;

    let quizRaw = await generateContent(prompt);

    quizRaw = quizRaw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const quiz = JSON.parse(quizRaw);

    return res.status(200).json({ quiz, difficulty, subject });

  } catch (error) {
    console.error("AI Quiz Error:", error);
    return res.status(500).json({ message: "AI generation failed" });
  }
};

/* ======================================================
   QUIZ SCORING
====================================================== */
const scoreQuiz = async (req, res) => {
  try {
    const { questions, userAnswers, difficulty = "medium" } =
      req.body;

    if (!questions || !userAnswers)
      return res.status(400).json({
        message: "Questions and userAnswers are required",
      });

    let score = 0;
    const results = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const isCorrect =
        q.correctAnswer === userAnswers[i];

      if (isCorrect) score++;

      results.push({
        question: q.question,
        correctAnswer: q.correctAnswer,
        userAnswer: userAnswers[i],
        isCorrect,
        explanation:
          q.explanation || "No explanation available",
      });
    }

    const subject = detectSubject(
      JSON.stringify(questions)
    );

    await QuizHistory.create({
      user: req.user.id,
      questions,
      userAnswers,
      score,
      totalQuestions: questions.length,
      difficulty,
      subject,
    });

    await UserActivity.create({
      user: req.user.id,
      type: "quiz",
      subject,
      difficulty,
      score,
      durationMinutes: 10,
    });

    return res.status(200).json({
      totalQuestions: questions.length,
      score,
      difficulty,
      subject,
      results,
    });

  } catch (error) {
    console.error("Quiz Scoring Error:", error);
    return res.status(500).json({ message: "Scoring failed" });
  }
};

/* ======================================================
   FLASHCARDS
====================================================== */
const generateFlashcards = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text)
      return res.status(400).json({ message: "Text is required" });

    const subject = detectSubject(text);

    const prompt = `
Create flashcards from the following text.

Return ONLY valid JSON in this format:
{
  "flashcards": [
    { "question": "string", "answer": "string" }
  ]
}

Generate exactly 5 flashcards.

Text:
${text}
`;

    let flashcardsRaw = await generateContent(prompt);

    flashcardsRaw = flashcardsRaw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(flashcardsRaw);

    await UserActivity.create({
      user: req.user.id,
      type: "flashcard",
      subject,
      durationMinutes: 5,
    });

    return res.status(200).json(parsed);

  } catch (error) {
    console.error("AI Flashcards Error:", error);
    return res.status(500).json({
      message: "AI generation failed",
    });
  }
};

/* ======================================================
   AI CHAT
====================================================== */
const aiChat = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message)
      return res.status(400).json({
        message: "Message is required",
      });

    const reply = await generateContent(message);

    await ChatHistory.create({
      user: req.user.id,
      messages: [
        { role: "user", content: message },
        { role: "ai", content: reply },
      ],
    });

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("AI Chat Error:", error);
    return res.status(500).json({
      message: "AI chat failed",
    });
  }
};

module.exports = {
  generateSummary,
  generateQuiz,
  generateFlashcards,
  scoreQuiz,
  aiChat,
};


