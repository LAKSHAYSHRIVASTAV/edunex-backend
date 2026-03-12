const QuizHistory = require("../models/QuizHistory");
const rlService = require("../services/rlService");

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

    // ------------------------------
    // Average Score
    // ------------------------------

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

    // ------------------------------
    // TOPIC PERFORMANCE ANALYSIS
    // ------------------------------

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

    // ------------------------------
    // FIND WEAKEST TOPIC
    // ------------------------------

    let weakestTopic = null;
    let lowestScore = 100;

    Object.entries(topicAverages).forEach(([topic, score]) => {

      if (score < lowestScore) {

        lowestScore = score;
        weakestTopic = topic;

      }

    });

    // ------------------------------
    // REINFORCEMENT LEARNING
    // ------------------------------

    const state = rlService.getState(averageScore);

    const action = await rlService.chooseAction(req.user.id, state);

    // ------------------------------
    // GENERATE STUDY PLAN
    // ------------------------------

    const studyPlan = [];

    if (weakestTopic) {

      studyPlan.push({
        topic: weakestTopic,
        duration: "45 minutes",
        difficulty: action
      });

    }

    studyPlan.push({
      topic: "Revision",
      duration: "20 minutes",
      difficulty: "medium"
    });

    // ------------------------------

    res.json({

      averageScore,

      weakestTopic,

      recommendedDifficulty: action,

      studyPlan,

      recommendation

    });

  } catch (error) {

    console.error("Study Planner Error:", error);

    res.status(500).json({
      message: "Failed to generate study plan",
    });

  }
};
