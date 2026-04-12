const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const RELATIONSHIP_ALLOWLIST = new Set([
  "uses",
  "produces",
  "causes",
  "includes",
  "depends on",
  "supports",
  "converts to",
  "contains",
  "enables",
  "requires",
  "forms",
  "transfers",
  "regulates",
  "stores",
  "absorbs",
  "releases",
]);

const GENERIC_LABEL_REGEX =
  /^(main process|process|step|steps|input|inputs|output|outputs|concept|concepts|node|nodes|idea|ideas|topic|topics)$/i;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "their",
  "there",
  "about",
  "after",
  "before",
  "during",
  "under",
  "over",
  "when",
  "where",
  "which",
  "while",
  "because",
  "through",
  "between",
  "have",
  "has",
  "had",
  "been",
  "being",
  "will",
  "would",
  "could",
  "should",
  "must",
  "into",
  "onto",
  "your",
  "than",
  "them",
  "they",
  "these",
  "those",
  "such",
  "each",
  "very",
  "much",
  "many",
  "more",
  "most",
  "only",
  "also",
  "text",
  "study",
  "material",
]);

function buildConceptMapPrompt(inputText) {
  return `
You are an expert educational knowledge-mapping system.

Task:
Read the user's study text and extract a real concept map from the content itself.

Strict rules:
- Do NOT invent any template structure.
- Do NOT use generic labels such as "Main Process", "Step", "Input", "Output", "Concept", or similar placeholders.
- Extract only meaningful concepts that actually appear in or are clearly implied by the text.
- Prefer educational relationships such as: uses, produces, causes, includes, depends on, supports, converts to, contains, enables, requires, forms, transfers, regulates, stores, absorbs, releases.
- Keep the map concise and clean.
- Use 5 to 14 unique concepts.
- Use 4 to 18 edges.
- Each edge source and target must exactly match one of the node labels.
- Return JSON only. No markdown. No commentary.

Required JSON shape:
{
  "nodes": ["concept 1", "concept 2"],
  "edges": [
    { "source": "concept 1", "target": "concept 2", "label": "uses" }
  ]
}

User text:
${inputText}
`;
}

function parseModelJson(raw = "") {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI response did not contain valid JSON.");
    return JSON.parse(match[0]);
  }
}

function sanitizeConceptLabel(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/[•*#`"]/g, "")
    .trim();
}

function isMeaningfulConcept(label) {
  return label && label.length >= 2 && !GENERIC_LABEL_REGEX.test(label);
}

function normalizeRelationship(label = "") {
  const clean = String(label).replace(/\s+/g, " ").trim().toLowerCase();
  if (RELATIONSHIP_ALLOWLIST.has(clean)) return clean;

  if (clean.includes("depend")) return "depends on";
  if (clean.includes("require")) return "requires";
  if (clean.includes("use")) return "uses";
  if (clean.includes("produc")) return "produces";
  if (clean.includes("caus")) return "causes";
  if (clean.includes("includ")) return "includes";
  if (clean.includes("support")) return "supports";
  if (clean.includes("convert")) return "converts to";
  if (clean.includes("contain")) return "contains";
  if (clean.includes("enable")) return "enables";
  if (clean.includes("form")) return "forms";
  if (clean.includes("transfer")) return "transfers";
  if (clean.includes("regulat")) return "regulates";
  if (clean.includes("store")) return "stores";
  if (clean.includes("absorb")) return "absorbs";
  if (clean.includes("release")) return "releases";

  return "includes";
}

function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildConceptId(label, index) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || `concept-${index + 1}`;
}

function buildReactFlowNodes(concepts, title) {
  const centerX = 460;
  const centerY = 290;
  const radius = 210;
  const [primary, ...rest] = concepts;

  const nodes = [];

  if (primary) {
    nodes.push({
      id: buildConceptId(primary, 0),
      label: primary,
      type: "core",
      description: `${primary} is a central concept in this topic.`,
      position: { x: centerX, y: centerY },
    });
  }

  rest.forEach((concept, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(rest.length, 1) - Math.PI / 2;
    nodes.push({
      id: buildConceptId(concept, index + 1),
      label: concept,
      type: "concept",
      description: `${concept} is connected to ${title}.`,
      position: {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      },
    });
  });

  return nodes;
}

function buildReactFlowEdges(rawEdges, nodeIdByLabel) {
  return rawEdges.map((edge, index) => ({
    id: `edge-${index + 1}`,
    source: nodeIdByLabel.get(edge.source),
    target: nodeIdByLabel.get(edge.target),
    label: edge.label,
    type: "concept",
  }));
}

