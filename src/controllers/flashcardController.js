const FlashcardProgress = require("../models/FlashcardProgress");

/* ================= SAVE FLASHCARD PROGRESS ================= */
exports.saveFlashcardProgress = async (req, res) => {
  try {
    const { topic, cards } = req.body;

    if (!topic || !cards) {
      return res.status(400).json({ message: "Missing data" });
    }

    // Save data
    await FlashcardProgress.create({
      user: req.user.id,
      topic,
      cards,
    });

    // Weakness logic
    const totalCards = cards.length;

    const hardCount = cards.filter(
      (card) => card.difficulty === "hard"
    ).length;

    const easyCount = cards.filter(
      (card) => card.difficulty === "easy"
    ).length;

    let weakness = "Strong 💪";

    if (hardCount > totalCards / 2) {
      weakness = "Weak 😓";
    } else if (hardCount > 0) {
      weakness = "Moderate 🤔";
    }

    res.json({
      message: "Progress saved successfully",
      weakness,
      stats: {
        totalCards,
        hardCount,
        easyCount,
      },
    });

  } catch (error) {
    console.error("Flashcard Save Error:", error);
    res.status(500).json({ message: "Failed to save progress" });
  }
};