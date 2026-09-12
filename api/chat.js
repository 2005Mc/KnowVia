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

function analyzeStudyDNA() {
  if (!state.quiz || state.quiz.length === 0) {
    showFeatureOutput(
      "Study DNA",
      "Generate and complete a quiz first. Your Study DNA is created from your quiz performance."
    );
    return;
  }

  const total = state.quiz.length;

  let correct = 0;
  let attempted = 0;
  let skipped = 0;

  const topicStats = {};

  state.quiz.forEach((question, index) => {
    const answer = state.quizAnswers[index];

    const topic =
      question.topic ||
      "General";

    if (!topicStats[topic]) {
      topicStats[topic] = {
        total: 0,
        correct: 0,
        attempted: 0
      };
    }

    topicStats[topic].total++;

    if (
      answer === null ||
      answer === undefined ||
      answer === ""
    ) {
      skipped++;
      return;
    }

    attempted++;

    topicStats[topic].attempted++;

    if (Number(answer) === Number(question.correctAnswer)) {
      correct++;
      topicStats[topic].correct++;
    }
  });

  const accuracy =
    attempted > 0
      ? Math.round((correct / attempted) * 100)
      : 0;

  const completion =
    total > 0
      ? Math.round((attempted / total) * 100)
      : 0;

  let learningLevel = "";
  let learningStyle = "";
  let recommendation = "";

  if (accuracy >= 85) {
    learningLevel = "Strong understanding";
    recommendation =
      "You have a strong grasp of the topic. Focus next on advanced applications, difficult questions and exam-style problems.";
  } else if (accuracy >= 70) {
    learningLevel = "Good understanding";
    recommendation =
      "Your fundamentals are good. Revise the concepts you missed and practice application-based questions.";
  } else if (accuracy >= 50) {
    learningLevel = "Developing understanding";
    recommendation =
      "You understand some important concepts, but your knowledge needs reinforcement. Review the summary and retry the weak areas.";
  } else {
    learningLevel = "Needs reinforcement";
    recommendation =
      "Start by revising the fundamentals and key concepts. Then attempt another quiz before moving to advanced questions.";
  }

  if (completion < 60) {
    learningStyle =
      "You tend to leave questions unanswered. Try attempting more questions so Knowvia can understand your learning pattern better.";
  } else if (accuracy >= 80) {
    learningStyle =
      "You learn effectively through active recall and question-based practice.";
  } else if (accuracy >= 60) {
    learningStyle =
      "You benefit from a combination of concept revision and active practice.";
  } else {
    learningStyle =
      "You would benefit most from concept-first learning followed by repeated practice.";
  }

  const topicEntries = Object.entries(topicStats);

  topicEntries.sort((a, b) => {
    const accuracyA =
      a[1].attempted > 0
        ? a[1].correct / a[1].attempted
        : 0;

    const accuracyB =
      b[1].attempted > 0
        ? b[1].correct / b[1].attempted
        : 0;

    return accuracyA - accuracyB;
  });

  const weakTopics = topicEntries
    .filter(([_, data]) => {
      if (data.attempted === 0) return true;

      return (
        data.correct / data.attempted < 0.7
      );
    })
    .slice(0, 3);

  const strongTopics = [...topicEntries]
    .sort((a, b) => {
      const accuracyA =
        a[1].attempted > 0
          ? a[1].correct / a[1].attempted
          : 0;

      const accuracyB =
        b[1].attempted > 0
          ? b[1].correct / b[1].attempted
          : 0;

      return accuracyB - accuracyA;
    })
    .filter(([_, data]) => data.attempted > 0)
    .slice(0, 3);

  let weakHTML = "";

  if (weakTopics.length > 0) {
    weakHTML = weakTopics
      .map(([topic, data]) => {
        const topicAccuracy =
          data.attempted > 0
            ? Math.round(
                (data.correct / data.attempted) * 100
              )
            : 0;

        return `
          <div class="dna-topic">
            <strong>${escapeHTML(topic)}</strong>
            <span>${topicAccuracy}% accuracy</span>
          </div>
        `;
      })
      .join("");
  } else {
    weakHTML = `
      <div class="dna-empty">
        No major weak topic was detected from this quiz.
      </div>
    `;
  }

  let strongHTML = "";

  if (strongTopics.length > 0) {
    strongHTML = strongTopics
      .map(([topic, data]) => {
        const topicAccuracy =
          data.attempted > 0
            ? Math.round(
                (data.correct / data.attempted) * 100
              )
            : 0;

        return `
          <div class="dna-topic">
            <strong>${escapeHTML(topic)}</strong>
            <span>${topicAccuracy}% accuracy</span>
          </div>
        `;
      })
      .join("");
  } else {
    strongHTML = `
      <div class="dna-empty">
        Complete more questions to identify your strongest areas.
      </div>
    `;
  }

  const html = `
    <div class="dna-header">
      <h3>Your Study DNA</h3>
      <p>Based on your actual performance in the current quiz.</p>
    </div>

    <div class="dna-stats">
      <div class="dna-stat">
        <strong>${accuracy}%</strong>
        <span>Accuracy</span>
      </div>

      <div class="dna-stat">
        <strong>${correct}/${attempted}</strong>
        <span>Correct</span>
      </div>

      <div class="dna-stat">
        <strong>${completion}%</strong>
        <span>Completed</span>
      </div>

      <div class="dna-stat">
        <strong>${skipped}</strong>
        <span>Skipped</span>
      </div>
    </div>

    <div class="dna-section">
      <h4>Learning Level</h4>
      <p>${learningLevel}</p>
    </div>

    <div class="dna-section">
      <h4>Your Learning Pattern</h4>
      <p>${learningStyle}</p>
    </div>

    <div class="dna-section">
      <h4>Strong Areas</h4>
      ${strongHTML}
    </div>

    <div class="dna-section">
      <h4>Areas That Need More Practice</h4>
      ${weakHTML}
    </div>

    <div class="dna-section">
      <h4>Recommended Next Step</h4>
      <p>${recommendation}</p>
    </div>
  `;

  showFeatureOutput("Study DNA", html);
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
