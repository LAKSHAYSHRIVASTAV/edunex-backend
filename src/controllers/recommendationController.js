const QuizHistory = require("../models/QuizHistory");
const StudyGoal = require("../models/StudyGoal");
const rlService = require("../services/rlService");

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

    // Overall average score
    const averageScore =
      quizzes.reduce(
        (acc, quiz) => acc + (quiz.score / quiz.totalQuestions) * 100,
        0
      ) / quizzes.length;

    // Difficulty analysis
    const easyQuizzes = quizzes.filter((q) => q.difficulty === "easy");
    const mediumQuizzes = quizzes.filter((q) => q.difficulty === "medium");
    const hardQuizzes = quizzes.filter((q) => q.difficulty === "hard");

    const avg = (arr) =>
      arr.length === 0
        ? 0
        : arr.reduce(
            (acc, quiz) => acc + (quiz.score / quiz.totalQuestions) * 100,
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

    // ------------------------------------
    // 🧠 TOPIC PERFORMANCE ANALYSIS
    // ------------------------------------

    const topicPerformance = {};

    quizzes.forEach((quiz) => {
      const percent = (quiz.score / quiz.totalQuestions) * 100;

      if (!topicPerformance[quiz.topic]) {
        topicPerformance[quiz.topic] = [];
      }

      topicPerformance[quiz.topic].push(percent);
    });

    const topicAverages = {};

    Object.keys(topicPerformance).forEach((topic) => {
      const scores = topicPerformance[topic];

      topicAverages[topic] =
        scores.reduce((a, b) => a + b, 0) / scores.length;
    });

    // ------------------------------------
    // 🧠 FIND WEAKEST TOPIC
    // ------------------------------------

    let weakestTopic = null;
    let lowestScore = 100;

    Object.entries(topicAverages).forEach(([topic, score]) => {
      if (score < lowestScore) {
        lowestScore = score;
        weakestTopic = topic;
      }
    });

    let topicSuggestion = "";

    if (weakestTopic) {
      topicSuggestion = ` Focus on improving topic: ${weakestTopic}.`;
    }

    recommendation += topicSuggestion;

    // ------------------------------------
    // WEEKLY GOAL CHECK
    // ------------------------------------

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

    // ------------------------------------
    //  REINFORCEMENT LEARNING PART
    // ------------------------------------

    const state = rlService.getState(averageScore);

    const action = await rlService.chooseAction(userId, state);

    let rlSuggestion = "";

    if (action === "easy") {
  rlSuggestion =
    " RL Suggestion: Practice more EASY quizzes to strengthen fundamentals.";
}

if (action === "medium") {
  rlSuggestion =
    " RL Suggestion: Move to MEDIUM quizzes to improve understanding.";
}

if (action === "hard") {
  rlSuggestion =
    " RL Suggestion: Challenge yourself with HARD quizzes.";
}

    recommendation += rlSuggestion;

    // ------------------------------------

    res.json({
      averageScore: Math.round(averageScore),

      difficultyBreakdown: {
        easy: Math.round(easyAvg),
        medium: Math.round(mediumAvg),
        hard: Math.round(hardAvg),
      },

      weakestTopic: weakestTopic,

      topicScores: topicAverages,

      rlState: state,

      rlAction: action,

      recommendation,
    });

  } catch (error) {
    console.error("Recommendation Error:", error);

    res.status(500).json({
      message: "Failed to generate recommendation",
    });
  }
};
