const QuizHistory = require("../models/QuizHistory");
const StudyGoal = require("../models/StudyGoal");

exports.getRecommendation = async (req, res) => {
  try {
    const userId = req.user.id;

    const quizzes = await QuizHistory.find({ user: userId });

    if (quizzes.length === 0) {
      return res.json({
        recommendation:
          "Start taking quizzes to receive personalized recommendations.",
      });
    }

    // Overall average
    const averageScore =
      quizzes.reduce(
        (acc, quiz) =>
          acc + (quiz.score / quiz.totalQuestions) * 100,
        0
      ) / quizzes.length;

    // Difficulty analysis
    const easyQuizzes = quizzes.filter(q => q.difficulty === "easy");
    const mediumQuizzes = quizzes.filter(q => q.difficulty === "medium");
    const hardQuizzes = quizzes.filter(q => q.difficulty === "hard");

    const avg = (arr) =>
      arr.length === 0
        ? 0
        : arr.reduce(
            (acc, quiz) =>
              acc + (quiz.score / quiz.totalQuestions) * 100,
            0
          ) / arr.length;

    const easyAvg = avg(easyQuizzes);
    const mediumAvg = avg(mediumQuizzes);
    const hardAvg = avg(hardQuizzes);

    let recommendation = "";

    // Base performance logic
    if (averageScore < 50) {
      recommendation =
        "Your overall performance is below 50%. Focus on fundamentals and attempt easy quizzes.";
    } else if (averageScore < 75) {
      recommendation =
        "You are doing well. Practice more medium-level quizzes to improve consistency.";
    } else {
      recommendation =
        "Excellent performance! Try hard-level quizzes to challenge yourself.";
    }

    // Difficulty-specific suggestion
    if (hardAvg < 50 && hardQuizzes.length > 0) {
      recommendation +=
        " Your hard-level performance needs improvement. Consider revising before attempting more hard quizzes.";
    }

    if (easyAvg > 85 && easyQuizzes.length > 0) {
      recommendation +=
        " You are excelling in easy quizzes. Move to medium or hard difficulty.";
    }

    // Weekly goal check
    const goal = await StudyGoal.findOne({ user: userId });

    if (goal) {
      const today = new Date();
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - today.getDay());

      const quizzesThisWeek = await QuizHistory.find({
        user: userId,
        createdAt: { $gte: startOfWeek },
      });

      if (quizzesThisWeek.length < goal.weeklyQuizTarget) {
        recommendation +=
          " You are below your weekly goal. Try completing more quizzes this week.";
      }
    }

    res.json({
      averageScore: Math.round(averageScore),
      difficultyBreakdown: {
        easy: Math.round(easyAvg),
        medium: Math.round(mediumAvg),
        hard: Math.round(hardAvg),
      },
      recommendation,
    });
  } catch (error) {
    console.error("Recommendation Error:", error);
    res.status(500).json({
      message: "Failed to generate recommendation",
    });
  }
};
