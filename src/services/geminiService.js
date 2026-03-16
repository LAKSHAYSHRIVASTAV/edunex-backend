const fetch = require("node-fetch");

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const API_KEY = process.env.GEMINI_API_KEY;

const MODEL = "models/gemini-1.5-flash";

/* ======================================================
   GENERATE CONTENT
====================================================== */
async function generateContent(prompt) {
  try {

    const res = await fetch(
      `${BASE_URL}/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Gemini Error:", data);

      // Handle rate limit gracefully
      if (data.error?.code === 429) {
        throw new Error("Gemini rate limit reached. Please wait a few seconds.");
      }

      throw new Error("Gemini generateContent failed");
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

  } catch (error) {
    console.error("AI Service Error:", error);
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



