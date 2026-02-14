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





const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "Backend is running successfully" });
});

// Connect DB FIRST
connectDB();

// Routes
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



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});



