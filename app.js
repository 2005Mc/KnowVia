"use strict";

/* =========================================================
   KNOWVIA - GEMINI BACKEND
   VERCEL SERVERLESS FUNCTION
   ========================================================= */

const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash"
];

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

/* =========================================================
   TEXT / JSON HELPERS
   ========================================================= */

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim();
}

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

  /* Direct parse first */
  try {
    return JSON.parse(cleaned);
  } catch {}

  /*
   * Find the first complete JSON object/array.
   * This avoids fragile regex extraction.
   */
  const firstObject = cleaned.indexOf("{");
  const firstArray = cleaned.indexOf("[");

  let start = -1;

  if (
    firstObject !== -1 &&
    firstArray !== -1
  ) {
    start = Math.min(
      firstObject,
      firstArray
    );
  } else {
    start =
      firstObject !== -1
        ? firstObject
        : firstArray;
  }

  if (start === -1) {
    throw new Error(
      "Gemini did not return valid JSON."
    );
  }

  const opening = cleaned[start];

  const closing =
    opening === "{"
      ? "}"
      : "]";

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

    if (inString) continue;

    if (
      char === opening
    ) {
      depth++;
    } else if (
      char === closing
    ) {
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
   GEMINI CALL
   ========================================================= */

async function callGemini(prompt) {
  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing in Vercel environment variables."
    );
  }

  let lastError = null;

  for (const model of MODELS) {
    try {
      const response =
        await fetch(GEMINI_API_URL, {
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
        });

      const data =
        await response.json();

      if (!response.ok) {
        lastError =
          new Error(
            data?.error?.message ||
            `Gemini request failed with status ${response.status}.`
          );

        continue;
      }

      /*
       * Interactions API response:
       * steps -> model_output -> content -> text
       */
      if (Array.isArray(data.steps)) {
        const textParts = [];

        for (const step of data.steps) {
          if (
            step?.type !==
            "model_output"
          ) {
            continue;
          }

          if (
            !Array.isArray(
              step.content
            )
          ) {
            continue;
          }

          for (
            const item of step.content
          ) {
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
        typeof data.output_text ===
        "string"
      ) {
        return data.output_text;
      }

      throw new Error(
        "Gemini returned no readable text."
      );

    } catch (error) {
      lastError = error;
    }
  }

  throw (
    lastError ||
    new Error("Gemini request failed.")
  );
}

/* =========================================================
   DIFFICULTY INSTRUCTIONS
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

Use very simple, beginner-friendly language.

Focus on:
- basic meaning
- fundamental concepts
- simple explanations
- simple examples
- easy applications
- basic exam understanding

Avoid unnecessary advanced mathematics,
advanced terminology and overly complex relationships.
`;
  }

  if (level === "hard") {
    return `
DIFFICULTY: HARD

Create genuinely advanced content.

Focus on:
- deep technical explanation
- mechanisms and relationships
- advanced concepts
- complex examples
- practical applications
- limitations and trade-offs
- analysis
- exam-level understanding
- higher-order reasoning

Do not merely add more words to an Easy explanation.
The concepts, examples and depth must genuinely become more advanced.
`;
  }

  return `
DIFFICULTY: MEDIUM

Use moderate technical depth.

Include:
- clear definitions
- important technical terminology
- detailed concepts
- examples
- applications
- moderate analysis
- exam-relevant understanding

The content must be deeper than Easy but less advanced than Hard.
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
You are Knowvia, an AI study assistant.

Create a complete study pack from the supplied study material.

SOURCE MATERIAL:
${material}

${difficultyInstruction(difficulty)}

QUESTION STYLE:
${questionStyle || "Mixed"}

IMPORTANT:
The study material must be genuinely different for Easy,
Medium and Hard.

Do NOT simply change the label or add a few words.
Adjust the actual depth, concepts, terminology,
examples and reasoning to the selected difficulty.

Return ONLY valid JSON.
Do not use Markdown fences.
Do not add explanations before or after the JSON.

Use exactly this structure:

{
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
    "importantExamPoints": ["string"],
    "quickRevision": ["string"]
  },
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

REQUIREMENTS:

1. Create EXACTLY 10 flashcards.

2. Create EXACTLY 10 quiz questions.

3. Every quiz question MUST have exactly 4 options.

4. correctAnswer MUST be an integer from 0 to 3.

5. Each quiz question MUST have exactly one correct answer.

6. Every quiz question must have an explanation.

7. Questions must be based on the generated study matter.

8. Flashcards must also be based on the same study matter.

9. Do not repeat the same question using different wording.

10. Keep the difficulty consistent with the selected level.

11. Easy quiz:
basic recall and understanding.

12. Medium quiz:
understanding, comparison and application.

13. Hard quiz:
analysis, relationships, application, limitations
and exam-level reasoning.

14. Include all relevant sections only when they make sense
for the topic. If "types" or "comparison" is not applicable,
use an empty array instead of inventing information.

15. Never invent facts that are not supported by the material
or established knowledge.

16. The generated study matter should be comprehensive enough
for a student to study from it directly.

17. Return JSON only.
`;
}

/* =========================================================
   NORMALIZE / VALIDATE STUDY PACK
   ========================================================= */

function normalizeStudyPack(pack) {
  if (!pack || typeof pack !== "object") {
    throw new Error(
      "Invalid study pack returned by Gemini."
    );
  }

  const studyMatter =
    pack.studyMatter || {};

  const requiredFields = [
    "introduction",
    "definition",
    "coreConcept",
    "keyConcepts",
    "types",
    "components",
    "working",
    "characteristics",
    "examples",
    "applications",
    "advantages",
    "limitations",
    "comparison",
    "importantExamPoints",
    "quickRevision"
  ];

  for (const field of requiredFields) {
    if (!(field in studyMatter)) {
      studyMatter[field] =
        Array.isArray(
          [
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
          ].includes(field)
        )
          ? []
          : "";
    }
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
    flashcards.map((card, index) => {
      if (
        !card ||
        typeof card.question !== "string" ||
        typeof card.answer !== "string"
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
    });

  const normalizedQuiz =
    quiz.map((q, index) => {
      if (
        !q ||
        typeof q.question !== "string" ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        typeof q.explanation !== "string"
      ) {
        throw new Error(
          `Quiz question ${index + 1} is invalid.`
        );
      }

      const correct =
        Number(q.correctAnswer);

      if (
        !Number.isInteger(correct) ||
        correct < 0 ||
        correct > 3
      ) {
        throw new Error(
          `Quiz question ${index + 1} has an invalid correctAnswer.`
        );
      }

      return {
        question:
          cleanText(q.question),

        options:
          q.options.map((x) =>
            cleanText(x)
          ),

        correctAnswer:
          correct,

        explanation:
          cleanText(q.explanation)
      };
    });

  return {
    studyMatter,
    flashcards:
      normalizedFlashcards,
    quiz:
      normalizedQuiz
  };
}

/* =========================================================
   OTHER PROMPTS
   ========================================================= */

function weakTopicsPrompt(
  material,
  wrongQuestions
) {
  return `
You are analysing a student's weak topics.

STUDY MATERIAL:
${material}

INCORRECTLY ANSWERED QUESTIONS:
${JSON.stringify(
  wrongQuestions,
  null,
  2
)}

Identify the concepts that appear weak.

Return ONLY valid JSON:

{
  "weakTopics": [
    {
      "topic": "string",
      "reason": "string"
    }
  ]
}

Use only evidence from the study material
and incorrect questions.
`;
}

function quizPrompt(
  material,
  difficulty,
  questionStyle,
  focusTopics
) {
  return `
Create a targeted 10-question multiple-choice quiz.

STUDY MATERIAL:
${material}

FOCUS TOPICS:
${focusTopics || "All major topics"}

${difficultyInstruction(difficulty)}

QUESTION STYLE:
${questionStyle || "Mixed"}

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

Create EXACTLY 10 questions.
Exactly 4 options per question.
Exactly one correct answer.
correctAnswer must be 0, 1, 2 or 3.
`;
}

function knowledgeMapPrompt(material) {
  return `
Create a concise knowledge map from this study material.

STUDY MATERIAL:
${material}

Show:
- central topic
- major concepts
- relationships
- supporting concepts
- applications where relevant

Return ONLY valid JSON:

{
  "knowledgeMap": [
    {
      "topic": "string",
      "relatedTo": ["string"],
      "description": "string"
    }
  ]
}
`;
}

function teachPrompt(
  material,
  difficulty
) {
  return `
You are a patient expert teacher.

Teach the following material progressively.

STUDY MATERIAL:
${material}

${difficultyInstruction(difficulty)}

Use this progression:

1. Start with the basic idea.
2. Explain the important concepts.
3. Connect the concepts.
4. Give examples.
5. Explain practical applications.
6. Give a short recall check.
7. Finish with exam-oriented takeaways.

Do not simply copy the study matter.
Teach it in a progressive way.

Use clear headings and student-friendly explanations.
`;
}

function studySessionPrompt(
  material,
  difficulty
) {
  return `
Create a guided study session from this material.

STUDY MATERIAL:
${material}

${difficultyInstruction(difficulty)}

Structure the session as:

1. LEARN
Explain the most important concepts.

2. RECALL
Give short questions/prompts that require memory.

3. PRACTICE
Give application or reasoning activities.

4. REVIEW
Summarise mistakes to watch for and important points.

5. FINAL CHECK
Give a short checklist the student can use before an exam.

Make it practical and progressive.
Do not merely repeat the study material.
`;
}

function examPrompt(
  material,
  difficulty,
  questionStyle
) {
  return `
Create an exam-style preparation activity.

STUDY MATERIAL:
${material}

${difficultyInstruction(difficulty)}

QUESTION STYLE:
${questionStyle || "Mixed"}

Include:

- important exam topics
- likely question areas
- short-answer practice
- conceptual questions
- application/reasoning questions appropriate for the difficulty
- common mistakes
- final revision checklist

Make Hard genuinely exam-level and analytical.
Make Easy genuinely beginner-level.
Make Medium moderately challenging.

Do not invent information outside the material.
`;
}

function askNotesPrompt(
  material,
  question
) {
  return `
Answer the student's question using ONLY the supplied study material
and established facts directly needed to explain it.

STUDY MATERIAL:
${material}

STUDENT QUESTION:
${question}

If the answer is not available from the material,
clearly say that the notes do not contain enough information.

Give a clear student-friendly explanation.
`;
}

function explainMistakePrompt(
  material,
  question,
  selectedAnswer,
  correctAnswer
) {
  return `
Explain a student's quiz mistake.

STUDY MATERIAL:
${material}

QUESTION:
${question}

STUDENT ANSWER:
${selectedAnswer}

CORRECT ANSWER:
${correctAnswer}

Explain:
1. what the question is testing
2. why the student's answer does not satisfy it
3. why the correct answer does
4. what concept should be remembered
5. one simple way to avoid the same mistake

Keep it educational and concise.
`;
}

/* =========================================================
   HANDLER
   ========================================================= */

module.exports = async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  try {
    const body =
      req.body || {};

    const task =
      cleanText(body.task);

    const difficulty =
      cleanText(
        body.difficulty || "Medium"
      );

    const questionStyle =
      cleanText(
        body.questionStyle || "Mixed"
      );

    if (!task) {
      return res.status(400).json({
        error: "Task is required."
      });
    }

    /* =====================================================
       STUDY PACK
       ===================================================== */

    if (task === "study_pack") {
      const material =
        cleanText(body.material);

      if (!material) {
        return res.status(400).json({
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

      const text =
        await callGemini(prompt);

      const parsed =
        extractJSON(text);

      const normalized =
        normalizeStudyPack(parsed);

      return res.status(200).json({
        result: normalized
      });
    }

    /* =====================================================
       WEAK TOPICS
       ===================================================== */

    if (task === "weak_topics") {
      const material =
        cleanText(body.material);

      const wrongQuestions =
        Array.isArray(
          body.wrongQuestions
        )
          ? body.wrongQuestions
          : [];

      const prompt =
        weakTopicsPrompt(
          material,
          wrongQuestions
        );

      const text =
        await callGemini(prompt);

      const parsed =
        extractJSON(text);

      return res.status(200).json({
        result: parsed
      });
    }

    /* =====================================================
       TARGETED QUIZ
       ===================================================== */

    if (task === "quiz") {
      const material =
        cleanText(body.material);

      const prompt =
        quizPrompt(
          material,
          difficulty,
          questionStyle,
          body.focusTopics
        );

      const text =
        await callGemini(prompt);

      const parsed =
        extractJSON(text);

      const quiz =
        Array.isArray(parsed)
          ? parsed
          : parsed.quiz;

      if (
        !Array.isArray(quiz) ||
        quiz.length !== 10
      ) {
        throw new Error(
          "Gemini did not return exactly 10 quiz questions."
        );
      }

      for (
        let i = 0;
        i < quiz.length;
        i++
      ) {
        if (
          !Array.isArray(
            quiz[i].options
          ) ||
          quiz[i].options.length !== 4
        ) {
          throw new Error(
            `Quiz question ${i + 1} does not have exactly 4 options.`
          );
        }

        const answer =
          Number(
            quiz[i].correctAnswer
          );

        if (
          !Number.isInteger(answer) ||
          answer < 0 ||
          answer > 3
        ) {
          throw new Error(
            `Quiz question ${i + 1} has an invalid answer.`
          );
        }
      }

      return res.status(200).json({
        result: quiz
      });
    }

    /* =====================================================
       KNOWLEDGE MAP
       ===================================================== */

    if (task === "knowledge_map") {
      const prompt =
        knowledgeMapPrompt(
          cleanText(body.material)
        );

      const text =
        await callGemini(prompt);

      const parsed =
        extractJSON(text);

      return res.status(200).json({
        result: parsed
      });
    }

    /* =====================================================
       TEACH ME
       ===================================================== */

    if (task === "teach") {
      const prompt =
        teachPrompt(
          cleanText(body.material),
          difficulty
        );

      const answer =
        await callGemini(prompt);

      return res.status(200).json({
        answer
      });
    }

    /* =====================================================
       STUDY SESSION
       ===================================================== */

    if (task === "study_session") {
      const prompt =
        studySessionPrompt(
          cleanText(body.material),
          difficulty
        );

      const answer =
        await callGemini(prompt);

      return res.status(200).json({
        answer
      });
    }

    /* =====================================================
       EXAM MODE
       ===================================================== */

    if (task === "exam") {
      const prompt =
        examPrompt(
          cleanText(body.material),
          difficulty,
          questionStyle
        );

      const answer =
        await callGemini(prompt);

      return res.status(200).json({
        answer
      });
    }

    /* =====================================================
       ASK MY NOTES
       ===================================================== */

    if (task === "ask_notes") {
      const material =
        cleanText(body.material);

      const question =
        cleanText(body.question);

      if (!material || !question) {
        return res.status(400).json({
          error:
            "Study material and question are required."
        });
      }

      const prompt =
        askNotesPrompt(
          material,
          question
        );

      const answer =
        await callGemini(prompt);

      return res.status(200).json({
        answer
      });
    }

    /* =====================================================
       EXPLAIN MISTAKE
       ===================================================== */

    if (task === "explain_mistake") {
      const prompt =
        explainMistakePrompt(
          cleanText(body.material),
          cleanText(body.question),
          cleanText(body.selectedAnswer),
          cleanText(body.correctAnswer)
        );

      const answer =
        await callGemini(prompt);

      return res.status(200).json({
        answer
      });
    }

    return res.status(400).json({
      error:
        `Unknown task: ${task}`
    });

  } catch (error) {
    console.error(
      "Knowvia API error:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Knowvia server error."
    });
  }
};
