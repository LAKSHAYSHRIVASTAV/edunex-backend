const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  forgotPassword,
} = require("../controllers/authController");

// POST /register
router.post("/register", registerUser);

// POST /login
router.post("/login", loginUser);

// POST /forgot-password
router.post("/forgot-password", forgotPassword);

module.exports = router;

