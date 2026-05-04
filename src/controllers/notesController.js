const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.generateNotes = async (req, res) => {
  try {
    const { content, difficulty } = req.body;

    // ✅ Validate input
    if (!content || content.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Content is required",
      });
    }

    // ✅ Debug API key (temporary)
    console.log("API KEY EXISTS:", !!process.env.GEMINI_API_KEY);

    // ✅ Use supported model
    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
    });

    // ✅ Build prompt
    const prompt = `
You are an expert teacher.

Create clear and structured study notes from the content below.

Instructions:
- Use headings and subheadings
- Use bullet points
- Keep explanations simple
- Highlight key concepts
- Maintain logical flow

Difficulty: ${difficulty || "Medium"}

Content:
${content}
`;

    // ✅ Generate content
    const result = await model.generateContent(prompt);

    // ✅ SAFE response extraction
    if (!result || !result.response) {
      throw new Error("Invalid response from Gemini API");
    }

    const notes = result.response.text();

    if (!notes) {
      throw new Error("Empty response from AI");
    }

    // ✅ Send response
    return res.json({
      success: true,
      notes,
    });

  } catch (error) {
    console.error("❌ GENERATE NOTES ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};