// ============================================================
// KNOWVIA - GEMINI AI BACKEND
// Gemini Interactions API
// ============================================================

const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite"
];

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

// ============================================================
// RESPONSE HELPER
// ============================================================

function send(res, status, data) {
  return res.status(status).json(data);
}

// ============================================================
// CLEAN JSON
// ============================================================

function cleanJSON(text) {
  if (!text) return "";

  let value = String(text).trim();

  value = value.replace(/^```json\s*/i, "");
  value = value.replace(/^```\s*/i, "");
  value = value.replace(/\s*```$/i, "");

  const firstObject = value.indexOf("{");
  const lastObject = value.lastIndexOf("}");

  if (
    firstObject !== -1 &&
    lastObject !== -1 &&
    lastObject > firstObject
  ) {
    value = value.slice(
      firstObject,
      lastObject + 1
    );
  }

  return value.trim();
}

// ============================================================
// EXTRACT GEMINI TEXT
// ============================================================

function getModelText(data) {
  if (!data) return "";

  if (Array.isArray(data.steps)) {
    for (const step of data.steps) {
      if (step.type !== "model_output") continue;

      if (!Array.isArray(step.content)) continue;

      for (const item of step.content) {
        if (
          item &&
          item.type === "text" &&
          typeof item.text === "string"
        ) {
          return item.text;
        }
      }
    }
  }

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
      "GEMINI_API_KEY is missing in Vercel Environment Variables."
    );
  }

  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log("Trying Gemini model:", model);

      // IMPORTANT:
      // No response_format
      // No generation_config
      // No mime_type

      const body = {
        model,
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
          `Gemini returned a non-JSON response: ${rawText.slice(
            0,
            500
          )}`
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
// DIFFICULTY INSTRUCTIONS
// ============================================================

function getDifficultyInstructions(
  difficulty
) {
  const level =
    String(difficulty || "Medium")
      .toLowerCase();

  if (level === "easy") {
    return `
EASY LEVEL:

- Use very simple student-friendly language.
- Assume the learner is a beginner.
- Explain basic ideas first.
- Define technical words immediately.
- Use simple everyday examples.
- Avoid unnecessarily advanced terminology.
- Focus on understanding the foundation.
- Quiz questions should test basic recall and understanding.
- Flashcards should focus on definitions, basic concepts and simple examples.
`;
  }

  if (level === "hard") {
    return `
HARD LEVEL:

- Give an advanced, detailed explanation.
- Assume the learner already understands the fundamentals.
- Use appropriate technical terminology.
- Explain mechanisms and relationships between concepts.
- Include complex or realistic examples.
- Include applications and limitations.
- Include comparisons where useful.
- Connect related concepts.
- Quiz questions should require analysis, application, relationships or exam-level reasoning.
- Flashcards should test deeper understanding, mechanisms, comparisons and applications.
`;
  }

  return `
MEDIUM LEVEL:

- Use clear but moderately technical language.
- Assume the learner knows basic terminology.
- Explain concepts with moderate depth.
- Include technical terms with explanations.
- Include examples and practical applications.
- Include relationships between important concepts.
- Quiz questions should test understanding and application.
- Flashcards should include concepts, examples, relationships and applications.
`;
}

// ============================================================
// STUDY PACK PROMPT
// ============================================================

function studyPackPrompt(body) {
  const topic =
    body.topic?.trim() ||
    "General Topic";

  const difficulty =
    body.difficulty ||
    "Medium";

  const material =
    body.material?.trim() ||
    "";

  const quizStyle =
    body.quizStyle ||
    "Mixed";

  const difficultyInstructions =
    getDifficultyInstructions(
      difficulty
    );

  return `
You are Knowvia, an AI-powered study assistant.

Your job is to create a COMPLETE STUDY PACK.

TOPIC:
${topic}

SELECTED DIFFICULTY:
${difficulty}

QUESTION STYLE:
${quizStyle}

SOURCE MATERIAL:
${
  material ||
  "No user-provided material was supplied. Use reliable general knowledge."
}

${difficultyInstructions}

============================================================
STUDY MATTER
============================================================

Create comprehensive study material.

Include the following sections whenever they are applicable:

1. Introduction
2. Definition
3. Core Concept
4. Key Concepts
5. Types / Classification
6. Components / Elements
7. Working / Process / Mechanism
8. Important Characteristics
9. Examples
10. Applications
11. Advantages
12. Limitations / Disadvantages
13. Comparison with Related Concepts
14. Important Exam Points
15. Quick Revision

Do NOT force irrelevant sections onto topics where they do not apply.

The content must genuinely match the selected difficulty.

Easy must NOT simply be Medium with shorter sentences.

Medium must contain more technical depth than Easy.

Hard must contain substantially deeper technical explanation than Medium.

If user-provided material exists, prioritize it.
Do not contradict the supplied material.

============================================================
FLASHCARDS
============================================================

Create EXACTLY 10 flashcards.

Every flashcard must contain:

question
answer

Generate them from the study matter.

The flashcards must match the selected difficulty.

============================================================
QUIZ
============================================================

Create EXACTLY 10 multiple-choice questions.

Every question MUST have:

- exactly 4 options
- exactly 1 correct answer
- correctAnswer as 0, 1, 2 or 3
- explanation

The quiz MUST be based on the study matter you generated above.

Difficulty rules:

Easy:
- basic recall
- definitions
- simple understanding

Medium:
- understanding
- interpretation
- application
- moderate reasoning

Hard:
- analysis
- application
- relationships
- mechanisms
- comparisons
- exam-level reasoning

Question style:
${quizStyle}

If the style is MCQ:
Use standard multiple-choice questions.

If the style is Exam Pattern:
Make the questions similar to college examination preparation.

If the style is Mixed:
Mix recall, understanding and application.

============================================================
IMPORTANT JSON RULES
============================================================

Return ONLY valid JSON.

Do NOT use Markdown.

Do NOT add text before the JSON.

Do NOT add text after the JSON.

Use EXACTLY this structure:

{
  "topic": "${topic.replace(/"/g, '\\"')}",
  "difficulty": "${difficulty}",
  "studyMatter": {
    "introduction": "string",
    "definition": "string",
    "coreConcept": "string",
    "keyConcepts": ["string"],
    "types": ["string"],
    "components": ["string"],
    "working": "string",
    "characteristics": ["string"],
    "examples": ["string"],
    "applications": ["string"],
    "advantages": ["string"],
    "limitations": ["string"],
    "comparison": ["string"],
    "examPoints": ["string"],
    "quickRevision": ["string"]
  },
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
      "options": [
        "string",
        "string",
        "string",
        "string"
      ],
      "correctAnswer": 0,
      "explanation": "string"
    }
  ]
}

