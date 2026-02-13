const QuizHistory = require("../models/QuizHistory");

exports.getStudyPlan = async (req, res) => {
  try {
    const quizzes = await QuizHistory.find({
      user: req.user.id,
    });

    if (quizzes.length === 0) {
      return res.json({
        recommendation:
          "Start attempting quizzes to generate a personalized study plan.",
      });
    }

    const averageScore = Math.round(
      quizzes.reduce(
        (acc, q) =>
          acc + (q.score / q.totalQuestions) * 100,
        0
      ) / quizzes.length
    );

    let recommendation = "";

    if (averageScore < 50) {
      recommendation =
        "Focus on fundamentals. Attempt easier quizzes and revise weak topics.";
    } else if (averageScore < 75) {
      recommendation =
        "Good progress! Try medium difficulty quizzes to improve consistency.";
    } else {
      recommendation =
        "Excellent performance! Challenge yourself with advanced quizzes.";
    }

    res.json({ recommendation });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate study plan" });
  }
};
