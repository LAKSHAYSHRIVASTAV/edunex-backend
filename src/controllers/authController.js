const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// =======================
// REGISTER USER
// =======================
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ name, email: normalizedEmail, password: hashedPassword });
    await user.save();

    return res.status(201).json({
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("registerUser error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

// =======================
// LOGIN USER + JWT
// =======================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // ✅ Securely compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // 🔐 CREATE JWT TOKEN
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("loginUser error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

// =======================
// FORGOT PASSWORD (PLACEHOLDER)
// =======================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "User with this email does not exist",
      });
    }

    return res.status(200).json({
      message: "Password reset link will be sent",
    });
  } catch (error) {
    console.error("forgotPassword error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
};

  