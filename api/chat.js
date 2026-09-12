"use strict";

/* =========================================================
   KNOWVIA - FINAL GEMINI BACKEND
   VERCEL SERVERLESS FUNCTION
   ========================================================= */

const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash"
];

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim();
}

function send(res, status, data) {
  return res.status(status).json(data);
}

/* =========================================================
   ROBUST JSON EXTRACTION
   ========================================================= */

function extractJSON(text) {
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  let cleaned = cleanText(text);

  /* Remove markdown fences */
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  /* Direct JSON parse */
  try {
    return JSON.parse(cleaned);
  } catch {}

  /*
   * Find either an object or array.
   */
  const objectStart = cleaned.indexOf("{");
  const arrayStart = cleaned.indexOf("[");

  let start = -1;

  if (
    objectStart !== -1 &&
    arrayStart !== -1
  ) {
    start = Math.min(
      objectStart,
      arrayStart
    );
  } else if (objectStart !== -1) {
    start = objectStart;
  } else if (arrayStart !== -1) {
    start = arrayStart;
  }

  if (start === -1) {
    throw new Error(
      "Gemini did not return valid JSON."
    );
  }

  const opening = cleaned[start];
  const closing =
    opening === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (
    let i = start;
    i < cleaned.length;
    i++
  ) {
    const char = cleaned[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === opening) {
      depth++;
    } else if (char === closing) {
      depth--;

      if (depth === 0) {
        const candidate =
          cleaned.slice(start, i + 1);

        try {
          return JSON.parse(candidate);
        } catch {
          break;
        }
      }
    }
  }

  throw new Error(
    "Gemini returned malformed JSON."
  );
}

/* =========================================================
   GET TEXT FROM GEMINI INTERACTIONS RESPONSE
   ========================================================= */

function getGeminiText(data) {
  if (!data) {
    return "";
  }

  if (Array.isArray(data.steps)) {
    const textParts = [];

    for (const step of data.steps) {
      if (
        step?.type !== "model_output"
      ) {
        continue;
      }

      if (
        !Array.isArray(step.content)
      ) {
        continue;
      }

      for (const item of step.content) {
        if (
          item?.type === "text" &&
          typeof item.text === "string"
        ) {
          textParts.push(item.text);
        }
      }
    }

    if (textParts.length) {
      return textParts.join("\n");
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

/* =========================================================
   GEMINI API CALL
   ========================================================= */

async function callGemini(prompt) {
  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing in Vercel Environment Variables."
    );
  }

  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(
        "Knowvia: trying Gemini model:",
        model
      );

      const response =
        await fetch(
          GEMINI_API_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-goog-api-key":
                apiKey
            },

            body: JSON.stringify({
              model,
              input: prompt,
              store: false
            })
          }
        );

      const raw =
        await response.text();

      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          `Gemini returned a non-JSON response: ${raw.slice(
            0,
            500
          )}`
        );
      }

      if (!response.ok) {
        const message =
          data?.error?.message ||
          `Gemini request failed with status ${response.status}.`;

        console.error(
          "Gemini API error:",
          message
        );

        lastError =
          new Error(message);

        continue;
      }

      const text =
        getGeminiText(data);

      if (!text) {
        lastError =
          new Error(
            "Gemini returned an empty response."
          );

        continue;
      }

      console.log(
        "Knowvia: Gemini succeeded:",
        model
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
    new Error(
      "Gemini request failed."
    )
  );
}

/* =========================================================
   DIFFICULTY
   ========================================================= */

function difficultyInstruction(
  difficulty
) {
  const level =
    String(difficulty || "Medium")
      .toLowerCase();

  if (level === "easy") {
    return `
DIFFICULTY: EASY

Create genuinely beginner-level material.

Use:
- very simple language
- basic concepts
- simple definitions
- simple examples
- basic applications
- foundational understanding
- easy recall questions

Avoid unnecessary advanced terminology,
complex relationships and advanced analysis.

The content must be genuinely easier,
not simply shorter.
`;
  }

  if (level === "hard") {
    return `
DIFFICULTY: HARD

Create genuinely advanced material.

Use:
- deeper technical explanation
- advanced terminology
- mechanisms
- relationships between concepts
- complex examples
- practical applications
- limitations
- comparisons
- trade-offs
- analytical reasoning
- exam-level understanding

Do not merely make Easy content longer.

The concepts, examples, reasoning and depth
must genuinely become more advanced.
`;
  }

  return `
DIFFICULTY: MEDIUM

Create moderately detailed material.

Use:
- clear definitions
- technical terminology
- detailed concepts
- examples
- applications
- relationships
- moderate reasoning
- exam-relevant understanding

Medium must be deeper than Easy
but less advanced than Hard.
`;
}

