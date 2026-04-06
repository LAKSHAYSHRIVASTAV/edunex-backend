require("dns").setDefaultResultOrder("ipv4first");

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const protectedRoutes = require("./routes/protectedRoutes");
const aiRoutes = require("./routes/aiRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const goalRoutes = require("./routes/goalRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const profileRoutes = require("./routes/profileRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const studyRoomRoutes = require("./routes/studyRoomRoutes");
const friendRoutes = require("./routes/friendRoutes");
const achievementRoutes = require("./routes/achievementRoutes");
const studyPlannerRoutes = require("./routes/studyPlannerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const rlRoutes = require("./routes/rlRoutes");
const progressRoutes = require("./routes/progressRoutes");
const knowledgeGraphRoutes = require("./routes/knowledgeGraphRoutes");
const chatHistoryRoutes = require("./routes/chatHistoryRoutes");
const flashcardRoutes = require("./routes/flashcardRoutes");
const reportRoutes = require("./routes/reportRoutes");
const conceptMapRoutes = require("./routes/ConceptMapRoutes");


const app = express();

// --------------------
// Middleware
// --------------------

app.use(
  cors({
    origin: "*",
    credentials: true
  })
);

app.use(express.json());

// --------------------
// Health Check Route
// --------------------

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "Backend is running successfully"
  });
});

// --------------------
// Connect Database
// --------------------

connectDB();

// --------------------
// API Routes
// --------------------

app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/recommendation", recommendationRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/rooms", studyRoomRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/study-plan", studyPlannerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/rl", rlRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/knowledge-graph", knowledgeGraphRoutes);
app.use("/api/chat-history", chatHistoryRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api", reportRoutes);
app.use("/api/concept-maps", conceptMapRoutes);
// --------------------
// Global Error Handler
// --------------------

app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  res.status(500).json({
    message: "Internal server error"
  });
});

// --------------------
// Start Server
// --------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("🚀 NEW SERVER FILE RUNNING");
});


