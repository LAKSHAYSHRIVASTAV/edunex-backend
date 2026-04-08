const ConceptMap = require('../models/ConceptMap.model');
const { generateConceptMapFromText } = require('../services/ConceptMapService');

// POST /api/concept-maps/generate
exports.generate = async (req, res, next) => {
  try {
    const { text, topic, userId: bodyUserId } = req.body;
    const userId = req.user?.id || bodyUserId || 'guest';

    if (!text && !topic) {
      return res.status(400).json({ success: false, message: 'Provide text or topic to generate a concept map.' });
    }

    const aiResult = await generateConceptMapFromText(text, topic);

    const conceptMap = new ConceptMap({
      userId,
      title: aiResult.title,
      topic: topic || aiResult.title,
      sourceText: text || '',
      nodes: aiResult.nodes,
      edges: aiResult.edges,
      summary: aiResult.summary,
      tags: aiResult.tags || [],
      layout: 'force',
    });

    await conceptMap.save();

    res.status(201).json({
      nodes: aiResult.nodes,
      edges: aiResult.edges,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/concept-maps/:userId
exports.getAll = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.params.userId || 'guest';
    const maps = await ConceptMap.find({ userId })
      .select('title topic summary tags createdAt nodes edges')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: maps });
  } catch (err) {
    next(err);
  }
};

// GET /api/concept-maps/map/:id
exports.getOne = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };

    if (req.user?.id) {
      query.userId = req.user.id;
    }

    const map = await ConceptMap.findOne(query);
    if (!map) return res.status(404).json({ success: false, message: 'Concept map not found.' });
    res.json({ success: true, data: map });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/concept-maps/map/:id/layout
exports.updateLayout = async (req, res, next) => {
  try {
    const { nodes, layout } = req.body;
    const query = { _id: req.params.id };

    if (req.user?.id) {
      query.userId = req.user.id;
    }

    const map = await ConceptMap.findOneAndUpdate(
      query,
      { ...(nodes && { nodes }), ...(layout && { layout }) },
      { new: true }
    );
    if (!map) return res.status(404).json({ success: false, message: 'Concept map not found.' });
    res.json({ success: true, data: map });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/concept-maps/map/:id
exports.deleteMap = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };

    if (req.user?.id) {
      query.userId = req.user.id;
    }

    const map = await ConceptMap.findOneAndDelete(query);
    if (!map) return res.status(404).json({ success: false, message: 'Concept map not found.' });
    res.json({ success: true, message: 'Concept map deleted.' });
  } catch (err) {
    next(err);
  }
};