function extractConceptsFallback(text) {
  const tokens = text.match(/[A-Za-z][A-Za-z0-9-]{2,}/g) || [];
  const counts = new Map();

  tokens.forEach((token) => {
    const clean = token.trim();
    const key = clean.toLowerCase();
    if (STOP_WORDS.has(key)) return;
    counts.set(clean, (counts.get(clean) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label]) => label);
}

function detectRelationship(sentence = "") {
  const lower = sentence.toLowerCase();
  if (lower.includes("depends on")) return "depends on";
  if (lower.includes("requires")) return "requires";
  if (lower.includes("uses")) return "uses";
  if (lower.includes("produces")) return "produces";
  if (lower.includes("causes")) return "causes";
  if (lower.includes("includes")) return "includes";
  if (lower.includes("supports")) return "supports";
  if (lower.includes("converts")) return "converts to";
  if (lower.includes("contains")) return "contains";
  if (lower.includes("enables")) return "enables";
  if (lower.includes("forms")) return "forms";
  if (lower.includes("transfers")) return "transfers";
  if (lower.includes("regulates")) return "regulates";
  if (lower.includes("stores")) return "stores";
  if (lower.includes("absorbs")) return "absorbs";
  if (lower.includes("releases")) return "releases";
  return "includes";
}

function buildFallbackEdges(text, concepts) {
  const sentences = text.split(/[.!?]\s+/).filter(Boolean);
  const edges = [];

  sentences.forEach((sentence) => {
    const matched = concepts.filter((concept) =>
      new RegExp(`\\b${concept.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(sentence)
    );

    if (matched.length >= 2) {
      edges.push({
        source: matched[0],
        target: matched[1],
        label: detectRelationship(sentence),
      });
    }
  });

  if (!edges.length && concepts.length > 1) {
    for (let index = 1; index < concepts.length; index += 1) {
      edges.push({
        source: concepts[0],
        target: concepts[index],
        label: "includes",
      });
    }
  }

  return edges;
}

function validateAndNormalizeConceptMap(parsed, text) {
  const rawNodeLabels = Array.isArray(parsed?.nodes) ? parsed.nodes : [];
  let concepts = rawNodeLabels
    .map(sanitizeConceptLabel)
    .filter(isMeaningfulConcept);

  concepts = uniqueBy(concepts, (label) => label.toLowerCase()).slice(0, 14);

  if (concepts.length < 2) {
    concepts = uniqueBy(
      extractConceptsFallback(text).map(sanitizeConceptLabel).filter(isMeaningfulConcept),
      (label) => label.toLowerCase()
    ).slice(0, 10);
  }

  if (concepts.length < 2) {
    throw new Error("Unable to extract enough meaningful concepts from the provided text.");
  }

  const conceptSet = new Set(concepts.map((concept) => concept.toLowerCase()));
  let edges = Array.isArray(parsed?.edges) ? parsed.edges : [];

  edges = edges
    .map((edge) => ({
      source: sanitizeConceptLabel(edge?.source),
      target: sanitizeConceptLabel(edge?.target),
      label: normalizeRelationship(edge?.label),
    }))
    .filter(
      (edge) =>
        edge.source &&
        edge.target &&
        edge.source.toLowerCase() !== edge.target.toLowerCase() &&
        conceptSet.has(edge.source.toLowerCase()) &&
        conceptSet.has(edge.target.toLowerCase())
    );

  edges = uniqueBy(edges, (edge) => `${edge.source.toLowerCase()}|${edge.target.toLowerCase()}|${edge.label}`).slice(0, 18);

  if (!edges.length) {
    edges = uniqueBy(buildFallbackEdges(text, concepts), (edge) => `${edge.source.toLowerCase()}|${edge.target.toLowerCase()}|${edge.label}`).slice(0, 18);
  }

  if (!edges.length) {
    throw new Error("Unable to extract meaningful concept relationships from the provided text.");
  }

  const title = concepts[0];
  const reactFlowNodes = buildReactFlowNodes(concepts, title);
  const nodeIdByLabel = new Map(reactFlowNodes.map((node) => [node.label, node.id]));
  const reactFlowEdges = buildReactFlowEdges(edges, nodeIdByLabel).filter((edge) => edge.source && edge.target);

  return {
    title,
    summary: `Concept map extracted from user content with ${concepts.length} concepts and ${reactFlowEdges.length} relationships.`,
    rawConceptMap: {
      nodes: concepts,
      edges,
    },
    nodes: reactFlowNodes,
    edges: reactFlowEdges,
  };
}

async function generateConceptMapFromText(text = "", topic = "") {
  const inputText = [topic, text]
    .filter((value) => value && String(value).trim())
    .join("\n\n")
    .trim();

  if (!inputText) {
    throw new Error("Text input is required to generate a concept map.");
  }

  if (!genAI) {
    return validateAndNormalizeConceptMap(
      {
        nodes: extractConceptsFallback(inputText),
        edges: buildFallbackEdges(inputText, extractConceptsFallback(inputText)),
      },
      inputText
    );
  }

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(buildConceptMapPrompt(inputText));
  const raw = result.response.text();
  const parsed = parseModelJson(raw);
  return validateAndNormalizeConceptMap(parsed, inputText);
}

module.exports = {
  generateConceptMapFromText,
  buildConceptMapPrompt,
};
