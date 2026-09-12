const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash"
];

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

function send(res, status, data) {
  res.status(status).json(data);
}

function getText(data) {
  try {
    return data.candidates?.[0]?.content?.parts
      ?.map(p => p.text || "")
      .join("") || "";
  } catch {
    return "";
  }
}

function cleanText(value) {
  if (!value) return "";
  return String(value).trim();
}

/* -----------------------------
   JSON SCHEMAS
----------------------------- */

const studyPackSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string"
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
          correctAnswer: { type: "integer" },
          explanation: { type: "string" },
          topic: { type: "string" }
        },
        required: [
          "question",
          "options",
          "correctAnswer",
          "explanation",
          "topic"
        ]
      }
    },
    practiceQuestions: {
      type: "array",
      items: { type: "string" }
    },
    examQuestions: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: [
    "summary",
    "flashcards",
    "quiz",
    "practiceQuestions",
    "examQuestions"
  ]
};

const flashcardsSchema = {
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
          correctAnswer: { type: "integer" },
          explanation: { type: "string" },
          topic: { type: "string" }
        },
        required: [
          "question",
          "options",
          "correctAnswer",
          "explanation",
          "topic"
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
        type: "object",
        properties: {
          topic: { type: "string" },
          reason: { type: "string" },
          recommendation: { type: "string" }
        },
        required: ["topic", "reason", "recommendation"]
      }
    },
    overallAdvice: {
      type: "string"
    }
  },
  required: ["weakTopics", "overallAdvice"]
};

const knowledgeMapSchema = {
  type: "object",
  properties: {
    title: {
      type: "string"
    },
    coreTopic: {
      type: "string"
    },
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          importance: { type: "string" }
        },
        required: ["name", "description", "importance"]
      }
    },
    connections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          relationship: { type: "string" }
        },
        required: ["from", "to", "relationship"]
      }
    }
  },
  required: [
    "title",
    "coreTopic",
    "concepts",
    "connections"
  ]
};

/* -----------------------------
   PROMPTS
----------------------------- */

function studyPackPrompt(payload) {
  const topic = cleanText(payload.topic);
  const material = cleanText(payload.material);
  const difficulty = cleanText(payload.difficulty) || "beginner";
  const quizStyle = cleanText(payload.quizStyle) || "mixed";

  return `
You are the main AI study engine for an educational application called Knowvia.

Create a COMPLETE study pack for:

TOPIC:
${topic || "Not specified"}

SOURCE MATERIAL:
${material || "No additional source material was provided."}

DIFFICULTY:
${difficulty}

QUESTION STYLE:
${quizStyle}

IMPORTANT RULE:

Difficulty must NOT decide which syllabus sections are included.

BEGINNER, INTERMEDIATE, and ADVANCED must cover the SAME important aspects of the topic.

The difficulty should change:
- explanation depth
- technical detail
- terminology
- examples
- reasoning complexity
- question difficulty

Do NOT make beginner = only definitions,
intermediate = only some concepts,
advanced = completely different topics.

For the topic, cover all relevant areas that actually apply, including:

1. Introduction
2. Definition
3. Meaning/basic concept
4. Background/history where relevant
5. Characteristics/features
6. Components/elements
7. Types
8. Classification
9. Working/principle
10. Architecture/structure where relevant
11. Important processes/steps
12. Important terminology
13. Examples
14. Applications/real-world uses
15. Advantages
16. Limitations/disadvantages
17. Comparisons
18. Formulas/rules where relevant
19. Practical significance
20. Common mistakes/misconceptions
21. Exam-important points
22. Quick revision points

Do not force irrelevant sections onto topics where they do not make sense.

The summary must be comprehensive and organized with clear headings.

For beginner:
Explain clearly using simple language, basic examples and intuition.

For intermediate:
Assume basic knowledge and provide more technical detail, relationships and practical examples.

For advanced:
Assume strong fundamentals and provide deeper reasoning, edge cases, technical details, comparisons and application-level understanding.

FLASHCARDS:
Create useful question-answer flashcards covering the important concepts.

QUIZ:
Create 10 multiple-choice questions.
Each question must have exactly 4 options.
correctAnswer must be the ZERO-BASED index of the correct option:
0, 1, 2, or 3.

The requested question style is:
${quizStyle}

If it is "exam pattern", make questions resemble realistic academic/exam questions.

PRACTICE QUESTIONS:
Create 5 questions that require the learner to practice understanding or application.

EXAM QUESTIONS:
Create 5 realistic exam-oriented questions.

Return ONLY the requested JSON structure.
`;
}

