// ============================================
// KNOWVIA - GEMINI AI BACKEND
// ============================================

// Gemini models
// Primary model first, fallback model second.
const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash"
];

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";


// ============================================
// HELPER FUNCTIONS
// ============================================

function send(res, status, data) {
  return res.status(status).json(data);
}


function getGeminiText(data) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim() || ""
  );
}


function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}


// ============================================
// JSON SCHEMAS
// ============================================

// Complete study pack
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
          question: {
            type: "string"
          },
          answer: {
            type: "string"
          }
        },
        required: ["question", "answer"]
      }
    },

    quiz: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: {
            type: "string"
          },

          options: {
            type: "array",
            items: {
              type: "string"
            }
          },

          correctAnswer: {
            type: "integer"
          },

          explanation: {
            type: "string"
          },

          topic: {
            type: "string"
          }
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
      items: {
        type: "string"
      }
    },

    examQuestions: {
      type: "array",
      items: {
        type: "string"
      }
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


// Flashcards
const flashcardsSchema = {
  type: "object",

  properties: {
    flashcards: {
      type: "array",

      items: {
        type: "object",

        properties: {
          question: {
            type: "string"
          },

          answer: {
            type: "string"
          }
        },

        required: [
          "question",
          "answer"
        ]
      }
    }
  },

  required: [
    "flashcards"
  ]
};


// Quiz
const quizSchema = {
  type: "object",

  properties: {
    quiz: {
      type: "array",

      items: {
        type: "object",

        properties: {
          question: {
            type: "string"
          },

          options: {
            type: "array",
            items: {
              type: "string"
            }
          },

          correctAnswer: {
            type: "integer"
          },

          explanation: {
            type: "string"
          },

          topic: {
            type: "string"
          }
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

  required: [
    "quiz"
  ]
};


// Weak topics
const weakTopicsSchema = {
  type: "object",

  properties: {
    weakTopics: {
      type: "array",

      items: {
        type: "object",

        properties: {
          topic: {
            type: "string"
          },

          reason: {
            type: "string"
          },

          recommendation: {
            type: "string"
          }
        },

        required: [
          "topic",
          "reason",
          "recommendation"
        ]
      }
    },

    overallAdvice: {
      type: "string"
    }
  },

  required: [
    "weakTopics",
    "overallAdvice"
  ]
};


// Knowledge map
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
          name: {
            type: "string"
          },

          description: {
            type: "string"
          },

          importance: {
            type: "string"
          }
        },

        required: [
          "name",
          "description",
          "importance"
        ]
      }
    },

    connections: {
      type: "array",

      items: {
        type: "object",

        properties: {
          from: {
            type: "string"
          },

          to: {
            type: "string"
          },

          relationship: {
            type: "string"
          }
        },

        required: [
          "from",
          "to",
          "relationship"
        ]
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


// ============================================
// STUDY PACK PROMPT
// ============================================

function createStudyPackPrompt(payload) {

  const topic = clean(payload.topic);
  const material = clean(payload.material);
  const difficulty =
    clean(payload.difficulty) || "beginner";
  const quizStyle =
    clean(payload.quizStyle) || "mixed";


  return `
You are the main AI study engine of Knowvia.

Create a COMPLETE study pack for the topic below.

TOPIC:
${topic}

ADDITIONAL STUDY MATERIAL:
${material || "No additional material was provided."}

DIFFICULTY:
${difficulty}

QUESTION STYLE:
${quizStyle}


==============================
VERY IMPORTANT RULE
==============================

The difficulty level must NEVER decide which important parts of the topic are covered.

Beginner, Intermediate and Advanced must cover the SAME major relevant syllabus areas.

Difficulty changes the DEPTH, not the COVERAGE.

For example:

BEGINNER:
- simple language
- basic explanations
- simple examples
- introductory reasoning

INTERMEDIATE:
- more technical explanation
- relationships between concepts
- practical examples
- moderate reasoning

ADVANCED:
- deeper technical detail
- complex reasoning
- edge cases
- advanced applications
- comparisons and deeper analysis


==============================
TOPIC COVERAGE
==============================

Cover every relevant aspect of the topic.

Where applicable, include:

1. Introduction
2. Definition
3. Meaning and basic concept
4. Background or history
5. Characteristics
6. Features
7. Components
8. Elements
9. Types
10. Classification
11. Working principle
12. Architecture or structure
13. Processes and steps
14. Important terminology
15. Examples
16. Applications
17. Real-world uses
18. Advantages
19. Limitations
20. Comparisons
21. Formulas or rules
22. Practical significance
23. Common mistakes
24. Misconceptions
25. Exam-important points
26. Quick revision points

Do NOT force a section if it is genuinely irrelevant to the topic.


==============================
SUMMARY
==============================

The summary must be a COMPLETE study note.

Use clear headings.

Do NOT create three separate summaries for beginner/intermediate/advanced.

Create ONE complete summary at the selected difficulty level.

The summary must cover the important aspects of the topic instead of only giving a short definition.

A student should be able to use the summary for exam preparation.


==============================
FLASHCARDS
==============================

Create 10 useful flashcards.

Cover different important concepts.

Do not repeat the same information.


==============================
QUIZ
==============================

Create exactly 10 multiple-choice questions.

Every question must have exactly 4 options.

correctAnswer must be the ZERO-BASED index:

0 = first option
1 = second option
2 = third option
3 = fourth option

Every question must have exactly one correct answer.

Cover different parts of the topic.

Use this question style:

${quizStyle}


==============================
PRACTICE QUESTIONS
==============================

Create 5 practice questions.

They should test understanding and application.


==============================
EXAM QUESTIONS
==============================

Create 5 exam-oriented questions.

Include realistic questions suitable for academic preparation.


==============================
OUTPUT
==============================

Return ONLY valid JSON matching the supplied schema.

Do not add explanations outside the JSON.
`;
}


// ============================================
// FLASHCARD PROMPT
// ============================================

function createFlashcardPrompt(payload) {

  return `
Create 10 high-quality study flashcards.

TOPIC:
${clean(payload.topic)}

DIFFICULTY:
${clean(payload.difficulty) || "beginner"}

MATERIAL:
${clean(payload.material) || "No additional material."}

Cover different important concepts.

Keep the answers clear and useful for revision.

Return only JSON matching the supplied schema.
`;
}


// ============================================
// QUIZ PROMPT
// ============================================

function createQuizPrompt(payload) {

  return `
Create exactly 10 multiple-choice questions.

TOPIC:
${clean(payload.topic)}

DIFFICULTY:
${clean(payload.difficulty) || "beginner"}

QUESTION STYLE:
${clean(payload.quizStyle) || "mixed"}

MATERIAL:
${clean(payload.material) || "No additional material."}

Requirements:

- Exactly 10 questions.
- Exactly 4 options per question.
- Exactly one correct answer.
- correctAnswer must be 0, 1, 2 or 3.
- Cover different important concepts.
- Include an explanation.
- Include the topic/concept tested.

Return only JSON matching the supplied schema.
`;
}


// ============================================
// TEXT FEATURE PROMPTS
// ============================================

function createTextPrompt(task, payload) {

  const topic = clean(payload.topic);
  const material = clean(payload.material);
  const difficulty =
    clean(payload.difficulty) || "beginner";


  // ------------------------------------------
  // TEACH ME
  // ------------------------------------------

  if (task === "teach") {

    return `
You are Knowvia's Teach Me tutor.

Teach this topic:

${topic}

Difficulty:
${difficulty}

Study material:
${material || "No additional material."}

Teach the topic step by step.

Use this structure:

1. What is it?
2. Why is it important?
3. Basic idea
4. Main concepts
5. Important types/features/components
6. How it works
7. Simple example
8. Practical example
9. Common confusion
10. Exam tips
11. Quick recap

Use simple language first and gradually introduce technical terminology.

Do not skip important concepts merely because the difficulty is beginner.

Make the explanation feel like a teacher is personally teaching the student.
`;
  }


  // ------------------------------------------
  // STUDY SESSION
  // ------------------------------------------

  if (task === "study_session") {

    return `
Create a focused Knowvia study session.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

MATERIAL:
${material || "No additional material."}

Create:

1. Learning goal
2. What to learn first
3. Core concepts
4. Important details
5. Active recall questions
6. Practice activity
7. Common mistakes
8. Self-check
9. Final revision

Make the session practical and easy to follow.
`;
  }


  // ------------------------------------------
  // EXAM MODE
  // ------------------------------------------

  if (task === "exam") {

    return `
Create an Exam Mode preparation guide.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

MATERIAL:
${material || "No additional material."}

Include:

1. Most important concepts
2. Definitions to remember
3. Important features
4. Types/classifications
5. Important differences
6. Working/principles
7. Applications
8. Advantages and limitations
9. Important formulas/rules if applicable
10. Short-answer questions
11. Long-answer questions
12. Application/problem questions
13. Common exam mistakes
14. Last-minute revision checklist

Focus on realistic academic exam preparation.
`;
  }


  // ------------------------------------------
  // ASK MY NOTES
  // ------------------------------------------

  if (task === "ask_notes") {

    return `
You are Knowvia's Ask My Notes tutor.

TOPIC:
${topic}

STUDY NOTES:
${material}

STUDENT QUESTION:
${clean(payload.question)}

Answer the student's question using the supplied study notes as the primary source.

If the notes do not contain enough information, clearly say so.

Then, if useful, provide a short general explanation separately.

Do not pretend that information exists in the notes when it does not.
`;
  }


  // ------------------------------------------
  // EXPLAIN MY MISTAKE
  // ------------------------------------------

  if (task === "explain_mistake") {

    return `
You are Knowvia's mistake-analysis tutor.

TOPIC:
${topic}

QUESTION:
${clean(payload.question)}

STUDENT ANSWER:
${clean(payload.studentAnswer)}

CORRECT ANSWER:
${clean(payload.correctAnswer)}

Explain the mistake clearly.

Use:

1. What the question asks
2. What the student answered
3. Why that answer is wrong
4. Correct reasoning
5. How to avoid this mistake
6. One short practice question

Be supportive and educational.

Do not insult or discourage the student.
`;
  }


  return `
Help the student understand:

${topic}

Difficulty:
${difficulty}

Material:
${material || "No additional material."}
`;
}


// ============================================
// CALL GEMINI
// ============================================

async function callGemini(prompt, schema) {

  const apiKey = process.env.GEMINI_API_KEY;


  // ------------------------------------------
  // Check API key
  // ------------------------------------------

  if (!apiKey) {

    throw new Error(
      "GEMINI_API_KEY is missing. Add it to Vercel Environment Variables."
    );
  }


  let lastError = null;


  // ------------------------------------------
  // Try primary model, then fallback
  // ------------------------------------------

  for (const model of MODELS) {

    try {

      const response = await fetch(
        `${GEMINI_API_URL}/${model}:generateContent`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            // IMPORTANT:
            // Gemini API key is sent here.
            // Do NOT create this as a Vercel variable.
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

            // Structured JSON output only when schema is provided
            ...(schema
              ? {
                  generationConfig: {
                    responseFormat: {
                      text: {
                        mimeType: "application/json",
                        schema: schema
                      }
                    }
                  }
                }
              : {})
          })
        }
      );


      const raw = await response.text();


      let data;

      try {
        data = JSON.parse(raw);
      } catch {

        throw new Error(
          `Gemini returned an invalid server response. HTTP ${response.status}.`
        );
      }


      // ------------------------------------------
      // Gemini API error
      // ------------------------------------------

      if (!response.ok) {

        const message =
          data?.error?.message ||
          `Gemini API error. HTTP ${response.status}.`;

        lastError = new Error(message);


        // Temporary errors → try fallback model
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


      // ------------------------------------------
      // Extract generated text
      // ------------------------------------------

      const text = getGeminiText(data);


      if (!text) {

        throw new Error(
          "Gemini returned an empty response."
        );
      }


      // ------------------------------------------
      // JSON response
      // ------------------------------------------

      if (schema) {

        try {

          return JSON.parse(text);

        } catch {

          /*
            Sometimes a model may surround JSON with
            markdown fences. Try cleaning them safely.
          */

          const cleaned = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();


          try {

            return JSON.parse(cleaned);

          } catch {

            throw new Error(
              "Gemini returned invalid JSON. Please try again."
            );
          }
        }
      }


      // ------------------------------------------
      // Normal text response
      // ------------------------------------------

      return {
        result: text,
        answer: text
      };

    } catch (error) {

      lastError = error;
    }
  }


  throw (
    lastError ||
    new Error("Gemini API request failed.")
  );
}


// ============================================
// VALIDATE STUDY PACK
// ============================================

function validateStudyPack(pack) {

  if (!pack || typeof pack !== "object") {

    throw new Error(
      "Gemini returned an empty study pack."
    );
  }


  if (typeof pack.summary !== "string") {

    throw new Error(
      "Study pack summary is missing."
    );
  }


  if (!Array.isArray(pack.flashcards)) {

    throw new Error(
      "Study pack flashcards are missing."
    );
  }


  if (!Array.isArray(pack.quiz)) {

    throw new Error(
      "Study pack quiz is missing."
    );
  }


  for (const item of pack.quiz) {

    if (!Array.isArray(item.options)) {

      throw new Error(
        "A quiz question is missing its options."
      );
    }


    if (item.options.length !== 4) {

      throw new Error(
        "Every quiz question must have exactly 4 options."
      );
    }


    if (
      !Number.isInteger(item.correctAnswer) ||
      item.correctAnswer < 0 ||
      item.correctAnswer > 3
    ) {

      throw new Error(
        "A quiz question contains an invalid correct answer."
      );
    }
  }


  return pack;
}


// ============================================
// MAIN API HANDLER
// ============================================

export default async function handler(req, res) {


  // ------------------------------------------
  // Only POST is allowed
  // ------------------------------------------

  if (req.method !== "POST") {

    return send(res, 405, {
      error: "Method not allowed. Use POST."
    });
  }


  try {

    const payload = req.body || {};

    const task = clean(payload.task);


    if (!task) {

      return send(res, 400, {
        error: "No task was provided."
      });
    }


    // ========================================
    // STUDY PACK
    // ========================================

    if (task === "study_pack") {

      const result = await callGemini(
        createStudyPackPrompt(payload),
        studyPackSchema
      );


      validateStudyPack(result);


      return send(res, 200, result);
    }


    // ========================================
    // FLASHCARDS
    // ========================================

    if (task === "flashcards") {

      const result = await callGemini(
        createFlashcardPrompt(payload),
        flashcardsSchema
      );


      return send(res, 200, result);
    }


    // ========================================
    // QUIZ
    // ========================================

    if (task === "quiz") {

      const result = await callGemini(
        createQuizPrompt(payload),
        quizSchema
      );


      return send(res, 200, result);
    }


    // ========================================
    // WEAK TOPICS
    // ========================================

    if (task === "weak_topics") {

      const result = await callGemini(
        `
Analyze the student's quiz performance.

QUIZ RESULTS:
${JSON.stringify(
  payload.quizResults || [],
  null,
  2
)}

Identify the student's genuinely weak topics.

For every weak topic provide:

- topic
- reason
- recommendation

Also provide overall study advice.

Do not invent weaknesses that are not supported by the quiz results.

Return only JSON.
`,
        weakTopicsSchema
      );


      return send(res, 200, result);
    }


    // ========================================
    // KNOWLEDGE MAP
    // ========================================

    if (task === "knowledge_map") {

      const result = await callGemini(
        `
Create a useful knowledge map.

TOPIC:
${clean(payload.topic)}

QUIZ RESULTS:
${JSON.stringify(
  payload.quizResults || [],
  null,
  2
)}

Create:

- a title
- core topic
- important concepts
- description of each concept
- importance of each concept
- connections between concepts

Return only JSON.
`,
        knowledgeMapSchema
      );


      return send(res, 200, result);
    }


    // ========================================
    // TEXT FEATURES
    // ========================================

    const textTasks = [
      "teach",
      "study_session",
      "exam",
      "ask_notes",
      "explain_mistake"
    ];


    if (textTasks.includes(task)) {

      const result = await callGemini(
        createTextPrompt(task, payload),
        null
      );


      return send(res, 200, result);
    }


    // ========================================
    // UNKNOWN TASK
    // ========================================

    return send(res, 400, {
      error: `Unknown Knowvia task: ${task}`
    });


  } catch (error) {

    console.error(
      "KNOWVIA GEMINI ERROR:",
      error
    );


    return send(res, 500, {
      error:
        error?.message ||
        "Something went wrong with the Knowvia AI service."
    });
  }
}