/* =========================================================
   STUDY PACK PROMPT
   ========================================================= */

function studyPackPrompt(
  material,
  difficulty,
  questionStyle
) {
  return `
You are Knowvia, an AI-powered study assistant.

Create a COMPLETE STUDY PACK from the supplied material.

SOURCE MATERIAL:
${material}

${difficultyInstruction(
  difficulty
)}

QUESTION STYLE:
${questionStyle || "Mixed"}

==================================================
STUDY MATTER
==================================================

Create comprehensive material that a student
can directly study from.

Include relevant sections:

1. Introduction
2. Definition
3. Core Concept
4. Key Concepts
5. Types / Classification
6. Components / Elements
7. Working / Process / Mechanism
8. Characteristics
9. Examples
10. Applications
11. Advantages
12. Limitations
13. Comparison
14. Important Exam Points
15. Quick Revision

Do NOT invent irrelevant sections.

If a section does not apply to the topic,
use an empty array or a short appropriate statement.

The selected difficulty must affect the ACTUAL CONTENT.

Easy:
simple foundational explanation.

Medium:
moderate technical depth.

Hard:
advanced technical explanation,
relationships, mechanisms, analysis,
applications and limitations.

==================================================
FLASHCARDS
==================================================

Create EXACTLY 10 flashcards.

Each must contain:

question
answer

Cover different important concepts.

Do not repeat the same concept unnecessarily.

==================================================
QUIZ
==================================================

Create EXACTLY 10 questions.

Each question must contain:

question
options
correctAnswer
explanation

Every question must have EXACTLY 4 options.

correctAnswer must be an integer:

0
1
2
3

There must be exactly ONE correct answer.

The quiz must be based on the generated study matter.

Difficulty:

EASY:
basic recall and understanding.

MEDIUM:
understanding, interpretation,
comparison and application.

HARD:
analysis, relationships,
mechanisms, application,
limitations and exam-level reasoning.

==================================================
JSON
==================================================

Return ONLY valid JSON.

No Markdown fences.

No explanation before JSON.

No explanation after JSON.

Use exactly this structure:

{
  "topic": "string",
  "difficulty": "string",
  "studyMatter": {
    "introduction": "string",
    "definition": "string",
    "coreConcept": "string",
    "keyConcepts": [],
    "types": [],
    "components": [],
    "working": "string",
    "characteristics": [],
    "examples": [],
    "applications": [],
    "advantages": [],
    "limitations": [],
    "comparison": [],
    "importantExamPoints": [],
    "quickRevision": []
  },
  "summary": "string",
  "keyConcepts": [],
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

FINAL CHECK:

- exactly 10 flashcards
- exactly 10 quiz questions
- exactly 4 options per quiz
- exactly one correct option
- correctAnswer is 0, 1, 2 or 3
- quiz is based on study matter
- flashcards are based on study matter
- difficulty genuinely matches ${difficulty}
- valid JSON only
`;
}

/* =========================================================
   NORMALIZE STUDY PACK
   ========================================================= */

