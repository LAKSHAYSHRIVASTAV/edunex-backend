const fetch = require("node-fetch");

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const MODEL = "gemini-1.5-flash";

/* ======================================================
   GENERATE CONTENT (STABLE VERSION)
====================================================== */
async function generateContent(prompt) {
  prompt = (prompt || "").slice(0, 8000);

  try {
    const res = await fetch(
      `${BASE_URL}/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Gemini Error:", data);

      if (data.error?.code === 429) {
        throw new Error("Rate limit hit. Try again in a few seconds.");
      }

      throw new Error(data.error?.message || "Gemini failed");
    }

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No AI response"
    );

  } catch (error) {
    console.error("AI Service Error:", error.message);

    // 🔥 IMPORTANT: DO NOT CRASH APP
    return "AI is temporarily unavailable. Please try again.";
  }
}

/* ======================================================
   STUDY PLAN GENERATOR (SAFE)
====================================================== */
async function generateSmartStudyPlan({
  subject,
  topics,
  examDate,
  hoursPerDay,
}) {
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

  const result = await generateContent(prompt);

  // 🔥 FAIL-SAFE JSON PARSE
  try {
    return JSON.parse(result);
  } catch {
    console.warn("AI returned invalid JSON, using fallback");

    return {
      weeks: [
        {
          week: "Week 1",
          days: [
            {
              day: "Day 1",
              focus: "Basic Concepts",
              hours: hoursPerDay || 2,
            },
          ],
        },
      ],
    };
  }
}

module.exports = {
  generateContent,
  generateSmartStudyPlan,
};


