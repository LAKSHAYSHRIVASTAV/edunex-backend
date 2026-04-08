const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const NODE_TYPES = ["core", "input", "reactant", "output", "byproduct", "process"];
const EDGE_TYPES = ["produces", "requires", "converts", "absorbs", "releases"];

const NODE_COLORS = {
  core: "#5B4EE8",
  input: "#1D9E75",
  reactant: "#2F80ED",
  output: "#EF9F27",
  byproduct: "#D4537E",
  process: "#7C3AED",
};

async function generateConceptMapFromText(text = "", topic = "") {
  if (!genAI) {
    return createFallbackConceptMap(text, topic);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(buildPrompt(text, topic));
    const raw = result.response.text();
    const parsed = parseGeminiJSON(raw);
    return normalizeConceptMap(parsed, text, topic);
  } catch (error) {
    console.error("Gemini concept map generation failed:", error.message);
    return createFallbackConceptMap(text, topic);
  }
}

function buildPrompt(text, topic) {
  const source = topic
    ? `Topic: ${topic}\nParagraph/context: ${text || "No paragraph provided"}`
    : `Paragraph/context: ${text}`;

  return `
Generate a structured educational concept graph.

Rules:
- Extract 6 to 12 meaningful concepts.
- Use ONLY these node types: ${NODE_TYPES.join(", ")}.
- Use ONLY these relationship types: ${EDGE_TYPES.join(", ")}.
- Every node must include: id, label, description, type, color.
- Every edge must include: id, source, target, label, type.
- Node ids must be stable ids like n1, n2, n3.
- Edge source and target must refer to existing node ids.
- The color must match the node type:
  core=${NODE_COLORS.core}
  input=${NODE_COLORS.input}
  reactant=${NODE_COLORS.reactant}
  output=${NODE_COLORS.output}
  byproduct=${NODE_COLORS.byproduct}
  process=${NODE_COLORS.process}
- Return ONLY JSON in this exact shape:
{
  "nodes": [],
  "edges": []
}

${source}
`;
}

function parseGeminiJSON(raw = "") {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini response did not include JSON");
    return JSON.parse(match[0]);
  }
}

function normalizeConceptMap(parsed = {}, text = "", topic = "") {
  const fallback = createFallbackConceptMap(text, topic);
  const rawNodes = Array.isArray(parsed.nodes) ? parsed.nodes : fallback.nodes;

  const nodes = rawNodes
    .slice(0, 12)
    .map((node, index) => normalizeNode(node, index))
    .filter((node) => node.label);

  while (nodes.length < 6) {
    nodes.push(normalizeNode(fallback.nodes[nodes.length] || fallback.nodes[0], nodes.length));
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const rawEdges = Array.isArray(parsed.edges) ? parsed.edges : fallback.edges;
  const edges = rawEdges
    .slice(0, 18)
    .map((edge, index) => normalizeEdge(edge, index))
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target) && edge.source !== edge.target);

  if (edges.length < 5) {
    addFallbackEdges(edges, nodes);
  }

  return {
    title: topic || nodes[0]?.label || "Concept Map",
    summary: `Structured concept graph with ${nodes.length} educational concepts.`,
    tags: [topic || nodes[0]?.label || "Concept Map"],
    nodes,
    edges,
  };
}

function normalizeNode(node = {}, index) {
  const type = NODE_TYPES.includes(node.type) ? node.type : inferNodeType(index);

  return {
    id: sanitizeId(node.id, `n${index + 1}`),
    label: String(node.label || `Concept ${index + 1}`).trim(),
    description: String(node.description || "Key educational concept.").trim(),
    type,
    color: NODE_COLORS[type],
  };
}

function normalizeEdge(edge = {}, index) {
  const type = EDGE_TYPES.includes(edge.type) ? edge.type : inferEdgeType(index);

  return {
    id: sanitizeId(edge.id, `e${index + 1}`),
    source: sanitizeId(edge.source, ""),
    target: sanitizeId(edge.target, ""),
    label: edge.label && EDGE_TYPES.includes(edge.label) ? edge.label : type,
    type,
  };
}

function sanitizeId(value, fallback) {
  const id = String(value || fallback).trim().replace(/[^a-zA-Z0-9_-]/g, "");
  return id || fallback;
}

function inferNodeType(index) {
  return NODE_TYPES[Math.min(index, NODE_TYPES.length - 1)];
}

function inferEdgeType(index) {
  return EDGE_TYPES[index % EDGE_TYPES.length];
}

function createFallbackConceptMap(text = "", topic = "") {
  const subject = topic || text.split(/\s+/).filter(Boolean).slice(0, 4).join(" ") || "Learning Topic";
  const labels = [
    subject,
    "Required Inputs",
    "Initial Reactants",
    "Main Process",
    "Conversion Step",
    "Primary Output",
    "Released Byproducts",
    "Supporting Conditions",
  ];

  const types = ["core", "input", "reactant", "process", "process", "output", "byproduct", "input"];
  const nodes = labels.map((label, index) => {
    const type = types[index];

    return {
      id: `n${index + 1}`,
      label,
      description: `${label} in the context of ${subject}.`,
      type,
      color: NODE_COLORS[type],
    };
  });

  const edges = [
    ["n2", "n4", "requires"],
    ["n3", "n4", "requires"],
    ["n4", "n5", "converts"],
    ["n5", "n6", "produces"],
    ["n4", "n7", "releases"],
    ["n8", "n4", "absorbs"],
  ].map(([source, target, type], index) => ({
    id: `e${index + 1}`,
    source,
    target,
    label: type,
    type,
  }));

  return {
    title: subject,
    summary: `Structured concept graph with ${nodes.length} educational concepts.`,
    tags: [subject],
    nodes,
    edges,
  };
}

function addFallbackEdges(edges, nodes) {
  for (let index = 1; index < nodes.length && edges.length < 5; index++) {
    const type = inferEdgeType(index - 1);
    edges.push({
      id: `e${edges.length + 1}`,
      source: nodes[0].id,
      target: nodes[index].id,
      label: type,
      type,
    });
  }
}

module.exports = { generateConceptMapFromText };
