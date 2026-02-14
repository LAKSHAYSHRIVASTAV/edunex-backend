const StudyGoal = require("../models/StudyGoal");
const QuizHistory = require("../models/QuizHistory");

// =======================
// 🎯 Update Weekly Goal
// =======================
exports.updateWeeklyGoal = async (req, res) => {
  try {
    const { weeklyQuizTarget } = req.body;
    const userId = req.user.id;

    const goal = await StudyGoal.findOneAndUpdate(
      { user: userId },
      { weeklyQuizTarget },
      { new: true, upsert: true } // auto-create if not exists
    );

    res.json(goal);
  } catch (error) {
    console.error("Update Goal Error:", error);
    res.status(500).json({ message: "Error updating goal" });
  }
};

// =======================
// 📊 Get Weekly Goal Progress
// =======================
exports.getWeeklyGoalProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    let goal = await StudyGoal.findOne({ user: userId });

    // Auto create default goal if not exists
    if (!goal) {
      goal = await StudyGoal.create({
        user: userId,
        weeklyQuizTarget: 5,
      });
    }

    const today = new Date();

    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const quizzesThisWeek = await QuizHistory.find({
      user: userId,
      createdAt: { $gte: startOfWeek },
    });

    const completed = quizzesThisWeek.length;

    const progressPercentage =
      goal.weeklyQuizTarget === 0
        ? 0
        : Math.min(
            100,
            Math.round((completed / goal.weeklyQuizTarget) * 100)
          );

    res.json({
      weeklyQuizTarget: goal.weeklyQuizTarget,
      completed,
      progressPercentage,
    });
  } catch (error) {
    console.error("Goal Progress Error:", error);
    res.status(500).json({
      message: "Failed to fetch goal progress",
    });
  }
};


