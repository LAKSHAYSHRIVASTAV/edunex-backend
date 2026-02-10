const fetch = require("node-fetch");

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const API_KEY = process.env.GEMINI_API_KEY;

// 1️⃣ List models available for YOUR key
async function listModels() {
  const res = await fetch(`${BASE_URL}/models?key=${API_KEY}`);
  const data = await res.json();

  if (!res.ok) {
    console.error("ListModels Error:", data);
    throw new Error("Failed to list models");
  }

  return data.models;
}

// 2️⃣ Generate content using the FIRST supported text model
async function generateContent(prompt) {
  const models = await listModels();

  // Pick first model that supports generateContent
  const model = models.find(m =>
    m.supportedGenerationMethods?.includes("generateContent")
  );

  if (!model) {
    throw new Error("No supported Gemini model found for this API key");
  }

  const res = await fetch(
    `${BASE_URL}/${model.name}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.error("GenerateContent Error:", data);
    throw new Error("Gemini generateContent failed");
  }

  return data.candidates[0].content.parts[0].text;
}

module.exports = { generateContent };





