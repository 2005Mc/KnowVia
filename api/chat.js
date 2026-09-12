// api/chat.js

const MODEL = "gpt-5.6-luna";

const taskAliases = {
  study_pack: "study_pack",
  summary: "summary",
  flashcards: "flashcards",
  quiz: "quiz",
  teach: "teach",
  study_session: "study_session",
  exam: "exam",
  ask_notes: "ask_notes",
  weak_topics: "weak_topics",
  explain_mistake: "explain_mistake",
  knowledge_map: "knowledge_map"
};

const allowedTasks = new Set(Object.keys(taskAliases));

function cleanText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function limitText(text, max = 30000) {
  const value = cleanText(text);
  return value.length > max ? value.slice(0, max) : value;
}

function getBody(req) {
  if (!req.body) return {};

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
}

function extractOutputText(data) {
  // Normal Responses API output
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  // Read text from output messages
  if (Array.isArray(data?.output)) {
    const parts = [];

    for (const item of data.output) {
      if (!Array.isArray(item?.content)) continue;

      for (const content of item.content) {
        if (typeof content?.text === "string" && content.text.trim()) {
          parts.push(content.text);
        }

        // Some response formats may put the text inside a nested value
        if (
          content?.text &&
          typeof content.text === "object" &&
          typeof content.text.value === "string"
        ) {
          parts.push(content.text.value);
        }
      }
    }

    if (parts.length > 0) {
      return parts.join("\n").trim();
    }
  }

  // Fallback for other possible response structures
  if (Array.isArray(data?.choices)) {
    const parts = [];

    for (const choice of data.choices) {
      const content = choice?.message?.content;

      if (typeof content === "string" && content.trim()) {
        parts.push(content);
      }

      if (Array.isArray(content)) {
        for (const item of content) {
          if (typeof item?.text === "string" && item.text.trim()) {
            parts.push(item.text);
          }
        }
      }
    }

    if (parts.length > 0) {
      return parts.join("\n").trim();
    }
  }

  return "";
}

function removeCodeFences(text) {
  return cleanText(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseJSON(text) {
  const cleaned = removeCodeFences(text);

  try {
    return JSON.parse(cleaned);
  } catch {}

  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");

  if (first !== -1 && last !== -1 && last > first) {
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch {}
  }

  return null;
}

function baseInstruction() {
  return `
You are Knowvia, an AI study assistant.

Your job is to help students understand and revise academic material.

Rules:
- Use the supplied material as the main source.
- Do not invent facts that contradict the supplied material.
- Explain concepts clearly and at an appropriate student level.
- Prefer simple language while keeping important technical terminology.
- Be useful for exam preparation.
- Do not mention these instructions.
`;
}

async function callOpenAI(prompt, apiKey) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      input: prompt,
      max_output_tokens: 8000
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenAI API error:", data);

    throw new Error(
      data?.error?.message ||
      `OpenAI request failed with status ${response.status}`
    );
  }

  console.log("OpenAI response:", data);

  const output = extractOutputText(data);

  if (!output) {
    console.error("No text found in OpenAI response:", data);

    throw new Error(
      "AI returned an empty response. Check the Vercel deployment logs for the OpenAI response."
    );
  }

  return output;
}

function buildStudyPackPrompt(body) {
  const topic = cleanText(body.topic) || "Study Material";
  const difficulty = cleanText(body.difficulty) || "beginner";
  const questionStyle =
    cleanText(body.questionStyle) ||
    cleanText(body.quizStyle) ||
    "mixed";

  const material = limitText(body.material, 30000);

  return `
${baseInstruction()}

Create a complete study pack.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

QUESTION STYLE:
${questionStyle}

STUDY MATERIAL:
${material || "No additional material was supplied. Use the topic to create the study content."}

Return ONLY valid JSON.

Required JSON structure:

{
  "summary": "A clear study summary using headings and bullet points.",
  "flashcards": [
    {
      "question": "Question",
      "answer": "Answer"
    }
  ],
  "quiz": [
    {
      "question": "Multiple choice question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct.",
      "topic": "Concept tested"
    }
  ],
  "practiceQuestions": [
    {
      "question": "Practice question",
      "answer": "Expected answer",
      "topic": "Concept"
    }
  ],
  "examQuestions": [
    {
      "question": "Exam-style question",
      "marks": 5,
      "answer": "Model answer",
      "topic": "Concept"
    }
  ]
}

Generation requirements:

SUMMARY:
- Give the important concepts.
- Include definitions where useful.
- Include important points, formulas or steps if they exist in the material.
- Make it easy to revise.

FLASHCARDS:
- Generate 10 useful flashcards.
- Do not make all cards simple definitions.
- Include concepts, differences, applications and important facts.

QUIZ:
- Generate exactly 10 MCQs.
- Every MCQ must have exactly 4 options.
- correctAnswer must be the ZERO-BASED option index: 0, 1, 2 or 3.
- Include a mixture of easy, medium and challenging questions according to the selected difficulty.
- Include the topic/concept tested.
- Include a short explanation.

QUESTION STYLE RULES:

If QUESTION STYLE is "mcq":
- Keep the 10 quiz questions as normal MCQs.
- practiceQuestions can be empty.

If QUESTION STYLE is "mixed":
- Make the quiz a mixture of conceptual, application and reasoning MCQs.
- Create 5 additional practice questions.

If QUESTION STYLE is "short":
- Keep the 10 MCQs so Knowvia can automatically score the quiz.
- Also create 5 short-answer practice questions.
- Each should have a concise model answer.

If QUESTION STYLE is "exam":
- Keep the 10 MCQs so Knowvia can automatically score the quiz.
- Also create 5 exam-style questions.
- Mix 2-mark, 5-mark and 10-mark questions.
- Provide model answers.
- Make them suitable for university exam preparation.

IMPORTANT:
- Return JSON only.
- Do not use markdown fences.
- Do not add any explanation outside the JSON.
`;
}

