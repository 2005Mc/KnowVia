/*
  ============================================================
  KNOWVIA AI BACKEND
  File: /api/chat.js

  Required Vercel Environment Variable:
  OPENAI_API_KEY

  IMPORTANT:
  - Never put the API key in app.js.
  - The browser talks to this serverless function.
  - This function talks to OpenAI.
  ============================================================
*/

const MODEL = "gpt-5.6-luna";

export default async function handler(req, res) {

  /* ----------------------------------------------------------
     ONLY POST REQUESTS
     ---------------------------------------------------------- */

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }


  /* ----------------------------------------------------------
     CHECK API KEY
     ---------------------------------------------------------- */

  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error:
        "OPENAI_API_KEY is not configured in Vercel."
    });
  }


  try {

    /* --------------------------------------------------------
       GET DATA FROM FRONTEND
       -------------------------------------------------------- */

    const {
      task = "",
      topic = "",
      difficulty = "beginner",
      material = "",
      question = "",
      userAnswer = "",
      quizResult = ""
    } = req.body || {};


    /* --------------------------------------------------------
       ALLOWED TASKS
       -------------------------------------------------------- */

    const validTasks = new Set([
      "summary",
      "flashcards",
      "quiz",
      "teach",
      "study_session",
      "exam",
      "ask_notes",
      "weak_topics",
      "explain_mistake"
    ]);


    if (!validTasks.has(task)) {

      return res.status(400).json({
        error:
          "Unknown Knowvia AI task."
      });

    }


    /* --------------------------------------------------------
       CLEAN INPUT
       -------------------------------------------------------- */

    const cleanTopic =
      String(topic).trim() ||
      "the uploaded study material";


    /*
      Limit material size so extremely large
      documents do not create unnecessarily
      huge API requests.
    */

    const cleanMaterial =
      String(material)
        .trim()
        .slice(0, 50000);


    const cleanQuestion =
      String(question)
        .trim()
        .slice(0, 5000);


    const cleanUserAnswer =
      String(userAnswer)
        .trim()
        .slice(0, 3000);


    const cleanQuizResult =
      String(quizResult)
        .trim()
        .slice(0, 10000);


    /* ========================================================
       DIFFICULTY INSTRUCTIONS

       IMPORTANT:
       These instructions make Beginner,
       Intermediate and Advanced genuinely different.
       ======================================================== */

    let levelRules = "";


    if (
      String(difficulty).toLowerCase() ===
      "beginner"
    ) {

      levelRules = `

BEGINNER LEVEL

The learner is new to this topic.

Your explanation must:

- Start with a clear and accurate definition.
- Explain basic terminology before using it.
- Use simple language.
- Build concepts from easiest to harder.
- Use everyday or simple technical examples.
- Avoid unnecessary advanced mathematics.
- Avoid assuming prior knowledge.
- Clearly explain what each important component does.

The learner should finish with a strong foundation.

Do NOT make the answer merely short.
Make it simple AND useful.

`;

    } else if (
      String(difficulty).toLowerCase() ===
      "intermediate"
    ) {

      levelRules = `

INTERMEDIATE LEVEL

The learner already understands the basic definition.

Do NOT repeat a beginner explanation.

Focus on:

- How the concepts work.
- Relationships between concepts.
- Comparisons.
- Practical applications.
- Examples.
- Advantages and limitations.
- Common mistakes.
- Why and when something is used.
- Moderate technical terminology.

Include more reasoning than a beginner explanation.

The learner should finish being able to explain
and apply the topic.

`;

    } else {

      levelRules = `

ADVANCED LEVEL

The learner already has a strong foundation.

Do NOT give a school-level introduction.

Focus on:

- Internal mechanisms.
- Architecture.
- Algorithms or technical processes.
- Design decisions.
- Trade-offs.
- Edge cases.
- Limitations.
- Performance considerations.
- Technical examples.
- Real-world implementation.
- Failure cases where relevant.
- Advanced comparisons.

Use technically accurate terminology.

Where relevant, include:

- formulas
- complexity
- architecture
- algorithms
- implementation considerations
- edge cases

The learner should finish being able to reason
about the topic technically.

`;

    }


    /* ========================================================
       SOURCE MATERIAL
       ======================================================== */

    let sourceInstruction = "";


    if (cleanMaterial) {

      sourceInstruction = `

SOURCE MATERIAL

The learner supplied the following material.

---------------- SOURCE START ----------------

${cleanMaterial}

---------------- SOURCE END ----------------

IMPORTANT SOURCE RULES:

1. Stay grounded in the supplied material.
2. Do not contradict the supplied material.
3. Do not pretend information is present if it is not.
4. You may add a small amount of background explanation
   when needed to make the material understandable.
5. Clearly distinguish additional explanation when useful.

`;

    } else {

      sourceInstruction = `

SOURCE MATERIAL

No notes or uploaded material were provided.

Use your subject knowledge for the topic.

`;

    }


    /* ========================================================
       TASK PROMPTS
       ======================================================== */

    let instruction = "";


    /* ========================================================
       SUMMARY
       ======================================================== */

    if (task === "summary") {

      instruction = `

You are Knowvia's expert study-content generator.

The learner wants to study:

TOPIC:
"${cleanTopic}"

DIFFICULTY:
${difficulty}

${levelRules}

${sourceInstruction}


VERY IMPORTANT:

The explanation MUST be specifically about:

"${cleanTopic}"

Do NOT produce a generic template.

For example, if the topic is "Computer",
you should actually discuss things such as:

- definition of a computer
- characteristics
- functional units
- input devices
- output devices
- CPU
- memory
- storage
- software
- applications
- advantages
- limitations

If the topic is "Machine Learning",
discuss actual Machine Learning concepts.

If the topic is "Computer Vision",
discuss actual Computer Vision concepts.

If the topic is "Python",
discuss actual Python concepts.

These are examples only.

Always adapt the content to the ACTUAL topic.


Do NOT repeatedly use meaningless phrases such as:

"basic idea"

"important terms"

"main components"

unless you immediately name the actual
topic-specific concepts.


The three difficulty levels must be substantially different.


Use the following structure:

# ${cleanTopic} — ${difficulty}


## 1. What is ${cleanTopic}?

Give a precise explanation.


## 2. Core Concepts

Give 5–8 REAL concepts related to the topic.

Explain each concept clearly.


## 3. How It Works / Structure

Explain the actual process, architecture,
working or structure when applicable.


## 4. Example

Give at least one concrete example.


## 5. Applications

Give 3–5 real applications.


## 6. Advantages and Limitations

Give relevant points.


## 7. Common Mistakes

Give 3–5 realistic misconceptions or mistakes.


## 8. Quick Revision

Give 5–10 exam-ready points.


If a heading does not make sense for this topic,
replace it with a more useful topic-specific heading.

Do NOT pad the response with generic sentences.

`;


    }


    /* ========================================================
       FLASHCARDS
       ======================================================== */

    if (task === "flashcards") {

      instruction = `

You are Knowvia's expert flashcard generator.

Create 10 high-quality flashcards for:

"${cleanTopic}"

Difficulty:
${difficulty}

${levelRules}

${sourceInstruction}


IMPORTANT:

Every flashcard must test an ACTUAL concept
from "${cleanTopic}".

Do NOT create generic questions such as:

"What is the basic idea?"

"What are important terms?"

"What are the main concepts?"

Instead ask specific questions.

Examples:

For Computer:
"What is the function of the ALU?"

For Machine Learning:
"What is overfitting and how can it be reduced?"

For Computer Vision:
"Why is Gaussian smoothing used before edge detection?"

For Python:
"What is the difference between a list and a tuple?"

Adapt everything to the actual topic.


Return ONLY valid JSON.

Do NOT use Markdown.

Use exactly this structure:

[
  {
    "question": "specific question",
    "answer": "accurate answer",
    "hint": "short memory hint"
  }
]

Create exactly 10 flashcards.

Make the questions useful for revision.

`;


    }


    /* ========================================================
       QUIZ
       ======================================================== */

    if (task === "quiz") {

      instruction = `

You are Knowvia's expert quiz generator.

Create 10 multiple-choice questions
about:

"${cleanTopic}"

Difficulty:
${difficulty}

${levelRules}

${sourceInstruction}


The questions must be SPECIFIC to the topic.

Include a mixture of:

- concept understanding
- application
- comparison
- reasoning
- common misconceptions

Beginner:
Use accessible questions testing foundations.

Intermediate:
Test mechanisms, relationships and applications.

Advanced:
Test technical reasoning, trade-offs,
implementation and edge cases where appropriate.


Return ONLY valid JSON.

Do NOT use Markdown.

Use exactly:

[
  {
    "question": "question text",
    "options": [
      "option A",
      "option B",
      "option C",
      "option D"
    ],
    "correctAnswer": 0
  }
]

Rules:

- Exactly 4 options.
- Exactly one correct answer.
- correctAnswer is zero-based.
- Make distractors plausible.
- Do not make the correct answer obvious from length.
- Create exactly 10 questions.

`;


    }


    /* ========================================================
       TEACH ME
       ======================================================== */

    if (task === "teach") {

      instruction = `

You are Knowvia's personal AI teacher.

Teach:

"${cleanTopic}"

Difficulty:
${difficulty}

${levelRules}

${sourceInstruction}


Do NOT simply provide a summary.

Teach the learner step-by-step.

Use this structure:

# Let's Learn ${cleanTopic}


## Step 1 — Start Here

Explain the foundation.


## Step 2 — Build the Idea

Explain the next concepts logically.


## Step 3 — Understand How It Works

Explain the actual process or relationship.


## Step 4 — Example

Give a concrete example.


## Step 5 — Common Confusion

Explain things students commonly misunderstand.


## Step 6 — Check Your Understanding

Ask 3 short questions.

Do not provide the answers immediately.


## Step 7 — 60-Second Recap

Give a concise recap.

Be friendly, patient and educational.

`;


    }


    /* ========================================================
       STUDY SESSION
       ======================================================== */

    if (task === "study_session") {

      instruction = `

Create a focused study session for:

"${cleanTopic}"

Difficulty:
${difficulty}

${levelRules}

${sourceInstruction}


Design a 30–45 minute study session.

Use:

## 1. 5-Minute Recall

Tell the learner what to recall.


## 2. Learn the Core Concepts

Give the most important concepts.


## 3. Active Practice

Give practical exercises or questions.


## 4. Self-Test

Give 5 questions.


## 5. Final Revision

Give a short checklist.


## 6. What To Study Next

Suggest the logical next concept.

Make every activity specific to the topic.

Do not give generic study advice.

`;


    }


    /* ========================================================
       EXAM MODE
       ======================================================== */

    if (task === "exam") {

      instruction = `

Create an exam-oriented preparation pack
for:

"${cleanTopic}"

Difficulty:
${difficulty}

${levelRules}

${sourceInstruction}


Use this structure:

# Exam Mode — ${cleanTopic}


## Most Important Areas

List the highest-priority concepts.


## Important Short Questions

Give 5 likely short-answer questions.


## Important Long Questions

Give 3 likely long-answer questions.


## Application / Reasoning Questions

Give 3 questions requiring understanding.


## How To Write High-Scoring Answers

Explain what students should include
when answering this particular topic.


## Last-Minute Revision

Give 10 topic-specific points.

Do not give generic exam motivation.

`;


    }


    /* ========================================================
       ASK MY NOTES
       ======================================================== */

    if (task === "ask_notes") {

      instruction = `

You are Knowvia's "Ask My Notes" tutor.

Topic:
"${cleanTopic}"

Difficulty:
${difficulty}

${sourceInstruction}


LEARNER'S QUESTION:

${cleanQuestion}


Answer the exact question.

Rules:

1. Give the direct answer first.
2. Explain it clearly.
3. Use the supplied material whenever possible.
4. If the material does not contain the answer,
   say that clearly.
5. You may then provide a general explanation.
6. Never pretend the notes contain information
   that they do not contain.
7. Use examples when useful.

`;

    }


    /* ========================================================
       WEAK TOPIC DETECTOR
       ======================================================== */

    if (task === "weak_topics") {

      instruction = `

You are Knowvia's learning-performance analyst.

Topic:
"${cleanTopic}"

Difficulty:
${difficulty}

${sourceInstruction}


LEARNER PERFORMANCE:

${cleanQuizResult}


Analyze the learner's performance.

Use:

## Weak Areas

Rank the likely weak areas.


## Evidence

Explain why each area appears weak
based only on the supplied performance.


## Repair Plan

Give a targeted study plan.


## Targeted Practice

Give 5 questions focused on
the weakest area.


## Priority

Tell the learner what to study first.

IMPORTANT:

Do not invent scores.

If the performance data is insufficient,
say exactly what cannot be concluded.

`;

    }


    /* ========================================================
       EXPLAIN MY MISTAKE
       ======================================================== */

    if (task === "explain_mistake") {

      instruction = `

You are Knowvia's patient mistake-explanation tutor.

Topic:
"${cleanTopic}"

Difficulty:
${difficulty}

${sourceInstruction}


QUESTION:

${cleanQuestion}


LEARNER'S ANSWER:

${cleanUserAnswer}


CORRECT ANSWER:

${cleanQuizResult}


Explain the mistake clearly.

Use:

## What The Question Was Testing

Explain the concept.


## Why Your Answer Was Wrong

Explain the exact problem.


## Why The Correct Answer Is Correct

Give the reasoning.


## Possible Misconception

Explain what misunderstanding
may have caused the mistake.


## Easy Memory Trick

Give a memorable way to remember it.


## Try Again

Give one similar practice question.

Do not shame the learner.

Make the explanation specific
to the actual question.

`;

    }


    /* ========================================================
       SAFETY CHECK
       ======================================================== */

    if (!instruction.trim()) {

      return res.status(400).json({
        error:
          "Could not create an AI instruction."
      });

    }


    /* ========================================================
       OPENAI REQUEST
       ======================================================== */

    const openAIResponse =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${apiKey}`
          },

          body: JSON.stringify({

            model: MODEL,

            input: instruction

          })
        }
      );


    /* ========================================================
       READ OPENAI RESPONSE
       ======================================================== */

    const data =
      await openAIResponse.json();


    /* ========================================================
       HANDLE OPENAI ERROR
       ======================================================== */

    if (!openAIResponse.ok) {

      const message =
        data?.error?.message ||
        "OpenAI API request failed.";

      console.error(
        "OpenAI error:",
        data
      );

      return res
        .status(
          openAIResponse.status
        )
        .json({
          error: message
        });

    }


    /* ========================================================
       EXTRACT TEXT
       ======================================================== */

    let answer =
      data.output_text ||
      "";


    /*
      Fallback extraction for Responses API
    */

    if (
      !answer &&
      Array.isArray(
        data.output
      )
    ) {

      answer =
        data.output

          .flatMap(
            item =>
              item.content || []
          )

          .filter(
            item =>
              item.type ===
              "output_text"
          )

          .map(
            item =>
              item.text
          )

          .join("\n");

    }


    /* ========================================================
       EMPTY RESPONSE
       ======================================================== */

    if (!answer) {

      console.error(
        "OpenAI returned no text:",
        data
      );

      return res.status(502).json({
        error:
          "OpenAI returned no text."
      });

    }


    /* ========================================================
       SUCCESS
       ======================================================== */

    return res.status(200).json({

      success: true,

      task,

      answer

    });


  } catch (error) {

    console.error(
      "Knowvia API error:",
      error
    );


    return res.status(500).json({

      error:
        error.message ||
        "Unexpected Knowvia server error."

    });

  }

}
