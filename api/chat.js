import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt is required"
      });
    }

    const response = await client.responses.create({
      model: "gpt-5",
      input: prompt
    });

    return res.status(200).json({
      answer: response.output_text
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "AI request failed"
    });

  }

}
