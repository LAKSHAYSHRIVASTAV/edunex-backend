const StudyGoal = require("../models/StudyGoal");
const QuizHistory = require("../models/QuizHistory");

// =======================
// 🎯 Set or Update Weekly Goal
// =======================
exports.setWeeklyGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weeklyQuizTarget } = req.body;

    if (!weeklyQuizTarget || weeklyQuizTarget <= 0) {
      return res.status(400).json({
        message: "Valid weekly target is required",
      });
    }

    let goal = await StudyGoal.findOne({ user: userId });

    if (goal) {
      goal.weeklyQuizTarget = weeklyQuizTarget;
      await goal.save();
    } else {
      goal = await StudyGoal.create({
        user: userId,
        weeklyQuizTarget,
      });
    }

    res.json({
      message: "Weekly goal saved successfully",
      goal,
    });
  } catch (error) {
    console.error("Set Goal Error:", error);
    res.status(500).json({ message: "Failed to set goal" });
  }
};

// =======================
// 📊 Get Weekly Goal Progress
// =======================
exports.getWeeklyGoalProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    let goal = await StudyGoal.findOne({ user: userId });

    // ✅ AUTO CREATE DEFAULT GOAL IF NOT EXISTS
    if (!goal) {
      goal = await StudyGoal.create({
        user: userId,
        weeklyQuizTarget: 5, // default value
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

