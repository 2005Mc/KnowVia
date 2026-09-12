// ============================================================
// KNOWVIA - GEMINI AI BACKEND
// Simple Interactions API version
// ============================================================

const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite"
];

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

// ============================================================
// HELPER
// ============================================================

function send(res, status, data) {
  return res.status(status).json(data);
}

function cleanJSON(text) {
  if (!text) return "";

  let value = String(text).trim();

  // Remove markdown fences if Gemini adds them
  value = value.replace(/^```json\s*/i, "");
  value = value.replace(/^```\s*/i, "");
  value = value.replace(/\s*```$/i, "");

  // Sometimes the model adds text before/after JSON.
  // Try to isolate the main JSON object.
  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");

  if (
    firstBrace !== -1 &&
    lastBrace !== -1 &&
    lastBrace > firstBrace
  ) {
    value = value.slice(firstBrace, lastBrace + 1);
  }

  return value.trim();
}

// ============================================================
// GET TEXT FROM INTERACTIONS RESPONSE
// ============================================================

function getModelText(data) {
  if (!data) return "";

  // Current Interactions API response
  if (Array.isArray(data.steps)) {
    for (const step of data.steps) {
      if (step.type !== "model_output") continue;

      if (!Array.isArray(step.content)) continue;

      for (const item of step.content) {
        if (
          item.type === "text" &&
          typeof item.text === "string"
        ) {
          return item.text;
        }
      }
    }
  }

  // Extra fallback in case Google changes the response shape
  if (
    typeof data.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text;
  }

  return "";
}

// ============================================================
// GEMINI REQUEST
// ============================================================

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing in Vercel."
    );
  }

  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log("Trying Gemini model:", model);

      // IMPORTANT:
      // There is intentionally NO response_format here.
      // There is NO generation_config here.
      // There is NO mime_type here.

      const body = {
        model: model,
        input: prompt,
        store: false
      };

      const response = await fetch(
        GEMINI_API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify(body)
        }
      );

      const rawText = await response.text();

      let data;

      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          `Gemini returned a non-JSON response: ${rawText.slice(0, 500)}`
        );
      }

      if (!response.ok) {
        const message =
          data?.error?.message ||
          `Gemini request failed with status ${response.status}`;

        console.error(
          `Gemini ${model} error:`,
          data
        );

        lastError = new Error(message);
        continue;
      }

      const text = getModelText(data);

      if (!text) {
        console.error(
          "Gemini response contained no text:",
          data
        );

        lastError = new Error(
          "Gemini returned an empty response."
        );

        continue;
      }

      console.log(
        `Gemini ${model} succeeded.`
      );

      return text;

    } catch (error) {
      console.error(
        `Gemini ${model} failed:`,
        error
      );

      lastError = error;
    }
  }

  throw (
    lastError ||
    new Error("Gemini request failed.")
  );
}

// ============================================================
// SCHEMAS
// ============================================================
// These are ONLY used inside our prompts.
// They are NOT sent as response_format to Gemini.
// This avoids the API error completely.
// ============================================================

const studyPackFormat = `
{
  "summary": "string",
  "keyConcepts": ["string"],
  "flashcards": [
    {
      "question": "string",
      "answer": "string"
    }
  ],
  "quiz": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": 0,
      "explanation": "string"
    }
  ]
}
`;

const flashcardFormat = `
{
  "flashcards": [
    {
      "question": "string",
      "answer": "string"
    }
  ]
}
`;

const quizFormat = `
{
  "quiz": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": 0,
      "explanation": "string"
    }
  ]
}
`;

const weakTopicsFormat = `
{
  "weakTopics": ["string"],
  "explanation": "string"
}
`;

const knowledgeMapFormat = `
{
  "nodes": [
    {
      "topic": "string",
      "status": "Strong",
      "reason": "string"
    }
  ]
}
`;

// ============================================================
// STUDY PACK
// ============================================================

function studyPackPrompt(body) {
  const topic =
    body.topic || "General Topic";

  const difficulty =
    body.difficulty || "Medium";

  const material =
    body.material || "";

  const quizStyle =
    body.quizStyle || "Mixed";

  return `
