// ============================================
// KNOWVIA - GEMINI AI BACKEND
// FINAL VERSION
// ============================================

// Gemini models
// We try the first model and automatically fall back
// to the second model if a temporary API/model error occurs.

const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite"
];

const GEMINI_INTERACTIONS_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";


// ============================================
// HELPER FUNCTIONS
// ============================================

function send(res, status, data) {
  return res.status(status).json(data);
}


function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}


/*
  Extract the model's text from the Interactions API response.

  Gemini Interactions API returns model output inside:

  steps[]
    -> model_output
      -> content[]
        -> text
*/
function getInteractionText(data) {

  if (!data || !Array.isArray(data.steps)) {
    return "";
  }

  for (const step of data.steps) {

    if (step?.type !== "model_output") {
      continue;
    }

    if (!Array.isArray(step.content)) {
      continue;
    }

    const text = step.content
      .filter(item => item?.type === "text")
      .map(item => item.text || "")
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  return "";
}


// ============================================
// JSON SCHEMAS
// ============================================

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

        required: [
          "question",
          "answer"
        ]
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


// ============================================
// FLASHCARD SCHEMA
// ============================================

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


// ============================================
// QUIZ SCHEMA
// ============================================

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


// ============================================
// WEAK TOPICS SCHEMA
// ============================================

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


// ============================================
// KNOWLEDGE MAP SCHEMA
// ============================================

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
You are the main AI study engine for an educational application called Knowvia.

Create a COMPLETE study pack for this topic:

TOPIC:
${topic}

ADDITIONAL STUDY MATERIAL:
${material || "No additional study material was provided."}

SELECTED DIFFICULTY:
${difficulty}

QUESTION STYLE:
${quizStyle}


========================================
MOST IMPORTANT RULE
========================================

Difficulty must change DEPTH, not TOPIC COVERAGE.

Beginner, Intermediate and Advanced must cover the SAME important aspects of the topic.

Do NOT make:

Beginner = only definitions
Intermediate = only some concepts
Advanced = completely different concepts

Instead:

BEGINNER:
Use simple language, basic explanations,
easy examples and introductory reasoning.

INTERMEDIATE:
Use more technical explanations,
relationships between concepts,
practical examples and moderate reasoning.

ADVANCED:
Use deeper technical details,
complex reasoning, edge cases,
advanced applications and deeper comparisons.


========================================
COMPLETE TOPIC COVERAGE
========================================

Cover every relevant part of the topic.

Where applicable, include:

1. Introduction
2. Definition
3. Meaning and basic concept
4. Background/history
5. Characteristics
6. Features
7. Components
8. Elements
9. Types
10. Classification
11. Working principle
12. Architecture/structure
13. Processes and steps
14. Important terminology
15. Examples
16. Applications
17. Real-world uses
18. Advantages
19. Limitations
20. Comparisons
21. Formulas/rules
22. Practical significance
23. Common mistakes
24. Misconceptions
25. Exam-important points
26. Quick revision points

Only include sections that are relevant to the topic.


========================================
SUMMARY
========================================

Create ONE complete summary at the selected difficulty.

Do NOT create separate beginner/intermediate/advanced summaries.

The summary must be detailed enough for exam preparation.

Use clear headings and subheadings.

Include all important concepts rather than giving only a short definition.


========================================
FLASHCARDS
========================================

Create exactly 10 useful flashcards.

Cover different important concepts.

Avoid repetitive flashcards.


========================================
QUIZ
========================================

Create exactly 10 multiple-choice questions.

Every question must contain exactly 4 options.

correctAnswer must be:

0 = first option
1 = second option
2 = third option
3 = fourth option

Every question must have exactly one correct answer.

Cover different areas of the topic.

Use the selected question style:

${quizStyle}


========================================
PRACTICE QUESTIONS
========================================

Create exactly 5 practice questions.

They should test understanding and application.


========================================
EXAM QUESTIONS
========================================

Create exactly 5 exam-oriented questions.

Make them realistic for academic examination preparation.


========================================
OUTPUT
========================================

Return only the JSON structure requested by the schema.
`;
}


// ============================================
// FLASHCARD PROMPT
// ============================================

function createFlashcardPrompt(payload) {

  return `
Create exactly 10 useful study flashcards.

TOPIC:
${clean(payload.topic)}

DIFFICULTY:
${clean(payload.difficulty) || "beginner"}

STUDY MATERIAL:
${clean(payload.material) || "No additional material."}

Cover different important concepts.

Do not repeat the same concept unnecessarily.

Return only the requested JSON structure.
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

STUDY MATERIAL:
${clean(payload.material) || "No additional material."}

Requirements:

- Exactly 10 questions.
- Exactly 4 options for every question.
- Exactly one correct answer.
- correctAnswer must be 0, 1, 2 or 3.
- Cover different important concepts.
- Include an explanation.
- Include the topic/concept tested.

Return only the requested JSON structure.
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


  // ========================================
  // TEACH ME
  // ========================================

  if (task === "teach") {

    return `
You are Knowvia's Teach Me tutor.

Teach this topic:

${topic}

DIFFICULTY:
${difficulty}

STUDY MATERIAL:
${material || "No additional material."}

Teach the student step by step.

Use this structure:

1. What is it?
2. Why is it important?
3. Basic idea
4. Main concepts
5. Important features/types/components
6. How it works
7. Simple example
8. Practical example
9. Common confusion
10. Exam tips
11. Quick recap

Use simple explanations first and gradually introduce technical detail.

Do not skip important concepts merely because the selected difficulty is beginner.

Make the explanation feel like a teacher is personally teaching the student.
`;
  }


  // ========================================
  // STUDY SESSION
  // ========================================

  if (task === "study_session") {

    return `
Create a focused Knowvia study session.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

STUDY MATERIAL:
${material || "No additional material."}

Include:

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


  // ========================================
  // EXAM MODE
  // ========================================

  if (task === "exam") {

    return `
Create an Exam Mode preparation guide.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

STUDY MATERIAL:
${material || "No additional material."}

Include:

1. Most important concepts
2. Definitions to remember
3. Important features
4. Types/classification
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


  // ========================================
  // ASK MY NOTES
  // ========================================

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

If you provide information beyond the notes, clearly label it as additional explanation.

Do not pretend that information exists in the notes when it does not.
`;
  }


  // ========================================
  // EXPLAIN MY MISTAKE
  // ========================================

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
5. How to avoid the same mistake
6. One short practice question

Be supportive and educational.
`;
  }


  return `
Help the student understand this topic:

${topic}

DIFFICULTY:
${difficulty}

STUDY MATERIAL:
${material || "No additional material."}
`;
}


