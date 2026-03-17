const User = require("../models/User");

const updateUserProgress = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const today = new Date().toDateString();

    /* 🎁 DAILY REWARD (once per day) */
    if (
      !user.lastRewardDate ||
      user.lastRewardDate.toDateString() !== today
    ) {
      user.xp += 20;
      user.lastRewardDate = new Date();
    }

    /* ⭐ NORMAL XP (per question) */
    user.xp += 10;

    /* 🧠 LEVEL SYSTEM */
    if (user.xp >= user.level * 100) {
      user.level += 1;
      user.xp = 0;
    }

    /* 🔥 STREAK SYSTEM */
    if (!user.lastActive) {
      user.streak = 1;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (user.lastActive.toDateString() === today) {
        // same day → no change
      } else if (
        user.lastActive.toDateString() === yesterday.toDateString()
      ) {
        user.streak += 1;
      } else {
        user.streak = 1;
      }
    }

    user.lastActive = new Date();

    await user.save();

    return {
      xp: user.xp,
      level: user.level,
      streak: user.streak,
    };
  } catch (error) {
    console.error("Progress Service Error:", error);
    throw error;
  }
};

module.exports = {
  updateUserProgress,
};