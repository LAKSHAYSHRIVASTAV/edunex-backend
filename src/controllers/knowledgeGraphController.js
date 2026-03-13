const QuizAttempt = require("../models/QuizAttempt");

exports.getKnowledgeGraph = async (req, res) => {
  try {
    const userId = req.user.id;

    const attempts = await QuizAttempt.find({ userId });

    if (!attempts.length) {
      return res.json({
        message: "No quiz data available",
        topics: []
      });
    }

    const topicScores = {};

    attempts.forEach((attempt) => {
      const topic = attempt.topic;

      if (!topicScores[topic]) {
        topicScores[topic] = { total: 0, count: 0 };
      }

      topicScores[topic].total += attempt.score;
      topicScores[topic].count += 1;
    });

    const topics = Object.keys(topicScores).map((topic) => {
      const avg =
        topicScores[topic].total / topicScores[topic].count;

      return {
        topic,
        mastery: Math.round(avg)
      };
    });

    res.json({
      subject: "Learning Map",
      topics
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};