// ============================================
// CALL GEMINI INTERACTIONS API
// ============================================

async function callGemini(prompt, schema = null) {

  const apiKey =
    process.env.GEMINI_API_KEY;


  // ------------------------------------------
  // API KEY CHECK
  // ------------------------------------------

  if (!apiKey) {

    throw new Error(
      "GEMINI_API_KEY is missing in Vercel Environment Variables."
    );
  }


  let lastError = null;


  // ------------------------------------------
  // TRY MODELS
  // ------------------------------------------

  for (const model of MODELS) {

    try {

      const body = {

        model: model,

        input: prompt,

        store: false

      };


      // ----------------------------------------
      // STRUCTURED JSON OUTPUT
      // ----------------------------------------

      if (schema) {

        body.response_format = {

          type: "text",

          mime_type: "application/json",

          schema: schema

        };

      }


      // ----------------------------------------
      // GEMINI REQUEST
      // ----------------------------------------

      const response = await fetch(
        GEMINI_INTERACTIONS_URL,
        {
          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            // IMPORTANT:
            // This is where the Gemini API key belongs.
            // Do NOT add this to Vercel separately.
            "x-goog-api-key":
              apiKey

          },

          body: JSON.stringify(body)
        }
      );


      const raw =
        await response.text();


      let data;


      try {

        data = JSON.parse(raw);

      } catch {

        throw new Error(
          `Gemini returned an invalid server response. HTTP ${response.status}.`
        );
      }


      // ----------------------------------------
      // API ERROR
      // ----------------------------------------

      if (!response.ok) {

        const message =
          data?.error?.message ||
          `Gemini API request failed. HTTP ${response.status}.`;

        lastError =
          new Error(message);


        // Temporary errors:
        // try the fallback model.

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


      // ----------------------------------------
      // GET MODEL OUTPUT
      // ----------------------------------------

      const text =
        getInteractionText(data);


      if (!text) {

        throw new Error(
          "Gemini returned an empty response."
        );
      }


      // ----------------------------------------
      // JSON TASK
      // ----------------------------------------

      if (schema) {

        try {

          return JSON.parse(text);

        } catch {

          // Safe cleanup in case the model
          // returns markdown fences.

          const cleaned =
            text
              .replace(/^```json\s*/i, "")
              .replace(/^```\s*/i, "")
              .replace(/\s*```$/i, "")
              .trim();


          try {

            return JSON.parse(cleaned);

          } catch {

            throw new Error(
              "Gemini returned invalid JSON."
            );
          }
        }
      }


      // ----------------------------------------
      // NORMAL TEXT TASK
      // ----------------------------------------

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
    new Error(
      "Gemini API request failed."
    )
  );
}


// ============================================
// VALIDATE STUDY PACK
// ============================================

function validateStudyPack(pack) {

  if (
    !pack ||
    typeof pack !== "object"
  ) {

    throw new Error(
      "Gemini returned an empty study pack."
    );
  }


  if (
    typeof pack.summary !== "string"
  ) {

    throw new Error(
      "Study pack summary is missing."
    );
  }


  if (
    !Array.isArray(pack.flashcards)
  ) {

    throw new Error(
      "Study pack flashcards are missing."
    );
  }


  if (
    !Array.isArray(pack.quiz)
  ) {

    throw new Error(
      "Study pack quiz is missing."
    );
  }


  for (
    const question of pack.quiz
  ) {

    if (
      !Array.isArray(
        question.options
      )
    ) {

      throw new Error(
        "A quiz question is missing its options."
      );
    }


    if (
      question.options.length !== 4
    ) {

      throw new Error(
        "Every quiz question must have exactly 4 options."
      );
    }


    if (
      !Number.isInteger(
        question.correctAnswer
      ) ||
      question.correctAnswer < 0 ||
      question.correctAnswer > 3
    ) {

      throw new Error(
        "A quiz question contains an invalid correct answer."
      );
    }

  }


  return pack;
}


// ============================================
// MAIN VERCEL FUNCTION
// ============================================

export default async function handler(
  req,
  res
) {

  // ------------------------------------------
  // POST ONLY
  // ------------------------------------------

  if (
    req.method !== "POST"
  ) {

    return send(
      res,
      405,
      {
        error:
          "Method not allowed. Use POST."
      }
    );
  }


  try {

    const payload =
      req.body || {};


    const task =
      clean(payload.task);


    if (!task) {

      return send(
        res,
        400,
        {
          error:
            "No task was provided."
        }
      );
    }


    // ========================================
    // STUDY PACK
    // ========================================

    if (
      task === "study_pack"
    ) {

      const result =
        await callGemini(
          createStudyPackPrompt(
            payload
          ),
          studyPackSchema
        );


      validateStudyPack(
        result
      );


      return send(
        res,
        200,
        result
      );
    }


    // ========================================
    // FLASHCARDS
    // ========================================

    if (
      task === "flashcards"
    ) {

      const result =
        await callGemini(
          createFlashcardPrompt(
            payload
          ),
          flashcardsSchema
        );


      return send(
        res,
        200,
        result
      );
    }


    // ========================================
    // QUIZ
    // ========================================

    if (
      task === "quiz"
    ) {

      const result =
        await callGemini(
          createQuizPrompt(
            payload
          ),
          quizSchema
        );


      return send(
        res,
        200,
        result
      );
    }


    // ========================================
    // WEAK TOPICS
    // ========================================

    if (
      task === "weak_topics"
    ) {

      const quizResults =
        JSON.stringify(
          payload.quizResults || [],
          null,
          2
        );


      const result =
        await callGemini(

          `
Analyze the student's quiz performance.

QUIZ RESULTS:
${quizResults}

Identify the student's genuinely weak topics.

For every weak topic provide:

- topic
- reason
- recommendation

Also provide overall advice.

Do not invent weaknesses that are not supported by the quiz results.

Return only the requested JSON.
`,

          weakTopicsSchema

        );


      return send(
        res,
        200,
        result
      );
    }


    // ========================================
    // KNOWLEDGE MAP
    // ========================================

    if (
      task === "knowledge_map"
    ) {

      const quizResults =
        JSON.stringify(
          payload.quizResults || [],
          null,
          2
        );


      const result =
        await callGemini(

          `
Create a useful knowledge map.

TOPIC:
${clean(payload.topic)}

QUIZ RESULTS:
${quizResults}

Create:

- title
- core topic
- important concepts
- description of each concept
- importance of each concept
- connections between concepts

Return only the requested JSON.
`,

          knowledgeMapSchema

        );


      return send(
        res,
        200,
        result
      );
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


    if (
      textTasks.includes(task)
    ) {

      const result =
        await callGemini(

          createTextPrompt(
            task,
            payload
          ),

          null

        );


      return send(
        res,
        200,
        result
      );
    }


    // ========================================
    // UNKNOWN TASK
    // ========================================

    return send(
      res,
      400,
      {
        error:
          `Unknown Knowvia task: ${task}`
      }
    );


  } catch (error) {

    console.error(
      "KNOWVIA GEMINI ERROR:",
      error
    );


    return send(
      res,
      500,
      {
        error:
          error?.message ||
          "Something went wrong with the Knowvia AI service."
      }
    );
  }
}
