const Friend = require("../models/Friend");
const User = require("../models/User");

/* ================= ADD FRIEND ================= */
exports.addFriend = async (req, res) => {
  try {
    const { email } = req.body;

    const friendUser = await User.findOne({ email });
    if (!friendUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (friendUser._id.toString() === req.user.id) {
      return res.status(400).json({ message: "You cannot add yourself" });
    }

    const existing = await Friend.findOne({
      user: req.user.id,
      friend: friendUser._id,
    });

    if (existing) {
      return res.status(400).json({ message: "Already added" });
    }

    await Friend.create({
      user: req.user.id,
      friend: friendUser._id,
      streak: Math.floor(Math.random() * 7) + 1,
      studyHours: Math.floor(Math.random() * 20) + 1,
      status: Math.random() > 0.5 ? "online" : "offline",
    });

    res.json({ message: "Friend added successfully 🚀" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add friend" });
  }
};

/* ================= GET FRIENDS ================= */
exports.getFriends = async (req, res) => {
  try {
    const friends = await Friend.find({ user: req.user.id })
      .populate("friend", "name email")
      .lean();

    const enhancedFriends = friends.map((f) => ({
      ...f,
      streak: f.streak || Math.floor(Math.random() * 7) + 1,
      studyHours: f.studyHours || Math.floor(Math.random() * 20) + 1,
      status: f.status || (Math.random() > 0.5 ? "online" : "offline"),
    }));

    res.json(enhancedFriends);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch friends" });
  }
};

/* ================= REMOVE FRIEND ================= */
exports.removeFriend = async (req, res) => {
  try {
    const { id } = req.params;

    await Friend.findOneAndDelete({
      user: req.user.id,
      friend: id,
    });

    res.json({ message: "Friend removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to remove friend" });
  }
};

/* ================= LEADERBOARD ================= */
exports.getLeaderboard = async (req, res) => {
  try {
    const friends = await Friend.find({ user: req.user.id })
      .populate("friend", "name email")
      .sort({ studyHours: -1 })
      .limit(5);

    res.json(friends);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
};