function flashcardsPrompt(payload) {
  return `
Create 10 useful study flashcards about:

TOPIC:
${cleanText(payload.topic)}

DIFFICULTY:
${cleanText(payload.difficulty) || "beginner"}

MATERIAL:
${cleanText(payload.material) || "No additional material."}

Cover different important concepts rather than repeating the same idea.

Return only JSON matching the provided schema.
`;
}

function quizPrompt(payload) {
  return `
Create 10 multiple-choice questions for:

TOPIC:
${cleanText(payload.topic)}

DIFFICULTY:
${cleanText(payload.difficulty) || "beginner"}

QUESTION STYLE:
${cleanText(payload.quizStyle) || "mixed"}

MATERIAL:
${cleanText(payload.material) || "No additional material."}

Each question must have exactly 4 options.

correctAnswer must be the ZERO-BASED option index:
0, 1, 2, or 3.

Make the questions cover different important parts of the topic.

Return only JSON matching the provided schema.
`;
}

/* -----------------------------
   TEXT FEATURE PROMPTS
----------------------------- */

function textPrompt(task, payload) {
  const topic = cleanText(payload.topic);
  const material = cleanText(payload.material);
  const difficulty = cleanText(payload.difficulty) || "beginner";

  if (task === "teach") {
    return `
You are Knowvia's Teach Me tutor.

Teach the following topic:

${topic}

Difficulty:
${difficulty}

Material:
${material || "No additional material."}

Teach it like a patient expert.

Structure your response as:

1. What is it?
2. Why is it important?
3. Core idea
4. How it works
5. Important components/types/features
6. Simple example
7. Practical example
8. Common confusion
9. Exam tip
10. Quick recap

Use simple explanations first and gradually increase depth.

Do not skip important concepts just because the learner selected an easier difficulty.
`;
  }

  if (task === "study_session") {
    return `
Create a focused study session for:

${topic}

Difficulty:
${difficulty}

Material:
${material || "No additional material."}

Include:

- Learning goal
- What to learn first
- Core concepts
- Active recall questions
- Practice activity
- Common mistakes
- Final self-check
- Quick revision

Make it practical and suitable for a student.
`;
  }

  if (task === "exam") {
    return `
Create an Exam Mode preparation session for:

${topic}

Difficulty:
${difficulty}

Material:
${material || "No additional material."}

Include:

- Most important exam concepts
- Definitions to remember
- Important differences/comparisons
- Important formulas/rules if applicable
- Likely short-answer questions
- Likely long-answer questions
- Application/problem questions
- Common mistakes
- Last-minute revision checklist

Focus on exam usefulness.
`;
  }

  if (task === "ask_notes") {
    return `
Answer the student's question using the supplied study material as the primary source.

TOPIC:
${topic}

STUDY MATERIAL:
${material}

STUDENT QUESTION:
${cleanText(payload.question)}

Explain clearly.

If the answer is not supported by the supplied material, say that the material does not contain enough information and then provide a clearly labeled general explanation if possible.
`;
  }

  if (task === "explain_mistake") {
    return `
Explain the student's mistake as a tutor.

TOPIC:
${topic}

QUESTION:
${cleanText(payload.question)}

STUDENT ANSWER:
${cleanText(payload.studentAnswer)}

CORRECT ANSWER:
${cleanText(payload.correctAnswer)}

Explain:

1. What the question is asking
2. Why the student's answer is not correct
3. The correct reasoning
4. How to avoid the same mistake
5. One short practice question

Be encouraging and educational.
`;
  }

  return `
Help the student study this topic:

${topic}

Difficulty:
${difficulty}

Material:
${material || "No additional material."}
`;
}

/* -----------------------------
   MAIN GEMINI CALL
----------------------------- */

