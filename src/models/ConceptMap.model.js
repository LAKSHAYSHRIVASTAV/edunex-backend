const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ['core', 'concept', 'input', 'reactant', 'output', 'byproduct', 'process'],
    default: 'concept',
  },
  description: { type: String, default: '' },
  color: { type: String, default: '#5B4EE8' },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
});

const EdgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  label: { type: String, default: '' },
  type: {
    type: String,
    default: 'concept',
  },
});

const ConceptMapSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    topic: { type: String, required: true },
    sourceText: { type: String, default: '' },
    nodes: [NodeSchema],
    edges: [EdgeSchema],
    layout: { type: String, enum: ['force', 'hierarchical', 'radial'], default: 'force' },
    summary: { type: String, default: '' },
    tags: [{ type: String }],
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ConceptMap', ConceptMapSchema);
