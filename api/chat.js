const MODEL = "gemini-3.7-flash";

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const JSON_TASKS = new Set([
  "study_pack",
  "quiz",
  "weak_topics",
  "knowledge_map"
]);

function clean(value) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim();
}

function extractText(data) {

  const parts =
    data?.candidates?.[0]?.content?.parts;

  if (Array.isArray(parts)) {

    const text =
      parts
        .map(p => p?.text || "")
        .join("\n")
        .trim();

    if (text) return text;
  }

  if (typeof data?.text === "string") {
    return data.text.trim();
  }

  return "";
}

function extractJSON(text) {

  let s =
    clean(text)
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

  try {
    return JSON.parse(s);
  } catch {}

  const firstObject =
    s.indexOf("{");

  const firstArray =
    s.indexOf("[");

  let start = -1;

  if (
    firstObject >= 0 &&
    firstArray >= 0
  ) {
    start =
      Math.min(
        firstObject,
        firstArray
      );
  } else {

    start =
      firstObject >= 0
        ? firstObject
        : firstArray;
  }

  if (start < 0) {
    throw new Error(
      "Gemini did not return valid JSON."
    );
  }

  const opening =
    s[start];

  const closing =
    opening === "{"
      ? "}"
      : "]";

  let depth = 0;

  let inString = false;

  let escaped = false;

  for (
    let i = start;
    i < s.length;
    i++
  ) {

    const c = s[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (c === "\\") {
      escaped = true;
      continue;
    }

    if (c === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (c === opening) {
      depth++;
    }

    if (c === closing) {

      depth--;

      if (depth === 0) {

        try {
          return JSON.parse(
            s.slice(
              start,
              i + 1
            )
          );
        } catch {}
      }
    }
  }

  throw new Error(
    "Gemini returned malformed JSON."
  );
}

function difficultyText(level) {

  const d =
    clean(level).toLowerCase();

  if (
    d.includes("beginner") ||
    d.includes("easy")
  ) {
    return "easy";
  }

  if (
    d.includes("advanced") ||
    d.includes("hard")
  ) {
    return "hard";
  }

  return "medium";
}

function difficultyInstruction(level) {

  const d =
    difficultyText(level);

  if (d === "easy") {

    return "Use very simple beginner-friendly language, basic concepts and simple examples.";
  }

  if (d === "hard") {

    return "Use deep technical detail, mechanisms, relationships, limitations, applications and exam-level reasoning.";
  }

  return "Use moderate technical depth, important terminology, examples, applications and exam-relevant reasoning.";
}

function studyPackPrompt(
  material,
  difficulty,
  questionStyle
) {

  return `You are Knowvia, an AI study assistant.

SOURCE MATERIAL:
${material}

DIFFICULTY:
${difficultyInstruction(difficulty)}

QUESTION STYLE:
${questionStyle || "Mixed"}

Create a complete study pack. The difficulty must genuinely change the depth of the explanation.

Return ONLY JSON in exactly this structure:

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
    "comparison": ["string"],
    "importantExamPoints": ["string"],
    "quickRevision": ["string"]
  },

  "flashcards": [
    {
      "question":"string",
      "answer":"string"
    }
  ],

  "quiz": [
    {
      "question":"string",
      "options":[
        "string",
        "string",
        "string",
        "string"
      ],
      "correctAnswer":0,
      "explanation":"string"
    }
  ]
}

Rules:

- exactly 10 flashcards
- exactly 10 MCQs
- exactly 4 options per MCQ
- exactly one correct answer
- correctAnswer is 0,1,2,or 3
- every MCQ has an explanation
- avoid duplicate questions
- base everything on the source material and established facts needed to explain it
- do not invent unsupported details
- return JSON only.`;
}

function quizPrompt(
  material,
  difficulty,
  questionStyle,
  focusTopics = ""
) {

  return `You are Knowvia's quiz generator.

STUDY MATERIAL:
${material}

DIFFICULTY:
${difficultyInstruction(difficulty)}

QUESTION STYLE:
${questionStyle || "Mixed"}

${
  focusTopics
    ? `FOCUS ON THESE WEAK TOPICS:
${focusTopics}`
    : ""
}

Return ONLY JSON as:

{
  "quiz":[
    {
      "question":"string",
      "options":[
        "string",
        "string",
        "string",
        "string"
      ],
      "correctAnswer":0,
      "explanation":"string"
    }
  ]
}

Create exactly 10 non-repetitive questions, exactly 4 options each, exactly one correct answer, with an explanation for every question.`;
}

function weakTopicsPrompt(
  material,
  wrongQuestions
) {

  return `You are Knowvia's Weak Topic Detector.

STUDY MATERIAL:
${material}

WRONG QUESTIONS:
${JSON.stringify(
  wrongQuestions,
  null,
  2
)}

Return ONLY JSON:

{
  "weakTopics":[
    {
      "topic":"string",
      "reason":"string"
    }
  ]
}

Use evidence from the material and wrong questions. Do not invent unrelated topics.`;
}

function knowledgeMapPrompt(material) {

  return `You are Knowvia's Knowledge Map generator.

STUDY MATERIAL:
${material}

Return ONLY JSON:

{
  "knowledgeMap":[
    {
      "topic":"string",
      "relatedTo":["string"],
      "description":"string"
    }
  ]
}

Include the central topic, major concepts, relationships and supporting concepts.`;
}

function textPrompt(task, body) {

  const material =
    clean(body.material);

  const topic =
    clean(body.topic) ||
    "the current study topic";

  const difficulty =
    difficultyInstruction(
      body.difficulty
    );

  if (task === "teach") {

    return `You are Knowvia's Teach Me tutor.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

STUDY MATERIAL:
${material}

Teach progressively:

1. Basic idea
2. Build understanding
3. Important concepts
4. Connect concepts
5. Examples
6. Quick check question
7. Reasoning
8. Exam takeaways

Do not merely copy the notes. Use clear headings.`;
  }

  if (task === "study_session") {

    return `You are Knowvia's Study Session coach.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

STUDY MATERIAL:
${material}

Create a practical progressive session with:

1. LEARN
2. RECALL
3. PRACTICE
4. REVIEW
5. FINAL CHECK

Tell the student what to do at each stage.`;
  }

  if (task === "exam") {

    return `You are Knowvia's Exam Mode tutor.

TOPIC:
${topic}

DIFFICULTY:
${difficulty}

QUESTION STYLE:
${clean(body.questionStyle) || "Mixed"}

STUDY MATERIAL:
${material}

Create:

1. High-priority concepts
2. Important exam areas
3. Likely question areas
4. Short-answer practice
5. Conceptual questions
6. Application questions
7. Reasoning questions
8. Common mistakes
9. Final revision checklist

Match the selected difficulty and do not merely copy the material.`;
  }

  if (task === "ask_notes") {

    return `You are Knowvia's Ask My Notes assistant.

NOTES:
${material}

QUESTION:
${clean(body.question)}

Answer using the notes. Prefer information explicitly present. If the notes do not contain enough information, say so clearly.`;
  }

  if (task === "explain_mistake") {

    return `You are Knowvia's mistake explanation tutor.

STUDY MATERIAL:
${material}

QUESTION:
${clean(body.question)}

STUDENT ANSWER:
${clean(body.selectedAnswer)}

CORRECT ANSWER:
${clean(body.correctAnswer)}

Explain:

1. what the question tests
2. what the student misunderstood
3. why the correct answer is correct
4. the concept to remember
5. how to avoid the same mistake

Be encouraging and concise.`;
  }

  return `You are Knowvia. Explain this topic clearly.

TOPIC:
${topic}

STUDY MATERIAL:
${material}`;
}

function normalizeStudyPack(pack) {

  if (
    !pack ||
    typeof pack !== "object"
  ) {
    throw new Error(
      "Invalid study pack."
    );
  }

  const sm =
    pack.studyMatter || {};

  const arrayFields = [
    "keyConcepts",
    "types",
    "components",
    "characteristics",
    "examples",
    "applications",
    "advantages",
    "limitations",
    "comparison",
    "importantExamPoints",
    "quickRevision"
  ];

  for (
    const f of arrayFields
  ) {

    if (
      !Array.isArray(sm[f])
    ) {

      sm[f] =
        sm[f]
          ? [String(sm[f])]
          : [];
    }
  }

  const flashcards =
    Array.isArray(pack.flashcards)
      ? pack.flashcards
      : [];

  const quiz =
    Array.isArray(pack.quiz)
      ? pack.quiz
      : [];

  if (
    flashcards.length !== 10
  ) {

    throw new Error(
      `Gemini returned ${flashcards.length} flashcards instead of 10.`
    );
  }

  if (
    quiz.length !== 10
  ) {

    throw new Error(
      `Gemini returned ${quiz.length} quiz questions instead of 10.`
    );
  }

  flashcards.forEach(
    (c, i) => {

      if (
        !clean(c?.question) ||
        !clean(c?.answer)
      ) {

        throw new Error(
          `Flashcard ${i + 1} is incomplete.`
        );
      }
    }
  );

  quiz.forEach(
    (q, i) => {

      if (
        !clean(q?.question) ||
        !Array.isArray(q.options) ||
        q.options.length !== 4
      ) {

        throw new Error(
          `Quiz question ${i + 1} is invalid.`
        );
      }

      if (
        ![0,1,2,3].includes(
          Number(q.correctAnswer)
        )
      ) {

        throw new Error(
          `Quiz question ${i + 1} has an invalid answer.`
        );
      }

      if (
        !clean(q.explanation)
      ) {

        throw new Error(
          `Quiz question ${i + 1} has no explanation.`
        );
      }
    }
  );

  return {
    studyMatter: sm,
    flashcards,
    quiz
  };
}

async function callGemini(
  prompt,
  jsonMode = false
) {

  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {

    throw new Error(
      "GEMINI_API_KEY is missing in Vercel Environment Variables."
    );
  }

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

      temperature: 0.35,

      maxOutputTokens:
        jsonMode
          ? 16000
          : 10000
    }
  };

  if (jsonMode) {

    body.generationConfig.responseMimeType =
      "application/json";
  }

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
          JSON.stringify(body)
      }
    );

  const raw =
    await response.text();

  let data = {};

  try {

    data =
      JSON.parse(raw);

  } catch {

    throw new Error(
      `Gemini returned a non-JSON response (${response.status}).`
    );
  }

  if (!response.ok) {

    throw new Error(
      data?.error?.message ||
      `Gemini request failed with status ${response.status}.`
    );
  }

  const text =
    extractText(data);

  if (!text) {

    throw new Error(
      "Gemini returned no readable text."
    );
  }

  return text;
}