You are Knowvia, an AI study assistant.

Create a complete study pack.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

QUESTION STYLE:
${quizStyle}

STUDY MATERIAL:
${
  material ||
  "No additional material was provided. Use reliable general knowledge."
}

Create:

1. SUMMARY

Give a clear and student-friendly explanation.

2. KEY CONCEPTS

Give the most important concepts.

3. FLASHCARDS

Create 8 useful flashcards.

4. QUIZ

Create 5 multiple-choice questions.

Every question must have EXACTLY 4 options.

correctAnswer MUST be a zero-based number:
0, 1, 2, or 3.

5. EXPLANATIONS

Give a short explanation for each question.

Question style:
${quizStyle}

If the style is Exam Pattern, make questions similar to college examination questions.

If the style is MCQ, make standard MCQs.

If the style is Mixed, combine recall, understanding and application.

IMPORTANT:

Return ONLY valid JSON.

Do NOT use Markdown.

Do NOT write anything before or after the JSON.

Use EXACTLY this structure:

${studyPackFormat}
`;
}

// ============================================================
// FLASHCARDS
// ============================================================

function flashcardsPrompt(body) {
  return `
You are Knowvia, an AI study assistant.

Create 10 useful study flashcards.

TOPIC:
${body.topic || "General Topic"}

MATERIAL:
${body.material || "Use reliable general knowledge."}

DIFFICULTY:
${body.difficulty || "Medium"}

Each flashcard needs:
- question
- answer

Focus on:
- important concepts
- definitions
- relationships
- applications
- exam points

Return ONLY valid JSON.

Do not use Markdown.

Use exactly this structure:

${flashcardFormat}
`;
}

// ============================================================
// QUIZ
// ============================================================

function quizPrompt(body) {
  return `
You are Knowvia, an AI study assistant.

Create 10 multiple-choice questions.

TOPIC:
${body.topic || "General Topic"}

MATERIAL:
${body.material || "Use reliable general knowledge."}

DIFFICULTY:
${body.difficulty || "Medium"}

QUESTION STYLE:
${body.quizStyle || "Mixed"}

Rules:

- Exactly 4 options per question.
- Only one option is correct.
- correctAnswer must be 0, 1, 2 or 3.
- Include an explanation.
- Avoid ambiguous questions.

Return ONLY valid JSON.

Do not use Markdown.

Use exactly this structure:

${quizFormat}
`;
}

// ============================================================
// WEAK TOPICS
// ============================================================

function weakTopicsPrompt(body) {
  return `
You are Knowvia's Weak Topic Detector.

Analyze this quiz performance:

${JSON.stringify(
  body.quizResults || [],
  null,
  2
)}

Identify concepts where the learner appears weak.

Do not invent information.

Return ONLY valid JSON.

Use exactly this structure:

${weakTopicsFormat}
`;
}

// ============================================================
// KNOWLEDGE MAP
// ============================================================

function knowledgeMapPrompt(body) {
  return `
You are Knowvia's Knowledge Map system.

Analyze these quiz results:

${JSON.stringify(
  body.quizResults || [],
  null,
  2
)}

For each important concept classify the learner as:

Strong
Developing
Weak

Give a short reason.

Return ONLY valid JSON.

Use exactly this structure:

${knowledgeMapFormat}
`;
}

// ============================================================
// TEXT FEATURES
// ============================================================

function textPrompt(task, body) {
  const topic =
    body.topic || "the study topic";

  const material =
    body.material || "";

  if (task === "teach") {
    return `
You are Knowvia's Teach Me tutor.

Teach the student about:

${topic}

Difficulty:
${body.difficulty || "Medium"}

Material:
${
  material ||
  "Use reliable general knowledge."
}