function normalizeStudyPack(pack) {
  if (
    !pack ||
    typeof pack !== "object"
  ) {
    throw new Error(
      "Invalid study pack returned by Gemini."
    );
  }

  const studyMatter =
    pack.studyMatter || {};

  const arrayFields = [
    "keyConcepts",
    "types",
    "components",
    "characteristics",
    "examples",
    "applications",
    "advantages",
    "limitations",
    "comparison",
    "importantExamPoints",
    "quickRevision"
  ];

  const textFields = [
    "introduction",
    "definition",
    "coreConcept",
    "working"
  ];

  for (const field of arrayFields) {
    if (!Array.isArray(studyMatter[field])) {
      studyMatter[field] = [];
    }

    studyMatter[field] =
      studyMatter[field]
        .map(cleanText)
        .filter(Boolean);
  }

  for (const field of textFields) {
    studyMatter[field] =
      cleanText(studyMatter[field]);
  }

  const flashcards =
    Array.isArray(pack.flashcards)
      ? pack.flashcards
      : [];

  const quiz =
    Array.isArray(pack.quiz)
      ? pack.quiz
      : [];

  if (flashcards.length !== 10) {
    throw new Error(
      `Gemini returned ${flashcards.length} flashcards. Exactly 10 are required.`
    );
  }

  if (quiz.length !== 10) {
    throw new Error(
      `Gemini returned ${quiz.length} quiz questions. Exactly 10 are required.`
    );
  }

  const normalizedFlashcards =
    flashcards.map(
      (card, index) => {
        if (
          !card ||
          typeof card.question !==
            "string" ||
          typeof card.answer !==
            "string"
        ) {
          throw new Error(
            `Flashcard ${index + 1} is invalid.`
          );
        }

        return {
          question:
            cleanText(card.question),
          answer:
            cleanText(card.answer)
        };
      }
    );

  const normalizedQuiz =
    quiz.map(
      (question, index) => {
        if (
          !question ||
          typeof question.question !==
            "string" ||
          !Array.isArray(
            question.options
          ) ||
          question.options.length !==
            4 ||
          typeof question.explanation !==
            "string"
        ) {
          throw new Error(
            `Quiz question ${index + 1} is invalid.`
          );
        }

        const correct =
          Number(
            question.correctAnswer
          );

        if (
          !Number.isInteger(correct) ||
          correct < 0 ||
          correct > 3
        ) {
          throw new Error(
            `Quiz question ${index + 1} has an invalid correct answer.`
          );
        }

        const options =
          question.options.map(
            cleanText
          );

        if (
          options.some(
            option => !option
          )
        ) {
          throw new Error(
            `Quiz question ${index + 1} contains an empty option.`
          );
        }

        return {
          question:
            cleanText(
              question.question
            ),
          options,
          correctAnswer: correct,
          explanation:
            cleanText(
              question.explanation
            )
        };
      }
    );

  return {
    topic:
      cleanText(pack.topic),

    difficulty:
      cleanText(pack.difficulty),

    studyMatter,

    summary:
      cleanText(pack.summary),

    keyConcepts:
      Array.isArray(
        pack.keyConcepts
      )
        ? pack.keyConcepts
            .map(cleanText)
            .filter(Boolean)
        : [],

    flashcards:
      normalizedFlashcards,

    quiz:
      normalizedQuiz
  };
}

/* =========================================================
   QUIZ PROMPT
   ========================================================= */

