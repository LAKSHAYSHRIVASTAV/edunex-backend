const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const NODE_COLORS = {
  core: "#5B4EE8",
  input: "#1D9E75",
  output: "#EF9F27",
  process: "#3B8BD4",
  byproduct: "#D4537E",
  concept: "#888780",
};

const SYSTEM_PROMPT = `You are an expert educational AI that generates concept maps from study material.
Return ONLY valid JSON with this shape:
{
  "title": "Short descriptive title",
  "summary": "2-3 sentence overview",
  "tags": ["tag1", "tag2"],
  "nodes": [
    {
      "id": "n1",
      "label": "Concept Name",
      "type": "core|input|output|process|byproduct|concept",
      "description": "Short description"
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "n1",
      "target": "n2",
      "label": "relationship",
      "type": "arrow|bidirectional|dashed"
    }
  ]
}`;

async function generateConceptMapFromText(text = "", topic = "") {
  if (!genAI) {
    return createFallbackConceptMap(text, topic);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = topic
      ? `Topic: ${topic}\n\nContext:\n${text || "None"}`
      : `Generate concept map from:\n${text}`;

    const result = await model.generateContent([
      SYSTEM_PROMPT,
      prompt,
    ]);

    const raw = result.response.text().trim();
    const parsed = parseConceptMapJSON(raw);

    return normalizeConceptMap(parsed, text, topic);
  } catch (error) {
    console.error("Concept map AI generation failed:", error.message);
    return createFallbackConceptMap(text, topic);
  }
}

function parseConceptMapJSON(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Invalid JSON from Gemini");
    return JSON.parse(match[0]);
  }
}

function normalizeConceptMap(parsed = {}, text = "", topic = "") {
  const fallback = createFallbackConceptMap(text, topic);
  const rawNodes = Array.isArray(parsed.nodes) && parsed.nodes.length
    ? parsed.nodes
    : fallback.nodes;
  const rawEdges = Array.isArray(parsed.edges)
    ? parsed.edges
    : fallback.edges;

  const nodes = assignPositions(
    rawNodes.map((node, index) => ({
      id: node.id || `n${index + 1}`,
      label: node.label || `Concept ${index + 1}`,
      type: NODE_COLORS[node.type] ? node.type : "concept",
      description: node.description || "",
      color: NODE_COLORS[node.type] || NODE_COLORS.concept,
    }))
  );

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = rawEdges
    .map((edge, index) => ({
      id: edge.id || `e${index + 1}`,
      source: edge.source,
      target: edge.target,
      label: edge.label || "",
      type: ["arrow", "bidirectional", "dashed"].includes(edge.type)
        ? edge.type
        : "arrow",
    }))
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));

  return {
    title: parsed.title || fallback.title,
    summary: parsed.summary || fallback.summary,
    tags: Array.isArray(parsed.tags) ? parsed.tags : fallback.tags,
    nodes,
    edges,
  };
}

function createFallbackConceptMap(text = "", topic = "") {
  const title = topic || text.split(/\s+/).filter(Boolean).slice(0, 5).join(" ") || "Concept Map";

  return {
    title,
    summary: text
      ? `Concept map generated from the provided study material about ${title}.`
      : `Concept map generated for ${title}.`,
    tags: [title],
    nodes: assignPositions([
      {
        id: "n1",
        label: title,
        type: "core",
        description: "Main concept",
        color: NODE_COLORS.core,
      },
      {
        id: "n2",
        label: "Key Ideas",
        type: "concept",
        description: "Important supporting ideas",
        color: NODE_COLORS.concept,
      },
    ]),
    edges: [
      {
        id: "e1",
        source: "n1",
        target: "n2",
        label: "includes",
        type: "arrow",
      },
    ],
  };
}

function assignPositions(nodes) {
  const coreNode = nodes.find((node) => node.type === "core");
  const others = nodes.filter((node) => node.type !== "core");

  const cx = 500;
  const cy = 320;
  const radius = 220;

  return nodes.map((node) => {
    if (node.type === "core" || (coreNode && node.id === coreNode.id)) {
      return { ...node, position: { x: cx, y: cy } };
    }

    const idx = Math.max(others.findIndex((item) => item.id === node.id), 0);
    const angle = (2 * Math.PI * idx) / Math.max(others.length, 1) - Math.PI / 2;

    return {
      ...node,
      position: {
        x: Math.round(cx + radius * Math.cos(angle)),
        y: Math.round(cy + radius * Math.sin(angle)),
      },
    };
  });
}

module.exports = { generateConceptMapFromText };
