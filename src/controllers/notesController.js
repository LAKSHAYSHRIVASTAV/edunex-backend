const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.generateNotes = async (req, res) => {
  try {
    const { content, difficulty } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: "Content is required" });
    }

  const model = genAI.getGenerativeModel({
  model: "gemini-pro"
});

    const prompt = `
Act as an expert teacher and generate structured study notes.

Requirements:
- Use headings and subheadings
- Use bullet points
- Keep explanations simple
- Highlight key concepts
- Maintain logical flow

Difficulty level: ${difficulty}

Content:
${content}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const notes = response.text();

    res.json({
      success: true,
      notes,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};