const StudyRoom = require("../models/StudyRoom");
const Message = require("../models/Message");

// Get all rooms
exports.getRooms = async (req, res) => {
  try {
    const rooms = await StudyRoom.find();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
};

// Get last 20 messages
exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;

    const messages = await Message.find({ room: roomId })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;

    const message = await Message.create({
      room: roomId,
      user: req.user.id,
      content,
    });

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message" });
  }
};