FINAL CHECK BEFORE RESPONDING:

- Exactly 10 flashcards.
- Exactly 10 quiz questions.
- Exactly 4 options for every quiz question.
- Exactly one correct option per question.
- Every correctAnswer is 0, 1, 2 or 3.
- Quiz is based on the generated study matter.
- Difficulty genuinely matches ${difficulty}.
- Return valid JSON only.
`;
}

// ============================================================
// FLASHCARDS
// ============================================================

function flashcardsPrompt(body) {
  return `
You are Knowvia.

Create EXACTLY 10 flashcards from the supplied study material.

TOPIC:
${body.topic || "Study Topic"}

DIFFICULTY:
${body.difficulty || "Medium"}

STUDY MATERIAL:
${body.material || "No additional material supplied."}

${getDifficultyInstructions(
  body.difficulty
)}

Rules:

- Exactly 10 flashcards.
- Each has question and answer.
- Do not repeat the same concept unnecessarily.
- Cover important concepts.
- Match the selected difficulty.
- Use the supplied material whenever possible.

Return ONLY valid JSON.

{
  "flashcards": [
    {
      "question": "string",
      "answer": "string"
    }
  ]
}
`;
}

// ============================================================
// QUIZ
// ============================================================

function quizPrompt(body) {
  return `
You are Knowvia.

Create EXACTLY 10 MCQ questions.

TOPIC:
${body.topic || "Study Topic"}

DIFFICULTY:
${body.difficulty || "Medium"}

QUESTION STYLE:
${body.quizStyle || "Mixed"}

STUDY MATTER:
${body.material || "No additional material supplied."}