module.exports =
  async function handler(
    req,
    res
  ) {

    if (
      req.method !== "POST"
    ) {

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

      if (
        task === "study_pack"
      ) {

        const material =
          clean(
            body.material ||
            body.topic
          );

        if (!material) {

          return res
            .status(400)
            .json({
              error:
                "Study material is required."
            });
        }

        const text =
          await callGemini(
            studyPackPrompt(
              material,
              body.difficulty,
              body.questionStyle
            ),
            true
          );

        return res
          .status(200)
          .json({
            result:
              normalizeStudyPack(
                extractJSON(text)
              )
          });
      }

      if (
        task === "quiz"
      ) {

        const text =
          await callGemini(
            quizPrompt(
              body.material,
              body.difficulty,
              body.questionStyle,
              body.focusTopics
            ),
            true
          );

        const parsed =
          extractJSON(text);

        const quiz =
          Array.isArray(parsed)
            ? parsed
            : parsed.quiz;

        if (
          !Array.isArray(quiz) ||
          quiz.length !== 10
        ) {

          throw new Error(
            "Gemini did not return exactly 10 quiz questions."
          );
        }

        quiz.forEach(
          (q, i) => {

            if (
              !Array.isArray(q.options) ||
              q.options.length !== 4
            ) {

              throw new Error(
                `Quiz question ${i + 1} must have 4 options.`
              );
            }

            if (
              ![0,1,2,3].includes(
                Number(q.correctAnswer)
              )
            ) {

              throw new Error(
                `Quiz question ${i + 1} has an invalid answer.`
              );
            }
          }
        );

        return res
          .status(200)
          .json({
            result: quiz
          });
      }

      if (
        task === "weak_topics"
      ) {

        const text =
          await callGemini(
            weakTopicsPrompt(
              body.material,
              body.wrongQuestions || []
            ),
            true
          );

        return res
          .status(200)
          .json({
            result:
              extractJSON(text)
          });
      }

      if (
        task === "knowledge_map"
      ) {

        const text =
          await callGemini(
            knowledgeMapPrompt(
              body.material
            ),
            true
          );

        return res
          .status(200)
          .json({
            result:
              extractJSON(text)
          });
      }

      if (
        [
          "teach",
          "study_session",
          "exam",
          "ask_notes",
          "explain_mistake"
        ].includes(task)
      ) {

        const answer =
          await callGemini(
            textPrompt(
              task,
              body
            ),
            false
          );

        return res
          .status(200)
          .json({
            answer,
            result: answer
          });
      }

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
