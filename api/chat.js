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

function studyPackPrompt(topic, material, difficulty, quizStyle) {
  return `
You are Knowvia, an AI study assistant.

Create a high-quality study pack for the student.

TOPIC:
${topic || "Not specified"}

SOURCE MATERIAL:
${material || "No source material was provided. Use accurate general knowledge about the topic."}

DIFFICULTY:
${difficulty}

QUESTION STYLE:
${quizStyle}

IMPORTANT DIFFICULTY RULE:
The difficulty level MUST genuinely affect the content.

BEGINNER:
- Use simple language.
- Explain concepts from the basics.
- Assume the student has little or no prior knowledge.
- Use simple examples.
- Avoid unnecessary technical complexity.
- Questions should test basic understanding and recognition.

INTERMEDIATE:
- Assume the student already understands the basic definitions.
- Explain relationships between concepts.
- Include moderate technical terminology.
- Include examples and small applications.
- Questions should test understanding, comparison, reasoning and application.

ADVANCED:
- Assume strong knowledge of the fundamentals.
- Include deeper technical details.
- Explain important relationships, edge cases and practical considerations.
- Include more complex examples and applications.
- Questions should require reasoning, analysis and problem solving.

SUMMARY REQUIREMENT:
The summary MUST NOT be a short paragraph.

Create a detailed, well-organized study summary.

The summary should contain the following sections whenever they are relevant to the topic:

1. Introduction
2. Definition / Meaning
3. Key Concepts
4. Types / Classification
5. Main Components
6. How It Works / Working / Steps
7. Important Characteristics
8. Advantages
9. Limitations / Disadvantages
10. Applications
11. Examples
12. Important Points to Remember
13. Exam-Oriented Points

Do NOT force a section if it genuinely does not apply to the topic.

For technical subjects:
- Include important terminology.
- Explain processes step by step.
- Include formulas only when relevant.
- Include comparisons when useful.
- Include practical examples.
- Make the explanation suitable for a B.Tech student.

For topics that have types, classifications or categories,
explain each important type clearly.

For topics involving a process or algorithm,
explain the working step by step.

For topics involving comparisons,
clearly explain the differences.

For BEGINNER level:
Keep explanations simple but complete.

For INTERMEDIATE level:
Give more depth, relationships and applications.

For ADVANCED level:
Give deeper technical explanation, reasoning, edge cases and practical relevance.

Do not write meaningless filler.
Do not repeat the same information in different sections.
Use clear headings and bullet points where appropriate.

FLASHCARDS:
Create exactly 10 useful flashcards.
Each flashcard must have:
- question
- answer

QUIZ:
Create exactly 10 multiple-choice questions.

Each question must contain:
- question
- exactly 4 options
- correctAnswer (0, 1, 2, or 3)
- explanation
- topic

The quiz difficulty must match the selected difficulty.

QUESTION STYLE RULE:
If the selected style is "mixed", create a mixture of conceptual, application, reasoning and exam-style questions appropriate to the difficulty.

If the selected style is "quiz", focus mainly on MCQ-style testing.

If the selected style is "short", create questions that require short written answers.

If the selected style is "exam", make questions resemble university/examination questions.

PRACTICE QUESTIONS:
Create useful practice questions appropriate to the selected difficulty.

EXAM QUESTIONS:
Create useful exam-oriented questions appropriate to the selected difficulty.

Return ONLY valid JSON in exactly this structure:

{
  "summary": "detailed study summary with headings and sections",
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
