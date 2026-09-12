/* =========================================================
   KNOWVIA API
   Gemini 3.5 Flash-Lite ONLY
========================================================= */

"use strict";


const MODEL = "gemini-3.5-flash-lite";


const ALLOWED_TASKS = new Set([
  "study_pack",
  "study_dna",
  "weak_topics",
  "explain_mistake",
  "knowledge_map"
]);


/* =========================================================
   HELPERS
========================================================= */

function cleanText(value) {

  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim();
}


function limit(value, max = 30000) {

  const text = cleanText(value);

  return text.length > max
    ? text.slice(0, max)
    : text;
}


function getBody(req) {

  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  return {};
}


function getGeminiText(data) {

  try {

    const parts =
      data?.candidates?.[0]?.content?.parts || [];

    return parts
      .map(part => part?.text || "")
      .join("")
      .trim();

  } catch {

    return "";
  }
}


function cleanJSON(text) {

  return String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}


/* =========================================================
   GEMINI CALL
========================================================= */

async function askGemini(prompt, apiKey, jsonMode = false) {

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;


  const body = {

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

    generationConfig: {

      maxOutputTokens: 10000,

      ...(jsonMode
        ? {
            responseMimeType: "application/json"
          }
        : {})

    }

  };


  const response =
    await fetch(endpoint, {

      method: "POST",

      headers: {

        "Content-Type":
          "application/json",

        "x-goog-api-key":
          apiKey

      },

      body:
        JSON.stringify(body)

    });


  const raw =
    await response.text();


  let data = {};

  try {

    data =
      raw
        ? JSON.parse(raw)
        : {};

  } catch {

    throw new Error(
      "Gemini returned an invalid server response."
    );
  }


  if (!response.ok) {

    const message =
      data?.error?.message ||
      `Gemini request failed (${response.status}).`;


    throw new Error(message);
  }


  const text =
    getGeminiText(data);


  if (!text) {

    throw new Error(
      "Gemini returned an empty response."
    );
  }


  return text;
}


/* =========================================================
   STUDY PACK PROMPT
========================================================= */

function studyPackPrompt({
  topic,
  material,
  difficulty,
  quizStyle
}) {

  return `

You are Knowvia, an AI study assistant.

Create a complete study pack for the learner.

TOPIC:
${limit(topic, 500)}

SOURCE MATERIAL:
${limit(material, 28000)}

DIFFICULTY:
${limit(difficulty, 50)}

QUESTION STYLE:
${limit(quizStyle, 50)}


IMPORTANT:

Use the supplied source material when it exists.

Do not invent facts that contradict the source.

Keep explanations appropriate for the selected difficulty.

Return ONLY valid JSON.

The JSON MUST have exactly these main fields:

{
  "summary": "...",
  "flashcards": [],
  "quiz": []
}


SUMMARY:

Create a clear, student-friendly explanation.

Use headings and concise explanations.


FLASHCARDS:

Create exactly 10 flashcards.

Each flashcard:

{
  "question": "...",
  "answer": "..."
}


QUIZ:

Create exactly 10 multiple-choice questions.

Each question MUST have:

{
  "question": "...",
  "options": [
    "...",
    "...",
    "...",
    "..."
  ],
  "correctAnswer": 0,
  "explanation": "...",
  "topic": "..."
}


RULES FOR correctAnswer:

It MUST be a number:

0, 1, 2, or 3.

Do not use letters.

Do not write the answer text there.


QUESTION STYLE:

If the style is "mcq", focus on standard MCQs.

If the style is "short", make the questions conceptually suitable for short-answer practice while still returning four options.

If the style is "exam", make the questions resemble examination concepts.

If the style is "mixed", mix recall, understanding and application questions.


QUALITY:

Every question must have exactly 4 options.

There must be exactly one correct option.

Avoid duplicate options.

Keep the questions directly related to the topic.

Return ONLY JSON.

`;
}


/* =========================================================
   STUDY DNA PROMPT
========================================================= */

function studyDnaPrompt({
  topic,
  quizResults
}) {

  return `

You are Knowvia's Study DNA analyzer.

TOPIC:
${limit(topic, 500)}

QUIZ RESULTS:
${limit(
  JSON.stringify(quizResults),
  18000
)}


Analyze the student's performance.

Return ONLY valid JSON in this format:

{
  "profile": "...",
  "recallPattern": "...",
  "strengths": [
    "...",
    "..."
  ],
  "improvements": [
    "...",
    "..."
  ],
  "recommendation": "..."
}


The analysis must be based on the supplied quiz results.

Do not claim personal information that cannot be inferred.

Keep the recommendation practical for a student.

`;
}


/* =========================================================
   WEAK TOPICS PROMPT
========================================================= */

