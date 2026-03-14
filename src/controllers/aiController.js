const ChatHistory = require("../models/ChatHistory");
const { generateContent } = require("../services/geminiService");
const QuizHistory = require("../models/QuizHistory");
const UserActivity = require("../models/UserActivity");
const AIStudyPlan = require("../models/AIStudyPlan");
const rlService = require("../services/rlService");

/* ======================================================
   AUTO SUBJECT DETECTION
====================================================== */

const detectSubject = (text) => {

  const lower = text.toLowerCase();

  if (
    lower.includes("math") ||
    lower.includes("algebra") ||
    lower.includes("equation") ||
    lower.includes("calculus")
  ) return "Mathematics";

  if (
    lower.includes("physics") ||
    lower.includes("force") ||
    lower.includes("energy") ||
    lower.includes("motion")
  ) return "Physics";

  if (
    lower.includes("chemistry") ||
    lower.includes("reaction") ||
    lower.includes("molecule") ||
    lower.includes("atom")
  ) return "Chemistry";

  if (
    lower.includes("biology") ||
    lower.includes("cell") ||
    lower.includes("organism") ||
    lower.includes("dna")
  ) return "Biology";

  if (
    lower.includes("english") ||
    lower.includes("grammar") ||
    lower.includes("literature") ||
    lower.includes("sentence") ||
    lower.includes("story")
  ) return "English";

  if (
    lower.includes("ai") ||
    lower.includes("artificial intelligence") ||
    lower.includes("machine learning") ||
    lower.includes("neural network")
  ) return "AI";

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

  return totalQuestions
    ? (totalScore / totalQuestions) * 100
    : 50;
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

    res.json({ summary });

  } catch (error) {

    console.error("AI Summary Error:", error);

    res.status(500).json({
      message: "AI generation failed"
    });

  }

};

/* ======================================================
   AI QUIZ GENERATION (RL ADAPTIVE)
====================================================== */

const generateQuiz = async (req, res) => {

  try {

    const { text } = req.body;

    if (!text)
      return res.status(400).json({ message: "Text is required" });

    const subject = detectSubject(text);

    const averageScore = await getAverageScore(req.user.id);

    const state = rlService.getState(averageScore);

    const difficulty = await rlService.chooseAction(
      req.user.id,
      state
    );

    const prompt = `
Create a ${difficulty} level quiz from the following text.

Return ONLY valid JSON in this format:

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

    quizRaw = quizRaw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const quiz = JSON.parse(quizRaw);

    res.json({
      quiz,
      difficulty,
      subject
    });

  } catch (error) {

    console.error("AI Quiz Error:", error);

    res.status(500).json({
      message: "AI generation failed"
    });

  }

};

/* ======================================================
   QUIZ SCORING
====================================================== */

const scoreQuiz = async (req, res) => {

  try {

    const { questions, userAnswers, difficulty = "medium", subject } = req.body;

    if (!questions || !userAnswers)
      return res.status(400).json({
        message: "Questions and answers required"
      });

    let score = 0;

    const results = [];

    for (let i = 0; i < questions.length; i++) {

      const q = questions[i];

      const isCorrect = q.correctAnswer === userAnswers[i];

      if (isCorrect) score++;

      results.push({
        question: q.question,
        correctAnswer: q.correctAnswer,
        userAnswer: userAnswers[i],
        isCorrect,
        explanation: q.explanation || ""
      });

    }

    const detectedSubject =
      subject || detectSubject(JSON.stringify(questions));

    const topic = questions[0]?.question || "General";

    const cleanSubject = detectedSubject
      ? detectedSubject.trim().toLowerCase()
      : "general";

    const formattedSubject =
      cleanSubject.charAt(0).toUpperCase() +
      cleanSubject.slice(1);

    await QuizHistory.create({
      user: req.user.id,
      questions,
      userAnswers,
      score,
      totalQuestions: questions.length,
      difficulty,
      subject: formattedSubject,
      topic
    });

    await UserActivity.create({
      user: req.user.id,
      type: "quiz",
      subject: formattedSubject,
      difficulty,
      score,
      durationMinutes: 10
    });

    res.json({
      totalQuestions: questions.length,
      score,
      difficulty,
      subject: formattedSubject,
      results
    });

  } catch (error) {

    console.error("Quiz Scoring Error:", error);

    res.status(500).json({
      message: "Scoring failed"
    });

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
Create flashcards from the following text.

Return JSON format:

{
 "flashcards":[
  {"question":"string","answer":"string"}
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
      durationMinutes: 5
    });

    res.json(parsed);

  } catch (error) {

    console.error("AI Flashcards Error:", error);

    res.status(500).json({
      message: "AI generation failed"
    });

  }

};

/* ======================================================
   EXPORTS
====================================================== */

module.exports = {
  generateSummary,
  generateQuiz,
  generateFlashcards,
  scoreQuiz
};


