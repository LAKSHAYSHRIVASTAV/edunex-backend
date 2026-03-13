const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  getKnowledgeGraph
} = require("../controllers/knowledgeGraphController");

router.get("/", authMiddleware, getKnowledgeGraph);

module.exports = router;