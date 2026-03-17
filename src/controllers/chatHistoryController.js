const ChatHistory = require("../models/ChatHistory");

/* ================= CREATE NEW CHAT ================= */
exports.createChat = async (req, res) => {
  try {
    const chat = await ChatHistory.create({
      user: req.user.id,
      messages: [],
      title: "New Chat",
    });

    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= GET ALL CHATS (SIDEBAR) ================= */
exports.getAllChats = async (req, res) => {
  try {
    const chats = await ChatHistory.find({ user: req.user.id })
      .select("title createdAt")
      .sort({ createdAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= GET SINGLE CHAT ================= */
exports.getChatById = async (req, res) => {
  try {
    const chat = await ChatHistory.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= ADD MESSAGE ================= */
exports.addMessage = async (req, res) => {
  try {
    const { role, content } = req.body;

    const chat = await ChatHistory.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    chat.messages.push({ role, content });

    // 🔥 Auto title from first message
    if (chat.messages.length === 1 && role === "user") {
      chat.title = content.substring(0, 30);
    }

    await chat.save();

    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= DELETE CHAT ================= */
exports.deleteChat = async (req, res) => {
  try {
    const chat = await ChatHistory.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.json({ message: "Chat deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};