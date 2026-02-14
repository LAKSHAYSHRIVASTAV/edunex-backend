const fetch = require("node-fetch");

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const API_KEY = process.env.GEMINI_API_KEY;

/* ======================================================
   LIST AVAILABLE MODELS
====================================================== */
async function listModels() {
  const res = await fetch(`${BASE_URL}/models?key=${API_KEY}`);
  const data = await res.json();

  if (!res.ok) {
    console.error("ListModels Error:", data);
    throw new Error("Failed to list models");
  }

  return data.models;
}

/* ======================================================
   GENERATE CONTENT (GENERIC)
====================================================== */
async function generateContent(prompt) {
  const models = await listModels();

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

/* ======================================================
   AI STUDY PLAN GENERATOR
====================================================== */
async function generateSmartStudyPlan({ subject, topics, examDate, hoursPerDay }) {

  const prompt = `
You are an intelligent academic planner.

Create a structured weekly study plan in STRICT JSON format.

Subject: ${subject}
Topics: ${topics}
Exam Date: ${examDate}
Daily Study Hours: ${hoursPerDay}

Instructions:
- Divide into weeks
- Distribute topics evenly
- Allocate hours logically
- Include revision days before exam
- Return ONLY valid JSON
- No markdown
- No extra explanation text

Required Format:
{
  "weeks": [
    {
      "week": "Week 1",
      "days": [
        {
          "day": "Day 1",
          "focus": "Topic name",
          "hours": 2
        }
      ]
    }
  ]
}
`;

  return await generateContent(prompt);
}

module.exports = {
  generateContent,
  generateSmartStudyPlan,
};





