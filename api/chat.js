````javascript
// Knowvia AI Backend
// Gemini API - ₹0 setup
// File: api/chat.js

const MODEL = "gemini-3.7-flash";

const ALLOWED_TASKS = new Set([
  "study_pack",
  "summary",
  "flashcards",
  "quiz",
  "teach",
  "study_session",
  "exam",
  "ask_notes",
  "weak_topics",
  "explain_mistake",
  "knowledge_map"
]);

function text(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function limit(value, max = 30000) {
  return text(value).slice(0, max);
}

async function getBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  let raw = "";

  for await (const chunk of req) {
    raw += chunk;
  }

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getGeminiText(data) {
  if (!data) return "";

  const candidates = data.candidates;

  if (!Array.isArray(candidates)) {
    return "";
  }

  const parts = candidates[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map(part => part?.text || "")
    .join("")
    .trim();
}

function cleanJSON(value) {
  let result = text(value);

  // Remove markdown code fences if Gemini adds them.
  result = result
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return result;
}

function parseJSON(value) {
  const cleaned = cleanJSON(value);

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract the first JSON object.
    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");

    if (objectStart !== -1 && objectEnd > objectStart) {
      try {
        return JSON.parse(
          cleaned.slice(objectStart, objectEnd + 1)
        );
      } catch {}
    }

    // Try to extract the first JSON array.
    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");

    if (arrayStart !== -1 && arrayEnd > arrayStart) {
      try {
        return JSON.parse(
          cleaned.slice(arrayStart, arrayEnd + 1)
        );
      } catch {}
    }

    throw new Error("Gemini returned invalid JSON.");
  }
}

async function askGemini(prompt, apiKey, wantsJSON = false) {
  const requestBody = {
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
      temperature: 0.7,
      maxOutputTokens: 12000
    }
  };

  // Ask Gemini for JSON for structured tasks.
  if (wantsJSON) {
    requestBody.generationConfig.responseMimeType = "application/json";
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(requestBody)
    }
  );

  const data = await response.json();

  console.log("Gemini status:", response.status);

  if (!response.ok) {
    console.error("Gemini error:", JSON.stringify(data));

    const message =
      data?.error?.message ||
      "Gemini API request failed.";

    throw new Error(message);
  }

  const result = getGeminiText(data);

  if (!result) {
    console.error("Gemini empty response:", JSON.stringify(data));
    throw new Error("Gemini returned an empty response.");
  }

  return result;
}


// ------------------------------------------------------------
// PROMPTS
// ------------------------------------------------------------

function studyPackPrompt(body) {
  const topic = limit(body.topic, 500);
  const material = limit(body.material, 30000);
  const difficulty = text(body.difficulty, "beginner");
  const quizStyle = text(body.quizStyle, "mixed");

  return `
You are Knowvia, an AI study assistant.

Create a complete study pack for the student.

TOPIC:
${topic || "Not specified"}

STUDY MATERIAL:
${material || "No additional material was provided."}

DIFFICULTY:
${difficulty}

QUESTION STYLE:
${quizStyle}

IMPORTANT:
- Base the study pack mainly on the supplied topic/material.
- Do not invent unrelated information.
- Use simple and student-friendly language.
- Make the content useful for exam preparation.
- Match the requested difficulty.
- Create useful explanations, not vague statements.

Return ONLY valid JSON with exactly this structure:

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
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct",
      "topic": "Specific concept tested"
    }
  ],
  "practiceQuestions": [
    "Practice question 1",
    "Practice question 2",
    "Practice question 3",
    "Practice question 4",
    "Practice question 5"
  ],
  "examQuestions": [
    "Exam-style question 1",
    "Exam-style question 2",
    "Exam-style question 3",
    "Exam-style question 4",
    "Exam-style question 5"
  ]
}

Requirements:
- Exactly 10 flashcards.
- Exactly 10 multiple-choice quiz questions.
- Every quiz question must have exactly 4 options.
- correctAnswer must be 0, 1, 2, or 3.
- Every quiz question must have an explanation.
- Every quiz question must have a topic.
- practiceQuestions should match the selected question style.
- examQuestions should feel like realistic examination questions.
`;
}