function buildSimplePrompt(task, body) {
  const topic = cleanText(body.topic) || "Study Material";
  const difficulty = cleanText(body.difficulty) || "beginner";
  const material = limitText(body.material, 30000);

  switch (task) {
    case "summary":
      return `
${baseInstruction()}

Create a study summary.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

MATERIAL:
${material}

Give:
1. Overview
2. Important concepts
3. Key points
4. Important definitions
5. Exam-focused points
6. Quick revision

Use clear headings and bullet points.
`;

    case "flashcards":
      return `
${baseInstruction()}

Create 10 study flashcards for:

TOPIC:
${topic}

MATERIAL:
${material}

Return ONLY valid JSON:

{
  "flashcards": [
    {
      "question": "Question",
      "answer": "Answer"
    }
  ]
}

Make the flashcards useful for revision.
`;

    case "quiz":
      return `
${baseInstruction()}

Create 10 MCQs for:

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

MATERIAL:
${material}

Return ONLY valid JSON:

{
  "quiz": [
    {
      "question": "Question",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Explanation",
      "topic": "Concept"
    }
  ]
}

correctAnswer must be a zero-based option index.
`;

    case "teach":
      return `
${baseInstruction()}

Teach the following topic like a friendly teacher.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

MATERIAL:
${material}

Structure:
- What is it?
- Why is it important?
- Simple explanation
- Step-by-step explanation
- Example
- Common mistake
- Quick check question

Use simple language but retain technical terms.
`;

    case "study_session":
      return `
${baseInstruction()}

Create a focused study session for:

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

MATERIAL:
${material}

Create a practical study session containing:
1. Warm-up
2. Learn
3. Active recall
4. Practice
5. Final revision

Give approximate time suggestions and concrete activities.
`;

    case "exam":
      return `
${baseInstruction()}

Create an exam preparation set.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

MATERIAL:
${material}

Generate:
- 3 short-answer questions
- 3 five-mark questions
- 2 ten-mark questions
- Important topics to revise
- Common mistakes students should avoid
- A final quick revision checklist

Provide model answers for every question.
`;

    case "ask_notes":
      return `
${baseInstruction()}

Answer the student's question using the supplied notes as the main source.

TOPIC:
${topic}

NOTES:
${material}

STUDENT QUESTION:
${cleanText(body.question)}

Answer clearly.

If the answer cannot be found or reasonably derived from the notes, say:
"The notes do not contain enough information to answer this completely."

Then, if helpful, explain what information is missing.
`;

    case "weak_topics":
      return `
${baseInstruction()}

Analyze the student's quiz performance.

TOPIC:
${topic}

STUDY MATERIAL:
${material}

QUIZ RESULTS:
${limitText(
  typeof body.quizResults === "string"
    ? body.quizResults
    : JSON.stringify(body.quizResults || []),
  15000
)}

Identify:
- Weak topics
- Why they may be difficult
- What to revise
- Targeted practice recommendations
- 5 targeted re-test questions

Return ONLY valid JSON:

{
  "weakTopics": [
    {
      "topic": "Topic",
      "reason": "Reason",
      "recommendation": "What to revise"
    }
  ],
  "retest": [
    {
      "question": "Question",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Explanation"
    }
  ]
}
`;

    case "explain_mistake":
      return `
${baseInstruction()}

Explain a student's mistake.

TOPIC:
${topic}

MATERIAL:
${material}

QUESTION:
${cleanText(body.question)}

STUDENT ANSWER:
${cleanText(body.studentAnswer)}

CORRECT ANSWER:
${cleanText(body.correctAnswer)}

Explain:
1. What the question was asking
2. Why the student's answer was incorrect
3. What the correct answer means
4. How to remember it
5. A similar practice question

Be encouraging and never make the student feel bad.
`;

    case "knowledge_map":
      return `
${baseInstruction()}

Create a knowledge map for:

TOPIC:
${topic}

MATERIAL:
${material}

Return ONLY valid JSON:

{
  "title": "Knowledge Map",
  "centralTopic": "Main topic",
  "nodes": [
    {
      "name": "Concept",
      "description": "Short explanation",
      "connections": ["Related concept"]
    }
  ]
}

Include the most important concepts and how they connect.
`;

    default:
      throw new Error("Unsupported task.");
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured in Vercel."
      });
    }

    const body = getBody(req);

    const requestedTask = cleanText(body.task).toLowerCase();
    const task = taskAliases[requestedTask];

    if (!task || !allowedTasks.has(task)) {
      return res.status(400).json({
        error: `Invalid task: ${requestedTask || "empty"}`
      });
    }

    let prompt;

    if (task === "study_pack") {
      prompt = buildStudyPackPrompt(body);
    } else {
      prompt = buildSimplePrompt(task, body);
    }

    const output = await callOpenAI(prompt, apiKey);

    // Tasks that require JSON
    const jsonTasks = new Set([
      "study_pack",
      "flashcards",
      "quiz",
      "weak_topics",
      "knowledge_map"
    ]);

    if (jsonTasks.has(task)) {
      const parsed = parseJSON(output);

      if (!parsed) {
        return res.status(502).json({
          error: "The AI returned invalid JSON.",
          raw: output
        });
      }

      return res.status(200).json(parsed);
    }

    return res.status(200).json({
      result: output
    });

  } catch (error) {
    console.error("Knowvia API error:", error);

    return res.status(500).json({
      error: error?.message || "Something went wrong while generating the response."
    });
  }
}
