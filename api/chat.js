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
function toPlainText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    // Common possible text/value properties
    const possibleValues = [
      value.value,
      value.text,
      value.topic,
      value.title,
      value.content,
      value.name
    ];

    for (const item of possibleValues) {
      if (typeof item === "string" && item.trim()) {
        return item.trim();
      }
    }

    // If it is an array, join its useful text
    if (Array.isArray(value)) {
      return value
        .map(item => toPlainText(item))
        .filter(Boolean)
        .join("\n");
    }

    return "";
  }

  return String(value);
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

function studyPackPrompt(topic, material, difficulty, quizStyle) {
  const selectedTopic = toPlainText(topic);
  const sourceMaterial = toPlainText(material);
  const selectedDifficulty = toPlainText(difficulty) || "beginner";
  const selectedStyle = toPlainText(quizStyle) || "mixed";

  return `
You are Knowvia, an AI-powered study assistant.

Create a study pack for the student's EXACT CURRENT TOPIC.

CURRENT TOPIC:
${selectedTopic || "No topic was provided."}

SOURCE MATERIAL:
${sourceMaterial || "No additional source material was provided."}

DIFFICULTY:
${selectedDifficulty}

QUESTION STYLE:
${selectedStyle}

IMPORTANT TOPIC RULE:

The CURRENT TOPIC above is the topic you must explain.

Use ONLY the actual current topic and supplied source material.

Do NOT use Photosynthesis unless the current topic is Photosynthesis.

Do NOT use Machine Learning unless the current topic is Machine Learning.

Do NOT use Computer Vision unless the current topic is Computer Vision.

Do NOT use Cloud Computing or any other example topic unless that is actually the student's current topic.

Never return a generic explanation.

Never use "[object Object]" as the topic.

If the current topic is "Machine Learning", the entire study pack must be about Machine Learning.

If the current topic is "Computer Vision", the entire study pack must be about Computer Vision.

If the current topic is "Photosynthesis", the entire study pack must be about Photosynthesis.

If source material is supplied, use it as the primary basis for the answer.

==================================================
DIFFICULTY
==================================================

BEGINNER:
- Assume the student is new to the topic.
- Explain the basics clearly.
- Define important terms.
- Use simple language.
- Use simple examples.
- Avoid unnecessary advanced details.
- Questions should mainly test basic understanding.

INTERMEDIATE:
- Assume the student knows the fundamentals.
- Explain concepts with greater technical depth.
- Include relationships between concepts.
- Include comparisons and applications.
- Questions should test understanding and application.

ADVANCED:
- Assume the student already understands the fundamentals.
- Give deeper technical details.
- Include advanced concepts and practical considerations.
- Include reasoning, analysis and application.
- Questions should be more challenging.

The selected difficulty MUST genuinely change the depth of the explanation and questions.

==================================================
DETAILED SUMMARY
==================================================

Create a detailed study summary about:

${selectedTopic || "the supplied source material"}

The summary must NOT be a short generic paragraph.

Use these sections whenever they are relevant:

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

Only include sections that genuinely apply to the topic.

Do NOT invent types if the topic has no meaningful classification.

Do NOT invent components if they are not relevant.

Do NOT add generic filler.

For technical subjects:
- Explain technical terminology.
- Explain processes step by step.
- Include formulas when relevant.
- Include comparisons when useful.
- Include practical examples.
- Make the explanation useful for a B.Tech student.

The summary must contain actual information about the CURRENT TOPIC.

==================================================
FLASHCARDS
==================================================

Create exactly 10 flashcards about the CURRENT TOPIC.

Each flashcard must contain:

{
  "question": "...",
  "answer": "..."
}

==================================================
QUIZ
==================================================

Create exactly 10 multiple-choice questions about the CURRENT TOPIC.

Each question must contain:

{
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "correctAnswer": 0,
  "explanation": "...",
  "topic": "..."
}

Rules:

- Exactly 4 options.
- Only one option is correct.
- correctAnswer must be 0, 1, 2 or 3.
- Questions must be about the CURRENT TOPIC.
- Explanations must explain the correct answer.
- The question topic must identify the actual concept being tested.
- Quiz difficulty must match the selected difficulty.

==================================================
QUESTION STYLE
==================================================

Selected style:

${selectedStyle}

If the style is "mixed":
Use conceptual, application, reasoning and exam-oriented questions.

If the style is "quiz":
Focus mainly on MCQ knowledge and understanding.

If the style is "short":
Create questions suitable for short written answers.

If the style is "exam":
Create university/examination-style questions.

==================================================
PRACTICE QUESTIONS
==================================================

Create useful practice questions about the CURRENT TOPIC.

Match the selected difficulty.

==================================================
EXAM QUESTIONS
==================================================

Create useful exam-oriented questions about the CURRENT TOPIC.

Match the selected difficulty.

==================================================
FINAL VALIDATION
==================================================

Before returning the answer, check:

- Is the summary about the CURRENT TOPIC?
- Are the flashcards about the CURRENT TOPIC?
- Are all quiz questions about the CURRENT TOPIC?
- Are practice questions about the CURRENT TOPIC?
- Are exam questions about the CURRENT TOPIC?
- Did you accidentally use an unrelated example topic?
- Is the difficulty correct?
- Did you use the source material when supplied?
- Is the summary detailed and useful?

If the current topic is "Machine Learning", there must be no unrelated Photosynthesis content.

If the current topic is "Computer Vision", there must be no unrelated Photosynthesis content.

Return ONLY valid JSON.

Use exactly this structure:

{
  "summary": "Detailed summary about the CURRENT TOPIC.",
  "flashcards": [
    {
      "question": "...",
      "answer": "..."
    }
  ],
  "quiz": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
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

function studyDNAPrompt(topic, quizResults) {
  return `
You are Knowvia's Study DNA Analyzer.

Analyze the student's actual quiz performance and create a meaningful Study DNA report.

TOPIC:
${topic || "Unknown topic"}

QUIZ RESULTS:
${JSON.stringify(quizResults || [])}

Analyze ONLY the information contained in the quiz results.

The analysis should identify:

1. Overall Performance
- Total questions
- Attempted questions
- Correct answers
- Incorrect answers
- Skipped questions
- Accuracy percentage

2. Learning Level
Classify the student's current understanding as one of:
- Needs Improvement
- Developing
- Good
- Strong
- Excellent

3. Strong Areas
Identify topics/concepts where the student performed well.

4. Weak Areas
Identify topics/concepts where the student made mistakes or showed weaker understanding.

5. Learning Pattern
Explain what the student's answers suggest about their learning pattern.

For example:
- Strong recall
- Good conceptual understanding
- Needs more application practice
- Confuses similar concepts
- Needs stronger fundamentals
- Makes errors despite knowing the concept

6. Mistake Pattern
Look for patterns in the incorrect answers.

Examples:
- Conceptual mistakes
- Confusion between terms
- Application mistakes
- Calculation mistakes
- Careless mistakes
- Partial understanding

7. Recommended Study Strategy
Give specific recommendations based on the student's actual performance.

8. Next Step
Suggest what the student should do next:
- Revise fundamentals
- Review weak topics
- Practice application questions
- Attempt another quiz
- Move to a higher difficulty level
etc.

IMPORTANT:
- Do NOT give a generic study report.
- Base the analysis on the student's actual quiz answers.
- Do NOT invent performance data.
- If there is not enough information to identify a pattern, clearly say so.
- Keep the report useful for a B.Tech student.
- Make the recommendations practical.

Return ONLY valid JSON in exactly this format:

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
