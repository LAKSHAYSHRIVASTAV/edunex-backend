const User = require("../models/User");
const QuizHistory = require("../models/QuizHistory");

exports.getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalQuizzes = await QuizHistory.countDocuments();

    const avgScore = await QuizHistory.aggregate([
      {
        $group: {
          _id: null,
          avg: {
            $avg: {
              $multiply: [
                { $divide: ["$score", "$totalQuestions"] },
                100,
              ],
            },
          },
        },
      },
    ]);

    res.json({
      totalUsers,
      totalQuizzes,
      averagePlatformScore: Math.round(avgScore[0]?.avg || 0),
    });
  } catch (err) {
    console.error("Admin Stats Error:", err);
    res.status(500).json({ message: "Admin stats failed" });
  }
};
