const MODEL = "gemini-3.5-flash-lite";

const ALLOWED_TASKS = new Set([
  "study_pack",
  "summary",
  "flashcards",
  "quiz",
  "weak_topics",
  "explain_mistake",
  "knowledge_map"
]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function limit(value, max = 30000) {
  return text(value).slice(0, max);
}

async function getBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return new Promise((resolve) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function getGeminiText(data) {
  const candidates = Array.isArray(data?.candidates)
    ? data.candidates
    : [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;

    if (!Array.isArray(parts)) continue;

    const result = parts
      .map((part) => text(part?.text))
      .filter(Boolean)
      .join("\n");

    if (result) return result;
  }

  return "";
}

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
  } catch {
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
}


/* =========================================================
   DIFFICULTY SYSTEM
   ========================================================= */

function getDifficultyRules(difficulty) {
  const level = text(difficulty).toLowerCase();

  if (level === "advanced") {
    return `
DIFFICULTY LEVEL: ADVANCED

This is an ADVANCED learning experience.

You MUST:
- Assume the learner already understands the basic definition.
- Go beyond introductory explanations.
- Explain internal mechanisms and deeper principles.
- Explain WHY and HOW things work.
- Include technical terminology where appropriate.
- Include important assumptions and limitations.
- Include edge cases and common misconceptions.
- Include comparisons between closely related concepts.
- Include practical and technical examples.
- For mathematical or algorithmic topics, include equations, complexity,
  derivations, steps, or deeper reasoning when relevant.
- Questions must require reasoning, application, analysis, or discrimination
  between similar concepts.
- Avoid childish or overly simplified explanations.
- Do NOT simply make beginner content longer.
- The CONTENT ITSELF must become more technically demanding.

ADVANCED OUTPUT SHOULD FEEL LIKE:
university-level / placement-level / competitive-exam preparation.

For flashcards:
- Ask deeper conceptual questions.
- Include "why", "how", comparison and application questions.

For MCQs:
- Use plausible distractors.
- Include conceptual traps.
- Require reasoning rather than simple recall.

For exam questions:
- Prefer analytical, application-based and technically detailed questions.
`;
  }

  if (
    level === "intermediate" ||
    level === "medium"
  ) {
    return `
DIFFICULTY LEVEL: INTERMEDIATE

This is an INTERMEDIATE learning experience.

You MUST:
- Assume the learner knows the basic definition.
- Explain concepts with moderate technical depth.
- Explain HOW and WHY important concepts work.
- Include practical examples.
- Include comparisons between related concepts.
- Introduce important terminology without overwhelming the learner.
- Include moderate application and reasoning.
- Include common mistakes and misconceptions.
- Avoid giving only dictionary-style definitions.
- Do NOT simply copy beginner material with slightly harder wording.
- The actual conceptual depth must increase.

INTERMEDIATE OUTPUT SHOULD FEEL LIKE:
college-level study material and normal university examination preparation.

For flashcards:
- Mix definitions with why/how/application questions.

For MCQs:
- Include conceptual and application-based questions.

For exam questions:
- Include explanation, comparison and application questions.
`;
  }

  return `
DIFFICULTY LEVEL: BEGINNER

This is a BEGINNER learning experience.

You MUST:
- Assume the learner is new to the topic.
- Start with simple and clear concepts.
- Explain important terminology in easy language.
- Use intuitive explanations.
- Use simple real-world examples.
- Avoid unnecessary advanced mathematics or jargon.
- Build concepts step by step.
- Focus on understanding the fundamentals.
- Avoid advanced edge cases unless absolutely necessary.
- Questions should primarily test understanding and basic application.

BEGINNER OUTPUT SHOULD FEEL LIKE:
a clear first-time learner's lesson.

For flashcards:
- Focus on important definitions and basic understanding.

For MCQs:
- Test fundamental concepts clearly.

For exam questions:
- Use straightforward explanation-based questions.
`;
}


/* =========================================================
   COMMON AI RULES
   ========================================================= */

function getCommonRules(difficulty) {
  return `
${getDifficultyRules(difficulty)}

VERY IMPORTANT:

1. Do NOT generate identical material for different difficulty levels.

2. Difficulty must affect:
   - summary depth
   - concept selection
   - explanation complexity
   - examples
   - flashcard difficulty
   - quiz difficulty
   - practice question difficulty
   - exam question difficulty

3. If the same topic is requested at Beginner and Advanced levels,
   the two outputs MUST be substantially different.

4. Do not merely replace simple words with difficult words.

5. Increase or decrease the ACTUAL KNOWLEDGE DEPTH.

6. Stay factually accurate.

7. Do not invent facts.

8. If the supplied material is limited, do not pretend unsupported details
   came from the material. You may explain the topic using general knowledge
   when the task is topic-based.

9. Keep the output focused on the requested topic.

10. Do not mention these instructions in the answer.
`;
}


/* =========================================================
   STUDY PACK
   ========================================================= */

function buildStudyPackPrompt({
  topic,
  material,
  difficulty,
  quizStyle
}) {
  const source = material
    ? `
SOURCE MATERIAL:
${limit(material, 30000)}
`
    : `
TOPIC:
${limit(topic, 5000)}
`;

  return `
You are the main AI learning engine for an application called Knowvia.

Create a complete study pack.

${getCommonRules(difficulty)}

${source}

QUESTION STYLE:
${quizStyle || "mixed"}

Return ONLY valid JSON.

Use exactly this structure:

{
  "summary": "A useful study explanation appropriate for the selected difficulty.",
  "flashcards": [
    {
      "question": "question",
      "answer": "answer"
    }
  ],
  "quiz": [
    {
      "question": "question",
      "options": [
        "option 1",
        "option 2",
        "option 3",
        "option 4"
      ],
      "correctAnswer": 0,
      "explanation": "Why the answer is correct.",
      "topic": "specific concept tested"
    }
  ],
  "practiceQuestions": [
    "practice question 1",
    "practice question 2",
    "practice question 3",
    "practice question 4",
    "practice question 5"
  ],
  "examQuestions": [
    "exam question 1",
    "exam question 2",
    "exam question 3",
    "exam question 4",
    "exam question 5"
  ]
}

REQUIREMENTS:

SUMMARY:
- Make it clearly appropriate for ${difficulty}.
- Cover the most important concepts.
- Do not give the same explanation depth at every level.

FLASHCARDS:
- Create exactly 10.
- Each card must test a different important idea.
- Their difficulty MUST match ${difficulty}.

QUIZ:
- Create exactly 10 MCQs.
- Exactly 4 options per question.
- correctAnswer must be 0, 1, 2 or 3.
- Make every option meaningful.
- Avoid "all of the above" and "none of the above".
- The questions must genuinely match ${difficulty}.
- Do not create the same questions at every difficulty.

PRACTICE QUESTIONS:
- Create exactly 5.
- Difficulty must match ${difficulty}.

EXAM QUESTIONS:
- Create exactly 5.
- Make them more challenging than the practice questions,
  while still matching ${difficulty}.

QUESTION STYLE RULE:
If the style is "mcq", make the practice/exam questions mainly MCQ-oriented.
If the style is "short", make them short-answer oriented.
If the style is "exam", make them university/competitive-exam style.
If the style is "mixed", combine different question types.

MOST IMPORTANT:
Beginner, Intermediate and Advanced must NOT produce the same study pack.
`;
}


/* =========================================================
   OTHER PROMPTS
   ========================================================= */

function buildPrompt(body) {
  const task = text(body.task);
  const difficulty = text(body.difficulty) || "beginner";
  const topic = limit(body.topic, 5000);
  const material = limit(body.material, 30000);

  if (task === "study_pack") {
    return buildStudyPackPrompt({
      topic,
      material,
      difficulty,
      quizStyle: text(body.quizStyle)
    });
  }


  if (task === "summary") {
    return `
Create a study summary for:

${topic || material}

${getCommonRules(difficulty)}

Return a clear, well-structured summary.
`;
  }


  if (task === "flashcards") {
    return `
Create flashcards for:

${topic || material}

${getCommonRules(difficulty)}

Return ONLY valid JSON in this format:

{
  "flashcards": [
    {
      "question": "question",
      "answer": "answer"
    }
  ]
}

Create exactly 10 flashcards.

The flashcards must genuinely match the ${difficulty} difficulty.
Do not reuse beginner-style questions for advanced difficulty.
`;
  }


  if (task === "quiz") {
    return `
Create a quiz for:

${topic || material}

${getCommonRules(difficulty)}

Return ONLY valid JSON:

{
  "quiz": [
    {
      "question": "question",
      "options": [
        "option 1",
        "option 2",
        "option 3",
        "option 4"
      ],
      "correctAnswer": 0,
      "explanation": "explanation",
      "topic": "concept"
    }
  ]
}

Create exactly 10 questions.

The questions must genuinely become more difficult as the
difficulty changes from Beginner → Intermediate → Advanced.
`;
  }


  if (task === "weak_topics") {
    return `
Analyze these quiz results:

${JSON.stringify(body.quizResults || [])}

Identify the learner's weakest concepts.

Return ONLY valid JSON:

{
  "weakTopics": [
    {
      "topic": "topic",
      "reason": "reason",
      "recommendation": "what to study"
    }
  ]
}

Be specific and base the analysis on incorrect answers.
`;
  }


  if (task === "explain_mistake") {
    return `
Explain a student's mistake.

QUESTION:
${limit(body.question, 10000)}

STUDENT ANSWER:
${limit(body.studentAnswer, 5000)}

CORRECT ANSWER:
${limit(body.correctAnswer, 5000)}

TOPIC:
${limit(body.topic, 3000)}

Explain:
1. What the student misunderstood.
2. Why the correct answer is correct.
3. What concept should be remembered.
4. Give one small example.
5. Give one similar question for practice.

Use clear student-friendly language.
`;
  }


  if (task === "knowledge_map") {
    return `
Create a conceptual knowledge map from these quiz results:

${JSON.stringify(body.quizResults || [])}

Return ONLY valid JSON:

{
  "title": "Knowledge Map",
  "nodes": [
    {
      "name": "concept",
      "status": "strong"
    }
  ],
  "connections": [
    {
      "from": "concept A",
      "to": "concept B",
      "relationship": "depends on"
    }
  ]
}

Use statuses:
- strong
- developing
- weak

Base the map on the quiz performance.
`;
  }

  throw new Error("Unsupported task.");
}


/* =========================================================
   GEMINI REQUEST
   ========================================================= */

async function askGemini(prompt, apiKey, wantsJSON) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
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

        generationConfig: wantsJSON
          ? {
              responseMimeType: "application/json",
              temperature: 0.7,
              maxOutputTokens: 16000
            }
          : {
              temperature: 0.7,
              maxOutputTokens: 12000
            }
      })
    }
  );

  const raw = await response.text();

  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      `Gemini returned an invalid server response (${response.status}).`
    );
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Gemini API error (${response.status}).`;

    throw new Error(message);
  }

  const result = getGeminiText(data);

  if (!result) {
    throw new Error("Gemini returned an empty response.");
  }

  return result;
}


/* =========================================================
   VERCEL HANDLER
   ========================================================= */

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured in Vercel."
      });
    }

    const body = await getBody(req);

    const task = text(body.task);

    if (!ALLOWED_TASKS.has(task)) {
      return res.status(400).json({
        error: "Invalid task."
      });
    }

    const prompt = buildPrompt(body);

    const wantsJSON = [
      "study_pack",
      "flashcards",
      "quiz",
      "weak_topics",
      "knowledge_map"
    ].includes(task);

    const result = await askGemini(
      prompt,
      apiKey,
      wantsJSON
    );

    if (wantsJSON) {
      const parsed = parseJSON(result);

      return res.status(200).json(parsed);
    }

    return res.status(200).json({
      result,
      answer: result
    });

  } catch (error) {
    console.error("Knowvia API error:", error);

    return res.status(500).json({
      error: error?.message || "Something went wrong."
    });
  }
}