async function callGemini(prompt, schema) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it in Vercel Environment Variables."
    );
  }

  let lastError = null;

  for (const model of MODELS) {
    try {
      const response = await fetch(
        `${GEMINI_API_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: schema
              ? {
                  responseFormat: {
                    text: {
                      mimeType: "application/json",
                      schema
                    }
                  }
                }
              : {}
          })
        }
      );

      const raw = await response.text();

      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          `Gemini returned a non-JSON HTTP response (${response.status}).`
        );
      }

      if (!response.ok) {
        const message =
          data?.error?.message ||
          `Gemini request failed with status ${response.status}.`;

        lastError = new Error(message);

        if (
          response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504
        ) {
          continue;
        }

        throw lastError;
      }

      const text = getText(data);

      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }

      if (schema) {
        try {
          return JSON.parse(text);
        } catch {
          throw new Error(
            "Gemini returned invalid JSON even though structured output was requested."
          );
        }
      }

      return {
        result: text,
        answer: text
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Gemini request failed.");
}

/* -----------------------------
   VALIDATION
----------------------------- */

function validateStudyPack(pack) {
  if (!pack || typeof pack !== "object") {
    throw new Error("Study pack is empty.");
  }

  if (typeof pack.summary !== "string") {
    throw new Error("Study pack summary is missing.");
  }

  if (!Array.isArray(pack.flashcards)) {
    throw new Error("Study pack flashcards are missing.");
  }

  if (!Array.isArray(pack.quiz)) {
    throw new Error("Study pack quiz is missing.");
  }

  for (const question of pack.quiz) {
    if (!Array.isArray(question.options)) {
      throw new Error("A quiz question has no options.");
    }

    if (question.options.length !== 4) {
      throw new Error("Every quiz question must have exactly 4 options.");
    }

    if (
      !Number.isInteger(question.correctAnswer) ||
      question.correctAnswer < 0 ||
      question.correctAnswer > 3
    ) {
      throw new Error("Invalid quiz answer index.");
    }
  }

  return pack;
}

/* -----------------------------
   API HANDLER
----------------------------- */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, {
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const payload = req.body || {};
    const task = cleanText(payload.task);

    if (!task) {
      return send(res, 400, {
        error: "No task was provided."
      });
    }

    /* STUDY PACK */
    if (task === "study_pack") {
      const prompt = studyPackPrompt(payload);

      const result = await callGemini(
        prompt,
        studyPackSchema
      );

      validateStudyPack(result);

      return send(res, 200, result);
    }

    /* FLASHCARDS */
    if (task === "flashcards") {
      const result = await callGemini(
        flashcardsPrompt(payload),
        flashcardsSchema
      );

      return send(res, 200, result);
    }

    /* QUIZ */
    if (task === "quiz") {
      const result = await callGemini(
        quizPrompt(payload),
        quizSchema
      );

      return send(res, 200, result);
    }

    /* WEAK TOPICS */
    if (task === "weak_topics") {
      const result = await callGemini(
        `
Analyze these quiz results and identify the student's weak topics.

QUIZ RESULTS:
${JSON.stringify(payload.quizResults || [], null, 2)}

Identify only genuinely weak areas.

For each weak topic provide:
- topic
- reason
- recommendation

Also provide overall advice.

Return only JSON.
`,
        weakTopicsSchema
      );

      return send(res, 200, result);
    }

    /* KNOWLEDGE MAP */
    if (task === "knowledge_map") {
      const result = await callGemini(
        `
Create a knowledge map for:

TOPIC:
${cleanText(payload.topic)}

QUIZ RESULTS:
${JSON.stringify(payload.quizResults || [], null, 2)}

Create a useful conceptual map showing:
- core topic
- important concepts
- relationships between concepts
- importance of concepts

Return only JSON.
`,
        knowledgeMapSchema
      );

      return send(res, 200, result);
    }

    /* TEXT FEATURES */
    const supportedTextTasks = [
      "teach",
      "study_session",
      "exam",
      "ask_notes",
      "explain_mistake"
    ];

    if (supportedTextTasks.includes(task)) {
      const result = await callGemini(
        textPrompt(task, payload),
        null
      );

      return send(res, 200, result);
    }

    return send(res, 400, {
      error: `Unknown task: ${task}`
    });

  } catch (error) {
    console.error("Knowvia API error:", error);

    return send(res, 500, {
      error: error?.message || "Something went wrong with the AI service."
    });
  }
}
