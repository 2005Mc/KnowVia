// api/chat.js

/*
=========================================================
KNOWVIA AI BACKEND
GPT-5.6 Terra
=========================================================
*/

const MODEL = "gpt-5.6-terra";

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


/* =====================================================
   HELPERS
===================================================== */

function text(value) {
    return value == null ? "" : String(value).trim();
}


function limit(value, max = 30000) {
    const result = text(value);

    return result.length > max
        ? result.slice(0, max)
        : result;
}


function getBody(req) {

    if (!req.body) {
        return {};
    }

    if (typeof req.body === "object") {
        return req.body;
    }

    try {
        return JSON.parse(req.body);
    } catch {
        return {};
    }
}


/* =====================================================
   OPENAI RESPONSE TEXT EXTRACTION
===================================================== */

function getAIText(data) {

    if (
        typeof data?.output_text === "string" &&
        data.output_text.trim()
    ) {
        return data.output_text.trim();
    }


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

                else if (
                    typeof content?.text === "string"
                ) {
                    parts.push(content.text);
                }
            }
        }


        if (parts.length) {
            return parts.join("\n").trim();
        }
    }


    return "";
}


/* =====================================================
   JSON CLEANER
===================================================== */

function cleanJSON(value) {

    let result = text(value);

    result = result
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    return result;
}


function parseJSON(value) {

    const cleaned = cleanJSON(value);


    try {
        return JSON.parse(cleaned);
    } catch {}


    const firstBrace =
        cleaned.indexOf("{");

    const lastBrace =
        cleaned.lastIndexOf("}");


    if (
        firstBrace !== -1 &&
        lastBrace > firstBrace
    ) {

        try {

            return JSON.parse(
                cleaned.slice(
                    firstBrace,
                    lastBrace + 1
                )
            );

        } catch {}
    }


    return null;
}


/* =====================================================
   OPENAI REQUEST
===================================================== */

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

                max_output_tokens: 16000
            })
        }
    );


    const data =
        await response.json();


    console.log(
        "KNOWVIA OPENAI RESPONSE:",
        JSON.stringify(data)
    );


    if (!response.ok) {

        throw new Error(
            data?.error?.message ||
            `OpenAI API error: ${response.status}`
        );
    }


    const answer =
        getAIText(data);


    if (!answer) {

        console.error(
            "EMPTY OPENAI RESPONSE:",
            JSON.stringify(data)
        );

        throw new Error(
            "OpenAI returned no text. Please try again."
        );
    }


    return answer;
}


/* =====================================================
   BASE PROMPT
===================================================== */

function basePrompt() {

    return `
You are Knowvia, an AI-powered study assistant.

Help students learn, understand and revise academic topics.

Use simple and clear language.

Keep important technical terminology.

Use the supplied study material as the main source.

Do not contradict the supplied material.

Make answers useful for exams, revision and understanding.

Do not unnecessarily repeat the same information.
`;
}


/* =====================================================
   STUDY PACK
===================================================== */

function studyPackPrompt(body) {

    const topic =
        text(body.topic) ||
        "Study Material";


    const difficulty =
        text(body.difficulty) ||
        "beginner";


    const questionStyle =
        text(body.questionStyle) ||
        text(body.quizStyle) ||
        "mixed";


    const material =
        limit(body.material);


    return `
${basePrompt()}

Create a complete Knowvia study pack.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

QUESTION STYLE:
${questionStyle}

STUDY MATERIAL:
${material || "No notes supplied. Generate suitable material from the topic."}


RETURN ONLY VALID JSON.

Use EXACTLY this structure:

{
  "summary": "string",
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
      "explanation": "string",
      "topic": "string"
    }
  ],
  "practiceQuestions": [
    {
      "question": "string",
      "answer": "string",
      "topic": "string"
    }
  ],
  "examQuestions": [
    {
      "question": "string",
      "marks": 5,
      "answer": "string",
      "topic": "string"
    }
  ]
}


SUMMARY:

Create a clear exam-friendly summary.

Include:

- Overview
- Important concepts
- Definitions
- Key points
- Steps or formulas where applicable
- Applications
- Exam-focused points


FLASHCARDS:

Create exactly 10 flashcards.

Cover:

- Definitions
- Concepts
- Differences
- Applications
- Important facts


QUIZ:

Create exactly 10 MCQs.

Every question MUST have:

- exactly 4 options
- correctAnswer as 0, 1, 2 or 3
- explanation
- topic

Mix easy, medium and challenging questions.


QUESTION STYLE:

If style = mcq:

Create normal MCQs.

If style = mixed:

Create conceptual, application and reasoning questions.

Also create 5 practice questions.

If style = short:

Keep the 10 MCQs for automatic scoring.

Also create 5 short-answer practice questions.

If style = exam:

Keep the 10 MCQs for automatic scoring.

Also create 5 university-style exam questions.

Use:

- 2-mark questions
- 5-mark questions
- 10-mark questions

Provide model answers.


IMPORTANT:

Return JSON ONLY.

Do NOT use markdown code fences.

Do NOT write anything before the JSON.

Do NOT write anything after the JSON.
`;
}