function quizPrompt(
  material,
  difficulty,
  questionStyle,
  focusTopics
) {
  return `
You are Knowvia.

Create a targeted quiz from the supplied study material.

STUDY MATERIAL:
${material}

DIFFICULTY:
${difficulty}

QUESTION STYLE:
${questionStyle || "Mixed"}

FOCUS:
${focusTopics || "All major concepts"}

${difficultyInstruction(
  difficulty
)}

Create EXACTLY 10 questions.

Each question must have:

- question
- exactly 4 options
- exactly one correct answer
- correctAnswer as 0, 1, 2 or 3
- explanation

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

/* =========================================================
   WEAK TOPICS
   ========================================================= */

function weakTopicsPrompt(
  material,
  wrongQuestions
) {
  return `
You are Knowvia's Weak Topic Detector.

STUDY MATERIAL:
${material}

INCORRECT QUESTIONS:
${JSON.stringify(
  wrongQuestions || [],
  null,
  2
)}

Identify concepts where the student
appears to have difficulty.

Only use evidence from the supplied
questions and study material.

Then create a targeted retest.

Create EXACTLY 5 retest questions.

Each retest question must have:

- question
- exactly 4 options
- exactly one correct answer
- correctAnswer 0, 1, 2 or 3
- explanation

Return ONLY valid JSON.

{
  "weakTopics": [
    "string"
  ],
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

/* =========================================================
   KNOWLEDGE MAP
   ========================================================= */

function knowledgeMapPrompt(
  material
) {
  return `
You are Knowvia's Knowledge Map generator.

Create a knowledge map from the study material.

STUDY MATERIAL:
${material}

Identify:

- central topic
- major concepts
- related concepts
- relationships
- supporting concepts
- applications where relevant

Return ONLY valid JSON.

{
  "nodes": [
    {
      "topic": "string",
      "relatedTo": [
        "string"
      ],
      "description": "string"
    }
  ]
}
`;
}

/* =========================================================
   TEACH / SESSION / EXAM / NOTES / MISTAKE
   ========================================================= */

function textPrompt(
  task,
  body
) {
  const material =
    cleanText(body.material);

  const topic =
    cleanText(body.topic) ||
    "the current study topic";

  const difficulty =
    cleanText(
      body.difficulty ||
      "Medium"
    );

  if (task === "teach") {
    return `
You are Knowvia's Teach Me tutor.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

STUDY MATERIAL:
${material}

${difficultyInstruction(
  difficulty
)}

Teach progressively.

Do NOT simply copy the study material.

Use:

1. Start with the basic idea
2. Build understanding
3. Introduce important concepts
4. Connect concepts
5. Give examples
6. Give a quick check question
7. Explain the reasoning
8. Finish with exam takeaways

Use headings.

Make the teaching genuinely appropriate
for ${difficulty} level.
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
${material}

Create a progressive study session:

1. LEARN
2. RECALL
3. PRACTICE
4. REVIEW
5. FINAL CHECK

The session must tell the student
what to do at each stage.

Do not merely repeat the summary.
`;
  }

  if (task === "exam") {
    return `
You are Knowvia's Exam Mode tutor.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

STUDY MATERIAL:
${material}

Create an exam preparation experience.

Include:

1. Important exam areas
2. High-priority concepts
3. Likely question areas
4. Short-answer practice
5. Conceptual questions
6. Application/reasoning questions
7. Common mistakes
8. Final revision checklist

Match the difficulty exactly.

Do not simply copy the study material.
`;
  }

  if (task === "ask_notes") {
    return `
You are Knowvia's Ask My Notes assistant.

SUPPLIED NOTES:
${material}

STUDENT QUESTION:
${cleanText(body.question)}

Answer using the supplied notes.

Rules:

- Prefer information explicitly contained
  in the notes.
- Explain the notes in simpler language
  when useful.
- Do not pretend unsupported information
  exists in the notes.
- If the notes do not contain enough
  information, clearly say so.
- Stay focused on the student's question.
`;
  }

  if (task === "explain_mistake") {
    return `
You are Knowvia's mistake explanation tutor.

STUDY MATERIAL:
${material}

QUESTION:
${cleanText(body.question)}

STUDENT ANSWER:
${cleanText(
  body.selectedAnswer ||
  body.studentAnswer
)}

CORRECT ANSWER:
${cleanText(body.correctAnswer)}

Explain:

1. What the question is testing
2. What the student misunderstood
3. Why the correct answer is correct
4. What concept should be remembered
5. How to avoid the same mistake

Be encouraging and concise.
`;
  }

  return `
You are Knowvia.

TOPIC:
${topic}

STUDY MATERIAL:
${material}

Give a useful student-friendly explanation.
`;
}

/* =========================================================
   VALIDATE QUIZ
   ========================================================= */

function validateQuiz(
  quiz,
  requiredCount = 10
) {
  if (
    !Array.isArray(quiz) ||
    quiz.length !== requiredCount
  ) {
    throw new Error(
      `Gemini returned ${quiz?.length || 0} quiz questions. Exactly ${requiredCount} are required.`
    );
  }

  return quiz.map(
    (item, index) => {
      if (
        !item ||
        typeof item.question !==
          "string" ||
        !Array.isArray(item.options) ||
        item.options.length !== 4 ||
        typeof item.explanation !==
          "string"
      ) {
        throw new Error(
          `Quiz question ${index + 1} is invalid.`
        );
      }

      const correct =
        Number(
          item.correctAnswer
        );

      if (
        !Number.isInteger(correct) ||
        correct < 0 ||
        correct > 3
      ) {
        throw new Error(
          `Quiz question ${index + 1} has an invalid correct answer.`
        );
      }

      return {
        question:
          cleanText(item.question),

        options:
          item.options.map(cleanText),

        correctAnswer:
          correct,

        explanation:
          cleanText(item.explanation)
      };
    }
  );
}

/* =========================================================
   MAIN VERCEL HANDLER
   ========================================================= */

module.exports =
  async function handler(
    req,
    res
  ) {

    if (req.method !== "POST") {
      return send(res, 405, {
        error:
          "Method not allowed."
      });
    }

    try {
      const body =
        req.body || {};

      const task =
        cleanText(body.task);

      const difficulty =
        cleanText(
          body.difficulty ||
          "Medium"
        );

      const questionStyle =
        cleanText(
          body.questionStyle ||
          body.quizStyle ||
          "Mixed"
        );

      if (!task) {
        return send(res, 400, {
          error:
            "Task is required."
        });
      }

      /* ================================================
         STUDY PACK
         ================================================ */

      if (
        task === "study_pack"
      ) {
        const material =
          cleanText(
            body.material
          );

        if (!material) {
          return send(res, 400, {
            error:
              "Study material is required."
          });
        }

        const prompt =
          studyPackPrompt(
            material,
            difficulty,
            questionStyle
          );

        const responseText =
          await callGemini(
            prompt
          );

        const parsed =
          extractJSON(
            responseText
          );

        const normalized =
          normalizeStudyPack(
            parsed
          );

        return send(res, 200, {
          result:
            normalized
        });
      }

      /* ================================================
         TARGETED QUIZ
         ================================================ */

      if (
        task === "quiz"
      ) {
        const material =
          cleanText(
            body.material
          );

        if (!material) {
          return send(res, 400, {
            error:
              "Study material is required."
          });
        }

        const prompt =
          quizPrompt(
            material,
            difficulty,
            questionStyle,
            body.focusTopics
          );

        const responseText =
          await callGemini(
            prompt
          );

        const parsed =
          extractJSON(
            responseText
          );

        const quiz =
          Array.isArray(parsed)
            ? parsed
            : parsed?.quiz;

        const validated =
          validateQuiz(
            quiz,
            10
          );

        return send(res, 200, {
          result:
            validated
        });
      }

      /* ================================================
         WEAK TOPICS
         ================================================ */

      if (
        task === "weak_topics"
      ) {
        const material =
          cleanText(
            body.material
          );

        const wrongQuestions =
          Array.isArray(
            body.wrongQuestions
          )
            ? body.wrongQuestions
            : Array.isArray(
                body.quizResults
              )
              ? body.quizResults
              : [];

        const prompt =
          weakTopicsPrompt(
            material,
            wrongQuestions
          );

        const responseText =
          await callGemini(
            prompt
          );

        const parsed =
          extractJSON(
            responseText
          );

        const retest =
          Array.isArray(
            parsed?.retestQuiz
          )
            ? parsed.retestQuiz
            : [];

        if (
          retest.length !== 5
        ) {
          throw new Error(
            "Gemini did not return exactly 5 targeted retest questions."
          );
        }

        const validated =
          validateQuiz(
            retest,
            5
          );

        return send(res, 200, {
          result: {
            weakTopics:
              Array.isArray(
                parsed?.weakTopics
              )
                ? parsed.weakTopics
                : [],

            explanation:
              cleanText(
                parsed?.explanation
              ),

            retestQuiz:
              validated
          }
        });
      }

      /* ================================================
         KNOWLEDGE MAP
         ================================================ */

      if (
        task === "knowledge_map"
      ) {
        const material =
          cleanText(
            body.material
          );

        const prompt =
          knowledgeMapPrompt(
            material
          );

        const responseText =
          await callGemini(
            prompt
          );

        const parsed =
          extractJSON(
            responseText
          );

        return send(res, 200, {
          result:
            parsed
        });
      }

      /* ================================================
         TEACH ME
         ================================================ */

      if (
        task === "teach"
      ) {
        const prompt =
          textPrompt(
            "teach",
            {
              ...body,
              difficulty
            }
          );

        const answer =
          await callGemini(
            prompt
          );

        return send(res, 200, {
          answer
        });
      }

      /* ================================================
         STUDY SESSION
         ================================================ */

      if (
        task === "study_session"
      ) {
        const prompt =
          textPrompt(
            "study_session",
            {
              ...body,
              difficulty
            }
          );

        const answer =
          await callGemini(
            prompt
          );

        return send(res, 200, {
          answer
        });
      }

      /* ================================================
         EXAM MODE
         ================================================ */

      if (
        task === "exam"
      ) {
        const prompt =
          textPrompt(
            "exam",
            {
              ...body,
              difficulty
            }
          );

        const answer =
          await callGemini(
            prompt
          );

        return send(res, 200, {
          answer
        });
      }

      /* ================================================
         ASK MY NOTES
         ================================================ */

      if (
        task === "ask_notes"
      ) {
        const material =
          cleanText(
            body.material
          );

        const question =
          cleanText(
            body.question
          );

        if (
          !material ||
          !question
        ) {
          return send(res, 400, {
            error:
              "Study material and question are required."
          });
        }

        const answer =
          await callGemini(
            textPrompt(
              "ask_notes",
              {
                ...body,
                material,
                question
              }
            )
          );

        return send(res, 200, {
          answer
        });
      }

      /* ================================================
         EXPLAIN MY MISTAKE
         ================================================ */

      if (
        task === "explain_mistake"
      ) {
        const answer =
          await callGemini(
            textPrompt(
              "explain_mistake",
              body
            )
          );

        return send(res, 200, {
          answer
        });
      }

      /* ================================================
         UNKNOWN TASK
         ================================================ */

      return send(res, 400, {
        error:
          `Unknown task: ${task}`
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
  };
