const QuizHistory = require("../models/QuizHistory");
const UserActivity = require("../models/UserActivity");

/* ========================================
   📊 MAIN ANALYTICS CONTROLLER
======================================== */
exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    const quizzes = await QuizHistory.find({ user: userId }).sort({
      createdAt: -1,
    });

    const totalQuizzes = quizzes.length;

    if (totalQuizzes === 0) {
      return res.json({
        totalQuizzes: 0,
        averageScore: 0,
        streak: 0,
        highestScore: 0,
        lowestScore: 0,
        recentAttempts: [],
        subjectDistribution: [],
      });
    }

    const percentages = quizzes.map(
      (quiz) => (quiz.score / quiz.totalQuestions) * 100
    );

    const averageScore = Math.round(
      percentages.reduce((a, b) => a + b, 0) / totalQuizzes
    );

    const highestScore = Math.round(Math.max(...percentages));
    const lowestScore = Math.round(Math.min(...percentages));

    const recentAttempts = quizzes.slice(0, 5).map((quiz) => ({
      score: quiz.score,
      totalQuestions: quiz.totalQuestions,
      date: quiz.createdAt,
      percentage: Math.round(
        (quiz.score / quiz.totalQuestions) * 100
      ),
    }));

    /* ========================================
       📚 SUBJECT DISTRIBUTION
    ======================================== */

    const subjectCount = {};

    quizzes.forEach((quiz) => {
      const subject = quiz.subject || "General";

      if (!subjectCount[subject]) {
        subjectCount[subject] = 0;
      }

      subjectCount[subject] += 1;
    });

    const subjectDistribution = Object.keys(subjectCount).map(
      (subject) => ({
        subject,
        percentage: Math.round(
          (subjectCount[subject] / totalQuizzes) * 100
        ),
      })
    );

    subjectDistribution.sort((a, b) => b.percentage - a.percentage);

    /* ========================================
       📅 STREAK CALCULATION
    ======================================== */

    const dates = quizzes
      .map((quiz) => new Date(quiz.createdAt).toDateString())
      .sort();

    const uniqueDates = [...new Set(dates)];

    let streak = 0;
    const today = new Date();

    for (let i = uniqueDates.length - 1; i >= 0; i--) {
      const quizDate = new Date(uniqueDates[i]);
      const diff = (today - quizDate) / (1000 * 60 * 60 * 24);

      if (Math.floor(diff) === streak) {
        streak++;
      } else {
        break;
      }
    }

    res.json({
      totalQuizzes,
      averageScore,
      streak,
      highestScore,
      lowestScore,
      recentAttempts,
      subjectDistribution,
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ========================================
   📅 WEEKLY PERFORMANCE
======================================== */
exports.getWeeklyPerformance = async (req, res) => {
  try {
    const userId = req.user.id;

    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);

    const quizzes = await QuizHistory.find({
      user: userId,
      createdAt: { $gte: sevenDaysAgo },
    });

    const weekData = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);

      const dateString = date.toISOString().split("T")[0];

      const dailyQuizzes = quizzes.filter(
        (quiz) =>
          quiz.createdAt.toISOString().split("T")[0] === dateString
      );

      const quizCount = dailyQuizzes.length;

      const averageScore =
        quizCount === 0
          ? 0
          : Math.round(
              dailyQuizzes.reduce(
                (acc, quiz) =>
                  acc + (quiz.score / quiz.totalQuestions) * 100,
                0
              ) / quizCount
            );

      weekData.unshift({
        date: dateString,
        quizzes: quizCount,
        averageScore,
      });
    }

    res.json(weekData);
  } catch (error) {
    console.error("Weekly Performance Error:", error);
    res.status(500).json({
      message: "Failed to fetch weekly performance",
    });
  }
};

