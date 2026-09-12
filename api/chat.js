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

function cleanJSON(value) {
  let result = text(value);

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
    const firstObject = cleaned.indexOf("{");
    const lastObject = cleaned.lastIndexOf("}");

    if (firstObject !== -1 && lastObject > firstObject) {
      return JSON.parse(
        cleaned.slice(firstObject, lastObject + 1)
      );
    }

    const firstArray = cleaned.indexOf("[");
    const lastArray = cleaned.lastIndexOf("]");

    if (firstArray !== -1 && lastArray > firstArray) {
      return JSON.parse(
        cleaned.slice(firstArray, lastArray + 1)
      );
    }

    throw new Error("Gemini returned invalid JSON.");
  }
}

async function getRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new Error("Invalid JSON request body.");
    }
  }

  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", chunk => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON request body."));
      }
    });

    req.on("error", reject);
  });
}

function getGeminiText(data) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map(part => part?.text || "")
      .join("")
      .trim() || ""
  );
}

async function askGemini(prompt, apiKey, jsonMode = false) {
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
      temperature: 0.4,
      maxOutputTokens: 12000
    }
  };

  if (jsonMode) {
    requestBody.generationConfig.responseMimeType =
      "application/json";
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

  const raw = await response.text();

  let data = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      `Gemini returned a non-JSON response: ${raw.slice(0, 500)}`
    );
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Gemini API request failed with status ${response.status}.`;

    throw new Error(message);
  }

  const result = getGeminiText(data);

  if (!result) {
    throw new Error("Gemini returned an empty response.");
  }

  return result;
}

function studyPackPrompt({
  topic,
  material,
  difficulty,
  quizStyle
}) {
  return `
You are Knowvia, an AI-powered study assistant.

Create a complete study pack for a student.

TOPIC:
${topic || "Not specified"}

STUDY MATERIAL:
${material || "No additional material provided."}

DIFFICULTY:
${difficulty || "beginner"}

QUESTION STYLE:
${quizStyle || "mixed"}

IMPORTANT:
- Use the supplied material when it is available.
- If only a topic is supplied, use reliable general academic knowledge.
- Keep explanations understandable.
- Match the requested difficulty.
- Match the requested question style.
- Do not invent citations or sources.
- Return ONLY valid JSON.
- Do not use Markdown code fences.

Return exactly this structure:

{
  "summary": "Detailed but easy-to-understand study summary.",
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
      "explanation": "Why this answer is correct.",
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
    "Exam question 1",
    "Exam question 2",
    "Exam question 3",
    "Exam question 4",
    "Exam question 5"
  ]
}

Create:
- 10 flashcards
- 10 MCQs
- 5 practice questions
- 5 exam questions

For quizStyle:
- "mixed": use a mixture of conceptual and application questions.
- "mcq": make questions strongly MCQ-oriented.
- "short": make practice/exam questions suitable for short answers.
- "exam": make questions similar to academic examination questions.
`;
}

function taskPrompt(body) {
  const topic = limit(body.topic, 10000);
  const material = limit(body.material, 30000);
  const difficulty = text(body.difficulty, "beginner");

  switch (body.task) {
    case "summary":
      return {
        json: false,
        prompt: `
You are Knowvia.

Create a clear study summary.

Topic:
${topic}

Material:
${material}

Difficulty:
${difficulty}

Include:
1. Main idea
2. Important concepts
3. Key definitions
4. Important points
5. Simple example where useful
6. Quick revision points

Use simple student-friendly language.
`
      };

    case "flashcards":
      return {
        json: true,
        prompt: `
You are Knowvia.

Create 10 useful study flashcards from this material.

Topic:
${topic}

Material:
${material}

Difficulty:
${difficulty}

Return ONLY JSON:

{
  "flashcards": [
    {
      "question": "Question",
      "answer": "Answer"
    }
  ]
}
`
      };

    case "quiz":
      return {
        json: true,
        prompt: `
You are Knowvia.

Create 10 multiple-choice questions.

Topic:
${topic}

Material:
${material}

Difficulty:
${difficulty}

Return ONLY JSON:

{
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
      "topic": "Concept"
    }
  ]
}

correctAnswer must be the zero-based option index.
`
      };

    case "teach":
      return {
        json: false,
        prompt: `
You are Knowvia's Teach Me tutor.

Teach the following topic as if helping a student who is learning it for the first time.

Topic:
${topic}

Material:
${material}

Difficulty:
${difficulty}

Use:
- simple explanation
- analogy when useful
- step-by-step breakdown
- small examples
- common mistakes
- quick check questions

