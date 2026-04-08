const mongoose = require("mongoose");

const User = require("../models/User");
const QuizHistory = require("../models/QuizHistory");
const UserActivity = require("../models/UserActivity");
const FlashcardProgress = require("../models/FlashcardProgress");

const PERIOD_DAYS = {
  "7d": 7,
  "30d": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value, digits = 0) => Number((Number(value) || 0).toFixed(digits));

const toObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

const scorePercentExpression = {
  $cond: [
    { $gt: ["$totalQuestions", 0] },
    {
      $cond: [
        { $lte: ["$score", "$totalQuestions"] },
        { $multiply: [{ $divide: ["$score", "$totalQuestions"] }, 100] },
        "$score",
      ],
    },
    "$score",
  ],
};

const getPeriodStart = (period) => {
  if (!period || period === "all") return null;
  const days = PERIOD_DAYS[period] || PERIOD_DAYS["30d"];
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days + 1);
  return date;
};

const buildDateMatch = (userId, period) => {
  const match = { user: userId };
  const startDate = getPeriodStart(period);
  if (startDate) match.createdAt = { $gte: startDate };
  return match;
};

const dateKey = (date) => new Date(date).toISOString().slice(0, 10);

const calculateStreaks = (activities) => {
  const activityDays = [...new Set(activities.map((activity) => dateKey(activity.createdAt)))].sort();
  const daySet = new Set(activityDays);

  let current = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 730; i += 1) {
    if (!daySet.has(dateKey(cursor))) break;
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  let best = 0;
  let run = 0;
  let previous = null;

  activityDays.forEach((day) => {
    const currentDay = new Date(`${day}T00:00:00.000Z`);
    if (!previous) {
      run = 1;
    } else {
      const diffDays = Math.round((currentDay - previous) / 86400000);
      run = diffDays === 1 ? run + 1 : 1;
    }
    best = Math.max(best, run);
    previous = currentDay;
  });

  return { current, best };
};

const buildDailySeries = (days, rows, valueKey, sourceKey = "value") => {
  const byDate = new Map(rows.map((row) => [row.date, row[sourceKey] || 0]));
  const series = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const key = dateKey(day);
    series.push({
      date: key,
      [valueKey]: round(byDate.get(key) || 0, valueKey === "hours" ? 1 : 0),
    });
  }

  return series;
};

const getTrendChange = (dailyPerformance) => {
  const validScores = dailyPerformance.filter((day) => day.score > 0);
  if (validScores.length < 2) return 0;

  const midpoint = Math.floor(validScores.length / 2);
  const firstHalf = validScores.slice(0, midpoint);
  const secondHalf = validScores.slice(midpoint);

  const avg = (items) => items.reduce((sum, item) => sum + item.score, 0) / (items.length || 1);
  return round(avg(secondHalf) - avg(firstHalf), 1);
};

const buildInsights = ({ subjectBreakdown, weakTopics, strongTopics, trendChange, streak }) => {
  const insights = [];
  const strongestSubject = subjectBreakdown[0];
  const weakestTopic = weakTopics[0];

  if (strongestSubject && strongestSubject.progress >= 80) {
    insights.push({
      type: "success",
      title: `${strongestSubject.subject} is a strength`,
      message: `You are averaging ${strongestSubject.progress}% in ${strongestSubject.subject}. Keep using it as a confidence builder.`,
    });
  }

  if (weakestTopic) {
    insights.push({
      type: "warning",
      title: `${weakestTopic.topic} needs attention`,
      message: `Your average score is ${weakestTopic.score}% in ${weakestTopic.topic}. Start with a short recap, then take a focused quiz.`,
    });
  }

  if (trendChange !== 0) {
    insights.push({
      type: trendChange > 0 ? "success" : "warning",
      title: trendChange > 0 ? "Performance is improving" : "Performance dipped recently",
      message: `Your recent average changed by ${Math.abs(trendChange)} percentage points compared with the earlier part of this period.`,
    });
  }

  if (streak.current >= 7) {
    insights.push({
      type: "success",
      title: "Consistency streak is active",
      message: `You have studied for ${streak.current} days in a row. Protect that rhythm with one small session today.`,
    });
  }

  if (!insights.length && strongTopics.length) {
    insights.push({
      type: "info",
      title: "Keep building momentum",
      message: `Your strongest topic is ${strongTopics[0].topic} at ${strongTopics[0].score}%. Add one review session to lock it in.`,
    });
  }

  if (!insights.length) {
    insights.push({
      type: "info",
      title: "Start your analytics trail",
      message: "Complete a quiz, create flashcards, or generate a summary to unlock personalized insights.",
    });
  }

  return insights;
};

