const Friend = require("../models/Friend");
const User = require("../models/User");

// Add friend by email
exports.addFriend = async (req, res) => {
  try {
    const { email } = req.body;

    const friendUser = await User.findOne({ email });
    if (!friendUser)
      return res.status(404).json({ message: "User not found" });

    await Friend.create({
      user: req.user.id,
      friend: friendUser._id,
    });

    res.json({ message: "Friend added successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add friend" });
  }
};

// Get friends list
exports.getFriends = async (req, res) => {
  try {
    const friends = await Friend.find({ user: req.user.id })
      .populate("friend", "name email");

    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch friends" });
  }
};
