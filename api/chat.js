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


/*
   Converts values safely into plain text.

   This prevents:
   [object Object]

   from appearing when frontend values are objects.
*/
function toPlainText(value) {

  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {

    return value
      .map(item => toPlainText(item))
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "object") {

    const possibleValues = [
      value.value,
      value.text,
      value.topic,
      value.title,
      value.content,
      value.name
    ];

    for (const item of possibleValues) {

      if (
        typeof item === "string" &&
        item.trim()
      ) {
        return item.trim();
      }
    }

    return "";
  }

  return String(value);
}


/*
   Safely get request body.
*/
function getBody(req) {

  if (
    req.body &&
    typeof req.body === "object"
  ) {
    return req.body;
  }

  if (typeof req.body === "string") {

    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return {};
}


/*
   Extract text returned by Gemini.
*/
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


/*
   Remove markdown code fences if Gemini adds them.
*/
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

async function askGemini(
  prompt,
  apiKey,
  jsonMode = false
) {

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;


  const requestBody = {

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
        JSON.stringify(requestBody)

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

function studyPackPrompt(
  topic,
  material,
  difficulty,
  quizStyle
) {

  /*
     IMPORTANT:
     Convert every value to plain text FIRST.
     This prevents [object Object].
  */

  const selectedTopic =
    toPlainText(topic);

  const sourceMaterial =
    toPlainText(material);

  const selectedDifficulty =
    toPlainText(difficulty) ||
    "beginner";

  const selectedStyle =
    toPlainText(quizStyle) ||
    "mixed";


  return `
You are Knowvia, an AI-powered study assistant.

Your task is to create a complete study pack for the student's EXACT CURRENT TOPIC.

==================================================
CURRENT TOPIC
==================================================

${selectedTopic || "No topic was provided."}


==================================================
SOURCE MATERIAL
==================================================

${sourceMaterial || "No additional source material was provided."}


==================================================
DIFFICULTY
==================================================

${selectedDifficulty}


==================================================
QUESTION STYLE
==================================================

${selectedStyle}


==================================================
CRITICAL TOPIC RULE
==================================================

The CURRENT TOPIC above is the ONLY topic you must explain.

Use the exact current topic.

Do NOT replace the current topic with another topic.

Do NOT assume the topic is Photosynthesis.

Do NOT assume the topic is Machine Learning.

Do NOT assume the topic is Computer Vision.

Do NOT assume the topic is Cloud Computing.

Those are only examples of possible topics.

Use them ONLY if they are actually entered as the student's current topic.

Never use unrelated example topics.

Never use old conversation topics.

Never use sample topics.

Never use generic filler.

The summary, flashcards, quiz, practice questions and exam questions MUST all be about the CURRENT TOPIC.

The CURRENT TOPIC is:

"${selectedTopic}"


==================================================
SOURCE MATERIAL RULE
==================================================

If source material is provided:

- Use it as the primary basis.
- Stay consistent with the supplied material.
- Do not replace it with an unrelated explanation.
- You may organize and explain it more clearly.

If source material is not provided:

- Use your own accurate knowledge of the CURRENT TOPIC.


==================================================
DIFFICULTY
==================================================

BEGINNER:

- Assume the student is new to the topic.
- Explain fundamentals clearly.
- Use simple language.
- Define important terminology.
- Give easy examples.
- Avoid unnecessary advanced details.
- Questions should mainly test basic understanding.


INTERMEDIATE:

- Assume the student knows the fundamentals.
- Explain concepts with more technical depth.
- Explain relationships between concepts.
- Include comparisons.
- Include practical applications.
- Include moderate reasoning.
- Questions should test understanding and application.


ADVANCED:

- Assume the student already understands the fundamentals.
- Give deeper technical details.
- Include advanced concepts.
- Include practical considerations.
- Include analysis and reasoning.
- Include challenging applications.
- Questions should be more difficult.


The selected difficulty MUST genuinely change:

- Explanation depth
- Terminology
- Examples
- Question difficulty
- Reasoning level


==================================================
DETAILED SUMMARY
==================================================

Create a detailed and useful study summary about:

${selectedTopic}


The summary must NOT be a short generic paragraph.

Use the following sections whenever they genuinely apply:

1. Introduction

2. Definition / Meaning

3. Key Concepts

4. Types / Classification

5. Main Components

6. How It Works / Working

7. Important Characteristics

8. Advantages

9. Limitations / Disadvantages

10. Applications

11. Examples

12. Important Points to Remember

13. Exam-Oriented Points


IMPORTANT:

Only include sections that genuinely apply.

Do NOT invent classifications.

Do NOT invent components.

Do NOT add meaningless filler.

For technical subjects:

- Explain technical terms.
- Explain processes step by step.
- Include formulas when relevant.
- Include comparisons when useful.
- Include practical examples.
- Make the explanation useful for a B.Tech student.


The summary should be sufficiently detailed for studying and exam preparation.

Do not make the summary unnecessarily short.


==================================================
FLASHCARDS
==================================================

Create EXACTLY 10 flashcards.

Every flashcard MUST be about the CURRENT TOPIC.

Each flashcard must contain:

{
  "question": "...",
  "answer": "..."
}


==================================================
QUIZ
==================================================

Create EXACTLY 10 multiple-choice questions.

Every question MUST be about the CURRENT TOPIC.

Each question must contain:

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


Rules:

- Exactly 4 options.
- Only one option is correct.
- correctAnswer must be 0, 1, 2 or 3.
- Questions must match the selected difficulty.
- Explanations must explain the correct answer.
- topic must identify the actual concept being tested.
- Do not create questions from unrelated topics.


==================================================
QUESTION STYLE
==================================================

Selected style:

${selectedStyle}


If style is:

"mixed"

Use a mixture of:
- Conceptual questions
- Application questions
- Reasoning questions
- Exam-oriented questions


"quiz"

Focus mainly on:
- MCQ knowledge
- Understanding
- Concept recognition


"short"

Make questions suitable for:
- Short written answers
- Definitions
- Brief explanations
- Conceptual understanding


"exam"

Make questions suitable for:
- University examinations
- Long answers
- Technical explanations
- Application and analysis


==================================================
PRACTICE QUESTIONS
==================================================

Create useful practice questions about the CURRENT TOPIC.

Match the selected difficulty.

Do not use unrelated topics.


==================================================
EXAM QUESTIONS
==================================================

Create useful exam-oriented questions about the CURRENT TOPIC.

Match the selected difficulty.

Do not use unrelated topics.


==================================================
FINAL VALIDATION
==================================================

Before returning the answer, internally verify:

1. Is the summary about the exact CURRENT TOPIC?

2. Are all flashcards about the exact CURRENT TOPIC?

3. Are all quiz questions about the exact CURRENT TOPIC?

4. Are practice questions about the exact CURRENT TOPIC?

5. Are exam questions about the exact CURRENT TOPIC?

6. Did you accidentally use an unrelated example topic?

7. Is the selected difficulty reflected correctly?

8. Did you use the source material when supplied?

9. Is the summary detailed enough?

10. Did you avoid "[object Object]"?

If any answer is NO, correct the response before returning it.


==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

Use exactly this structure:

{
  "summary": "Detailed study summary about the CURRENT TOPIC.",
  "flashcards": [
    {
      "question": "...",
      "answer": "..."
    }
  ],
  "quiz": [
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
  ],
  "practiceQuestions": [
    "..."
  ],
  "examQuestions": [
    "..."
  ]
}
`;
}


/* =========================================================
   STUDY DNA PROMPT
========================================================= */

function studyDNAPrompt(
  topic,
  quizResults
) {

  const selectedTopic =
    toPlainText(topic);

  const resultsText =
    Array.isArray(quizResults)
      ? JSON.stringify(quizResults)
      : toPlainText(quizResults);


  return `
You are Knowvia's Study DNA Analyzer.

Analyze the student's ACTUAL quiz performance.

==================================================
TOPIC
==================================================

${selectedTopic || "Unknown topic"}


==================================================
QUIZ RESULTS
==================================================

${resultsText || "No quiz results were provided."}


==================================================
ANALYSIS
==================================================

Analyze ONLY the information contained in the quiz results.

Do NOT invent performance data.

Calculate the actual:

- Total questions
- Attempted questions
- Correct answers
- Incorrect answers
- Skipped questions
- Accuracy percentage


==================================================
LEARNING LEVEL
==================================================

Classify the student's understanding as one of:

- Needs Improvement
- Developing
- Good
- Strong
- Excellent


==================================================
STRONG AREAS
==================================================

Identify concepts/topics where the student performed well.

Use evidence from the quiz results.


==================================================
WEAK AREAS
==================================================

Identify concepts/topics where the student made mistakes or performed poorly.

Use evidence from the quiz results.


==================================================
LEARNING PATTERN
==================================================

Explain what the student's performance suggests.

Possible patterns include:

- Strong recall
- Good conceptual understanding
- Needs more application practice
- Confuses similar concepts
- Needs stronger fundamentals
- Makes errors despite understanding
- Difficulty applying concepts


Only identify a pattern when supported by the results.


==================================================
MISTAKE PATTERN
==================================================

Identify patterns in incorrect answers.

Possible examples:

- Conceptual mistakes
- Confusion between terms
- Application mistakes
- Calculation mistakes
- Careless mistakes
- Partial understanding


Do not invent a mistake pattern when there is insufficient evidence.


==================================================
STUDY STRATEGY
==================================================

Give practical study recommendations based on the student's actual performance.

Recommendations should focus on the student's weak areas.


==================================================
NEXT STEP
==================================================

Suggest the most useful next action.

Examples:

- Revise fundamentals
- Review weak topics
- Practice application questions
- Attempt another quiz
- Practice difficult questions
- Move to a higher difficulty level


==================================================
IMPORTANT
==================================================

Do NOT give a generic report.

Base everything on the actual quiz results.

If there is not enough information to identify a pattern, clearly say so.

Keep the recommendations useful for a B.Tech student.


==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

Use exactly this format:

{
  "overallPerformance": {
    "totalQuestions": 0,
    "attempted": 0,
    "correct": 0,
    "incorrect": 0,
    "skipped": 0,
    "accuracy": 0
  },
  "learningLevel": "",
  "strongAreas": [
    ""
  ],
  "weakAreas": [
    ""
  ],
  "learningPattern": "",
  "mistakePattern": [
    ""
  ],
  "studyStrategy": [
    ""
  ],
  "nextStep": ""
}
`;
}


/* =========================================================
   WEAK TOPICS PROMPT
========================================================= */

function weakTopicsPrompt({
  topic,
  quizResults
}) {

  const selectedTopic =
    toPlainText(topic);

  const resultsText =
    Array.isArray(quizResults)
      ? JSON.stringify(quizResults)
      : toPlainText(quizResults);


  return `
You are Knowvia's Weak Topic Detector.

MAIN TOPIC:
${limit(selectedTopic, 500)}

QUIZ RESULTS:
${limit(resultsText, 18000)}


Identify concepts where the student performed poorly.

Use ONLY evidence from the quiz results.

Do not invent weak areas.

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
${limit(toPlainText(topic), 500)}

QUESTION:
${limit(toPlainText(question), 4000)}

STUDENT ANSWER:
${limit(toPlainText(studentAnswer), 2000)}

CORRECT ANSWER:
${limit(toPlainText(correctAnswer), 2000)}

EXISTING EXPLANATION:
${limit(toPlainText(explanation), 4000)}


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

  const selectedTopic =
    toPlainText(topic);

  const resultsText =
    Array.isArray(quizResults)
      ? JSON.stringify(quizResults)
      : toPlainText(quizResults);


  return `
You are Knowvia's Knowledge Map generator.

MAIN TOPIC:
${limit(selectedTopic, 500)}

QUIZ RESULTS:
${limit(resultsText, 18000)}


Create a conceptual map of the important ideas.

Use the supplied topic and quiz information.

Create 6 to 10 useful concepts.

Connections should explain which concepts are related.

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
`;
}


/* =========================================================
   MAIN HANDLER
========================================================= */

export default async function handler(req, res) {

  /*
     Always return JSON.
  */

  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );


  /* =======================================================
     METHOD CHECK
  ======================================================= */

  if (req.method !== "POST") {

    return res
      .status(405)
      .json({
        error: "Method not allowed."
      });
  }


  try {

    /* =====================================================
       GEMINI API KEY
    ===================================================== */

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


    /* =====================================================
       REQUEST BODY
    ===================================================== */

    const body =
      getBody(req);


    const task =
      cleanText(body.task);


    /* =====================================================
       TASK VALIDATION
    ===================================================== */

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


    /* =====================================================
       STUDY PACK
    ===================================================== */

    if (task === "study_pack") {

      /*
         IMPORTANT FIX:

         studyPackPrompt() expects:

         topic,
         material,
         difficulty,
         quizStyle

         NOT one object.

         This was the cause of [object Object].
      */

      prompt =
        studyPackPrompt(
          body.topic,
          body.material,
          body.difficulty,
          body.quizStyle
        );

      jsonMode = true;
    }


    /* =====================================================
       STUDY DNA
    ===================================================== */

    else if (task === "study_dna") {

      /*
         IMPORTANT FIX:

         Correct function name is:

         studyDNAPrompt

         not studyDnaPrompt
      */

      prompt =
        studyDNAPrompt(
          body.topic,
          body.quizResults
        );

      jsonMode = true;
    }


    /* =====================================================
       WEAK TOPICS
    ===================================================== */

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


    /* =====================================================
       EXPLAIN MISTAKE
    ===================================================== */

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


    /* =====================================================
       KNOWLEDGE MAP
    ===================================================== */

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


    /* =====================================================
       CALL GEMINI
    ===================================================== */

    const result =
      await askGemini(
        prompt,
        apiKey,
        jsonMode
      );


    /* =====================================================
       JSON TASKS
    ===================================================== */

    if (jsonMode) {

      let parsed;


      try {

        parsed =
          JSON.parse(
            cleanJSON(result)
          );

      } catch (error) {

        console.error(
          "Gemini JSON parsing error:",
          error
        );

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


    /* =====================================================
       TEXT TASK
    ===================================================== */

    return res
      .status(200)
      .json({

        result,

        answer:
          result

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
