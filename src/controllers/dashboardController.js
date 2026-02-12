const UserActivity = require("../models/UserActivity");

exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    const activities = await UserActivity.find({ user: userId });

    if (!activities.length) {
      return res.json({
        readingProgress: 0,
        quizCompletion: 0,
        flashcardsReviewed: 0,
        weeklyStudyHours: 0,
        weeklyActivity: [],
        subjectDistribution: [],
        studyStreak: 0,
        totalHours: 0,
        avgDailyHours: 0,
      });
    }

    // ----------------------------
    // Reading Progress
    // ----------------------------
    const summaries = activities.filter(a => a.type === "summary").length;
    const readingProgress = Math.min(summaries * 10, 100);

    // ----------------------------
    // Quiz Completion %
    // ----------------------------
    const quizzes = activities.filter(a => a.type === "quiz");
    const avgScore =
      quizzes.length > 0
        ? quizzes.reduce((acc, q) => acc + q.score, 0) / quizzes.length
        : 0;

    const quizCompletion = Math.round((avgScore / 5) * 100);

    // ----------------------------
    // Flashcards Reviewed
    // ----------------------------
    const flashcardsReviewed = activities.filter(
      a => a.type === "flashcard"
    ).length;

    // ----------------------------
    // Weekly Study Hours
    // ----------------------------
    const totalMinutes = activities.reduce(
      (acc, a) => acc + (a.durationMinutes || 0),
      0
    );

    const totalHours = +(totalMinutes / 60).toFixed(1);

    const weeklyStudyHours = totalHours;

    // ----------------------------
    // Weekly Activity Chart
    // ----------------------------
    const today = new Date();
    const weeklyActivity = [];

    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(today.getDate() - i);

      const dayStr = day.toDateString();

      const dayMinutes = activities
        .filter(a => new Date(a.createdAt).toDateString() === dayStr)
        .reduce((acc, a) => acc + (a.durationMinutes || 0), 0);

      weeklyActivity.push({
        date: dayStr.slice(0, 3),
        hours: +(dayMinutes / 60).toFixed(1),
      });
    }

    // ----------------------------
    // Subject Distribution
    // ----------------------------
    const subjectMap = {};

    activities.forEach(a => {
      subjectMap[a.subject] = (subjectMap[a.subject] || 0) + 1;
    });

    const subjectDistribution = Object.entries(subjectMap).map(
      ([subject, count]) => ({
        subject,
        count,
      })
    );

    // ----------------------------
    // Study Streak
    // ----------------------------
    const uniqueDates = [
      ...new Set(
        activities.map(a =>
          new Date(a.createdAt).toDateString()
        )
      ),
    ].sort((a, b) => new Date(b) - new Date(a));

    let streak = 0;
    let currentDate = new Date();

    for (let i = 0; i < uniqueDates.length; i++) {
      const activityDate = new Date(uniqueDates[i]);
      const diff =
        (currentDate - activityDate) / (1000 * 60 * 60 * 24);

      if (Math.floor(diff) === streak) {
        streak++;
      } else {
        break;
      }
    }

    const avgDailyHours =
      weeklyActivity.reduce((acc, d) => acc + d.hours, 0) / 7;

    res.json({
      readingProgress,
      quizCompletion,
      flashcardsReviewed,
      weeklyStudyHours,
      weeklyActivity,
      subjectDistribution,
      studyStreak: streak,
      totalHours,
      avgDailyHours: +avgDailyHours.toFixed(1),
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Dashboard data error" });
  }
};
