const User = require("../models/User");
const QuizHistory = require("../models/QuizHistory");
const StudyGoal = require("../models/StudyGoal");

exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("-password");

    const quizzes = await QuizHistory.find({ user: userId });

    const totalQuizzes = quizzes.length;

    const averageScore =
      totalQuizzes === 0
        ? 0
        : Math.round(
            quizzes.reduce(
              (acc, quiz) =>
                acc +
                (quiz.score / quiz.totalQuestions) * 100,
              0
            ) / totalQuizzes
          );

    const bestScore =
      totalQuizzes === 0
        ? 0
        : Math.round(
            Math.max(
              ...quizzes.map(
                (quiz) =>
                  (quiz.score / quiz.totalQuestions) * 100
              )
            )
          );

    const goal = await StudyGoal.findOne({ user: userId });

    res.json({
      name: user.name,
      email: user.email,
      joinedAt: user.createdAt,
      totalQuizzes,
      averageScore,
      bestScore,
      weeklyGoal: goal ? goal.weeklyQuizTarget : 0,
    });
  } catch (error) {
    console.error("Profile Error:", error);
    res.status(500).json({
      message: "Failed to fetch profile",
    });
  }
};
