// api/chat.js

const MODEL = "gpt-5.6-luna";

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

function text(value) {
  return value == null ? "" : String(value).trim();
}

function limit(value, max = 30000) {
  const result = text(value);
  return result.length > max ? result.slice(0, max) : result;
}

function getBody(req) {
  if (!req.body) return {};

  if (typeof req.body === "object") {
    return req.body;
  }

  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

/*
  Read the text returned by the OpenAI Responses API.
*/
function getAIText(data) {

  // Normal Responses API convenience field
  if (
    typeof data?.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  // Read output items
  if (Array.isArray(data?.output)) {

    const parts = [];

    for (const item of data.output) {

      if (!Array.isArray(item?.content)) {
        continue;
      }

      for (const content of item.content) {

        if (
          content?.type === "output_text" &&
          typeof content?.text === "string"
        ) {
          parts.push(content.text);
        }

        // Extra fallback
        else if (
          typeof content?.text === "string"
        ) {
          parts.push(content.text);
        }
      }
    }

    if (parts.length > 0) {
      return parts.join("\n").trim();
    }
  }

  return "";
}

/*
  Remove accidental markdown code fences
  around JSON.
*/
function cleanJSON(textValue) {

  let value = textValue.trim();

  if (value.startsWith("```json")) {
    value = value.slice(7);
  }

  if (value.startsWith("```")) {
    value = value.slice(3);
  }

  if (value.endsWith("```")) {
    value = value.slice(0, -3);
  }

  return value.trim();
}

/*
  Parse JSON even if the AI accidentally adds
  a little extra text.
*/
function parseJSON(textValue) {

  const cleaned = cleanJSON(textValue);

  try {
    return JSON.parse(cleaned);
  } catch {}

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {

    try {
      return JSON.parse(
        cleaned.slice(firstBrace, lastBrace + 1)
      );
    } catch {}
  }

  return null;
}

/*
  Main OpenAI request
*/
async function askAI(prompt, apiKey) {

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },

      body: JSON.stringify({
        model: MODEL,

        reasoning: {
          effort: "none"
        },

        input: prompt,

        max_output_tokens: 12000
      })
    }
  );

  const data = await response.json();

  console.log(
    "OPENAI RESPONSE:",
    JSON.stringify(data)
  );

  if (!response.ok) {

    throw new Error(
      data?.error?.message ||
      `OpenAI API error: ${response.status}`
    );
  }

  const answer = getAIText(data);

  if (!answer) {

    console.error(
      "OpenAI returned no readable text:",
      JSON.stringify(data)
    );

    throw new Error(
      "AI returned an empty response."
    );
  }

  return answer;
}

/*
  Common instructions
*/
function basePrompt() {

  return `
You are Knowvia, an AI-powered study assistant.

Help students learn, understand and revise academic topics.

Use simple and clear language.

Keep important technical terminology.

Use the supplied study material as the main source.

Do not invent information that contradicts the material.

Make the response useful for exams and revision.
`;
}

/*
  STUDY PACK
*/
function studyPackPrompt(body) {

  const topic =
    text(body.topic) || "Study Material";

  const difficulty =
    text(body.difficulty) || "beginner";

  const questionStyle =
    text(body.questionStyle) ||
    text(body.quizStyle) ||
    "mixed";

  const material =
    limit(body.material);

  return `
${basePrompt()}

Create a complete study pack.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

QUESTION STYLE:
${questionStyle}

STUDY MATERIAL:
${material || "No notes were supplied. Generate appropriate study material from the topic."}

Return ONLY valid JSON.

Use exactly this structure:

{
  "summary": "study summary",
  "flashcards": [
    {
      "question": "question",
      "answer": "answer"
    }
  ],
  "quiz": [
    {
      "question": "question",
      "options": [
        "option A",
        "option B",
        "option C",
        "option D"
      ],
      "correctAnswer": 0,
      "explanation": "explanation",
      "topic": "concept"
    }
  ],
  "practiceQuestions": [
    {
      "question": "question",
      "answer": "model answer",
      "topic": "concept"
    }
  ],
  "examQuestions": [
    {
      "question": "question",
      "marks": 5,
      "answer": "model answer",
      "topic": "concept"
    }
  ]
}

SUMMARY:
- Explain the topic clearly.
- Include important concepts.
- Include definitions.
- Include important points.
- Include formulas or steps if applicable.
- Make it useful for revision.

FLASHCARDS:
- Generate exactly 10.
- Include definitions, concepts, differences, applications and important facts.

QUIZ:
- Generate exactly 10 MCQs.
- Every question must have exactly 4 options.
- correctAnswer MUST be a zero-based number:
  0, 1, 2 or 3.
- Include easy, medium and challenging questions.
- Include explanations.
- Include the concept tested.

QUESTION STYLE:

For "mcq":
Create normal MCQs.
practiceQuestions can be empty.

For "mixed":
Create a mixture of conceptual, application and reasoning questions.
Create 5 additional practice questions.

For "short":
Keep the 10 MCQs for automatic scoring.
Also create 5 short-answer practice questions.

For "exam":
Keep the 10 MCQs for automatic scoring.
Also create 5 university-style exam questions.
Use a mixture of 2-mark, 5-mark and 10-mark questions.
Give model answers.

IMPORTANT:
Return JSON only.
Do not use markdown code fences.
Do not write anything before or after the JSON.
`;
}

