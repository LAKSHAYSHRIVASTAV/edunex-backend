const QuizHistory = require("../models/QuizHistory");

// ========================================
// 📊 MAIN ANALYTICS CONTROLLER
// ========================================
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

    // Last 5 attempts
    const recentAttempts = quizzes.slice(0, 5).map((quiz) => ({
      score: quiz.score,
      totalQuestions: quiz.totalQuestions,
      date: quiz.createdAt,
      percentage: Math.round(
        (quiz.score / quiz.totalQuestions) * 100
      ),
    }));

    // Study streak calculation
    const dates = quizzes
      .map((quiz) =>
        new Date(quiz.createdAt).toDateString()
      )
      .sort();

    const uniqueDates = [...new Set(dates)];

    let streak = 0;
    let today = new Date();

    for (let i = uniqueDates.length - 1; i >= 0; i--) {
      const quizDate = new Date(uniqueDates[i]);
      const diff =
        (today - quizDate) / (1000 * 60 * 60 * 24);

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
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ========================================
// 📅 WEEKLY PERFORMANCE (Last 7 Days)
// ========================================
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
                  acc +
                  (quiz.score / quiz.totalQuestions) * 100,
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

