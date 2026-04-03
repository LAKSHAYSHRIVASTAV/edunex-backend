c/* ========================= STATIC REPORT (WORKING VERSION) ========================= */

exports.getReport = async (req, res) => {
  try {
    const period = req.query.period || "30d";

    res.json({
      user: {
        name: "Aryan",
        avatarInitials: "AR",
      },

      period,
      generatedAt: new Date(),

      stats: {
        totalHours: 5.6,
        avgDailyHours: 1.2,
        quizzesCompleted: 14,
        avgScore: 72,
        summariesCreated: 6,
        flashcardsReviewed: 48,
        flashcardsMastered: 30,
      },

      streak: 14,

      insights: [
        "Strong in Newton's Laws — scored 92%",
        "Probability needs attention — 41%",
        "Consistency improving — keep it up!"
      ],

      weeklyHours: [
        { date: "2026-03-01", value: 1 },
        { date: "2026-03-02", value: 2 },
        { date: "2026-03-03", value: 1.5 }
      ],

      subjectDistribution: [
        { subject: "Physics", value: 38 },
        { subject: "Mathematics", value: 28 },
        { subject: "Computer", value: 10 },
        { subject: "General", value: 15 },
        { subject: "English", value: 5 },
        { subject: "AI", value: 4 }
      ],

      recentQuizzes: [
        { title: "Newton's Laws", subject: "Physics", score: 92, date: "Mar 28" },
        { title: "Calculus Basics", subject: "Math", score: 85, date: "Mar 25" },
        { title: "Thermodynamics", subject: "Physics", score: 64, date: "Mar 22" },
        { title: "Probability", subject: "Math", score: 41, date: "Mar 18" },
        { title: "Data Structures", subject: "Computer", score: 78, date: "Mar 14" }
      ],

      recentSummaries: [
        { title: "Electromagnetic Induction", subject: "Physics" },
        { title: "Limits and Continuity", subject: "Math" },
        { title: "Binary Trees Explained", subject: "Computer" },
        { title: "Kinematics Formulae Sheet", subject: "Physics" },
        { title: "Grammar — Active vs Passive", subject: "English" }
      ]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate report" });
  }
};


/* ========================= SHARE (TEMP DISABLED) ========================= */

exports.createShareableReport = async (req, res) => {
  res.json({ id: "demo-id" });
};

exports.getSharedReport = async (req, res) => {
  res.json({ message: "Sharing disabled for now" });
};


/* ========================= PERIODS ========================= */

exports.getPeriods = (req, res) => {
  res.json([
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "3m", label: "Last 3 months" },
    { value: "6m", label: "Last 6 months" },
    { value: "1y", label: "Last year" },
    { value: "all", label: "All time" },
  ]);
};