const buildRecommendations = (weakTopics, subjectBreakdown) => {
  if (weakTopics.length) {
    return weakTopics.slice(0, 5).map((topic) => ({
      topic: topic.topic,
      subject: topic.subject,
      priority: "High",
      actions: [
        `Take a 10-question ${topic.topic} quiz`,
        `Generate a summary for ${topic.topic}`,
        `Add ${topic.topic} to tomorrow's study plan`,
      ],
    }));
  }

  return subjectBreakdown.slice(-3).map((subject) => ({
    topic: subject.subject,
    subject: subject.subject,
    priority: subject.progress >= 70 ? "Medium" : "High",
    actions: [
      `Review recent ${subject.subject} mistakes`,
      `Create flashcards for ${subject.subject}`,
      `Schedule a focused ${subject.subject} session`,
    ],
  }));
};

const getBadges = ({ streak, overallScore, quizzesDone, flashcardsCreated }) => {
  const badges = [];
  if (streak.current >= 7) badges.push({ name: "Consistency Flame", description: "7+ day active streak" });
  if (overallScore >= 80) badges.push({ name: "High Scorer", description: "80%+ overall score" });
  if (quizzesDone >= 10) badges.push({ name: "Quiz Sprinter", description: "10+ quizzes completed" });
  if (flashcardsCreated >= 50) badges.push({ name: "Memory Builder", description: "50+ flashcards created" });
  return badges;
};

