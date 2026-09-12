"use strict";

/* =========================================================
   KNOWVIA - GEMINI BACKEND
   VERCEL SERVERLESS FUNCTION

   IMPORTANT:
   - Gemini only
   - No OpenAI
   - No database
   - API key stays in Vercel
   ========================================================= */

const MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash"
];

const GEMINI_URL =
    "https://generativelanguage.googleapis.com/v1beta/interactions";


/* =========================================================
   HELPERS
   ========================================================= */

function clean(value) {

    return String(value ?? "")
        .replace(/\u0000/g, "")
        .trim();
}


/* =========================================================
   EXTRACT JSON SAFELY
   ========================================================= */

function extractJSON(text) {

    if (!text) {
        throw new Error(
            "Gemini returned an empty response."
        );
    }

    let value =
        clean(text);

    value =
        value
            .replace(
                /^```json\s*/i,
                ""
            )
            .replace(
                /^```\s*/i,
                ""
            )
            .replace(
                /\s*```$/i,
                ""
            )
            .trim();

    try {
        return JSON.parse(value);
    } catch (_) {
        // Continue below.
    }

    let startObject =
        value.indexOf("{");

    let startArray =
        value.indexOf("[");

    let start;

    if (
        startObject >= 0 &&
        startArray >= 0
    ) {

        start =
            Math.min(
                startObject,
                startArray
            );

    } else {

        start =
            startObject >= 0
                ? startObject
                : startArray;
    }

    if (start < 0) {

        throw new Error(
            "Gemini did not return valid JSON."
        );
    }

    const opening =
        value[start];

    const closing =
        opening === "{"
            ? "}"
            : "]";

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (
        let i = start;
        i < value.length;
        i++
    ) {

        const char =
            value[i];

        if (escaped) {

            escaped = false;
            continue;
        }

        if (char === "\\") {

            escaped = true;
            continue;
        }

        if (char === '"') {

            inString =
                !inString;

            continue;
        }

        if (inString) {
            continue;
        }

        if (char === opening) {
            depth++;
        }

        if (char === closing) {

            depth--;

            if (depth === 0) {

                const candidate =
                    value.slice(
                        start,
                        i + 1
                    );

                try {

                    return JSON.parse(
                        candidate
                    );

                } catch (_) {

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
   GEMINI API
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

    for (
        const model of MODELS
    ) {

        try {

            const response =
                await fetch(
                    GEMINI_URL,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "x-goog-api-key":
                                apiKey
                        },

                        body:
                            JSON.stringify({
                                model:
                                    model,

                                input:
                                    prompt,

                                store:
                                    false
                            })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                lastError =
                    new Error(
                        data?.error?.message ||
                        `Gemini request failed: ${response.status}`
                    );

                continue;
            }

            if (
                Array.isArray(
                    data.steps
                )
            ) {

                const parts = [];

                for (
                    const step of
                    data.steps
                ) {

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
                        const item of
                        step.content
                    ) {

                        if (
                            item?.type ===
                                "text" &&
                            typeof item.text ===
                                "string"
                        ) {

                            parts.push(
                                item.text
                            );
                        }
                    }
                }

                if (parts.length) {

                    return parts.join(
                        "\n"
                    );
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

            lastError =
                error;
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
        clean(difficulty)
            .toLowerCase();

    if (
        level === "easy" ||
        level === "beginner"
    ) {

        return `
DIFFICULTY: EASY

Use:
- very simple language
- beginner-friendly explanations
- basic concepts
- simple examples
- minimal technical jargon
- step-by-step explanations

Do not make the explanation unnecessarily advanced.
`;
    }

    if (
        level === "hard" ||
        level === "advanced"
    ) {

        return `
DIFFICULTY: HARD

Use:
- advanced technical concepts
- deeper mechanisms
- relationships between concepts
- complex examples
- applications
- limitations
- analytical reasoning
- exam-level depth

Do not simplify advanced concepts unnecessarily.
`;
    }

    return `
DIFFICULTY: MEDIUM

Use:
- clear explanations
- moderate technical detail
- important terminology
- practical examples
- applications
- moderate reasoning
- exam-relevant points
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

Create a COMPLETE study pack from the supplied material.

SOURCE MATERIAL:
${material}

${difficultyInstruction(
    difficulty
)}

QUESTION STYLE:
${questionStyle}

VERY IMPORTANT:

The difficulty must genuinely change the content.

Easy:
- simple beginner explanation
- basic concepts
- easy examples
- basic questions

Medium:
- more technical detail
- examples
- applications
- moderate reasoning

Hard:
- deep technical explanation
- mechanisms
- relationships
- complex examples
- limitations
- analytical/exam-level questions

Do NOT merely change the difficulty label.

STUDY MATTER MUST INCLUDE:

1. Introduction
2. Definition
3. Core concept
4. Key concepts
5. Types, if applicable
6. Components, if applicable
7. How it works
8. Characteristics
9. Examples
10. Applications
11. Advantages
12. Limitations
13. Comparison, if useful
14. Important exam points
15. Quick revision

Generate EXACTLY 10 flashcards.

Generate EXACTLY 10 quiz questions.

Every quiz question must have EXACTLY 4 options.

Each quiz question must have exactly ONE correct answer.

The quiz must be based on the study matter you generated.

Quiz difficulty must match the selected difficulty.

Return ONLY valid JSON.

Use this structure:

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
    "comparison": "string",
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
`;
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
You are Knowvia's quiz generator.

STUDY MATERIAL:
${material}

DIFFICULTY:
${difficulty}

QUESTION STYLE:
${questionStyle}

${focusTopics
    ? `FOCUS ON THESE WEAK TOPICS:
${focusTopics}`
    : ""
}

${difficultyInstruction(
    difficulty
)}

Generate EXACTLY 10 questions.

Each question must contain:

- question
- exactly 4 options
- correctAnswer from 0 to 3
- explanation

There must be exactly ONE correct option.

For Easy:
test basic understanding.

For Medium:
test understanding and application.

For Hard:
test analysis, relationships, mechanisms and application.

Return ONLY valid JSON.

[
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

QUESTIONS THE STUDENT GOT WRONG:
${JSON.stringify(
    wrongQuestions,
    null,
    2
)}

Identify the concepts the student is struggling with.

Return ONLY valid JSON.

{
  "weakTopics": [
    {
      "topic": "string",
      "reason": "string"
    }
  ]
}

Do not invent topics unrelated to the supplied material.
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

Create a conceptual map from this study material:

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
      "relatedTo": ["string"],
      "description": "string"
    }
  ]
}
`;
}


/* =========================================================
   TEXT FEATURES
   ========================================================= */

function textPrompt(
    task,
    body
) {

    const material =
        clean(body.material);

    const topic =
        clean(body.topic) ||
        "the current study topic";

    const difficulty =
        clean(body.difficulty) ||
        "medium";


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

Use this sequence:

1. Basic idea
2. Build understanding
3. Important concepts
4. Connect concepts
5. Examples
6. Quick check question
7. Reasoning
8. Exam takeaways

Use clear headings.

Make the teaching genuinely appropriate for the selected difficulty.
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

Create a complete progressive study session.

Use these stages:

1. LEARN
2. RECALL
3. PRACTICE
4. REVIEW
5. FINAL CHECK

Tell the student exactly what to do at each stage.

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

1. High-priority concepts
2. Important exam areas
3. Likely question areas
4. Short-answer practice
5. Conceptual questions
6. Application questions
7. Reasoning questions
8. Common mistakes
9. Final revision checklist

Match the selected difficulty.

Do not simply copy the study material.
`;
    }


    if (task === "ask_notes") {

        return `
You are Knowvia's Ask My Notes assistant.

SUPPLIED NOTES:
${material}

STUDENT QUESTION:
${clean(body.question)}

Answer using the supplied notes.

Rules:

- Prefer information explicitly present in the notes.
- Explain difficult parts simply when useful.
- Do not pretend unsupported information is present.
- If the notes do not contain enough information, say so clearly.
- Stay focused on the student's question.
`;
    }


    if (task === "explain_mistake") {

        return `
You are Knowvia's mistake explanation tutor.

STUDY MATERIAL:
${material}

QUESTION:
${clean(body.question)}

STUDENT ANSWER:
${clean(body.selectedAnswer)}

CORRECT ANSWER:
${clean(body.correctAnswer)}

Explain:

1. What the question tests
2. What the student misunderstood
3. Why the correct answer is correct
4. The concept to remember
5. How to avoid the same mistake

Be encouraging and clear.
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
   VALIDATE FLASHCARDS
   ========================================================= */

function validateFlashcards(
    cards
) {

    if (
        !Array.isArray(cards) ||
        cards.length !== 10
    ) {

        throw new Error(
            "Gemini must return exactly 10 flashcards."
        );
    }

    cards.forEach(
        (card, index) => {

            if (
                !clean(card.question) ||
                !clean(card.answer)
            ) {

                throw new Error(
                    `Flashcard ${index + 1} is incomplete.`
                );
            }
        }
    );

    return cards;
}


/* =========================================================
   VALIDATE QUIZ
   ========================================================= */

function validateQuiz(
    quiz
) {

    if (
        !Array.isArray(quiz) ||
        quiz.length !== 10
    ) {

        throw new Error(
            "Gemini must return exactly 10 quiz questions."
        );
    }

    quiz.forEach(
        (question, index) => {

            if (
                !clean(
                    question.question
                )
            ) {

                throw new Error(
                    `Quiz question ${index + 1} is incomplete.`
                );
            }

            if (
                !Array.isArray(
                    question.options
                ) ||
                question.options.length !== 4
            ) {

                throw new Error(
                    `Quiz question ${index + 1} must have exactly 4 options.`
                );
            }

            const answer =
                Number(
                    question.correctAnswer
                );

            if (
                !Number.isInteger(answer) ||
                answer < 0 ||
                answer > 3
            ) {

                throw new Error(
                    `Quiz question ${index + 1} has an invalid correct answer.`
                );
            }

            if (
                !clean(
                    question.explanation
                )
            ) {

                throw new Error(
                    `Quiz question ${index + 1} needs an explanation.`
                );
            }
        }
    );

    return quiz;
}


/* =========================================================
   VERCEL HANDLER
   ========================================================= */

module.exports =
    async function handler(
        req,
        res
    ) {

        if (req.method !== "POST") {

            return res
                .status(405)
                .json({
                    error:
                        "Method not allowed."
                });
        }

        try {

            const body =
                req.body || {};

            const task =
                clean(body.task);

            if (!task) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Task is required."
                    });
            }


            /* =============================================
               STUDY PACK
               ============================================= */

            if (
                task ===
                "study_pack"
            ) {

                const material =
                    clean(body.material);

                if (!material) {

                    return res
                        .status(400)
                        .json({
                            error:
                                "Study material is required."
                        });
                }

                const prompt =
                    studyPackPrompt(
                        material,
                        body.difficulty,
                        body.questionStyle
                    );

                const text =
                    await callGemini(
                        prompt
                    );

                const result =
                    extractJSON(text);

                validateFlashcards(
                    result.flashcards
                );

                validateQuiz(
                    result.quiz
                );

                return res
                    .status(200)
                    .json({
                        result
                    });
            }


            /* =============================================
               QUIZ
               ============================================= */

            if (
                task === "quiz"
            ) {

                const material =
                    clean(body.material);

                const prompt =
                    quizPrompt(
                        material,
                        body.difficulty,
                        body.questionStyle,
                        body.focusTopics
                    );

                const text =
                    await callGemini(
                        prompt
                    );

                const quiz =
                    extractJSON(text);

                validateQuiz(
                    quiz
                );

                return res
                    .status(200)
                    .json({
                        result: quiz
                    });
            }


            /* =============================================
               WEAK TOPICS
               ============================================= */

            if (
                task ===
                "weak_topics"
            ) {

                const material =
                    clean(body.material);

                const prompt =
                    weakTopicsPrompt(
                        material,
                        body.wrongQuestions
                    );

                const text =
                    await callGemini(
                        prompt
                    );

                const result =
                    extractJSON(text);

                return res
                    .status(200)
                    .json({
                        result
                    });
            }


            /* =============================================
               KNOWLEDGE MAP
               ============================================= */

            if (
                task ===
                "knowledge_map"
            ) {

                const prompt =
                    knowledgeMapPrompt(
                        clean(
                            body.material
                        )
                    );

                const text =
                    await callGemini(
                        prompt
                    );

                const result =
                    extractJSON(text);

                return res
                    .status(200)
                    .json({
                        result
                    });
            }


            /* =============================================
               TEXT FEATURES
               ============================================= */

            const textTasks = [
                "teach",
                "study_session",
                "exam",
                "ask_notes",
                "explain_mistake"
            ];

            if (
                textTasks.includes(
                    task
                )
            ) {

                const prompt =
                    textPrompt(
                        task,
                        body
                    );

                const answer =
                    await callGemini(
                        prompt
                    );

                return res
                    .status(200)
                    .json({
                        answer
                    });
            }


            /* =============================================
               UNKNOWN TASK
               ============================================= */

            return res
                .status(400)
                .json({
                    error:
                        `Unknown task: ${task}`
                });

        } catch (error) {

            console.error(
                "Knowvia API error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        error?.message ||
                        "Knowvia server error."
                });
        }
    };
