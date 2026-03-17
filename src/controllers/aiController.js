const ChatHistory = require("../models/ChatHistory");
const { generateContent } = require("../services/geminiService");
const QuizHistory = require("../models/QuizHistory");
const UserActivity = require("../models/UserActivity");
const rlService = require("../services/rlService");

/* ======================================================
   SAFE JSON PARSER (GLOBAL FIX)
====================================================== */
const safeJSONParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    } catch {
      return null;
    }
  }
};

/* ======================================================
AUTO SUBJECT DETECTION
====================================================== */
const detectSubject = (text = "") => {
  const lower = text.toLowerCase();

  if (lower.match(/math|algebra|equation|calculus|derivative/)) return "Mathematics";
  if (lower.match(/physics|force|energy|motion|velocity|acceleration/)) return "Physics";
  if (lower.match(/chemistry|reaction|molecule|atom/)) return "Chemistry";
  if (lower.match(/biology|cell|dna|organism/)) return "Biology";
  if (lower.match(/english|grammar|literature|sentence/)) return "English";
  if (lower.match(/computer|coding|programming|algorithm/)) return "Computer";
  if (lower.match(/ai|machine learning|neural network/)) return "AI";

  return "General";
};

/* ======================================================
USER PERFORMANCE
====================================================== */
const getAverageScore = async (userId) => {
  const quizzes = await QuizHistory.find({ user: userId });

  if (!quizzes.length) return 50;

  const totalScore = quizzes.reduce((acc, q) => acc + q.score, 0);
  const totalQ = quizzes.reduce((acc, q) => acc + q.totalQuestions, 0);

  return totalQ ? (totalScore / totalQ) * 100 : 50;
};

/* ======================================================
AI SUMMARY
====================================================== */
const generateSummary = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Text is required" });

    const subject = detectSubject(text);

    const prompt = `Summarize in simple bullet points:\n\n${text}`;

    const summary = await generateContent(prompt);

    await UserActivity.create({
      user: req.user.id,
      type: "summary",
      subject,
      durationMinutes: 5,
    });

    res.json({ summary });
  } catch (error) {
    console.error("AI Summary Error:", error);
    res.status(500).json({ message: "AI generation failed" });
  }
};

/* ======================================================
🔥 AI QUIZ GENERATION (FIXED)
====================================================== */
const generateQuiz = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Text is required" });

    const subject = detectSubject(text);

    const avgScore = await getAverageScore(req.user.id);
    const state = rlService.getState(avgScore);
    const difficulty = await rlService.chooseAction(req.user.id, state);

    const prompt = `
You are an expert teacher.

Generate a ${difficulty} level ${subject} quiz.

STRICT RULES:
- Return ONLY JSON
- No markdown
- No explanation text
- Exactly 5 questions
- Each must have 4 options
- Only one correct answer

FORMAT:
{
  "questions":[
    {
      "question":"string",
      "options":["A","B","C","D"],
      "correctAnswer":"exact option text",
      "explanation":"short explanation"
    }
  ]
}

TEXT:
${text}
`;

    const result = await generateContent(prompt);

    if (!result || result.includes("temporarily unavailable")) {
      throw new Error("AI unavailable");
    }

    const parsed = safeJSONParse(result);

    if (!parsed || !parsed.questions) {
      console.warn("⚠️ Invalid quiz → fallback");

      return res.json({
        quiz: [
          {
            question: "Fallback question",
            options: ["A", "B", "C", "D"],
            correctAnswer: "A",
            explanation: "Fallback explanation",
          },
        ],
        difficulty,
        subject,
      });
    }

    res.json({
      quiz: parsed.questions,
      difficulty,
      subject,
    });

  } catch (error) {
    console.error("AI Quiz Error:", error.message);
    res.status(500).json({ message: "AI generation failed" });
  }
};

/* ======================================================
QUIZ SCORING
====================================================== */
const scoreQuiz = async (req, res) => {
  try {
    const userId = req.user.id;
    const { questions, userAnswers, difficulty, subject } = req.body;

    if (!questions || !userAnswers) {
      return res.status(400).json({ message: "Quiz data missing" });
    }

    let score = 0;

    questions.forEach((q, i) => {
      const correct = q.correctAnswer.trim();
      const user = userAnswers[i];
      if (user && (correct === user || correct.startsWith(user))) score++;
    });

    const totalQuestions = questions.length;
    const percentage = (score / totalQuestions) * 100;

    let detectedSubject = subject || detectSubject(
      questions.map(q => q.question).join(" ")
    );

    await QuizHistory.create({
      user: userId,
      subject: detectedSubject,
      topic: detectedSubject,
      score,
      totalQuestions,
      difficulty,
      questions,
      userAnswers,
    });

    const state = rlService.getState(percentage);
    const action = difficulty.replace("_quiz", "");

    await rlService.updateQValue(userId, state, action, percentage);

    await UserActivity.create({
      user: userId,
      type: "quiz",
      subject: detectedSubject,
      difficulty,
      score,
      durationMinutes: 10,
    });

    res.json({
      score,
      totalQuestions,
      subject: detectedSubject,
      difficulty,
      percentage,
    });

  } catch (error) {
    console.error("Quiz Scoring Error:", error);
    res.status(500).json({ message: "Quiz scoring failed" });
  }
};

/* ======================================================
FLASHCARDS (FIXED)
====================================================== */
const generateFlashcards = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Text required" });

    const subject = detectSubject(text);

    const prompt = `
Generate 5 flashcards in JSON.

FORMAT:
{
 "flashcards":[
  {"question":"string","answer":"string"}
 ]
}

TEXT:
${text}
`;

    const result = await generateContent(prompt);
    const parsed = safeJSONParse(result);

    if (!parsed || !parsed.flashcards) {
      console.warn("⚠️ Flashcard fallback triggered");

      return res.json({
        flashcards: [
          { question: "Fallback question", answer: "Fallback answer" },
        ],
      });
    }

    await UserActivity.create({
      user: req.user.id,
      type: "flashcard",
      subject,
      durationMinutes: 5,
    });

    res.json(parsed);

  } catch (error) {
    console.error("Flashcards Error:", error);
    res.status(500).json({ message: "AI generation failed" });
  }
};

/* ======================================================
AI CHAT
====================================================== */
const aiChat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "Message required" });

    const reply = await generateContent(message);

    await ChatHistory.create({
      user: req.user.id,
      messages: [
        { role: "user", content: message },
        { role: "ai", content: reply },
      ],
    });

    res.json({ reply });

  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ message: "AI chat failed" });
  }
};

module.exports = {
  generateSummary,
  generateQuiz,
  generateFlashcards,
  scoreQuiz,
  aiChat,
};