const buildReport = async (userId, period) => {
  const dateMatch = buildDateMatch(userId, period);
  const startDate = getPeriodStart(period);

  const [
    user,
    activityStats,
    subjectStats,
    topicStats,
    quizHistory,
    dailyScores,
    dailyHours,
    timeDistribution,
    flashcardStats,
    summaries,
    allActivities,
  ] = await Promise.all([
    User.findById(userId).select("name email xp level streak createdAt").lean(),

    UserActivity.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          durationMinutes: { $sum: { $ifNull: ["$durationMinutes", 0] } },
        },
      },
    ]),

    QuizHistory.aggregate([
      { $match: dateMatch },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$subject",
          attempts: { $sum: 1 },
          avgScore: { $avg: scorePercentExpression },
          firstScore: { $first: scorePercentExpression },
          lastScore: { $last: scorePercentExpression },
        },
      },
      { $sort: { avgScore: -1 } },
    ]),

    QuizHistory.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: { topic: "$topic", subject: "$subject" },
          attempts: { $sum: 1 },
          avgScore: { $avg: scorePercentExpression },
        },
      },
      { $sort: { avgScore: 1 } },
    ]),

    QuizHistory.aggregate([
      { $match: dateMatch },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 0,
          id: "$_id",
          topic: 1,
          title: "$topic",
          subject: 1,
          score: { $round: [scorePercentExpression, 0] },
          correctAnswers: "$score",
          totalQuestions: { $ifNull: ["$totalQuestions", 0] },
          difficulty: 1,
          date: "$createdAt",
        },
      },
    ]),

    QuizHistory.aggregate([
      { $match: startDate ? { user: userId, createdAt: { $gte: new Date(Date.now() - 90 * 86400000) } } : { user: userId } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          value: { $avg: scorePercentExpression },
        },
      },
      { $project: { _id: 0, date: "$_id", value: { $round: ["$value", 0] } } },
      { $sort: { date: 1 } },
    ]),

    UserActivity.aggregate([
      { $match: { user: userId, createdAt: { $gte: new Date(Date.now() - 90 * 86400000) } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          value: { $sum: { $divide: [{ $ifNull: ["$durationMinutes", 0] }, 60] } },
        },
      },
      { $project: { _id: 0, date: "$_id", value: { $round: ["$value", 1] } } },
      { $sort: { date: 1 } },
    ]),

    UserActivity.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: "$subject",
          minutes: { $sum: { $ifNull: ["$durationMinutes", 0] } },
        },
      },
      { $project: { _id: 0, subject: { $ifNull: ["$_id", "General"] }, hours: { $round: [{ $divide: ["$minutes", 60] }, 1] } } },
      { $sort: { hours: -1 } },
    ]),

    FlashcardProgress.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: null,
          decks: { $sum: 1 },
          cards: { $sum: { $size: { $ifNull: ["$cards", []] } } },
        },
      },
    ]),

    UserActivity.find({
      ...dateMatch,
      type: "summary",
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("subject durationMinutes createdAt")
      .lean(),

    UserActivity.find({ user: userId }).sort({ createdAt: 1 }).select("createdAt").lean(),
  ]);

  if (!user) return null;

  const statMap = activityStats.reduce((acc, item) => {
    acc[item._id] = item;
    return acc;
  }, {});

  const flashcardsCreated = flashcardStats[0]?.cards || 0;
  const totalMinutes = activityStats.reduce((sum, item) => sum + (item.durationMinutes || 0), 0);
  const quizzesDone = subjectStats.reduce((sum, subject) => sum + subject.attempts, 0);
  const summariesCreated = statMap.summary?.count || 0;

  const subjectBreakdown = subjectStats.map((subject) => ({
    subject: subject._id || "General",
    progress: round(clamp(subject.avgScore)),
    improvementRate: round((subject.lastScore || 0) - (subject.firstScore || 0), 1),
    attempts: subject.attempts,
  }));

  const weakTopics = topicStats
    .filter((topic) => topic.avgScore < 50)
    .map((topic) => ({
      topic: topic._id.topic || topic._id.subject || "General",
      subject: topic._id.subject || "General",
      score: round(topic.avgScore),
      attempts: topic.attempts,
    }));

  const strongTopics = topicStats
    .filter((topic) => topic.avgScore > 80)
    .sort((a, b) => b.avgScore - a.avgScore)
    .map((topic) => ({
      topic: topic._id.topic || topic._id.subject || "General",
      subject: topic._id.subject || "General",
      score: round(topic.avgScore),
      attempts: topic.attempts,
    }));

  const overallScore = subjectBreakdown.length
    ? round(subjectBreakdown.reduce((sum, subject) => sum + subject.progress * subject.attempts, 0) / subjectBreakdown.reduce((sum, subject) => sum + subject.attempts, 0))
    : 0;

  const performanceTrend = {
    "7d": buildDailySeries(7, dailyScores, "score"),
    "30d": buildDailySeries(30, dailyScores, "score"),
    "90d": buildDailySeries(90, dailyScores, "score"),
  };

  const studyTrend = {
    "7d": buildDailySeries(7, dailyHours, "hours"),
    "30d": buildDailySeries(30, dailyHours, "hours"),
    "90d": buildDailySeries(90, dailyHours, "hours"),
  };

  const streak = calculateStreaks(allActivities);
  const trendChange = getTrendChange(performanceTrend["30d"]);
  const expectedScoreNextWeek = round(clamp(overallScore + trendChange * 0.5));
  const xp = (user.xp || 0) + quizzesDone * 20 + flashcardsCreated * 2 + summariesCreated * 15 + round(totalMinutes / 10);
  const level = Math.max(user.level || 1, Math.floor(xp / 500) + 1);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatarInitials: (user.name || "U")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
    },
    period,
    generatedAt: new Date(),
    overallScore,
    studyStats: {
      totalHours: round(totalMinutes / 60, 1),
      quizzesDone,
      flashcardsCreated,
      summariesCreated,
    },
    stats: {
      totalHours: round(totalMinutes / 60, 1),
      quizzesCompleted: quizzesDone,
      avgScore: overallScore,
      summariesCreated,
      flashcardsReviewed: flashcardsCreated,
    },
    subjectBreakdown,
    quizHistory,
    summaries: summaries.map((summary) => ({
      id: summary._id,
      title: `${summary.subject || "General"} summary`,
      subject: summary.subject || "General",
      durationMinutes: summary.durationMinutes || 0,
      date: summary.createdAt,
    })),
    aiInsights: buildInsights({ subjectBreakdown, weakTopics, strongTopics, trendChange, streak }),
    insights: buildInsights({ subjectBreakdown, weakTopics, strongTopics, trendChange, streak }),
    streak,
    weakTopics,
    strongTopics,
    recommendations: buildRecommendations(weakTopics, subjectBreakdown),
    expectedScoreNextWeek,
    trends: {
      performance: performanceTrend,
      studyHours: studyTrend,
    },
    timeDistribution,
    gamification: {
      xp,
      level,
      nextLevelXp: level * 500,
      badges: getBadges({ streak, overallScore, quizzesDone, flashcardsCreated }),
    },
  };
};

exports.getReport = async (req, res) => {
  try {
    const requestedUserId = req.params.userId || req.user?.id;
    const authUserId = req.user?.id;
    const userId = toObjectId(requestedUserId);

    if (!userId) return res.status(400).json({ message: "Invalid user id" });
    if (authUserId && String(authUserId) !== String(requestedUserId)) {
      return res.status(403).json({ message: "You can only view your own report" });
    }

    const report = await buildReport(userId, req.query.period || "30d");
    if (!report) return res.status(404).json({ message: "User not found" });

    return res.json(report);
  } catch (err) {
    console.error("Report Error:", err);
    return res.status(500).json({ message: "Failed to generate report" });
  }
};

exports.getMyReport = async (req, res) => {
  req.params.userId = req.user.id;
  return exports.getReport(req, res);
};

exports.createShareableReport = async (req, res) => {
  res.status(501).json({ message: "Shareable reports are not enabled yet" });
};

exports.getSharedReport = async (req, res) => {
  res.status(501).json({ message: "Shared reports are not enabled yet" });
};

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
