const fetch = require("node-fetch");

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

/* ======================================================
   ✅ MULTI-MODEL FALLBACK (PERMANENT FIX)
====================================================== */
const MODELS = [
  "models/gemini-1.5-flash-latest",
  "models/gemini-1.5-pro",
];

/* ======================================================
   GENERATE CONTENT (ULTRA SAFE)
====================================================== */
async function generateContent(prompt) {
  prompt = (prompt || "").slice(0, 8000);

  for (let model of MODELS) {
    try {
      const res = await fetch(
        `${BASE_URL}/${model}:generateContent?key=${API_KEY}`,
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

      /* ❌ HANDLE API ERROR */
      if (!res.ok) {
        console.error(`❌ ${model} failed:`, data?.error?.message);

        // Rate limit → stop retrying
        if (data?.error?.code === 429) {
          throw new Error("Rate limit hit. Try again later.");
        }

        // Try next model
        continue;
      }

      /* ✅ SUCCESS */
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) return text;

    } catch (err) {
      console.error(`⚠️ ${model} crashed:`, err.message);
      continue;
    }
  }

  /* ❌ ALL MODELS FAILED */
  return "AI is temporarily unavailable. Please try again.";
}

/* ======================================================
   SAFE JSON PARSER (VERY IMPORTANT)
====================================================== */
function safeJSONParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    try {
      // 🔥 Try to extract JSON if AI added extra text
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch {}

    return null;
  }
}

/* ======================================================
   STUDY PLAN GENERATOR (ULTRA SAFE)
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

  console.warn("⚠️ AI returned invalid JSON → using fallback");

  /* ✅ FALLBACK PLAN */
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
};

