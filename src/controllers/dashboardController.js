const UserActivity = require("../models/UserActivity");
const QuizHistory = require("../models/QuizHistory");
const rlService = require("../services/rlService");

exports.getDashboardData = async (req, res) => {

  try {

    const userId = req.user.id;

    const activities = await UserActivity.find({ user: userId });

    const quizzes = await QuizHistory.find({ user: userId })
      .select("subject topic score totalQuestions createdAt");

    // ----------------------------
    // Reading Progress
    // ----------------------------

    const summaries = activities.filter(
      (a) => a.type === "summary"
    ).length;

    const readingProgress = Math.min(summaries * 10, 100);

    // ----------------------------
    // Quiz Completion %
    // ----------------------------

    let quizCompletion = 0;

    if (quizzes.length > 0) {

      const avgScore =
        quizzes.reduce(
          (acc, q) =>
            acc +
            (q.score / q.totalQuestions) * 100,
          0
        ) / quizzes.length;

      quizCompletion = Math.round(avgScore);

    }

    // ----------------------------
    // Flashcards Reviewed
    // ----------------------------

    const flashcardsReviewed = activities.filter(
      (a) => a.type === "flashcard"
    ).length;

    // ----------------------------
    // Weekly Study Hours
    // ----------------------------

    const totalMinutes = activities.reduce(
      (acc, a) => acc + (a.durationMinutes || 0),
      0
    );

    const totalHours = +(totalMinutes / 60).toFixed(1);

    const weeklyStudyHours = totalHours;

    // ----------------------------
    // Weekly Activity Chart
    // ----------------------------

    const baseDate = new Date();

    const weeklyActivity = [];

    for (let i = 6; i >= 0; i--) {

      const day = new Date();

      day.setDate(baseDate.getDate() - i);

      const dayStr = day.toDateString();

      const dayMinutes = activities
        .filter(
          (a) =>
            new Date(a.createdAt).toDateString() ===
            dayStr
        )
        .reduce(
          (acc, a) => acc + (a.durationMinutes || 0),
          0
        );

      weeklyActivity.push({
        date: dayStr.slice(0, 3),
        hours: +(dayMinutes / 60).toFixed(1),
      });

    }

    // ----------------------------
    // Subject Distribution
    // ----------------------------

    const subjectMap = {};

    quizzes.forEach((quiz) => {

      const subject = quiz.subject || "General";

      subjectMap[subject] =
        (subjectMap[subject] || 0) + 1;

    });

    const totalQuizzes = quizzes.length || 1;

    const subjectDistribution = Object.entries(
      subjectMap
    ).map(([subject, count]) => ({
      subject,
      count: Math.round(
        (count / totalQuizzes) * 100
      ),
    }));

    // ----------------------------
    // Study Streak
    // ----------------------------

    const activityDates = [
      ...new Set(
        activities.map((a) =>
          new Date(a.createdAt).toDateString()
        )
      ),
    ];

    let streak = 0;

    const today = new Date();

    for (let i = 0; i < 365; i++) {

      const checkDate = new Date();

      checkDate.setDate(today.getDate() - i);

      if (
        activityDates.includes(
          checkDate.toDateString()
        )
      ) {
        streak++;
      } else {
        break;
      }

    }

    const avgDailyHours =
      weeklyActivity.reduce(
        (acc, d) => acc + d.hours,
        0
      ) / 7;

    // -------------------------------------------------
    // 🤖 AI LEARNING INSIGHTS
    // -------------------------------------------------

    let learningState = "unknown";
    let recommendedDifficulty = "medium_quiz";
    let weakestTopic = null;

    if (quizzes.length > 0) {

      const averageScore =
        quizzes.reduce(
          (acc, quiz) =>
            acc +
            (quiz.score / quiz.totalQuestions) * 100,
          0
        ) / quizzes.length;

      learningState = rlService.getState(averageScore);

      recommendedDifficulty =
        await rlService.chooseAction(
          userId,
          learningState
        );

      // Detect weakest topic

      const topicPerformance = {};

      quizzes.forEach((quiz) => {

        const topic =
          quiz.topic || quiz.subject || "General";

        const percent =
          (quiz.score / quiz.totalQuestions) * 100;

        if (!topicPerformance[topic]) {
          topicPerformance[topic] = [];
        }

        topicPerformance[topic].push(percent);

      });

      const topicAverages = {};

      Object.keys(topicPerformance).forEach(
        (topic) => {

          const scores = topicPerformance[topic];

          topicAverages[topic] =
            scores.reduce((a, b) => a + b, 0) /
            scores.length;

        }
      );

      let lowestScore = 100;

      Object.entries(topicAverages).forEach(
        ([topic, score]) => {

          if (score < lowestScore) {

            lowestScore = score;

            weakestTopic = topic;

          }

        }
      );

    }

    // -------------------------------------------------

    res.json({

      readingProgress,
      quizCompletion,
      flashcardsReviewed,

      weeklyStudyHours,
      weeklyActivity,

      subjectDistribution,

      studyStreak: streak,

      totalHours,

      avgDailyHours: +avgDailyHours.toFixed(1),

      aiInsights: {
        learningState,
        recommendedDifficulty,
        weakestTopic
      }

    });

  } catch (error) {

    console.error(error);

    res
      .status(500)
      .json({ message: "Dashboard data error" });

  }

};