/* ========================================
   📊 PROGRESS OVERVIEW (DASHBOARD)
======================================== */
exports.getProgressOverview = async (req, res) => {
  try {
    const userId = req.user.id;

    const activities = await UserActivity.find({ user: userId });

    if (!activities || activities.length === 0) {
      return res.json({
        weeklyHours: {
          Mon: 0,
          Tue: 0,
          Wed: 0,
          Thu: 0,
          Fri: 0,
          Sat: 0,
          Sun: 0,
        },
        totalHours: 0,
        avgDaily: 0,
        subjectDistribution: [],
        streak: 0,
      });
    }

    let totalMinutes = 0;

    const weeklyHours = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
    };

    const subjectMap = {};

    activities.forEach((activity) => {
      const minutes = activity.durationMinutes || 0;
      totalMinutes += minutes;

      const subject = activity.subject || "General";

      if (!subjectMap[subject]) {
        subjectMap[subject] = 0;
      }

      subjectMap[subject]++;

      const day = new Date(activity.createdAt).toLocaleString(
        "en-US",
        { weekday: "short" }
      );

      weeklyHours[day] += minutes;
    });

    const totalHours = (totalMinutes / 60).toFixed(1);

    const avgDaily = (totalMinutes / 7 / 60).toFixed(1);

    const subjectDistribution = Object.keys(subjectMap).map(
      (subject) => ({
        subject,
        percentage: Math.round(
          (subjectMap[subject] / activities.length) * 100
        ),
      })
    );

    /* ========================================
       🔥 STUDY STREAK CALCULATION
    ======================================== */

    const activityDates = activities
      .map((a) => new Date(a.createdAt).toDateString())
      .sort();

    const uniqueDates = [...new Set(activityDates)];

    let streak = 0;
    const today = new Date();

    for (let i = uniqueDates.length - 1; i >= 0; i--) {
      const studyDate = new Date(uniqueDates[i]);

      const diffDays = Math.floor(
        (today - studyDate) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === streak) {
        streak++;
      } else {
        break;
      }
    }

    res.json({
      weeklyHours,
      totalHours,
      avgDaily,
      subjectDistribution,
      streak,
    });
  } catch (error) {
    console.error("Progress Overview Error:", error);

    res.status(500).json({
      message: "Failed to fetch progress overview",
    });
  }
};

/* ========================================
   🧠 AI LEARNING INSIGHTS
======================================== */
exports.getLearningInsights = async (req, res) => {
  try {
    const userId = req.user.id;

    const quizzes = await QuizHistory.find({ user: userId });

    if (!quizzes || quizzes.length === 0) {
      return res.json({
        masteryScore: 0,
        weakTopics: [],
        strongTopics: [],
        quizCount: 0,
      });
    }

    let totalPercent = 0;
    const topicPerformance = {};

    quizzes.forEach((quiz) => {
      const percent = (quiz.score / quiz.totalQuestions) * 100;
      totalPercent += percent;

      const topic = quiz.topic || quiz.subject || "General";

      if (!topicPerformance[topic]) {
        topicPerformance[topic] = [];
      }

      topicPerformance[topic].push(percent);
    });

    const masteryScore = Math.round(totalPercent / quizzes.length);

    const weakTopics = [];
    const strongTopics = [];

    Object.keys(topicPerformance).forEach((topic) => {
      const scores = topicPerformance[topic];

      const avg =
        scores.reduce((a, b) => a + b, 0) / scores.length;

      if (avg < 50) weakTopics.push(topic);
      if (avg >= 75) strongTopics.push(topic);
    });

    res.json({
      masteryScore,
      weakTopics: weakTopics.slice(0, 3),
      strongTopics: strongTopics.slice(0, 3),
      quizCount: quizzes.length,
    });
  } catch (error) {
    console.error("Learning Insights Error:", error);
    res.status(500).json({
      message: "Failed to generate insights",
    });
  }
};

/* ========================================
   📚 KNOWLEDGE GRAPH
======================================== */
exports.getKnowledgeGraph = async (req, res) => {
  try {
    const userId = req.user.id;

    const quizzes = await QuizHistory.find({ user: userId });

    if (!quizzes || quizzes.length === 0) {
      return res.json({
        labels: [],
        scores: [],
        colors: [],
      });
    }

    const subjectScores = {};

    quizzes.forEach((quiz) => {
      const subject = quiz.subject || "General";
      const percent = (quiz.score / quiz.totalQuestions) * 100;

      if (!subjectScores[subject]) {
        subjectScores[subject] = [];
      }

      subjectScores[subject].push(percent);
    });

    const labels = [];
    const scores = [];
    const colors = [];

    /* ========================================
       SUBJECT COLOR MAP
    ======================================== */

    const subjectColors = {
      Physics: "#6366F1",
      Mathematics: "#8B5CF6",
      English: "#22C55E",
      Computer: "#3B82F6",
      General: "#F59E0B",
    };

    Object.keys(subjectScores).forEach((subject) => {
      labels.push(subject);

      const avg =
        subjectScores[subject].reduce((a, b) => a + b, 0) /
        subjectScores[subject].length;

      const rounded = Math.round(avg);

  // ensure minimum visible bar
  scores.push(rounded === 0 ? 1 : rounded);


      // Assign color
      colors.push(subjectColors[subject] || "#94A3B8");
    });

    res.json({
      labels,
      scores,
      colors,
    });
  } catch (error) {
    console.error("Knowledge Graph Error:", error);
    res.status(500).json({
      message: "Failed to fetch knowledge graph",
    });
  }
};