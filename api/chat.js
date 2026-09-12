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

        /*
        =====================================================
        GET REQUEST DATA
        =====================================================
        */

        let task = String(body.task || "").trim().toLowerCase();

        const topic = String(body.topic || "").trim();
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

        /*
        =====================================================
        NORMALIZE TASK NAMES
        =====================================================
        */

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

        /*
        =====================================================
        VALID TASKS
        =====================================================
        */

        const allowedTasks = [
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
            console.error("Invalid task received:", body.task);

            return res.status(400).json({
                error: `Invalid task: ${body.task || "missing task"}`
            });
        }

        /*
        =====================================================
        TOPIC
        =====================================================
        */

        const cleanTopic =
            topic || "the requested study topic";

        /*
        =====================================================
        DIFFICULTY
        =====================================================
        */

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

        /*
        =====================================================
        STUDY MATERIAL
        =====================================================
        */

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

        /*
        =====================================================
        PROMPT
        =====================================================
        */

        let prompt = "";

        /*
        =========================
        SUMMARY
        =========================
        */

        if (task === "summary") {
            prompt = `
You are Knowvia, an AI study assistant.

The student wants to learn:

TOPIC:
${cleanTopic}

DIFFICULTY:
${difficulty}

${level}

${source}

Create a genuinely useful, topic-specific study explanation.

IMPORTANT:

Do NOT write generic placeholder content such as:

"important terms"
"main components"
"basic idea"
"major concepts"

Instead, name the REAL concepts belonging to the topic.

For example:

If the topic is Computer:
- CPU
- ALU
- Control Unit
- RAM
- ROM
- Storage
- Input devices
- Output devices
- Software

If the topic is Machine Learning:
- supervised learning
- unsupervised learning
- regression
- classification
- training data
- testing data
- features
- labels
- overfitting

If the topic is Computer Vision:
- image representation
- pixels
- filtering
- edge detection
- segmentation
- object detection
- image classification

The explanation must change meaningfully according to the difficulty.

Use this structure:

# ${cleanTopic}

## What is ${cleanTopic}?

Give a clear definition suitable for the selected difficulty.

## Core Concepts

Explain 5–8 REAL concepts specific to ${cleanTopic}.

## How It Works

Explain the actual working, process, architecture or stages.

## Example

Give a clear real-world or practical example.

## Applications

Give relevant applications.

## Advantages

Give relevant advantages.

## Limitations

Give relevant limitations.

## Common Mistakes

Give realistic mistakes students make with this topic.

## Quick Revision

Give 5–10 important points for revision.

Make the explanation educational rather than generic.
`;
        }

        /*
        =========================
        FLASHCARDS
        =========================
        */

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

Every flashcard must be specifically related to:

${cleanTopic}

Do NOT create generic questions.

Questions should become appropriately more difficult according to the selected level.

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
- Every question must be topic-specific.
- Answers must be accurate.
- Keep answers concise but useful.
`;
        }

        /*
        =========================
        QUIZ
        =========================
        */

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

The questions must specifically test:

${cleanTopic}

Include a mixture of:

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
- Exactly 4 options per question.
- Only one correct answer.
- correctAnswer must be 0, 1, 2 or 3.
- Do not make all correct answers the same position.
- Questions must match the selected difficulty.
`;
        }

        /*
        =========================
        TEACH ME
        =========================
        */

        else if (task === "teach") {
            prompt = `
You are Knowvia's personal AI teacher.

Teach:

${cleanTopic}

Difficulty:
${difficulty}

${level}

${source}

Do not simply summarize.

Teach the topic step-by-step.

Use:

# Let's Learn ${cleanTopic}

## Step 1 — Start Here

Explain the foundation.

## Step 2 — Build the Idea

Explain the important concepts gradually.

## Step 3 — How It Works

Explain the actual working.

## Step 4 — Example

Give a clear example.

## Step 5 — Common Confusion

Explain common misunderstandings.

## Step 6 — Check Your Understanding

Ask 3 short questions.

## Step 7 — Quick Recap

Give a concise revision.
`;
        }

        /*
        =========================
        STUDY SESSION
        =========================
        */

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

Give important things to recall.

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

        /*
        =========================
        EXAM MODE
        =========================
        */

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

List the most important concepts.

## 2-Mark Questions

Give 5 important short questions.

## 5-Mark Questions

Give 5 questions.

## 10-Mark Questions

Give 3 important long-answer questions.

## Application Questions

Give 3 reasoning/application questions.

## How To Write Answers

Explain how students should answer questions from this topic.

## Last-Minute Revision

Give 10 important points.

Keep everything specific to:

${cleanTopic}
`;
        }

        /*
        =========================
        ASK MY NOTES
        =========================
        */

        else if (task === "ask_notes") {
            prompt = `
You are Knowvia's Ask My Notes tutor.

Topic:
${cleanTopic}

Student question:
${question}

${source}

Answer the student's exact question.

Rules:

1. Give the direct answer first.
2. Explain clearly.
3. Use the student's material whenever possible.
4. If the answer is not present in the material, clearly say:
   "This is not directly covered in your notes."
5. Then provide a general explanation if useful.
`;
        }

        /*
        =========================
        WEAK TOPIC DETECTOR
        =========================
        */

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

Rank the weak areas.

## Evidence

Explain why they appear weak.

## Repair Plan

Give a targeted study plan.

## Targeted Practice

Give 5 questions for the weakest area.

## Priority

Tell the student what should be studied first.

Do not invent scores or performance information.
`;
        }

        /*
        =========================
        EXPLAIN MY MISTAKE
        =========================
        */

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

Explain the concept being tested.

## Why Your Answer Was Wrong

Explain the exact mistake.

## Why The Correct Answer Is Correct

Explain the correct reasoning.

## Possible Misconception

Identify the likely misunderstanding.

## Easy Memory Trick

Give an easy memory trick.

## Try Again

Give one similar practice question.

Be encouraging and specific.
`;
        }

        /*
        =========================
        KNOWLEDGE MAP
        =========================
        */

        else if (task === "knowledge_map") {
            prompt = `
You are Knowvia's concept-map generator.

Topic:
${cleanTopic}

Difficulty:
${difficulty}

${level}

${source}

Create a clear text-based knowledge map for:

${cleanTopic}

Show the relationship between the major concepts.

Use:

# Knowledge Map — ${cleanTopic}

## Central Topic

${cleanTopic}

## Main Concepts

List 5–8 major concepts.

## Connections

Explain how each major concept connects to the others.

## Learning Order

Show the best order in which a student should learn the concepts.

## Quick Map

Finish with a compact arrow-style map such as:

Topic
→ Concept 1
→ Concept 2
→ Concept 3
→ Application

Make it specific to the topic.
`;
        }

        /*
        =====================================================
        CALL OPENAI
        =====================================================
        */

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

        /*
        =====================================================
        OPENAI ERROR
        =====================================================
        */

        if (!response.ok) {
            console.error("OpenAI Error:", data);

            return res.status(response.status).json({
                error:
                    data?.error?.message ||
                    "OpenAI request failed."
            });
        }

        /*
        =====================================================
        GET RESPONSE TEXT
        =====================================================
        */

        let answer = data.output_text || "";

        if (
            !answer &&
            Array.isArray(data.output)
        ) {
            answer = data.output
                .flatMap(item => item.content || [])
                .filter(
                    item =>
                        item.type === "output_text"
                )
                .map(item => item.text)
                .join("\n");
        }

        if (!answer) {
            return res.status(500).json({
                error:
                    "OpenAI returned an empty response."
            });
        }

        /*
        =====================================================
        SUCCESS
        =====================================================
        */

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
