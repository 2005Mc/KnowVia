const MODEL = "gpt-5.6-luna";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not configured in Vercel."
    });
  }

  try {
    const {
      task,
      topic = "",
      difficulty = "beginner",
      material = "",
      question = "",
      userAnswer = "",
      quizResult = ""
    } = req.body || {};

    const allowedTasks = [
      "summary",
      "flashcards",
      "quiz",
      "teach",
      "study_session",
      "exam",
      "ask_notes",
      "weak_topics",
      "explain_mistake"
    ];

    if (!allowedTasks.includes(task)) {
      return res.status(400).json({
        error: "Invalid task."
      });
    }

    const cleanTopic =
      String(topic).trim() || "the study topic";

    const cleanMaterial =
      String(material).trim().slice(0, 50000);

    const cleanQuestion =
      String(question).trim();

    const cleanUserAnswer =
      String(userAnswer).trim();

    const cleanQuizResult =
      String(quizResult).trim();

    /* ---------------- DIFFICULTY ---------------- */

    let level = "";

    if (difficulty.toLowerCase() === "beginner") {
      level = `
The student is a beginner.

Use very simple language.
Explain basic terms before using them.
Start from the foundation.
Use simple examples.
Do not assume previous knowledge.
`;
    } else if (difficulty.toLowerCase() === "intermediate") {
      level = `
The student knows the basics.

Do not give only a beginner explanation.
Focus on how things work, relationships,
examples, applications, advantages,
limitations and common mistakes.
`;
    } else {
      level = `
The student has strong knowledge.

Do not give a basic school-level explanation.
Focus on technical details, internal working,
algorithms, architecture, implementation,
trade-offs, limitations and advanced examples.
`;
    }

    /* ---------------- MATERIAL ---------------- */

    let source = "";

    if (cleanMaterial) {
      source = `
The following are the student's study materials:

--- MATERIAL START ---
${cleanMaterial}
--- MATERIAL END ---

Use these materials as the main source.
Do not invent information that is not supported
by the material.
`;
    } else {
      source = `
No study material was provided.
Use your knowledge about the requested topic.
`;
    }

    /* ==================================================
       SUMMARY
       ================================================== */

    let prompt = "";

    if (task === "summary") {
      prompt = `
You are Knowvia, an AI study assistant.

Topic: ${cleanTopic}
Difficulty: ${difficulty}

${level}

${source}

Create a useful topic-specific study explanation.

IMPORTANT:
Do NOT use generic placeholders such as:
"important terms"
"main components"
"basic idea"

Actually name the concepts belonging to the topic.

For example, if the topic is Computer,
talk about CPU, ALU, memory, input devices,
output devices, storage, software, etc.

If the topic is Machine Learning,
talk about actual Machine Learning concepts.

Use this structure:

# ${cleanTopic}

## What is ${cleanTopic}?
Give a clear definition.

## Core Concepts
Explain 5–8 real concepts.

## How It Works
Explain the actual working or structure.

## Example
Give a clear example.

## Applications
Give real applications.

## Advantages and Limitations
Give relevant points.

## Common Mistakes
Give realistic student mistakes.

## Quick Revision
Give 5–10 important points.

Make the content genuinely different for
Beginner, Intermediate and Advanced levels.
`;
    }

    /* ==================================================
       FLASHCARDS
       ================================================== */

    if (task === "flashcards") {
      prompt = `
You are Knowvia's flashcard generator.

Topic: ${cleanTopic}
Difficulty: ${difficulty}

${level}

${source}

Create exactly 10 useful flashcards.

Every question must be specifically about
${cleanTopic}.

Do NOT create generic questions.

Return ONLY valid JSON.

[
  {
    "question": "specific question",
    "answer": "accurate answer",
    "hint": "short memory hint"
  }
]
`;
    }

    /* ==================================================
       QUIZ
       ================================================== */

    if (task === "quiz") {
      prompt = `
You are Knowvia's quiz generator.

Topic: ${cleanTopic}
Difficulty: ${difficulty}

${level}

${source}

Create exactly 10 multiple-choice questions.

Questions must be specifically about
${cleanTopic}.

Include:
- concept questions
- application questions
- reasoning questions
- common misconceptions

Return ONLY valid JSON.

[
  {
    "question": "question",
    "options": [
      "option 1",
      "option 2",
      "option 3",
      "option 4"
    ],
    "correctAnswer": 0
  }
]

Rules:
- Exactly 4 options.
- Only one correct answer.
- correctAnswer must be 0, 1, 2 or 3.
`;
    }

    /* ==================================================
       TEACH ME
       ================================================== */

    if (task === "teach") {
      prompt = `
You are Knowvia's personal AI teacher.

Teach the student:

${cleanTopic}

Difficulty: ${difficulty}

${level}

${source}

Do not simply give a summary.

Teach step-by-step.

Use:

# Let's Learn ${cleanTopic}

## Step 1 — Start Here
Explain the foundation.

## Step 2 — Build the Idea
Explain the important concepts.

## Step 3 — How It Works
Explain the actual working.

## Step 4 — Example
Give a simple example.

## Step 5 — Common Confusion
Explain common misunderstandings.

## Step 6 — Check Your Understanding
Ask 3 short questions.

## Step 7 — Quick Recap
Give a short revision.
`;
    }

    /* ==================================================
       STUDY SESSION
       ================================================== */

    if (task === "study_session") {
      prompt = `
Create a 30–45 minute study session for:

${cleanTopic}

Difficulty: ${difficulty}

${level}

${source}

Use:

# Study Session — ${cleanTopic}

## 1. Quick Recall
Give things to remember.

## 2. Learn
Teach the most important concepts.

## 3. Practice
Give topic-specific practice.

## 4. Self-Test
Give 5 questions.

## 5. Final Revision
Give a checklist.

## 6. What To Study Next
Suggest the next logical concept.

Do not give generic study advice.
`;
    }

    /* ==================================================
       EXAM MODE
       ================================================== */

    if (task === "exam") {
      prompt = `
Create an exam preparation pack for:

${cleanTopic}

Difficulty: ${difficulty}

${level}

${source}

Use:

# Exam Mode — ${cleanTopic}

## Most Important Areas
List the important concepts.

## Short Questions
Give 5 important questions.

## Long Questions
Give 3 important questions.

## Application Questions
Give 3 reasoning/application questions.

## How To Write Answers
Explain how to answer this topic well.

## Last-Minute Revision
Give 10 important points.

Keep everything specific to ${cleanTopic}.
`;
    }

    /* ==================================================
       ASK MY NOTES
       ================================================== */

    if (task === "ask_notes") {
      prompt = `
You are Knowvia's Ask My Notes tutor.

Topic:
${cleanTopic}

Student question:
${cleanQuestion}

${source}

Answer the student's exact question.

Rules:
1. Give the direct answer first.
2. Explain clearly.
3. Use the student's material when possible.
4. If the answer is not in the material,
   clearly say that.
5. Then provide a general explanation if useful.
`;
    }

    /* ==================================================
       WEAK TOPIC DETECTOR
       ================================================== */

    if (task === "weak_topics") {
      prompt = `
You are Knowvia's learning-performance analyst.

Topic:
${cleanTopic}

Student quiz performance:
${cleanQuizResult}

${source}

Analyze the student's performance.

Use:

## Weak Areas
Rank the weak areas.

## Evidence
Explain why they appear weak.

## Repair Plan
Give a targeted study plan.

## Targeted Practice
Give 5 questions for the weakest area.

## Priority
Tell the student what to study first.

Do not invent scores or information.
`;
    }

    /* ==================================================
       EXPLAIN MY MISTAKE
       ================================================== */

    if (task === "explain_mistake") {
      prompt = `
You are Knowvia's mistake-explanation tutor.

Topic:
${cleanTopic}

Question:
${cleanQuestion}

Student's Answer:
${cleanUserAnswer}

Correct Answer:
${cleanQuizResult}

${source}

Explain the mistake clearly.

Use:

## What The Question Was Testing

## Why Your Answer Was Wrong

## Why The Correct Answer Is Correct

## Possible Misconception

## Easy Memory Trick

## Try Again

Give one similar practice question.

Be encouraging and specific.
`;
    }

    /* ==================================================
       OPENAI
       ================================================== */

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
          input: prompt
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI Error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenAI request failed."
      });
    }

    let answer = data.output_text || "";

    if (!answer && Array.isArray(data.output)) {
      answer = data.output
        .flatMap(item => item.content || [])
        .filter(item => item.type === "output_text")
        .map(item => item.text)
        .join("\n");
    }

    if (!answer) {
      return res.status(500).json({
        error: "OpenAI returned an empty response."
      });
    }

    return res.status(200).json({
      success: true,
      task: task,
      answer: answer
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      error:
        error.message ||
        "Something went wrong on the server."
    });
  }
}
