const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash"
];

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

function cleanText(value, fallback = "") {
  return typeof value === "string"
    ? value.trim()
    : fallback;
}

function limit(value, max = 30000) {
  return cleanText(value).slice(0, max);
}

function cleanJSON(value) {
  return cleanText(value)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseJSON(value) {
  const cleaned = cleanJSON(value);

  try {
    return JSON.parse(cleaned);
  } catch {}

  const firstObject = cleaned.indexOf("{");
  const lastObject = cleaned.lastIndexOf("}");

  if (firstObject !== -1 && lastObject > firstObject) {
    try {
      return JSON.parse(
        cleaned.slice(firstObject, lastObject + 1)
      );
    } catch {}
  }

  const firstArray = cleaned.indexOf("[");
  const lastArray = cleaned.lastIndexOf("]");

  if (firstArray !== -1 && lastArray > firstArray) {
    try {
      return JSON.parse(
        cleaned.slice(firstArray, lastArray + 1)
      );
    } catch {}
  }

  throw new Error("Gemini returned invalid JSON.");
}

async function getRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new Error("Invalid JSON request body.");
    }
  }

  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", chunk => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON request body."));
      }
    });

    req.on("error", reject);
  });
}

function extractGeminiText(data) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map(part => part?.text || "")
      .join("")
      .trim() || ""
  );
}

async function askGemini(prompt, apiKey, jsonMode = false) {
  let lastError = null;

  for (const model of MODELS) {
    try {
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
          maxOutputTokens: jsonMode ? 12000 : 8000
        }
      };

      if (jsonMode) {
        requestBody.generationConfig.responseMimeType =
          "application/json";
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify(requestBody)
        }
      );

      const raw = await response.text();

      let data = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        lastError = new Error(
          `Gemini returned an invalid response from ${model}.`
        );
        continue;
      }

      if (!response.ok) {
        const message =
          data?.error?.message ||
          `Gemini request failed with status ${response.status}.`;

        lastError = new Error(message);

        /*
          Try the next model for temporary service/rate-limit errors.
        */
        if (
          response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504
        ) {
          continue;
        }

        throw lastError;
      }

      const result = extractGeminiText(data);

      if (!result) {
        lastError = new Error(
          `Gemini returned no text from ${model}.`
        );
        continue;
      }

      return result;

    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(
    "Gemini is temporarily unavailable. Please try again."
  );
}


/* =========================================================
   COMPLETE STUDY PACK
   ========================================================= */

function studyPackPrompt(body) {
  const topic = limit(body.topic, 10000);
  const material = limit(body.material, 40000);
  const difficulty = cleanText(
    body.difficulty,
    "beginner"
  );

  const quizStyle = cleanText(
    body.quizStyle,
    "mixed"
  );

  return `
You are Knowvia, an AI-powered study assistant.

Your job is to create a COMPLETE study pack for the topic below.

TOPIC:
${topic}

SOURCE MATERIAL:
${material || "No source material was provided. Use established academic knowledge."}

DIFFICULTY:
${difficulty}

QUESTION STYLE:
${quizStyle}


==================================================
IMPORTANT STUDY-PACK RULE
==================================================

Do NOT create a different syllabus for Beginner,
Intermediate and Advanced.

ALL difficulty levels must cover the SAME IMPORTANT
TOPIC AREAS.

The difficulty should change the DEPTH and COMPLEXITY,
not remove important sections.

For example:

BEGINNER:
Simple definitions, examples and easy explanations.

INTERMEDIATE:
More technical terminology, relationships,
working principles and practical examples.

ADVANCED:
Deeper mechanisms, architecture, comparisons,
edge cases, limitations and advanced applications.


==================================================
COMPLETE TOPIC COVERAGE
==================================================

Whenever applicable, cover these areas:

1. Introduction / definition
2. Meaning and basic concept
3. History or background
4. Characteristics / features
5. Components / elements
6. Types
7. Classification
8. Working / operating principle
9. Architecture / structure
10. Important processes or steps
11. Important terminology
12. Examples
13. Applications / real-world uses
14. Advantages
15. Limitations / disadvantages
16. Comparisons with related concepts
17. Important formulas or rules, if applicable
18. Practical significance
19. Common mistakes / misconceptions
20. Exam-important points
21. Quick revision points


Do NOT force irrelevant sections.

For example, if a topic has no useful formulas,
do not invent formulas.

If history is not important for the topic,
keep it short.


==================================================
SOURCE RULE
==================================================

If source material is provided:

- Prefer the source material.
- Do not contradict it unnecessarily.
- Do not pretend unsupported information came from the source.
- You may organize the source into a better study structure.

If no source material is provided:

- Use established academic knowledge.
- Do not invent facts.


==================================================
SUMMARY
==================================================

Create a comprehensive student-friendly summary.

The summary must contain clearly labelled sections such as:

INTRODUCTION
DEFINITION
KEY FEATURES
COMPONENTS
TYPES / CLASSIFICATION
WORKING / PRINCIPLE
IMPORTANT CONCEPTS
APPLICATIONS
ADVANTAGES
LIMITATIONS
EXAMPLES
EXAM POINTS
QUICK REVISION

Use only sections relevant to the topic.

The difficulty controls how deeply each section is explained.


==================================================
FLASHCARDS
==================================================

Create 10 flashcards.

Cover DIFFERENT concepts rather than repeating
the definition.

Include a mixture of:
- definitions
- features
- types
- components
- applications
- comparisons
- important concepts


==================================================
QUIZ
==================================================

Create 10 MCQs.

Questions should cover different parts of the topic.

Do NOT make all questions about definitions.

Include:
- conceptual questions
- feature/type questions
- application questions
- working/principle questions
- comparison questions
- exam-style questions

Each question must have exactly four options.

correctAnswer must be:
0, 1, 2, or 3.


==================================================
PRACTICE QUESTIONS
==================================================

Create 5 practice questions.

Mix:
- short answer
- explanation
- application
- comparison
- reasoning


==================================================
EXAM QUESTIONS
==================================================

Create 5 exam-oriented questions.

Make them appropriate for the selected difficulty.

==================================================
RETURN FORMAT
==================================================

Return ONLY valid JSON.

Do not use Markdown code fences.

Use exactly this structure:

{
  "summary": "Complete structured study notes...",
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
    "...",
    "...",
    "...",
    "...",
    "..."
  ],
  "examQuestions": [
    "...",
    "...",
    "...",
    "...",
    "..."
  ]
}
`;
}