${getDifficultyInstructions(
  body.difficulty
)}

Rules:

- Exactly 10 questions.
- Exactly 4 options per question.
- Exactly one correct answer.
- correctAnswer must be 0, 1, 2 or 3.
- Include explanation.
- Avoid ambiguous questions.
- Questions must be based on the supplied study matter.

Return ONLY valid JSON.

{
  "quiz": [
    {
      "question": "string",
      "options": [
        "string",
        "string",
        "string",
        "string"
      ],
      "correctAnswer": 0,
      "explanation": "string"
    }
  ]
}
`;
}

// ============================================================
// WEAK TOPICS + TARGETED RETEST
// ============================================================

function weakTopicsPrompt(body) {
  return `
You are Knowvia's Weak Topic Detector.

Analyze the learner's quiz performance.

QUIZ RESULTS:

${JSON.stringify(
  body.quizResults || [],
  null,
  2
)}

Identify the concepts where the learner performed poorly.

Then create a targeted re-test.

Rules:

- Identify weak concepts only from the supplied quiz results.
- Do not invent performance information.
- Create EXACTLY 5 re-test questions.
- Every question has exactly 4 options.
- Exactly one answer is correct.
- Questions should focus on weak concepts.
- correctAnswer must be 0, 1, 2 or 3.
- Include explanation.

Return ONLY valid JSON.

{
  "weakTopics": ["string"],
  "explanation": "string",
  "retestQuiz": [
    {
      "question": "string",
      "options": [
        "string",
        "string",
        "string",
        "string"
      ],
      "correctAnswer": 0,
      "explanation": "string"
    }
  ]
}
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

Classify important concepts as:

Strong
Developing
Weak

Use ONLY information supported by the quiz results.

Return ONLY valid JSON.

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
}

// ============================================================
// TEXT FEATURES
// ============================================================

function textPrompt(task, body) {
  const topic =
    body.topic ||
    "the current study topic";

  const material =
    body.material ||
    "";

  const difficulty =
    body.difficulty ||
    "Medium";

  if (task === "teach") {
    return `
You are Knowvia's Teach Me tutor.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

STUDY MATERIAL:
${material || "Use reliable general knowledge."}

Teach progressively.

Do NOT simply repeat a summary.

Use this sequence:

Step 1: What the learner should know first
Step 2: Build the basic idea
Step 3: Introduce the next concept
Step 4: Connect the concepts
Step 5: Give an example
Step 6: Ask a quick check question
Step 7: Correctly explain the expected reasoning
Step 8: Final recap

Make the teaching appropriate for ${difficulty} level.
`;
  }

  if (task === "study_session") {
    return `
You are Knowvia's Study Session coach.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

STUDY MATERIAL:
${material || "Use reliable general knowledge."}

Create an actionable session using:

1. LEARN
What to understand first.

2. RECALL
What to remember without looking.

3. PRACTICE
A practical activity or questions.

4. REVIEW
What to revise after practice.

5. FINAL CHECK
How the learner can test themselves.

Make it progressive and practical.
`;
  }

  if (task === "exam") {
    return `
You are Knowvia's Exam Mode.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

STUDY MATERIAL:
${material || "Use reliable general knowledge."}

Create an exam-style preparation experience.

Include:

1. Important exam areas
2. High-priority concepts
3. Likely question patterns
4. Practice questions
5. Application questions
6. Common mistakes
7. Last-minute revision checklist

Match the difficulty to ${difficulty}.
Do not simply repeat the summary.
`;
  }

  if (task === "ask_notes") {
    return `
You are Knowvia's Ask My Notes assistant.

SUPPLIED NOTES:

${material}

STUDENT QUESTION:

${body.question || ""}

Answer the student's question using the supplied notes.

Rules:

- Prefer information explicitly present in the notes.
- Do not pretend unsupported information is in the notes.
- If the notes do not contain enough information, clearly say so.
- You may explain information from the notes in simpler language.
- Keep the answer relevant to the question.
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

1. What the learner misunderstood.
2. Why the correct answer is correct.
3. What clue should have been noticed.
4. How to avoid the same mistake next time.

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
// MAIN HANDLER
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

    return send(res, 200, {
      answer
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
