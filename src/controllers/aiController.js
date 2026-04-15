const ChatHistory = require("../models/ChatHistory");
const { generateContent } = require("../services/geminiService");
const QuizHistory = require("../models/QuizHistory");
const UserActivity = require("../models/UserActivity");
const rlService = require("../services/rlService");
const { updateUserProgress } = require("../services/progressService");
const { normalizeSubject } = require("../utils/subjectUtils");

/* ======================================================
   SAFE JSON PARSER
====================================================== */
const safeJSONParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      return match ? JSON.parse(match[0]) : null;
    } catch {
      return null;
    }
  }
};

const QUIZ_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

const getQuizSourceText = (body = {}) => {
  const candidates = [
    body.text,
    body.inputText,
    body.content,
    body.pdfText,
    body.extractedText,
    body.uploadedText,
  ];

  const text = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  return text ? text.trim() : "";
};

const normalizeDifficulty = (requestedDifficulty, fallbackDifficulty) => {
  const requested = String(requestedDifficulty || "")
    .trim()
    .toLowerCase();

  if (QUIZ_DIFFICULTIES.has(requested)) return requested;
  if (QUIZ_DIFFICULTIES.has(fallbackDifficulty)) return fallbackDifficulty;
  return "medium";
};

const normalizeQuestionCount = (value, fallback = 5) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), 10);
};

const hasSufficientQuizContent = (text = "") => {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 80) return false;

  const words = compact.split(" ").filter(Boolean);
  return words.length >= 15;
};

const tokenizeForGrounding = (text = "") =>
  (text.toLowerCase().match(/[a-z0-9]{4,}/g) || []).filter(
    (token, index, arr) => arr.indexOf(token) === index
  );

const isGroundedInContent = (value, contentTokens) => {
  if (typeof value !== "string" || !value.trim()) return false;

  const tokens = tokenizeForGrounding(value);
  if (!tokens.length) return true;

  const matches = tokens.filter((token) => contentTokens.has(token)).length;
  return matches / tokens.length >= 0.45;
};

const normalizeQuizQuestions = (parsed, sourceText, requestedCount) => {
  const rawQuestions = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.questions)
      ? parsed.questions
      : [];

  if (!rawQuestions.length) return [];

  const contentTokens = new Set(tokenizeForGrounding(sourceText));
  const normalized = [];

  for (const item of rawQuestions) {
    const question = typeof item?.question === "string" ? item.question.trim() : "";
    const options = Array.isArray(item?.options)
      ? item.options
          .filter((option) => typeof option === "string" && option.trim())
          .map((option) => option.trim())
      : [];
    const answer = typeof item?.answer === "string"
      ? item.answer.trim()
      : typeof item?.correctAnswer === "string"
        ? item.correctAnswer.trim()
        : "";
    const explanation =
      typeof item?.explanation === "string" ? item.explanation.trim() : "";

    if (!question || options.length !== 4 || !answer || !explanation) continue;
    if (!options.includes(answer)) continue;
    if (!isGroundedInContent(question, contentTokens)) continue;
    if (!isGroundedInContent(answer, contentTokens)) continue;
    if (!isGroundedInContent(explanation, contentTokens)) continue;

    normalized.push({
      question,
      options,
      answer,
      correctAnswer: answer,
      explanation,
    });

    if (normalized.length === requestedCount) break;
  }

 return normalized;
};

const guessQuizLabel = (body = {}) => {
  const provided = [body.subject, body.topic, body.title].find(
    (value) => typeof value === "string" && value.trim()
  );

  return provided ? provided.trim() : "Uploaded Content";
};

/* ======================================================
   AUTO SUBJECT DETECTION
====================================================== */
const detectSubject = (text = "") => normalizeSubject("", text);

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
    const sourceText = getQuizSourceText(req.body);
    if (!sourceText) {
      return res.status(400).json({ message: "Text is required" });
    }

    if (!hasSufficientQuizContent(sourceText)) {
      return res.json({
        quiz: [],
        difficulty: normalizeDifficulty(req.body?.difficulty, "medium"),
        subject: guessQuizLabel(req.body),
      });
    }

    const avgScore = await getAverageScore(req.user.id);
    const state = rlService.getState(avgScore);
    const adaptiveDifficulty = await rlService.chooseAction(req.user.id, state);
    const difficulty = normalizeDifficulty(
      req.body?.difficulty,
      adaptiveDifficulty
    );
    const numQuestions = normalizeQuestionCount(req.body?.numQuestions, 5);
    const subject = detectSubject(sourceText);

    const prompt = `
You are an expert educator AI.

IMPORTANT RULES (STRICT):
1. You MUST generate questions ONLY from the provided content below.
2. DO NOT use any external knowledge.
3. DO NOT generate random subjects like Physics, Math, etc.
4. If the content is about a specific topic, ALL questions MUST be from that topic only.
5. If content is insufficient, return an empty array [].

CONTENT:
"""
${sourceText}
"""

TASK:
Generate ${numQuestions} ${difficulty}-level multiple choice questions.

FORMAT (STRICT JSON ONLY):
[
  {
    "question": "string",
    "options": ["A", "B", "C", "D"],
    "answer": "correct option text",
    "explanation": "short explanation strictly from content"
  }
]

VALIDATION RULES:
- Every question MUST be directly answerable from the CONTENT.
- No hallucinated facts.
- No unrelated subjects.
- Keep language simple and clear.

OUTPUT:
Return ONLY valid JSON. No extra text.
`;

    const result = await generateContent(prompt);
    const parsed = safeJSONParse(result);
    const quiz = normalizeQuizQuestions(parsed, sourceText, numQuestions);

    if (!quiz.length) {
      console.log("⚠️ AI returned weak quiz, retrying...");

      return res.json({
        quiz: [],
        difficulty,
        subject,
        message: "Try with more detailed content",
      });
    }

    res.json({
      quiz,
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
    const normalizedSubject = normalizeSubject(subject);

    questions.forEach((q, i) => {
      if (q.correctAnswer === userAnswers[i]) score++;
    });

    const totalQuestions = questions.length;
    const percentage = (score / totalQuestions) * 100;

    // 🔥 SAVE FULL DATA (FIXED)
    await QuizHistory.create({
      user: userId,
      subject: normalizedSubject,
      topic: topic || normalizedSubject,
      score,
      totalQuestions,
      difficulty,
      questions,
      userAnswers,
    });

    await UserActivity.create({
      user: userId,
      type: "quiz",
      subject: normalizedSubject,
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
