const ChatHistory = require("../models/ChatHistory");
const { generateContent } = require("../services/geminiService");
const QuizHistory = require("../models/QuizHistory");
const UserActivity = require("../models/UserActivity");
const rlService = require("../services/rlService");
const { updateUserProgress } = require("../services/progressService");

/* ======================================================
   SAFE JSON PARSER
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
   AI QUIZ GENERATION
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
- Exactly 5 questions

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
    const parsed = safeJSONParse(result);

    if (!parsed || !parsed.questions) {
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
    console.error("AI Quiz Error:", error);
    res.status(500).json({ message: "AI generation failed" });
  }
};

/* ======================================================
   QUIZ SCORING
====================================================== */
const scoreQuiz = async (req, res) => {
  try {
    const userId = req.user.id;
    const { questions, userAnswers, difficulty, subject, topic } = req.body;

    if (!Array.isArray(questions) || !Array.isArray(userAnswers) || questions.length === 0) {
      return res.status(400).json({
        message: "questions and userAnswers are required",
      });
    }

    let score = 0;

    questions.forEach((q, i) => {
      if (q.correctAnswer === userAnswers[i]) score++;
    });

    const totalQuestions = questions.length;
    const percentage = (score / totalQuestions) * 100;

    // 🔥 SAVE FULL DATA (FIXED)
    await QuizHistory.create({
      user: userId,
      subject,
      topic: topic || subject, // Use subject as fallback if topic is missing
      score,
      totalQuestions,
      difficulty,
      questions,
      userAnswers,
    });

    await UserActivity.create({
      user: userId,
      type: "quiz",
      subject,
      score,
      durationMinutes: 10,
    });

    res.json({ score, totalQuestions, percentage });

  } catch (error) {
    console.error("Quiz Scoring Error:", error);
    res.status(500).json({ message: "Quiz scoring failed" });
  }
};

/* ======================================================
   FLASHCARDS
====================================================== */
const generateFlashcards = async (req, res) => {
  try {
    const { text } = req.body;

    const prompt = `
Generate 5 flashcards JSON format:
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

    res.json(parsed || { flashcards: [] });

  } catch (error) {
    console.error("Flashcards Error:", error);
    res.status(500).json({ message: "AI generation failed" });
  }
};

/* ======================================================
   🤖 AI CHAT (UPDATED WITH HISTORY)
====================================================== */
const aiChat = async (req, res) => {
  try {
    const { message, chatId } = req.body;

    if (!message || !chatId) {
      return res.status(400).json({ message: "Message and chatId required" });
    }

    const chat = await ChatHistory.findOne({
      _id: chatId,
      user: req.user.id,
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Save user message
    chat.messages.push({
      role: "user",
      content: message,
    });

    // AI response
    const reply = await generateContent(message);

    // Save AI message
    chat.messages.push({
      role: "ai",
      content: reply,
    });

    // Auto title
    if (chat.messages.length === 2) {
      chat.title = message.substring(0, 30);
    }

    await chat.save();

    const progress = await updateUserProgress(req.user.id);

    res.json({
      reply,
      progress,
      chatId: chat._id,
    });

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