/*
  OTHER AI FEATURES
*/
function featurePrompt(task, body) {

  const topic =
    text(body.topic) || "Study Material";

  const difficulty =
    text(body.difficulty) || "beginner";

  const material =
    limit(body.material);

  if (task === "teach") {

    return `
${basePrompt()}

Teach this topic like a friendly teacher.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

MATERIAL:
${material}

Use this structure:

1. What is it?
2. Why is it important?
3. Simple explanation
4. Step-by-step explanation
5. Example
6. Common mistake
7. Quick check question

Make it easy to understand.
`;
  }

  if (task === "study_session") {

    return `
${basePrompt()}

Create a focused study session.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

MATERIAL:
${material}

Create:

1. Warm-up
2. Learn
3. Active recall
4. Practice
5. Final revision

Give practical activities and approximate time suggestions.
`;
  }

  if (task === "exam") {

    return `
${basePrompt()}

Create an exam preparation set.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

MATERIAL:
${material}

Create:

3 short-answer questions
3 five-mark questions
2 ten-mark questions

Then provide:

Important topics to revise
Common mistakes
Quick revision checklist
Model answers
`;
  }

  if (task === "ask_notes") {

    return `
${basePrompt()}

Answer the student's question using the notes.

TOPIC:
${topic}

NOTES:
${material}

STUDENT QUESTION:
${text(body.question)}

Give a clear answer.

If the notes do not contain enough information,
say so clearly instead of inventing information.
`;
  }

  if (task === "explain_mistake") {

    return `
${basePrompt()}

Explain the student's mistake.

TOPIC:
${topic}

MATERIAL:
${material}

QUESTION:
${text(body.question)}

STUDENT ANSWER:
${text(body.studentAnswer)}

CORRECT ANSWER:
${text(body.correctAnswer)}

Explain:

1. What the question asked
2. Why the student's answer was wrong
3. What the correct answer means
4. How to remember it
5. A similar practice question

Be encouraging.
`;
  }

  if (task === "summary") {

    return `
${basePrompt()}

Create a clear study summary.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

MATERIAL:
${material}

Include:

1. Overview
2. Important concepts
3. Definitions
4. Key points
5. Exam-focused points
6. Quick revision
`;
  }

  if (task === "flashcards") {

    return `
${basePrompt()}

Create exactly 10 flashcards.

TOPIC:
${topic}

MATERIAL:
${material}

Return ONLY JSON:

{
  "flashcards": [
    {
      "question": "question",
      "answer": "answer"
    }
  ]
}
`;
  }

  if (task === "quiz") {

    return `
${basePrompt()}

Create exactly 10 MCQs.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

MATERIAL:
${material}

Return ONLY JSON:

{
  "quiz": [
    {
      "question": "question",
      "options": [
        "A",
        "B",
        "C",
        "D"
      ],
      "correctAnswer": 0,
      "explanation": "explanation",
      "topic": "concept"
    }
  ]
}

correctAnswer must be 0, 1, 2 or 3.
`;
  }

  if (task === "weak_topics") {

    const results = limit(
      typeof body.quizResults === "string"
        ? body.quizResults
        : JSON.stringify(body.quizResults || []),
      15000
    );

    return `
${basePrompt()}

Analyze the student's quiz performance.

TOPIC:
${topic}

MATERIAL:
${material}

QUIZ RESULTS:
${results}

Return ONLY JSON:

{
  "weakTopics": [
    {
      "topic": "topic",
      "reason": "why it is weak",
      "recommendation": "what to revise"
    }
  ],
  "retest": [
    {
      "question": "question",
      "options": [
        "A",
        "B",
        "C",
        "D"
      ],
      "correctAnswer": 0,
      "explanation": "explanation"
    }
  ]
}

Create targeted questions based on the student's mistakes.
`;
  }

  if (task === "knowledge_map") {

    return `
${basePrompt()}

Create a knowledge map.

TOPIC:
${topic}

MATERIAL:
${material}

Return ONLY JSON:

{
  "title": "Knowledge Map",
  "centralTopic": "main topic",
  "nodes": [
    {
      "name": "concept",
      "description": "short explanation",
      "connections": [
        "related concept"
      ]
    }
  ]
}

Show the important concepts and how they connect.
`;
  }

  throw new Error("Unsupported task.");
}

/*
  API HANDLER
*/
export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {

      return res.status(500).json({
        error:
          "OPENAI_API_KEY is missing from Vercel environment variables."
      });
    }

    const body = getBody(req);

    const task =
      text(body.task).toLowerCase();

    if (!ALLOWED_TASKS.has(task)) {

      return res.status(400).json({
        error:
          `Invalid task: ${task || "empty"}`
      });
    }

    let prompt;

    if (task === "study_pack") {

      prompt =
        studyPackPrompt(body);

    } else {

      prompt =
        featurePrompt(task, body);
    }

    const result =
      await askAI(prompt, apiKey);

    /*
      JSON-based tasks
    */
    if (
      task === "study_pack" ||
      task === "flashcards" ||
      task === "quiz" ||
      task === "weak_topics" ||
      task === "knowledge_map"
    ) {

      const parsed =
        parseJSON(result);

      if (!parsed) {

        console.error(
          "Could not parse AI JSON:",
          result
        );

        return res.status(502).json({
          error:
            "AI returned an invalid JSON response.",
          raw: result
        });
      }

      return res.status(200).json(parsed);
    }

    /*
      Normal text response
    */
    return res.status(200).json({
      result: result
    });

  } catch (error) {

    console.error(
      "KNOWVIA API ERROR:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Something went wrong."
    });
  }
}
