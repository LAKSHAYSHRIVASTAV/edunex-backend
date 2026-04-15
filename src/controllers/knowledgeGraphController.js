const QuizHistory = require("../models/QuizHistory");
const { normalizeSubject } = require("../utils/subjectUtils");

exports.getKnowledgeGraph = async (req, res) => {

  try {

    const userId = req.user.id;

    const attempts = await QuizHistory.find({ user: userId });

    const subjectScores = {};

    attempts.forEach((attempt) => {

      const subject = normalizeSubject(attempt.subject);

      if (!subjectScores[subject]) {

        subjectScores[subject] = {
          total: 0,
          count: 0
        };

      }

      subjectScores[subject].total += attempt.score;
      subjectScores[subject].count += 1;

    });

    const topics = Object.keys(subjectScores).map((subject) => {

      const avgScore =
        subjectScores[subject].total /
        subjectScores[subject].count;

      return {
        topic: subject,
        mastery: Math.round((avgScore / 5) * 100)
      };

    });

    res.json({
      subject: "Learning Map",
      topics
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};
