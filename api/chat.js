const MODEL = "gemini-3.7-flash";

module.exports = async function handler(req, res) {
  try {
    // Test GET request
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed. Use POST."
      });
    }

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel Environment Variables."
      });
    }

    // Read request body
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          error: "Invalid JSON request body."
        });
      }
    }

    if (!body || typeof body !== "object") {
      return res.status(400).json({
        error: "Request body is missing."
      });
    }

    const topic = body.topic || "";
    const material = body.material || "";
    const difficulty = body.difficulty || "beginner";

    const prompt = `
You are Knowvia, an AI study assistant.

Create a useful study pack for the student.

Topic:
${topic}

Study material:
${material}

Difficulty:
${difficulty}

Return ONLY valid JSON in exactly this format:

{
  "summary": "A clear study summary",
  "flashcards": [
    {
      "question": "Question",
      "answer": "Answer"
    }
  ],
  "quiz": [
    {
      "question": "Question",
      "options": [
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4"
      ],
      "correctAnswer": 0,
      "explanation": "Explanation",
      "topic": "Topic"
    }
  ],
  "practiceQuestions": [],
  "examQuestions": []
}

Create 5 flashcards and 5 multiple-choice questions.
`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    const rawText = await geminiResponse.text();

    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({
        error: "Gemini API error",
        details: rawText
      });
    }

    let data;

    try {
      data = JSON.parse(rawText);
    } catch {
      return res.status(500).json({
        error: "Gemini returned an invalid response.",
        details: rawText.slice(0, 1000)
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") || "";

    if (!text) {
      return res.status(500).json({
        error: "Gemini returned no text.",
        details: JSON.stringify(data).slice(0, 2000)
      });
    }

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "Gemini response was not valid JSON.",
        details: text.slice(0, 2000)
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Knowvia API crash:", error);

    return res.status(500).json({
      error: "Knowvia API crashed.",
      details: error?.message || String(error)
    });
  }
};
