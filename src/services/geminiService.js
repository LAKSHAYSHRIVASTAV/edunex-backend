const fetch = require("node-fetch");

const BASE_URL = "https://generativelanguage.googleapis.com/v1";
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const MODEL = "models/gemini-pro";

/* ======================================================
   GENERATE CONTENT
====================================================== */
async function generateContent(prompt) {
prompt = (prompt || "").slice(0, 8000);
  try {

    const res = await fetch(
      `${BASE_URL}/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Gemini Error:", data);

      if (data.error?.code === 429) {
        throw new Error("Gemini rate limit reached. Please wait a few seconds.");
      }

      throw new Error(data.error?.message || "Gemini generateContent failed");
    }

    if (!data.candidates || !data.candidates.length) {
      throw new Error("Gemini returned empty response");
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No AI response";

  } catch (error) {
    console.error("AI Service Error:", error.message);
    throw error;
  }
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
  generateSmartStudyPlan
};