/* =========================================================
   INDIVIDUAL FEATURES
   ========================================================= */

function taskPrompt(body) {

  const topic = limit(body.topic, 10000);
  const material = limit(body.material, 40000);
  const difficulty = cleanText(
    body.difficulty,
    "beginner"
  );

  switch (body.task) {

    case "summary":
      return {
        json: false,
        prompt: `
You are Knowvia.

Create COMPLETE study notes for:

TOPIC:
${topic}

SOURCE MATERIAL:
${material || "No source material provided."}

DIFFICULTY:
${difficulty}

Cover all relevant areas:

- Introduction
- Definition
- Features / characteristics
- Components
- Types
- Classification
- Working / principle
- Important concepts
- Examples
- Applications
- Advantages
- Limitations
- Comparisons
- Common mistakes
- Exam-important points
- Quick revision

Do not create separate unrelated summaries.

The same major syllabus coverage must remain present
at every difficulty level.

Difficulty should change the depth of explanation.

Use clear headings and student-friendly language.
`
      };


    case "flashcards":
      return {
        json: true,
        prompt: `
Create 10 comprehensive study flashcards.

Topic:
${topic}

Material:
${material}

Difficulty:
${difficulty}

Cover different areas such as:

definition, features, components, types,
working, important concepts, applications,
advantages, limitations and examples.

Return ONLY:

{
  "flashcards": [
    {
      "question": "...",
      "answer": "..."
    }
  ]
}
`
      };


    case "quiz":
      return {
        json: true,
        prompt: `
Create 10 high-quality MCQs for:

Topic:
${topic}

Material:
${material}

Difficulty:
${difficulty}

Cover different concepts.

Include questions about:
- definitions
- features
- types
- components
- working
- applications
- comparisons
- reasoning

Each question must have exactly four options.

Return ONLY:

{
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
  ]
}
`
      };


    case "teach":
      return {
        json: false,
        prompt: `
You are Knowvia's Teach Me tutor.

Teach this topic from the beginning:

TOPIC:
${topic}

MATERIAL:
${material}

DIFFICULTY:
${difficulty}

Teach it as a complete lesson.

Cover all relevant:

1. What it is
2. Why it is important
3. Features
4. Components
5. Types
6. How it works
7. Examples
8. Applications
9. Advantages
10. Limitations
11. Common mistakes
12. Quick revision

Use simple explanations first and gradually increase
technical depth according to the selected difficulty.

Use examples and analogies where useful.

End with:
"Quick Check"

and give 3 questions for the student to answer.
`
      };


    case "study_session":
      return {
        json: false,
        prompt: `
Create a complete Knowvia Study Session.

Topic:
${topic}

Material:
${material}

Difficulty:
${difficulty}

Create a practical study session containing:

1. Learning objective
2. What to understand first
3. Core concepts
4. Important definitions
5. Types/features/components
6. Working/principle
7. Applications
8. What to memorize
9. What to practice
10. Self-test
11. Final revision checklist

Keep it focused and useful for an actual student.
`
      };


    case "exam":
      return {
        json: false,
        prompt: `
You are Knowvia Exam Mode.

Prepare a complete exam-oriented revision guide.

Topic:
${topic}

Material:
${material}

Difficulty:
${difficulty}

Include:

IMPORTANT DEFINITIONS
IMPORTANT FEATURES
TYPES / CLASSIFICATION
IMPORTANT COMPONENTS
WORKING / PRINCIPLE
APPLICATIONS
ADVANTAGES
LIMITATIONS
COMPARISONS
COMMON EXAM QUESTIONS
SHORT-ANSWER QUESTIONS
LONG-ANSWER QUESTIONS
LAST-MINUTE REVISION

Focus on points that a student can actually revise
before an examination.
`
      };


    case "ask_notes":
      return {
        json: false,
        prompt: `
You are Knowvia's Ask My Notes assistant.

TOPIC:
${topic}

STUDY NOTES:
${material}

STUDENT QUESTION:
${limit(body.question, 10000)}

Answer using the supplied notes first.

Explain:
- direct answer
- relevant concept
- simple example if useful

If the notes do not contain enough information,
clearly tell the student that additional knowledge
is being used.

Never claim something exists in the notes if it does not.
`
      };


    case "weak_topics":
      return {
        json: true,
        prompt: `
You are Knowvia's Weak Topic Detector.

Topic:
${topic}

Quiz Results:
${JSON.stringify(body.quizResults || [])}

Identify concepts where the student needs improvement.

Return:

{
  "weakTopics": [
    {
      "topic": "...",
      "reason": "...",
      "recommendation": "..."
    }
  ],
  "overallAdvice": "..."
}

Do not invent weaknesses when the results do not
support them.
`
      };


    case "explain_mistake":
      return {
        json: false,
        prompt: `
You are Knowvia's Explain My Mistake tutor.

QUESTION:
${limit(body.question, 10000)}

STUDENT ANSWER:
${limit(body.studentAnswer, 5000)}

CORRECT ANSWER:
${limit(body.correctAnswer, 5000)}

EXISTING EXPLANATION:
${limit(body.explanation, 10000)}

Explain:

1. What the student misunderstood
2. Why the student's answer is not correct
3. Why the correct answer is correct
4. The concept to remember
5. A simple memory trick
6. One similar practice question

Be encouraging.
`
      };


    case "knowledge_map":
      return {
        json: true,
        prompt: `
Create a Knowledge Map.

Topic:
${topic}

Material:
${material}

Quiz Results:
${JSON.stringify(body.quizResults || [])}

Return:

{
  "title": "Knowledge Map",
  "coreTopic": "...",
  "concepts": [
    {
      "name": "...",
      "description": "...",
      "importance": "high"
    }
  ],
  "connections": [
    {
      "from": "...",
      "to": "...",
      "relationship": "..."
    }
  ]
}

Include the major concepts and their relationships.
`
      };

    default:
      throw new Error("Unsupported task.");
  }
}


/* =========================================================
   VERCEL FUNCTION
   ========================================================= */

export default async function handler(req, res) {

  try {

    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed. Use POST."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY is missing from Vercel Environment Variables."
      });
    }

    const body = await getRequestBody(req);

    const task = cleanText(body.task);

    if (!ALLOWED_TASKS.has(task)) {
      return res.status(400).json({
        error: "Invalid Knowvia task."
      });
    }

    let prompt;
    let jsonMode = false;

    if (task === "study_pack") {

      prompt = studyPackPrompt(body);
      jsonMode = true;

    } else {

      const taskData = taskPrompt(body);

      prompt = taskData.prompt;
      jsonMode = taskData.json;
    }

    const aiText = await askGemini(
      prompt,
      apiKey,
      jsonMode
    );

    if (jsonMode) {

      const result = parseJSON(aiText);

      return res.status(200).json(result);

    }

    return res.status(200).json({
      result: aiText,
      answer: aiText
    });

  } catch (error) {

    console.error("KNOWVIA API ERROR:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Knowvia AI could not complete the request."
    });
  }
}
