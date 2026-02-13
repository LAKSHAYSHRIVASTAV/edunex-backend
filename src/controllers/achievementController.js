const QuizHistory = require("../models/QuizHistory");

exports.getAchievements = async (req, res) => {
  try {
    const quizzes = await QuizHistory.find({
      user: req.user.id,
    });

    const totalQuizzes = quizzes.length;

    const highestScore =
      quizzes.length > 0
        ? Math.max(
            ...quizzes.map(
              (q) => (q.score / q.totalQuestions) * 100
            )
          )
        : 0;

    const achievements = [
      {
        title: "🔥 5 Quizzes Completed",
        unlocked: totalQuizzes >= 5,
      },
      {
        title: "🏆 80% Score Master",
        unlocked: highestScore >= 80,
      },
      {
        title: "📚 20 Quizzes Completed",
        unlocked: totalQuizzes >= 20,
      },
    ];

    res.json(achievements);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch achievements" });
  }
};
