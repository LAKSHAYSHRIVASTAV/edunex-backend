const StudyRoom = require("../models/StudyRoom");
const Message = require("../models/Message");
const StudyProgress = require("../models/StudyProgress");

/* =========================================
   GET ALL STUDY ROOMS
========================================= */

exports.getRooms = async (req, res) => {
  try {

    const rooms = await StudyRoom.find();

    res.json(rooms);

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch rooms"
    });

  }
};

/* =========================================
   GET LAST 20 MESSAGES
========================================= */

exports.getMessages = async (req, res) => {
  try {

    const { roomId } = req.params;

    const messages = await Message.find({ room: roomId })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(messages.reverse());

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch messages"
    });

  }
};

/* =========================================
   SEND MESSAGE
========================================= */

exports.sendMessage = async (req, res) => {
  try {

    const { roomId } = req.params;
    const { content } = req.body;

    const message = await Message.create({
      room: roomId,
      user: req.user.id,
      content
    });

    res.json(message);

  } catch (error) {

    res.status(500).json({
      message: "Failed to send message"
    });

  }
};

/* =========================================
   RECORD STUDY SESSION (RL FEATURE)
========================================= */

exports.completeStudySession = async (req, res) => {

  try {

    const { topic, duration } = req.body;

    if (!topic) {

      return res.status(400).json({
        message: "Topic is required"
      });

    }

    await StudyProgress.create({

      user: req.user.id,

      topic,

      difficulty: "medium",

      completed: true,

      score: 1

    });

    res.json({

      message: "Study session recorded"

    });

  } catch (error) {

    console.error("Study session error:", error);

    res.status(500).json({

      message: "Failed to record session"

    });

  }

};