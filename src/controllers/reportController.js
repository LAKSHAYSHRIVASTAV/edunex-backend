const QuizHistory = require("../models/QuizHistory");
const StudyProgress = require("../models/StudyProgress");
const FlashcardProgress = require("../models/FlashcardProgress");
const User = require("../models/User");
const Report = require("../models/Report");

/* ========================= HELPERS ========================= */

function getPeriodRange(period) {
  const now = new Date();
  const start = new Date(now);

  switch (period) {
    case "7d": start.setDate(now.getDate() - 7); break;
    case "30d": start.setDate(now.getDate() - 30); break;
    case "3m": start.setMonth(now.getMonth() - 3); break;
    case "6m": start.setMonth(now.getMonth() - 6); break;
    case "1y": start.setFullYear(now.getFullYear() - 1); break;
    default: return { start: new Date("2000-01-01"), end: now };
  }

  return { start, end: now };
}

function groupByDay(data) {
  const map = {};
  data.forEach(item => {
    const date = new Date(item.createdAt).toISOString().split("T")[0];
    map[date] = (map[date] || 0) + (item.hours || 1);
  });

  return Object.entries(map).map(([date, value]) => ({ date, value }));
}

function computeStats(quizzes, summaries, flashcards, studyHours, start, end) {
  const totalHours = studyHours.reduce((sum, h) => sum + (h.hours || 0), 0);

  const avgScore = quizzes.length
    ? Math.round(quizzes.reduce((s, q) => s + (q.score || 0), 0) / quizzes.length)
    : 0;

  const totalDays = Math.max(
    1,
    Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  );

  return {
    totalHours,
    avgDailyHours: (totalHours / totalDays).toFixed(1),
    quizzesCompleted: quizzes.length,
    avgScore,
    summariesCreated: summaries.length,
    flashcardsReviewed: flashcards.length,
    flashcardsMastered: flashcards.filter(f => f.mastered).length,
  };
}

function computeStreak(studyHours) {
  const days = new Set(
    studyHours.map(d =>
      new Date(d.createdAt).toISOString().split("T")[0]
    )
  );

  let streak = 0;
  let current = new Date();

  while (days.has(current.toISOString().split("T")[0])) {
    streak++;
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

function generateInsights(stats) {
  const insights = [];

  if (stats.avgScore > 80) insights.push("Great performance in quizzes 🚀");
  if (stats.totalHours < 10) insights.push("Try to increase study time ⏳");
  if (stats.flashcardsMastered > 20) insights.push("Strong memory retention 💡");

  return insights;
}

function computeSubjectDistribution(quizzes) {
  const map = {};
  quizzes.forEach(q => {
    const subject = q.subject || "General";
    map[subject] = (map[subject] || 0) + 1;
  });

  return Object.entries(map).map(([subject, value]) => ({
    subject,
    value,
  }));
}

/* ========================= MAIN REPORT ========================= */

exports.getReport = async (req, res) => {
  try {
    // ✅ AUTH FIX (MAIN BUG FIXED)
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user._id;

    const period = req.query.period || "30d";
    const { start, end } = getPeriodRange(period);

    // ✅ SAFE USER FETCH
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // FETCH DATA
    const quizzes = await QuizHistory.find({
      userId,
      createdAt: { $gte: start, $lte: end },
    });

    const flashcards = await FlashcardProgress.find({
      userId,
      createdAt: { $gte: start, $lte: end },
    });

    const studyHours = await StudyProgress.find({
      userId,
      createdAt: { $gte: start, $lte: end },
    });

    const summaries = [];

    // COMPUTE
    const stats = computeStats(
      quizzes,
      summaries,
      flashcards,
      studyHours,
      start,
      end
    );

    const streak = computeStreak(studyHours);
    const insights = generateInsights(stats);
    const weeklyHours = groupByDay(studyHours);
    const subjectDistribution = computeSubjectDistribution(quizzes);

    // RESPONSE
    res.json({
      user: {
        name: user.name || "User",
        avatarInitials: user.name?.slice(0, 2) || "U",
      },
      period,
      generatedAt: new Date(),

      stats,
      streak,
      insights,

      weeklyHours,
      subjectDistribution,

      recentQuizzes: quizzes.slice(-10).reverse(),
      recentSummaries: [],
    });

  } catch (err) {
    console.error("Report Error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
};

/* ========================= SHARE ========================= */

exports.createShareableReport = async (req, res) => {
  try {
    const { user, stats, period } = req.body;
    const report = await Report.create({ user, stats, period });
    res.json({ id: report._id });
  } catch {
    res.status(500).json({ error: "Failed to create report" });
  }
};

exports.getSharedReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch {
    res.status(500).json({ error: "Error fetching report" });
  }
};

/* ========================= PERIODS ========================= */

exports.getPeriods = (req, res) => {
  res.json([
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "3m", label: "Last 3 months" },
    { value: "6m", label: "Last 6 months" },
    { value: "1y", label: "Last year" },
    { value: "all", label: "All time" },
  ]);
};