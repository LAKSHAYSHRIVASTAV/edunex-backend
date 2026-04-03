// Mock database - replace with real DB (MongoDB/PostgreSQL) in production
// All dates are ISO strings for simplicity

const MOCK_USER = {
  id: "user_001",
  name: "Aryan Sharma",
  email: "aryan@example.com",
  joinedAt: "2025-09-01",
  avatarInitials: "AS",
};

// Generate mock quiz attempts spanning last 6 months
const generateQuizAttempts = () => {
  const subjects = ["Physics", "Mathematics", "Computer", "English", "General", "AI"];
  const quizzesBySubject = {
    Physics: [
      "Newton's Laws", "Thermodynamics", "Electromagnetic Induction",
      "Optics & Light", "Fluid Mechanics", "Quantum Basics",
    ],
    Mathematics: [
      "Calculus Basics", "Probability", "Linear Algebra",
      "Differential Equations", "Statistics", "Number Theory",
    ],
    Computer: [
      "Data Structures", "Algorithms", "Operating Systems",
      "Networking Basics", "SQL Fundamentals", "OOP Concepts",
    ],
    English: [
      "Grammar Essentials", "Reading Comprehension", "Essay Writing",
      "Vocabulary Builder", "Punctuation Rules",
    ],
    General: [
      "Current Affairs", "History Overview", "Geography Basics",
      "Science GK", "Economics Intro",
    ],
    AI: [
      "Machine Learning 101", "Neural Networks", "Prompt Engineering",
      "AI Ethics", "Computer Vision",
    ],
  };

  const attempts = [];
  const now = new Date();

  for (let i = 180; i >= 0; i -= Math.floor(Math.random() * 5) + 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const quizList = quizzesBySubject[subject];
    const quizName = quizList[Math.floor(Math.random() * quizList.length)];

    // Score skewed higher for Physics, lower for Probability/AI
    let baseScore = 55 + Math.floor(Math.random() * 40);
    if (subject === "Physics") baseScore = Math.min(100, baseScore + 10);
    if (subject === "AI") baseScore = Math.max(30, baseScore - 15);

    attempts.push({
      id: `quiz_${attempts.length + 1}`,
      quizName,
      subject,
      score: baseScore,
      totalQuestions: 20,
      correctAnswers: Math.round((baseScore / 100) * 20),
      timeTaken: 300 + Math.floor(Math.random() * 900), // seconds
      date: date.toISOString(),
    });
  }

  return attempts;
};

const generateSummaries = () => {
  const summaryData = [
    { title: "Electromagnetic Induction — Chapter 6", subject: "Physics" },
    { title: "Limits and Continuity", subject: "Mathematics" },
    { title: "Binary Trees Explained", subject: "Computer" },
    { title: "Kinematics Formulae Sheet", subject: "Physics" },
    { title: "Grammar — Active vs Passive Voice", subject: "English" },
    { title: "Probability Distributions", subject: "Mathematics" },
    { title: "Newton's Laws of Motion", subject: "Physics" },
    { title: "SQL JOIN Operations", subject: "Computer" },
    { title: "Current Affairs March 2026", subject: "General" },
    { title: "Neural Network Architectures", subject: "AI" },
    { title: "Optics & Reflection Laws", subject: "Physics" },
    { title: "Vocabulary — Advanced Words", subject: "English" },
    { title: "Sorting Algorithms Comparison", subject: "Computer" },
    { title: "Statistics: Mean, Median, Mode", subject: "Mathematics" },
    { title: "World War II Overview", subject: "General" },
    { title: "Machine Learning Basics", subject: "AI" },
    { title: "Thermodynamics Laws", subject: "Physics" },
    { title: "Calculus Integration Methods", subject: "Mathematics" },
  ];

  const now = new Date();
  return summaryData.map((s, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 7 - Math.floor(Math.random() * 5));
    return {
      id: `summary_${i + 1}`,
      ...s,
      wordCount: 200 + Math.floor(Math.random() * 600),
      date: date.toISOString(),
    };
  });
};

const generateFlashcards = () => {
  const subjects = ["Physics", "Mathematics", "Computer", "English", "General", "AI"];
  const flashcards = [];
  const now = new Date();

  for (let i = 0; i < 120; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - Math.floor(Math.random() * 180));
    flashcards.push({
      id: `fc_${i + 1}`,
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      mastered: Math.random() > 0.4,
      date: date.toISOString(),
    });
  }
  return flashcards;
};

const generateStudyHours = () => {
  const hours = [];
  const now = new Date();

  for (let i = 180; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    // Weekends have more study time
    const maxHours = dayOfWeek === 0 || dayOfWeek === 6 ? 3.5 : 2.0;
    const studyHours = Math.random() > 0.3 ? Math.round(Math.random() * maxHours * 10) / 10 : 0;

    hours.push({
      date: date.toISOString().split("T")[0],
      hours: studyHours,
    });
  }
  return hours;
};

// Singleton mock data
const DB = {
  user: MOCK_USER,
  quizAttempts: generateQuizAttempts(),
  summaries: generateSummaries(),
  flashcards: generateFlashcards(),
  studyHours: generateStudyHours(),
};

module.exports = DB;