Explain step by step using simple language.

Include:
- simple explanation
- examples
- important points
- quick check questions
- final recap

Do not make it unnecessarily complicated.
`;
  }

  if (task === "study_session") {
    return `
You are Knowvia's Study Session coach.

Create a focused study session for:

${topic}

Difficulty:
${body.difficulty || "Medium"}

Material:
${
  material ||
  "Use reliable general knowledge."
}

Include:

1. What to study first
2. Important concepts
3. Practice activity
4. Quick self-test
5. Final revision checklist

Keep it practical.
`;
  }

  if (task === "exam") {
    return `
You are Knowvia's Exam Mode.

Create an exam preparation guide for:

${topic}

Difficulty:
${body.difficulty || "Medium"}

Material:
${
  material ||
  "Use reliable general knowledge."
}

Include:

- important exam areas
- likely question types
- practice questions
- last-minute revision points
- common mistakes

Make it useful for a college student.
`;
  }

  if (task === "ask_notes") {
    return `
You are Knowvia's Ask My Notes assistant.

STUDY MATERIAL:

${material}

USER QUESTION:

${body.question || ""}

Answer using the supplied study material whenever possible.

If the answer is not present in the notes, clearly say that the supplied notes do not contain enough information.

Do not pretend information is in the notes when it is not.
`;
  }

  if (task === "explain_mistake") {
    return `
You are Knowvia's mistake explanation tutor.

QUESTION:
${body.question || ""}

STUDENT ANSWER:
${body.studentAnswer || ""}

CORRECT ANSWER:
${body.correctAnswer || ""}

Explain:

1. What the student misunderstood.
2. Why the correct answer is correct.
3. How to avoid the same mistake.

Be encouraging and simple.
`;
  }

  return `
You are Knowvia, an AI study assistant.

Topic:
${topic}

Material:
${material}

Give a useful student-friendly response.
`;
}

// ============================================================
// MAIN API HANDLER
// ============================================================

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return send(res, 405, {
      error: "Method not allowed."
    });
  }

  try {

    const body = req.body || {};

    const task = body.task;

    if (!task) {
      return send(res, 400, {
        error: "Missing task."
      });
    }

    let prompt;
    let isJSON = false;

    switch (task) {

      case "study_pack":
        prompt = studyPackPrompt(body);
        isJSON = true;
        break;

      case "flashcards":
        prompt = flashcardsPrompt(body);
        isJSON = true;
        break;

      case "quiz":
        prompt = quizPrompt(body);
        isJSON = true;
        break;

      case "weak_topics":
        prompt = weakTopicsPrompt(body);
        isJSON = true;
        break;

      case "knowledge_map":
        prompt = knowledgeMapPrompt(body);
        isJSON = true;
        break;

      case "teach":
      case "study_session":
      case "exam":
      case "ask_notes":
      case "explain_mistake":
        prompt = textPrompt(task, body);
        break;

      default:
        return send(res, 400, {
          error: `Unknown task: ${task}`
        });
    }

    const answer =
      await callGemini(prompt);

    // ========================================================
    // JSON TASKS
    // ========================================================

    if (isJSON) {

      const cleaned =
        cleanJSON(answer);

      try {

        const parsed =
          JSON.parse(cleaned);

        return send(res, 200, {
          result: parsed,
          answer: cleaned
        });

      } catch (error) {

        console.error(
          "Gemini JSON parsing failed:",
          cleaned
        );

        return send(res, 500, {
          error:
            "Gemini returned invalid JSON. Please try again.",
          raw: cleaned
        });
      }
    }

    // ========================================================
    // NORMAL TEXT TASKS
    // ========================================================

    return send(res, 200, {
      answer: answer
    });

  } catch (error) {

    console.error(
      "KNOWVIA API ERROR:",
      error
    );

    return send(res, 500, {
      error:
        error?.message ||
        "Something went wrong while contacting Gemini."
    });
  }
}