Do not make it unnecessarily complicated.
`
      };

    case "study_session":
      return {
        json: false,
        prompt: `
You are Knowvia's Study Session coach.

Create a focused study session for:

Topic:
${topic}

Material:
${material}

Difficulty:
${difficulty}

Give the student:
1. What to learn first
2. What to understand next
3. What to memorize
4. What to practice
5. A short self-test
6. Final revision checklist

Make it practical and easy to follow.
`
      };

    case "exam":
      return {
        json: false,
        prompt: `
You are Knowvia's Exam Mode assistant.

Prepare an exam-oriented revision guide.

Topic:
${topic}

Material:
${material}

Difficulty:
${difficulty}

Include:
- most important concepts
- likely question areas
- short-answer questions
- long-answer questions
- application questions
- last-minute revision checklist

Focus on exam usefulness.
`
      };

    case "ask_notes":
      return {
        json: false,
        prompt: `
You are Knowvia's Ask My Notes assistant.

Answer the student's question using the supplied study material first.

Topic:
${topic}

Notes:
${material}

Student question:
${limit(body.question, 10000)}

Rules:
- If the answer is directly available in the notes, explain it from the notes.
- If the notes do not contain enough information, clearly say so.
- Do not pretend that something is present in the notes when it is not.
- Explain in simple language.
`
      };

    case "weak_topics":
      return {
        json: true,
        prompt: `
You are Knowvia's Weak Topic Detector.

Analyze the student's quiz results.

Topic:
${topic}

Quiz results:
${JSON.stringify(body.quizResults || [])}

Identify concepts where the student appears weak.

Return ONLY JSON:

{
  "weakTopics": [
    {
      "topic": "Concept",
      "reason": "Why this appears weak",
      "recommendation": "What the student should study"
    }
  ],
  "overallAdvice": "Short advice for improving."
}

If there are no clear weak topics, say so honestly.
`
      };

    case "explain_mistake":
      return {
        json: false,
        prompt: `
You are Knowvia's Explain My Mistake tutor.

Explain a student's incorrect quiz answer.

Question:
${limit(body.question, 10000)}

Student answer:
${limit(body.studentAnswer, 5000)}

Correct answer:
${limit(body.correctAnswer, 5000)}

Explanation already provided:
${limit(body.explanation, 10000)}

Do:
1. Explain why the student's answer is wrong.
2. Explain why the correct answer is right.
3. Point out the likely misunderstanding.
4. Give one simple memory trick.
5. Give one similar practice question.

Be encouraging, not judgmental.
`
      };

    case "knowledge_map":
      return {
        json: true,
        prompt: `
You are Knowvia's Knowledge Map generator.

Create a conceptual map from the student's material and quiz results.

Topic:
${topic}

Material:
${material}

Quiz results:
${JSON.stringify(body.quizResults || [])}

Return ONLY JSON:

{
  "title": "Knowledge Map",
  "coreTopic": "Main topic",
  "concepts": [
    {
      "name": "Concept",
      "description": "Short explanation",
      "importance": "high"
    }
  ],
  "connections": [
    {
      "from": "Concept A",
      "to": "Concept B",
      "relationship": "How they are connected"
    }
  ]
}

Keep the map useful for revision.
`
      };

    default:
      return {
        json: false,
        prompt: `
You are Knowvia, an AI study assistant.

Topic:
${topic}

Material:
${material}

Difficulty:
${difficulty}

Help the student understand this topic clearly.
`
      };
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed. Use POST."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY is missing. Add it in Vercel Environment Variables."
      });
    }

    const body = await getRequestBody(req);

    const task = text(body.task);

    if (!ALLOWED_TASKS.has(task)) {
      return res.status(400).json({
        error: "Invalid Knowvia task."
      });
    }

    let prompt;
    let jsonMode = false;

    if (task === "study_pack") {
      prompt = studyPackPrompt({
        topic: limit(body.topic, 10000),
        material: limit(body.material, 30000),
        difficulty: text(body.difficulty, "beginner"),
        quizStyle: text(body.quizStyle, "mixed")
      });

      jsonMode = true;
    } else {
      const taskData = taskPrompt(body);
      prompt = taskData.prompt;
      jsonMode = taskData.json;
    }

    const aiText = await askGemini(
      prompt,
      apiKey,
      jsonMode
    );

    if (jsonMode) {
      const parsed = parseJSON(aiText);

      return res.status(200).json(parsed);
    }

    return res.status(200).json({
      result: aiText,
      answer: aiText
    });

  } catch (error) {
    console.error("Knowvia API error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Knowvia could not process the request."
    });
  }
}
