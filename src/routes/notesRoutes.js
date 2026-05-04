const express = require("express");
const router = express.Router();
const { generateNotes } = require("../controllers/notesController");

router.post("/generate", generateNotes);

module.exports = router;