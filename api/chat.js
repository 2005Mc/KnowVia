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

        const body = req.body || {};

        let task = String(
            body.task || ""
        ).trim().toLowerCase();

        const topic = String(
            body.topic || ""
        ).trim();

        const difficulty = String(
            body.difficulty || "beginner"
        ).trim().toLowerCase();

        const material = String(
            body.material || ""
        ).trim().slice(0, 50000);

        const question = String(
            body.question || ""
        ).trim();

        const userAnswer = String(
            body.userAnswer || ""
        ).trim();

        const quizResult = String(
            body.quizResult || ""
        ).trim();

        const quizStyle = String(
            body.quizStyle || "mixed"
        ).trim().toLowerCase();


        /* =====================================================
           TASK ALIASES
        ===================================================== */

        const taskAliases = {

            "summary": "summary",
            "summarize": "summary",
            "summarise": "summary",
            "generate_summary": "summary",
            "generate-summary": "summary",

            "flashcard": "flashcards",
            "flashcards": "flashcards",
            "generate_flashcards": "flashcards",
            "generate-flashcards": "flashcards",

            "quiz": "quiz",
            "generate_quiz": "quiz",
            "generate-quiz": "quiz",

            "study_pack": "study_pack",
            "study-pack": "study_pack",
            "studypack": "study_pack",
            "generate_study_pack": "study_pack",
            "generate-study-pack": "study_pack",

            "teach": "teach",
            "teach_me": "teach",
            "teach-me": "teach",

            "study_session": "study_session",
            "study-session": "study_session",
            "studysession": "study_session",

            "exam": "exam",
            "exam_mode": "exam",
            "exam-mode": "exam",

            "ask_notes": "ask_notes",
            "ask-notes": "ask_notes",
            "ask_my_notes": "ask_notes",
            "ask-my-notes": "ask_notes",

            "weak_topics": "weak_topics",
            "weak-topics": "weak_topics",
            "weak_topic_detector": "weak_topics",

            "explain_mistake": "explain_mistake",
            "explain-mistake": "explain_mistake",
            "mistake": "explain_mistake",

            "knowledge_map": "knowledge_map",
            "knowledge-map": "knowledge_map",
            "knowledge": "knowledge_map"
        };

        task = taskAliases[task] || task;


        /* =====================================================
           ALLOWED TASKS
        ===================================================== */

        const allowedTasks = [

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

        ];


        if (!allowedTasks.includes(task)) {

            console.error(
                "Invalid task received:",
                body.task
            );

            return res.status(400).json({

                error:
                    `Invalid task: ${
                        body.task || "missing task"
                    }`

            });
        }


        /* =====================================================
           TOPIC
        ===================================================== */

        const cleanTopic =
            topic ||
            "the requested study topic";


        /* =====================================================
           DIFFICULTY
        ===================================================== */

        let level = "";


        if (difficulty === "beginner") {

            level = `

The student is a beginner.

Use very simple language.

Explain basic terms before using them.

Start from the foundation.

Use simple examples.

Do not assume previous knowledge.

Avoid unnecessary technical jargon.

`;

        }

        else if (difficulty === "intermediate") {

            level = `

The student understands the basics.

Do not give only a beginner explanation.

Focus on:

- how things work
- relationships between concepts
- examples
- applications
- advantages
- limitations
- common mistakes
- practical understanding

`;

        }

        else {

            level = `

The student has strong knowledge.

Do NOT give a basic school-level explanation.

Focus on:

- technical details
- internal working
- algorithms
- architecture
- implementation
- trade-offs
- limitations
- advanced examples
- reasoning

`;

        }


        /* =====================================================
           STUDY MATERIAL
        ===================================================== */

        let source = "";


        if (material) {

            source = `

The following material was provided by the student:

--- MATERIAL START ---

${material}

--- MATERIAL END ---

Use this material as the main source.

Stay faithful to the material.

Do not invent facts that contradict the material.

`;

        }

        else {

            source = `

No study material was uploaded.

Use your general knowledge about the requested topic.

`;

        }


        /* =====================================================
           PROMPT
        ===================================================== */

        let prompt = "";


        /* =====================================================
           STUDY PACK
           THIS IS THE IMPORTANT FIX
        ===================================================== */

        if (task === "study_pack") {

            prompt = `

You are Knowvia, an advanced AI study assistant.

The student wants to study:

TOPIC:
${cleanTopic}

DIFFICULTY:
${difficulty}

QUESTION STYLE:
${quizStyle}

${level}

${source}

Create ONE complete study pack containing:

1. Summary
2. Flashcards
3. Quiz

The content must be genuinely specific to:

${cleanTopic}

Do NOT create generic placeholder content.

For example, if the topic is "Computer", discuss
CPU, ALU, Control Unit, RAM, ROM, storage,
input devices, output devices, software, etc.

If the topic is "Machine Learning", discuss
supervised learning, unsupervised learning,
classification, regression, training data,
testing data, features, labels, overfitting, etc.

The difficulty must meaningfully change the depth.

BEGINNER:
Explain foundations simply.

INTERMEDIATE:
Explain relationships, working, applications,
advantages, limitations and common mistakes.

ADVANCED:
Explain technical details, algorithms,
architecture, implementation and trade-offs.


==================================================
SUMMARY
==================================================

Create a detailed topic-specific summary.

Include:

- What is the topic?
- Core Concepts
- How It Works
- Example
- Applications
- Advantages
- Limitations
- Common Mistakes
- Quick Revision


==================================================
FLASHCARDS
==================================================

Create EXACTLY 10 flashcards.

Every flashcard must be specifically about
${cleanTopic}.

Each flashcard must contain:

question
answer
hint


==================================================
QUIZ
==================================================

Create EXACTLY 10 multiple-choice questions.

Each question must contain:

question
options
correctAnswer

There must be exactly 4 options.

correctAnswer must be:

0, 1, 2, or 3

Use a mixture of:

- concept questions
- understanding questions
- application questions
- reasoning questions
- misconception questions


==================================================
VERY IMPORTANT OUTPUT RULE
==================================================

Return ONLY valid JSON.

Do NOT use markdown.

Do NOT write anything before the JSON.

Do NOT write anything after the JSON.

Use exactly this structure:

{
    "summary": "complete summary text",
    "flashcards": [
        {
            "question": "question",
            "answer": "answer",
            "hint": "hint"
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
            "correctAnswer": 0
        }
    ]
}

Rules:

- Exactly 10 flashcards.
- Exactly 10 quiz questions.
- Exactly 4 options per quiz question.
- Only one correct answer.
- correctAnswer must be 0, 1, 2 or 3.
- Do not make all correct answers the same position.
- All content must be specific to ${cleanTopic}.
- Do not use placeholder phrases.
- Return valid JSON only.

`;

        }


        /* =====================================================
           SUMMARY
        ===================================================== */

        else if (task === "summary") {

            prompt = `

You are Knowvia, an AI study assistant.

The student wants to learn:

TOPIC:
${cleanTopic}

DIFFICULTY:
${difficulty}

${level}

${source}

Create a genuinely useful topic-specific study explanation.

Do NOT use generic placeholders.

Use:

# ${cleanTopic}

## What is ${cleanTopic}?

## Core Concepts

Explain 5–8 real concepts.

## How It Works

## Example

## Applications

## Advantages

## Limitations

## Common Mistakes

## Quick Revision

Make the explanation genuinely different for
Beginner, Intermediate and Advanced levels.

`;

        }


        /* =====================================================
           FLASHCARDS
        ===================================================== */

        else if (task === "flashcards") {

            prompt = `

You are Knowvia's AI flashcard generator.

Topic:
${cleanTopic}

Difficulty:
${difficulty}

${level}

${source}

Create EXACTLY 10 useful flashcards.

Every question must be specifically related to:

${cleanTopic}

Return ONLY valid JSON.

Do not include markdown.

Format:

[
    {
        "question": "specific question",
        "answer": "accurate answer",
        "hint": "short memory hint"
    }
]

Rules:

- Exactly 10 flashcards.
- Questions must be topic-specific.
- Answers must be accurate.
- Difficulty must match ${difficulty}.

`;

        }


        /* =====================================================
           QUIZ
        ===================================================== */

        else if (task === "quiz") {

            prompt = `

You are Knowvia's AI quiz generator.

Topic:
${cleanTopic}

Difficulty:
${difficulty}

${level}

${source}

Create EXACTLY 10 multiple-choice questions.

Include:

- concept questions
- understanding questions
- application questions
- reasoning questions
- misconception questions

Return ONLY valid JSON.

Do not include markdown.

Format:

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

- Exactly 10 questions.
- Exactly 4 options.
- Only one correct answer.
- correctAnswer must be 0, 1, 2 or 3.
- Do not make all answers the same position.

`;

        }


        /* =====================================================
           TEACH ME
        ===================================================== */

        else if (task === "teach") {

            prompt = `

You are Knowvia's personal AI teacher.

Teach:

${cleanTopic}

Difficulty:
${difficulty}

${level}

${source}

Teach step-by-step.

Use:

# Let's Learn ${cleanTopic}

## Step 1 — Start Here

## Step 2 — Build the Idea

## Step 3 — How It Works

## Step 4 — Example

## Step 5 — Common Confusion

## Step 6 — Check Your Understanding

Ask 3 short questions.

## Step 7 — Quick Recap

`;

        }


        /* =====================================================
           STUDY SESSION
        ===================================================== */

        else if (task === "study_session") {

            prompt = `

Create a focused 30–45 minute study session for:

${cleanTopic}

Difficulty:
${difficulty}

${level}

${source}

Use:

# Study Session — ${cleanTopic}

## 1. Quick Recall

## 2. Learn

## 3. Practice

## 4. Self-Test

Give 5 questions.

## 5. Final Revision

## 6. What To Study Next

Do not give generic study advice.

`;

        }


        /* =====================================================
           EXAM MODE
        ===================================================== */

        else if (task === "exam") {

            prompt = `

Create an exam preparation pack for:

${cleanTopic}

Difficulty:
${difficulty}

${level}

${source}

Use:

# Exam Mode — ${cleanTopic}

## Most Important Areas

## 2-Mark Questions

Give 5.

## 5-Mark Questions

Give 5.

## 10-Mark Questions

Give 3.

## Application Questions

Give 3.

## How To Write Answers

## Last-Minute Revision

Give 10 important points.

Keep everything specific to ${cleanTopic}.

`;

        }


        /* =====================================================
           ASK MY NOTES
        ===================================================== */

        else if (task === "ask_notes") {

            prompt = `

You are Knowvia's Ask My Notes tutor.

Topic:
${cleanTopic}

Student question:
${question}

${source}

Answer the student's exact question.

Give the direct answer first.

Use the student's material whenever possible.

If the answer is not present in the material,
say:

"This is not directly covered in your notes."

Then provide a general explanation if useful.

`;

        }


        /* =====================================================
           WEAK TOPICS
        ===================================================== */

        else if (task === "weak_topics") {

            prompt = `

You are Knowvia's learning-performance analyst.

Topic:
${cleanTopic}

Student quiz performance:
${quizResult}

${source}

Analyze the student's performance.

Use:

## Weak Areas

## Evidence

## Repair Plan

## Targeted Practice

Give 5 questions.

## Priority

Do not invent scores.

`;

        }


        /* =====================================================
           EXPLAIN MISTAKE
        ===================================================== */

        else if (task === "explain_mistake") {

            prompt = `

You are Knowvia's mistake-explanation tutor.

Topic:
${cleanTopic}

Question:
${question}

Student's Answer:
${userAnswer}

Correct Answer:
${quizResult}

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


        /* =====================================================
           KNOWLEDGE MAP
        ===================================================== */

        else if (task === "knowledge_map") {

            prompt = `

You are Knowvia's concept-map generator.

Topic:
${cleanTopic}

Difficulty:
${difficulty}

${level}

${source}

Create a clear text-based knowledge map.

Use:

# Knowledge Map — ${cleanTopic}

## Central Topic

${cleanTopic}

## Main Concepts

List 5–8 major concepts.

## Connections

Explain how the concepts connect.

## Learning Order

Show the best order to learn them.

## Quick Map

Finish with an arrow-style map.

Make it specific to ${cleanTopic}.

`;

        }


        /* =====================================================
           CALL OPENAI
        ===================================================== */

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


        const data =
            await response.json();


        /* =====================================================
           OPENAI ERROR
        ===================================================== */

        if (!response.ok) {

            console.error(
                "OpenAI Error:",
                data
            );

            return res.status(
                response.status
            ).json({

                error:
                    data?.error?.message ||
                    "OpenAI request failed."

            });
        }


        /* =====================================================
           GET RESPONSE TEXT
        ===================================================== */

        let answer =
            data.output_text || "";


        if (
            !answer &&
            Array.isArray(data.output)
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


        if (!answer) {

            return res.status(500).json({

                error:
                    "OpenAI returned an empty response."

            });
        }


        /* =====================================================
           SUCCESS
        ===================================================== */

        return res.status(200).json({

            success: true,

            task: task,

            answer: answer

        });


    } catch (error) {

        console.error(
            "Knowvia Server Error:",
            error
        );

        return res.status(500).json({

            error:
                error.message ||
                "Something went wrong on the server."

        });
    }
}