function featurePrompt(task, body) {
  const material = limit(body.material, 30000);
  const topic = limit(body.topic, 500);
  const difficulty = text(body.difficulty, "beginner");

  if (task === "teach") {
    return `
You are Knowvia's "Teach Me" tutor.

Topic:
${topic}

Study material:
${material}

Difficulty:
${difficulty}

Teach this topic like a friendly personal teacher.

Use:
1. Simple explanation
2. Important concepts
3. Easy example
4. Real-world connection where useful
5. Common mistake
6. Quick check question

Do not be unnecessarily complicated.
`;
  }

  if (task === "study_session") {
    return `
You are Knowvia's Study Session planner.

Topic:
${topic}

Study material:
${material}

Difficulty:
${difficulty}

Create a focused study session for this material.

Include:
- What to study first
- Key concepts
- Short learning steps
- Active recall activity
- Practice activity
- Final self-check

Make it practical and easy to follow.
`;
  }

  if (task === "exam") {
    return `
You are Knowvia's Exam Mode assistant.

Topic:
${topic}

Study material:
${material}

Difficulty:
${difficulty}

Create an exam-focused revision guide.

Include:
- Most important concepts
- Likely question areas
- Short-answer questions
- Long-answer questions
- MCQ-style questions
- Common mistakes
- Last-minute revision tips

Do not provide unnecessarily unrelated information.
`;
  }

  if (task === "ask_notes") {
    const question = limit(body.question, 3000);

    return `
You are Knowvia's "Ask My Notes" assistant.

The student is asking a question about their study material.

TOPIC:
${topic}

NOTES:
${material}

STUDENT QUESTION:
${question}

Answer using the supplied notes/material as the primary source.

If the notes do not contain enough information, clearly say that the answer is not fully available in the supplied notes rather than pretending that it is.

Explain the answer simply.
`;
  }

  if (task === "explain_mistake") {
    const question = limit(body.question, 3000);
    const studentAnswer = limit(body.studentAnswer, 3000);
    const correctAnswer = limit(body.correctAnswer, 3000);

    return `
You are Knowvia's mistake-explanation tutor.

Topic:
${topic}

Question:
${question}

Student's answer:
${studentAnswer}

Correct answer:
${correctAnswer}

Explain:
1. What the student misunderstood
2. Why the correct answer is correct
3. How to avoid this mistake next time
4. One short similar practice question

Be supportive and never make the student feel bad.
`;
  }

  if (task === "summary") {
    return `
Create a clear study summary.

Topic:
${topic}

Material:
${material}

Difficulty:
${difficulty}

Include:
- Main idea
- Important concepts
- Key definitions
- Important points
- Simple examples where useful
- Quick revision section

Use clear headings and student-friendly language.
`;
  }

  if (task === "flashcards") {
    return `
Create 10 useful study flashcards.

Topic:
${topic}

Material:
${material}

Difficulty:
${difficulty}

Return ONLY valid JSON in this format:

[
  {
    "question": "Question",
    "answer": "Answer"
  }
]

Create exactly 10 flashcards.
`;
  }

  if (task === "quiz") {
    return `
Create 10 multiple-choice questions.

Topic:
${topic}

Material:
${material}

Difficulty:
${difficulty}

Return ONLY valid JSON in this format:

[
  {
    "question": "Question",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "correctAnswer": 0,
    "explanation": "Explanation",
    "topic": "Concept"
  }
]

Rules:
- Exactly 10 questions.
- Exactly 4 options per question.
- correctAnswer must be 0, 1, 2, or 3.
- Include an explanation.
- Include the tested topic.
`;
  }

  return "";
}


// ------------------------------------------------------------
// MAIN HANDLER
// ------------------------------------------------------------

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY is missing in Vercel environment variables."
      });
    }

    const body = await getBody(req);

    const task = text(body.task);

    if (!ALLOWED_TASKS.has(task)) {
      return res.status(400).json({
        error: "Invalid Knowvia task."
      });
    }

    let prompt = "";
    let wantsJSON = false;

    // --------------------------------------------------------
    // STUDY PACK
    // --------------------------------------------------------

    if (task === "study_pack") {
      prompt = studyPackPrompt(body);
      wantsJSON = true;
    }

    // --------------------------------------------------------
    // WEAK TOPICS
    // --------------------------------------------------------

    else if (task === "weak_topics") {
      const quizResults =
        Array.isArray(body.quizResults)
          ? body.quizResults
          : [];

      prompt = `
You are Knowvia's Weak Topic Detector.

Analyze the student's quiz results.

Quiz results:
${JSON.stringify(quizResults, null, 2)}

Identify the concepts where the student is weakest.

Return ONLY valid JSON:

{
  "weakTopics": [
    {
      "topic": "Topic name",
      "reason": "Why this topic appears weak",
      "priority": "High"
    }
  ],
  "recommendation": "Short study recommendation"
}

Rules:
- Use the actual quiz results.
- Do not invent weak topics without evidence.
- Maximum 5 weak topics.
- If there are no meaningful weak topics, return an empty array.
`;

      wantsJSON = true;
    }

    // --------------------------------------------------------
    // KNOWLEDGE MAP
    // --------------------------------------------------------

    else if (task === "knowledge_map") {
      const quizResults =
        Array.isArray(body.quizResults)
          ? body.quizResults
          : [];

      prompt = `
You are Knowvia's Knowledge Map generator.

Create a simple conceptual map from the student's study topic and quiz performance.

Topic:
${limit(body.topic, 500)}

Study material:
${limit(body.material, 30000)}

Quiz results:
${JSON.stringify(quizResults, null, 2)}

Return ONLY valid JSON:

{
  "title": "Knowledge Map",
  "centralTopic": "Main topic",
  "nodes": [
    {
      "name": "Concept",
      "importance": "High",
      "status": "Strong"
    }
  ],
  "connections": [
    {
      "from": "Concept A",
      "to": "Concept B",
      "relationship": "explains"
    }
  ]
}

Use only concepts relevant to the supplied material.
Maximum 12 nodes.
`;
      wantsJSON = true;
    }

    // --------------------------------------------------------
    // OTHER FEATURES
    // --------------------------------------------------------

    else {
      prompt = featurePrompt(task, body);

      if (!prompt) {
        return res.status(400).json({
          error: "Could not create the requested prompt."
        });
      }

      // These tasks return JSON.
      if (
        task === "flashcards" ||
        task === "quiz"
      ) {
        wantsJSON = true;
      }
    }

    const result = await askGemini(
      prompt,
      apiKey,
      wantsJSON
    );

    // --------------------------------------------------------
    // JSON TASKS
    // --------------------------------------------------------

    if (wantsJSON) {
      const parsed = parseJSON(result);

      // Keep the frontend compatible with the previous
      // Knowvia backend.
      return res.status(200).json(parsed);
    }

    // --------------------------------------------------------
    // NORMAL TEXT TASKS
    // --------------------------------------------------------

    return res.status(200).json({
      result: result,
      answer: result
    });

  } catch (error) {
    console.error("Knowvia API error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Something went wrong while contacting Gemini."
    });
  }
}
````
