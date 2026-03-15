const ChatHistory = require("../models/ChatHistory");
const { generateContent } = require("../services/geminiService");
const QuizHistory = require("../models/QuizHistory");
const UserActivity = require("../models/UserActivity");
const rlService = require("../services/rlService");

/* ======================================================
AUTO SUBJECT DETECTION
====================================================== */

const detectSubject = (text = "") => {
  const lower = text.toLowerCase();

  if (
    lower.includes("math") ||
    lower.includes("algebra") ||
    lower.includes("equation") ||
    lower.includes("calculus") ||
    lower.includes("derivative")
  )
    return "Mathematics";

  if (
    lower.includes("physics") ||
    lower.includes("force") ||
    lower.includes("energy") ||
    lower.includes("motion") ||
    lower.includes("velocity") ||
    lower.includes("acceleration")
  )
    return "Physics";

  if (
    lower.includes("chemistry") ||
    lower.includes("reaction") ||
    lower.includes("molecule") ||
    lower.includes("atom")
  )
    return "Chemistry";

  if (
    lower.includes("biology") ||
    lower.includes("cell") ||
    lower.includes("organism") ||
    lower.includes("dna")
  )
    return "Biology";

  if (
    lower.includes("english") ||
    lower.includes("grammar") ||
    lower.includes("literature") ||
    lower.includes("sentence")
  )
    return "English";

  if (
    lower.includes("computer") ||
    lower.includes("programming") ||
    lower.includes("coding") ||
    lower.includes("algorithm")
  )
    return "Computer";

  if (
    lower.includes("ai") ||
    lower.includes("machine learning") ||
    lower.includes("neural network")
  )
    return "AI";

  return "General";
};

/* ======================================================
CALCULATE USER PERFORMANCE
====================================================== */

const getAverageScore = async (userId) => {
  const quizzes = await QuizHistory.find({ user: userId });

  if (quizzes.length === 0) return 50;

  const totalScore = quizzes.reduce((acc, q) => acc + q.score, 0);
  const totalQuestions = quizzes.reduce(
    (acc, q) => acc + q.totalQuestions,
    0
  );

  return totalQuestions ? (totalScore / totalQuestions) * 100 : 50;
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

    const prompt = `Summarize the following content in simple bullet points:\n\n${text}`;

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

    if (!text)
      return res.status(400).json({ message: "Text is required" });

    const subject = detectSubject(text);

    const avgScore = await getAverageScore(req.user.id);
    const state = rlService.getState(avgScore);
    const difficulty = await rlService.chooseAction(req.user.id, state);

    const prompt = `
Create a ${difficulty} level quiz.

Return ONLY valid JSON:

{
"questions":[
{
"question":"string",
"options":["A","B","C","D"],
"correctAnswer":"exact option",
"explanation":"short explanation"
}
]
}

Generate exactly 5 questions.

Text:
${text}
`;

    let quizRaw = await generateContent(prompt);

    quizRaw = quizRaw.replace(/```json/g, "").replace(/```/g, "").trim();

    const quiz = JSON.parse(quizRaw);

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

    const { questions, userAnswers, difficulty, subject } = req.body;

    if (!questions || !userAnswers) {
      return res.status(400).json({ message: "Quiz data missing" });
    }

    /* ---------- Calculate Score ---------- */

    let score = 0;

    questions.forEach((q, i) => {
      if (q.correctAnswer === userAnswers[i]) score++;
    });

    const totalQuestions = questions.length;
    const percentage = (score / totalQuestions) * 100;

    /* ---------- SUBJECT DETECTION FIX ---------- */

    let detectedSubject = subject;

    if (!detectedSubject || detectedSubject.toLowerCase() === "general") {
      detectedSubject = detectSubject(
        questions.map((q) => q.question).join(" ")
      );
    }

    /* ---------- Save Quiz ---------- */

    const quizHistory = await QuizHistory.create({
      user: userId,
      subject: detectedSubject,
      topic: detectedSubject,
      score,
      totalQuestions,
      difficulty,
      questions,
      userAnswers,
    });

    /* ---------- Update RL Model ---------- */

    const state = rlService.getState(percentage);

    await rlService.updateUserPerformance({
      userId,
      state,
      action: difficulty,
      reward: percentage,
    });

    /* ---------- Save Activity ---------- */

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
FLASHCARDS
====================================================== */

const generateFlashcards = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text)
      return res.status(400).json({ message: "Text required" });

    const subject = detectSubject(text);

    const prompt = `
Create flashcards.

Return JSON:

{
"flashcards":[
{"question":"string","answer":"string"}
]
}

Generate exactly 5 flashcards.

Text:
${text}
`;

    let raw = await generateContent(prompt);

    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(raw);

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

    if (!message)
      return res.status(400).json({ message: "Message required" });

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