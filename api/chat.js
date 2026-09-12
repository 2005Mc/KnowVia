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
  const selectedTopic = String(topic || "").trim();
  const sourceMaterial = String(material || "").trim();
  const selectedDifficulty = String(difficulty || "beginner").trim();
  const selectedStyle = String(quizStyle || "mixed").trim();

  return `
You are Knowvia, an AI-powered study assistant.

Your job is to create a study pack for the EXACT topic or source material provided below.

========================
STUDENT INPUT
========================

TOPIC:
${selectedTopic || "No topic name provided"}

SOURCE MATERIAL:
${sourceMaterial || "No additional source material provided."}

DIFFICULTY:
${selectedDifficulty}

QUESTION STYLE:
${selectedStyle}

========================
VERY IMPORTANT
========================

The topic above is the student's CURRENT topic.

You MUST generate content about that exact topic.

NEVER use Photosynthesis, Machine Learning, Computer Vision, Cloud Computing, or any other example topic unless that is actually the student's requested topic.

NEVER copy a previous response.

NEVER return a fixed/sample answer.

Every request must be generated from the CURRENT topic and CURRENT source material.

If source material is provided, use it as the primary basis for the study pack.

If no source material is provided, use your general knowledge about the CURRENT topic.

Do not confuse the topic with an example from these instructions.

========================
DIFFICULTY
========================

The selected difficulty is:

${selectedDifficulty}

If difficulty is BEGINNER:
- Assume the student is new to the topic.
- Explain fundamentals clearly.
- Use simple language.
- Define technical terms.
- Give simple examples.
- Avoid unnecessarily advanced details.
- Quiz questions should mainly test basic understanding.

If difficulty is INTERMEDIATE:
- Assume the student knows the fundamentals.
- Explain concepts with more technical detail.
- Include relationships between concepts.
- Include comparisons and applications.
- Quiz questions should test understanding and application.

If difficulty is ADVANCED:
- Assume strong knowledge of the fundamentals.
- Provide deeper technical details.
- Include advanced concepts, edge cases and practical considerations.
- Include analysis and application.
- Quiz questions should require reasoning and deeper understanding.

The three difficulty levels MUST produce noticeably different depth.

========================
SUMMARY
========================

Create a detailed study summary about:

${selectedTopic || "the supplied study material"}

The summary MUST NOT be a single short paragraph.

Use the following sections whenever they are relevant:

1. Introduction

Explain what the topic is, why it is important, and where it is used.

2. Definition / Meaning

Give a clear and accurate definition.

3. Key Concepts

Explain the important concepts the student must understand.

4. Types / Classification

If the topic has different types, categories, models, methods or classifications, explain them clearly.

If the topic genuinely has no meaningful types, do not invent them.

5. Main Components

Explain the important components, elements, parts, tools, stages or entities involved.

6. How It Works / Working

Explain the process step by step when the topic involves a process, algorithm, system or mechanism.

7. Important Characteristics

Explain important properties, features or characteristics.

8. Advantages

Explain important advantages.

9. Limitations / Disadvantages

Explain important limitations, disadvantages or challenges.

10. Applications

Explain real-world uses and applications.

11. Examples

Give relevant examples directly related to the CURRENT topic.

12. Important Points to Remember

Give concise points useful for revision.

13. Exam-Oriented Points

Give important points, comparisons, definitions, diagrams-to-remember, formulas or likely exam concepts when relevant.

Do NOT force irrelevant sections.

Do NOT invent information merely to fill a section.

For technical B.Tech topics:
- Use proper technical terminology.
- Explain difficult terms.
- Explain processes step by step.
- Include formulas when genuinely relevant.
- Include comparisons when useful.
- Include practical examples.
- Make the content useful for university examinations.

========================
SOURCE MATERIAL RULE
========================

If SOURCE MATERIAL is provided:

${sourceMaterial ? "Use the supplied source material as the primary reference. Do not ignore it." : "No source material was supplied."}

Do not replace the supplied material with an unrelated topic.

If the source material contains specific terminology, preserve that terminology where appropriate.

If the source material is incomplete, explain only what can reasonably be supported and supplement with relevant knowledge about the SAME topic.

========================
FLASHCARDS
========================

Create exactly 10 flashcards about the CURRENT topic.

Each flashcard must contain:

{
  "question": "...",
  "answer": "..."
}

Flashcards must test important concepts rather than trivial facts.

========================
QUIZ
========================

Create exactly 10 multiple-choice questions about the CURRENT topic.

Every question must contain:

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
- correctAnswer must be 0, 1, 2 or 3.
- Only one option should be correct.
- The explanation must explain why the answer is correct.
- The topic field must contain the actual concept being tested.
- Questions MUST be about the CURRENT topic.
- Do not use questions from another topic.

========================
QUESTION STYLE
========================

Selected style:

${selectedStyle}

If style is "mixed":
Use a mixture of conceptual, application, reasoning and exam-oriented questions.

If style is "quiz":
Focus mainly on MCQ-style knowledge and understanding.

If style is "short":
Create questions suitable for short written answers.

If style is "exam":
Make questions resemble university/examination questions.

========================
PRACTICE QUESTIONS
========================

Create useful practice questions about the CURRENT topic.

They must match the selected difficulty.

========================
EXAM QUESTIONS
========================

Create useful exam-oriented questions about the CURRENT topic.

They must match the selected difficulty.

========================
FINAL CHECK BEFORE ANSWERING
========================

Before returning the response, verify:

1. Is every section about the CURRENT topic?
2. Did I accidentally use Photosynthesis as an example topic?
3. Did I accidentally use another unrelated topic?
4. Are the flashcards about the CURRENT topic?
5. Are all 10 quiz questions about the CURRENT topic?
6. Are the practice questions about the CURRENT topic?
7. Are the exam questions about the CURRENT topic?
8. Does the difficulty match ${selectedDifficulty}?
9. Did I use the supplied source material when available?
10. Is the summary detailed enough for a B.Tech student?

If any answer is NO, correct it before returning the response.

========================
OUTPUT
========================

Return ONLY valid JSON.

Use exactly this structure:

{
  "summary": "Detailed study summary with clearly labeled sections.",
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
