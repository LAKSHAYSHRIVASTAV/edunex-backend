const { GoogleGenerativeAI } = require("@google/generative-ai");

const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new GoogleGenerativeAI(apiKey);
};

/* ======================================================
   GENERATE CONTENT (GEMINI 2.5 - STABLE)
====================================================== */
async function generateContent(prompt) {
  try {
    const genAI = getGenAIClient();

    if (!genAI) {
      console.warn("Gemini request skipped: GEMINI_API_KEY is not configured");
      return "AI is temporarily unavailable. Please try again.";
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
      },
    });

    const response = result.response;

    const text = response.text();

    if (!text) {
      throw new Error("Empty AI response");
    }

    return text;

  } catch (error) {
    console.error("Gemini 2.5 Error:", error.message);

    // ❌ Don't crash app
    return "AI is temporarily unavailable. Please try again.";
  }
}

/* ======================================================
   SAFE JSON PARSER
====================================================== */
function safeJSONParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch {}

    return null;
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

Rules:
- Divide into weeks
- Distribute topics evenly
- Include revision before exam
- Return ONLY JSON
- No markdown
- No explanation

Format:
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

  const parsed = safeJSONParse(result);

  if (parsed) return parsed;

  console.warn("⚠️ Invalid JSON → fallback plan");

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

module.exports = {
  generateContent,
  generateSmartStudyPlan,
  safeJSONParse, // export for controller reuse
};
