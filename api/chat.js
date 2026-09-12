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
// HELPERS
// ============================================================

function send(res, status, data) {
  return res.status(status).json(data);
}

function cleanJSON(text) {
  if (!text) return "";

  let value = text.trim();

  // Remove markdown JSON fences if Gemini adds them
  value = value.replace(/^```json\s*/i, "");
  value = value.replace(/^```\s*/i, "");
  value = value.replace(/\s*```$/i, "");

  return value.trim();
}

function getModelText(data) {
  if (!data || !Array.isArray(data.steps)) {
    return "";
  }

  // Find the model output step
  for (const step of data.steps) {
    if (step.type !== "model_output") continue;

    if (!Array.isArray(step.content)) continue;

    for (const item of step.content) {
      if (item.type === "text" && typeof item.text === "string") {
        return item.text;
      }
    }
  }

  return "";
}

// ============================================================
// JSON SCHEMAS
// ============================================================

const studyPackSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string"
    },
    keyConcepts: {
      type: "array",
      items: {
        type: "string"
      }
    },
    flashcards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" }
        },
        required: ["question", "answer"]
      }
    },
    quiz: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" }
          },
          correctAnswer: {
            type: "integer"
          },
          explanation: {
            type: "string"
          }
        },
        required: [
          "question",
          "options",
          "correctAnswer",
          "explanation"
        ]
      }
    }
  },
  required: [
    "summary",
    "keyConcepts",
    "flashcards",
    "quiz"
  ]
};

const flashcardSchema = {
  type: "object",
  properties: {
    flashcards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" }
        },
        required: ["question", "answer"]
      }
    }
  },
  required: ["flashcards"]
};

const quizSchema = {
  type: "object",
  properties: {
    quiz: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" }
          },
          correctAnswer: {
            type: "integer"
          },
          explanation: {
            type: "string"
          }
        },
        required: [
          "question",
          "options",
          "correctAnswer",
          "explanation"
        ]
      }
    }
  },
  required: ["quiz"]
};

const weakTopicsSchema = {
  type: "object",
  properties: {
    weakTopics: {
      type: "array",
      items: {
        type: "string"
      }
    },
    explanation: {
      type: "string"
    }
  },
  required: ["weakTopics", "explanation"]
};

const knowledgeMapSchema = {
  type: "object",
  properties: {
    nodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          status: { type: "string" },
          reason: { type: "string" }
        },
        required: ["topic", "status", "reason"]
      }
    }
  },
  required: ["nodes"]
};

// ============================================================
// GEMINI CALL
// ============================================================

async function callGemini(prompt, schema = null) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it in Vercel Environment Variables."
    );
  }

  let lastError = null;

  for (const model of MODELS) {
    try {
      const body = {
        model,
        input: prompt,
        store: false
      };

      // IMPORTANT:
      // This is the CURRENT Interactions API format.
      // Do NOT put this inside generation_config.
      if (schema) {
        body.response_format = {
          type: "text",
          mime_type: "application/json",
          schema
        };
      }

      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        lastError = new Error(
          data?.error?.message ||
          `Gemini request failed with status ${response.status}`
        );

        console.error(`Gemini ${model} error:`, data);
        continue;
      }

      const text = getModelText(data);

      if (!text) {
        lastError = new Error(
          "Gemini returned an empty response."
        );
        continue;
      }

      return text;

    } catch (error) {
      lastError = error;
      console.error(`Gemini ${model} failed:`, error);
    }
  }

  throw lastError || new Error("Gemini request failed.");
}

// ============================================================
// PROMPTS
// ============================================================

function studyPackPrompt(body) {
  const topic = body.topic || "General Topic";
  const difficulty = body.difficulty || "Medium";
  const material = body.material || "";
  const quizStyle = body.quizStyle || "Mixed";

  return `
You are Knowvia, an AI study assistant.

Create a complete study pack for the learner.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

QUESTION STYLE:
${quizStyle}

STUDY MATERIAL:
${material || "No additional material was provided. Use reliable general knowledge about the topic."}

Requirements:

1. SUMMARY
Give a clear, student-friendly explanation of the topic.
Match the requested difficulty.

2. KEY CONCEPTS
Give the most important concepts the learner should remember.
Keep them concise.

3. FLASHCARDS
Create 8 useful flashcards.
Questions should test understanding, not just wording.

4. QUIZ
Create 5 multiple-choice questions.
Each question MUST have exactly 4 options.
correctAnswer MUST be the zero-based index:
0, 1, 2, or 3.

Question style:
${quizStyle}

For "Exam Pattern", make questions similar to academic examination questions.
For "Short Answer", still provide four choices but make the question test short-answer concepts.
For "MCQ", make standard MCQs.
For "Mixed", combine conceptual, application and recall questions.

5. EXPLANATIONS
Give a short explanation for every quiz answer.

Return ONLY the requested JSON structure.
`;
}

function flashcardsPrompt(body) {
  return `
You are Knowvia, an AI study assistant.

Create 10 high-quality flashcards.

TOPIC:
${body.topic || "General Topic"}

MATERIAL:
${body.material || "Use reliable general knowledge."}

DIFFICULTY:
${body.difficulty || "Medium"}

Each flashcard must contain:
- question
- answer

Focus on important concepts, definitions, relationships, applications and common exam points.

Return only JSON.
`;
}

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
- correctAnswer must be 0, 1, 2 or 3.
- Only one option may be correct.
- Include an explanation.
- Avoid ambiguous questions.

Return only JSON.
`;
}

function weakTopicsPrompt(body) {
  return `
Analyze the learner's quiz performance.

QUIZ RESULTS:
${JSON.stringify(body.quizResults || [], null, 2)}

Identify the topics or concepts where the learner appears weakest.

Return:
- weakTopics: array of concise topic names
- explanation: short explanation

Do not invent information that cannot reasonably be inferred from the quiz results.

Return only JSON.
`;
}

function knowledgeMapPrompt(body) {
  return `
Create a simple knowledge map from these quiz results.

QUIZ RESULTS:
${JSON.stringify(body.quizResults || [], null, 2)}

For each important concept, classify the learner's status as one of:
- Strong
- Developing
- Weak

Give a short reason.

Return only JSON.
`;
}

function textPrompt(task, body) {
  const topic = body.topic || "the study topic";
  const material = body.material || "";

  if (task === "teach") {
    return `
You are Knowvia's Teach Me tutor.

Teach the student about:
${topic}

Difficulty:
${body.difficulty || "Medium"}

Material:
${material || "Use reliable general knowledge."}

Explain step by step in simple language.

Use:
- simple explanation
- examples
- important points
- quick check questions
- final recap

Do not be unnecessarily complicated.
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
${material || "Use reliable general knowledge."}

Include:
1. What to study first
2. Important concepts
3. Practice activity
4. Quick self-test
5. Final revision checklist

Keep it practical and student-friendly.
`;
  }

  if (task === "exam") {
    return `
You are Knowvia's Exam Mode.

Create an exam-style practice set for:
${topic}

Difficulty:
${body.difficulty || "Medium"}

Material:
${material || "Use reliable general knowledge."}

Include:
- important exam areas
- likely question types
- practice questions
- last-minute revision points
- common mistakes

Make it useful for a college student preparing for an examination.
`;
  }

  if (task === "ask_notes") {
    return `
You are Knowvia's Ask My Notes assistant.

STUDY MATERIAL:
${material}

USER QUESTION:
${body.question || ""}

Answer ONLY using the supplied study material when possible.

If the material does not contain enough information, clearly say that the answer is not available in the supplied notes instead of pretending that it is.

Give a clear student-friendly answer.
`;
  }

  if (task === "explain_mistake") {
    return `
You are Knowvia's mistake-explanation tutor.

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
    let schema = null;
    let isJSON = false;

    switch (task) {
      case "study_pack":
        prompt = studyPackPrompt(body);
        schema = studyPackSchema;
        isJSON = true;
        break;

      case "flashcards":
        prompt = flashcardsPrompt(body);
        schema = flashcardSchema;
        isJSON = true;
        break;

      case "quiz":
        prompt = quizPrompt(body);
        schema = quizSchema;
        isJSON = true;
        break;

      case "weak_topics":
        prompt = weakTopicsPrompt(body);
        schema = weakTopicsSchema;
        isJSON = true;
        break;

      case "knowledge_map":
        prompt = knowledgeMapPrompt(body);
        schema = knowledgeMapSchema;
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

    const answer = await callGemini(prompt, schema);

    if (isJSON) {
      const cleaned = cleanJSON(answer);

      try {
        const parsed = JSON.parse(cleaned);

        return send(res, 200, {
          result: parsed,
          answer: cleaned
        });

      } catch (error) {
        console.error("JSON parsing failed:", cleaned);

        return send(res, 500, {
          error: "Gemini returned invalid JSON.",
          raw: cleaned
        });
      }
    }

    return send(res, 200, {
      answer
    });

  } catch (error) {
    console.error("Knowvia API error:", error);

    return send(res, 500, {
      error:
        error?.message ||
        "Something went wrong while contacting Gemini."
    });
  }
}