/* =====================================================
   FEATURE PROMPTS
===================================================== */

function featurePrompt(task, body) {

    const topic =
        text(body.topic) ||
        "Study Material";


    const difficulty =
        text(body.difficulty) ||
        "beginner";


    const material =
        limit(body.material);


    /* -------------------------------------------------
       TEACH ME
    ------------------------------------------------- */

    if (task === "teach") {

        return `
${basePrompt()}

Teach the following topic like a friendly personal teacher.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

MATERIAL:
${material}

Use:

1. What is it?
2. Why is it important?
3. Simple explanation
4. Step-by-step explanation
5. Example
6. Common mistake
7. Quick check question

Use simple language.
`;
    }


    /* -------------------------------------------------
       STUDY SESSION
    ------------------------------------------------- */

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

Give approximate time suggestions.
`;
    }


    /* -------------------------------------------------
       EXAM MODE
    ------------------------------------------------- */

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


    /* -------------------------------------------------
       ASK MY NOTES
    ------------------------------------------------- */

    if (task === "ask_notes") {

        return `
${basePrompt()}

Answer the student's question using the supplied notes.

TOPIC:
${topic}

NOTES:
${material}

STUDENT QUESTION:
${text(body.question)}

Give a clear answer.

If the notes do not contain enough information,
say so instead of inventing information.
`;
    }


    /* -------------------------------------------------
       EXPLAIN MY MISTAKE
    ------------------------------------------------- */

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


    /* -------------------------------------------------
       SUMMARY
    ------------------------------------------------- */

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


    /* -------------------------------------------------
       FLASHCARDS
    ------------------------------------------------- */

    if (task === "flashcards") {

        return `
${basePrompt()}

Create exactly 10 flashcards.

TOPIC:
${topic}

MATERIAL:
${material}

Return ONLY valid JSON.

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


    /* -------------------------------------------------
       QUIZ
    ------------------------------------------------- */

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

Return ONLY valid JSON.

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


    /* -------------------------------------------------
       TARGETED RETEST
    ------------------------------------------------- */

    if (task === "weak_topics") {

        const results =
            limit(
                typeof body.quizResults === "string"
                    ? body.quizResults
                    : JSON.stringify(
                        body.quizResults || []
                    ),
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

Return ONLY valid JSON.

{
  "weakTopics": [
    {
      "topic": "topic",
      "reason": "why this is weak",
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

Create targeted questions based specifically
on the concepts the student got wrong.
`;
    }


    /* -------------------------------------------------
       KNOWLEDGE MAP
    ------------------------------------------------- */

    if (task === "knowledge_map") {

        return `
${basePrompt()}

Create a knowledge map.

TOPIC:
${topic}

MATERIAL:
${material}

Return ONLY valid JSON.

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

Show important concepts and how they connect.
`;
    }


    throw new Error(
        "Unsupported task."
    );
}


/* =====================================================
   API HANDLER
===================================================== */

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


        const body =
            getBody(req);


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
                featurePrompt(
                    task,
                    body
                );
        }


        const result =
            await askAI(
                prompt,
                apiKey
            );


        /* =================================================
           JSON TASKS
        ================================================= */

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
                    "INVALID AI JSON:",
                    result
                );

                return res.status(502).json({

                    error:
                        "AI returned invalid JSON.",

                    answer:
                        result
                });
            }


            /*
             * IMPORTANT:
             *
             * We return the JSON as a STRING
             * inside "answer" because the
             * frontend expects result.answer.
             */

            return res.status(200).json({

                answer:
                    JSON.stringify(parsed)

            });
        }


        /* =================================================
           NORMAL TEXT TASKS
        ================================================= */

        return res.status(200).json({

            answer:
                result

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