function weakTopicsPrompt({
  topic,
  quizResults
}) {

  return `

You are Knowvia's Weak Topic Detector.

MAIN TOPIC:
${limit(topic, 500)}

QUIZ RESULTS:
${limit(
  JSON.stringify(quizResults),
  18000
)}


Identify concepts where the student performed poorly.

Return ONLY valid JSON:

{
  "weakTopics": [
    {
      "topic": "...",
      "reason": "...",
      "recommendation": "..."
    }
  ]
}


If there are no meaningful weak areas:

{
  "weakTopics": []
}


Use only evidence from the quiz results.

`;
}


/* =========================================================
   EXPLAIN MISTAKE PROMPT
========================================================= */

function explainMistakePrompt({
  topic,
  question,
  studentAnswer,
  correctAnswer,
  explanation
}) {

  return `

You are Knowvia's mistake-explanation tutor.

TOPIC:
${limit(topic, 500)}

QUESTION:
${limit(question, 4000)}

STUDENT ANSWER:
${limit(studentAnswer, 2000)}

CORRECT ANSWER:
${limit(correctAnswer, 2000)}

EXISTING EXPLANATION:
${limit(explanation, 4000)}


Explain the mistake in a simple student-friendly way.

Use this structure:

1. What you answered
2. Why it is incorrect
3. Correct concept
4. Correct answer
5. Easy way to remember
6. One similar practice question

Do not be harsh or judgmental.

Return normal text.

`;
}


/* =========================================================
   KNOWLEDGE MAP PROMPT
========================================================= */

function knowledgeMapPrompt({
  topic,
  quizResults
}) {

  return `

You are Knowvia's Knowledge Map generator.

MAIN TOPIC:
${limit(topic, 500)}

QUIZ RESULTS:
${limit(
  JSON.stringify(quizResults),
  18000
)}


Create a conceptual map of the important ideas.

Return ONLY valid JSON:

{
  "title": "...",
  "nodes": [
    {
      "name": "...",
      "description": "...",
      "connections": [
        "...",
        "..."
      ]
    }
  ]
}


Create 6 to 10 useful concepts.

Connections should explain which concepts are related.

Use the supplied topic and quiz information.

`;
}


/* =========================================================
   MAIN HANDLER
========================================================= */

export default async function handler(req, res) {

  /*
     Always return JSON.
     This prevents HTML-like responses from confusing
     the frontend.
  */

  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );


  if (req.method !== "POST") {

    return res
      .status(405)
      .json({
        error: "Method not allowed."
      });
  }


  try {

    const apiKey =
      process.env.GEMINI_API_KEY;


    if (!apiKey) {

      return res
        .status(500)
        .json({
          error:
            "GEMINI_API_KEY is missing in Vercel Environment Variables."
        });
    }


    const body =
      getBody(req);


    const task =
      cleanText(body.task);


    if (!ALLOWED_TASKS.has(task)) {

      return res
        .status(400)
        .json({
          error:
            "Invalid Knowvia task."
        });
    }


    let prompt = "";

    let jsonMode = false;


    /* =========================
       STUDY PACK
    ========================= */

    if (task === "study_pack") {

      prompt =
        studyPackPrompt({

          topic:
            body.topic,

          material:
            body.material,

          difficulty:
            body.difficulty,

          quizStyle:
            body.quizStyle

        });

      jsonMode = true;
    }


    /* =========================
       STUDY DNA
    ========================= */

    else if (task === "study_dna") {

      prompt =
        studyDnaPrompt({

          topic:
            body.topic,

          quizResults:
            body.quizResults

        });

      jsonMode = true;
    }


    /* =========================
       WEAK TOPICS
    ========================= */

    else if (task === "weak_topics") {

      prompt =
        weakTopicsPrompt({

          topic:
            body.topic,

          quizResults:
            body.quizResults

        });

      jsonMode = true;
    }


    /* =========================
       EXPLAIN MISTAKE
    ========================= */

    else if (task === "explain_mistake") {

      prompt =
        explainMistakePrompt({

          topic:
            body.topic,

          question:
            body.question,

          studentAnswer:
            body.studentAnswer,

          correctAnswer:
            body.correctAnswer,

          explanation:
            body.explanation

        });

      jsonMode = false;
    }


    /* =========================
       KNOWLEDGE MAP
    ========================= */

    else if (task === "knowledge_map") {

      prompt =
        knowledgeMapPrompt({

          topic:
            body.topic,

          quizResults:
            body.quizResults

        });

      jsonMode = true;
    }


    /* =========================
       CALL GEMINI
    ========================= */

    const result =
      await askGemini(
        prompt,
        apiKey,
        jsonMode
      );


    /* =========================
       JSON TASKS
    ========================= */

    if (jsonMode) {

      let parsed;

      try {

        parsed =
          JSON.parse(
            cleanJSON(result)
          );

      } catch {

        return res
          .status(502)
          .json({
            error:
              "Gemini returned invalid JSON. Please try again."
          });
      }


      return res
        .status(200)
        .json(parsed);
    }


    /* =========================
       TEXT TASK
    ========================= */

    return res
      .status(200)
      .json({

        result,

        answer: result

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
}
