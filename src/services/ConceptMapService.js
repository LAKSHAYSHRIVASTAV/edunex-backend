const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const NODE_COLORS = {
  core: "#5B4EE8",
  input: "#1D9E75",
  output: "#EF9F27",
  process: "#3B8BD4",
  byproduct: "#D4537E",
  concept: "#888780",
};

const SYSTEM_PROMPT = `You are an expert educational AI that generates concept maps from study material.
Your job is to extract key concepts, their types, and relationships from any given text or topic.

IMPORTANT:
- Return ONLY valid JSON
- No markdown
- No explanation
- No code blocks

JSON format:
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

async function generateConceptMapFromText(text, topic) {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash", // fast + cheap
  });

  const prompt = topic
    ? `Topic: ${topic}\n\nContext:\n${text || "None"}`
    : `Generate concept map from:\n${text}`;

  const result = await model.generateContent([
    SYSTEM_PROMPT,
    prompt,
  ]);

  const raw = result.response.text().trim();

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Invalid JSON from Gemini");
    parsed = JSON.parse(match[0]);
  }

  // 🎨 Add colors + layout
  parsed.nodes = assignPositions(
    parsed.nodes.map((n) => ({
      ...n,
      color: NODE_COLORS[n.type] || NODE_COLORS.concept,
    }))
  );

  parsed.edges = parsed.edges.map((e, i) => ({
    ...e,
    id: e.id || `e${i}`,
  }));

  return parsed;
}

function assignPositions(nodes) {
  const coreNode = nodes.find((n) => n.type === "core");
  const others = nodes.filter((n) => n.type !== "core");

  const cx = 500;
  const cy = 320;
  const radius = 220;

  return nodes.map((node) => {
    if (node.type === "core" || (coreNode && node.id === coreNode.id)) {
      return { ...node, position: { x: cx, y: cy } };
    }

    const idx = others.findIndex((n) => n.id === node.id);
    const angle = (2 * Math.PI * idx) / others.length - Math.PI / 2;

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