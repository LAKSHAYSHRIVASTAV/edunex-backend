const QuizHistory = require("../models/QuizHistory");
const User = require("../models/User");

exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await QuizHistory.aggregate([
      {
        $group: {
          _id: "$user",
          totalQuizzes: { $sum: 1 },
          averageScore: {
            $avg: {
              $multiply: [
                { $divide: ["$score", "$totalQuestions"] },
                100,
              ],
            },
          },
        },
      },
      { $sort: { averageScore: -1 } },
      { $limit: 10 },
    ]);

    // Attach user names
    const formatted = await Promise.all(
      leaderboard.map(async (entry, index) => {
        const user = await User.findById(entry._id).select("name");

        return {
          rank: index + 1,
          name: user ? user.name : "Unknown",
          averageScore: Math.round(entry.averageScore),
          totalQuizzes: entry.totalQuizzes,
        };
      })
    );

    res.json(formatted);
  } catch (error) {
    console.error("Leaderboard Error:", error);
    res.status(500).json({
      message: "Failed to fetch leaderboard",
    });
  }
};
