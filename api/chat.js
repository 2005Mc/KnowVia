export default async function handler(req, res) {

    // Only allow POST requests
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const {
            task,
            topic,
            difficulty,
            material,
            question,
            userAnswer,
            quizResult
        } = req.body || {};

        if (!task) {
            return res.status(400).json({
                error: "AI task is required"
            });
        }

        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "OPENAI_API_KEY is not configured"
            });
        }


        /* =====================================================
           KNOWVIA AI INSTRUCTIONS
        ===================================================== */

        let instruction = "";


        /* =========================
           SUMMARY
        ========================= */

        if (task === "summary") {

            instruction = `
You are Knowvia, an AI study companion.

Create a clear study summary for the following topic.

Topic:
${topic || "Not provided"}

Difficulty:
${difficulty || "beginner"}

Material:
${material || "No material provided"}

Requirements:
- Explain the topic according to the selected difficulty.
- Start with a simple definition.
- Include important concepts.
- Include important stages, steps or types when relevant.
- Include examples where useful.
- Highlight exam-important points.
- Do not invent information from supplied study material.
- Make the answer easy for a student to study.
- Use headings, bullet points and short paragraphs.
`;
        }


        /* =========================
           FLASHCARDS
        ========================= */

        else if (task === "flashcards") {

            instruction = `
You are Knowvia, an AI study companion.

Generate useful study flashcards.

Topic:
${topic || "Not provided"}

Difficulty:
${difficulty || "beginner"}

Study material:
${material || "No material provided"}

Create exactly 10 flashcards.

Return ONLY valid JSON in this format:

{
  "flashcards": [
    {
      "question": "Question here",
      "answer": "Answer here"
    }
  ]
}

Requirements:
- Questions must test important concepts.
- Answers must be concise but useful.
- Match the selected difficulty.
- If study material is provided, prioritize that material.
`;
        }


        /* =========================
           QUIZ
        ========================= */

        else if (task === "quiz") {

            instruction = `
You are Knowvia, an AI study companion.

Create a quiz for the student.

Topic:
${topic || "Not provided"}

Difficulty:
${difficulty || "beginner"}

Study material:
${material || "No material provided"}

Create exactly 10 multiple-choice questions.

Return ONLY valid JSON:

{
  "quiz": [
    {
      "question": "Question here",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "answer": "Option A",
      "explanation": "Short explanation"
    }
  ]
}

Requirements:
- Only one option must be correct.
- Questions should cover different concepts.
- Match the selected difficulty.
- Use the supplied material when available.
`;
        }


        /* =========================
           TEACH ME
        ========================= */

        else if (task === "teach") {

            instruction = `
You are Knowvia's personal AI teacher.

Teach the student the following topic.

Topic:
${topic || "Not provided"}

Difficulty:
${difficulty || "beginner"}

Study material:
${material || "No material provided"}

Teach the topic step by step.

Use this structure:

1. What is it?
2. Why is it important?
3. Main concepts
4. Simple explanation
5. Example
6. Common mistake
7. Quick check question
8. One-minute revision

Use simple language appropriate for the selected difficulty.
`;
        }


        /* =========================
           EXPLAIN MY MISTAKE
        ========================= */

        else if (task === "explain_mistake") {

            instruction = `
You are Knowvia's mistake-explanation tutor.

Topic:
${topic || "Not provided"}

Study material:
${material || "No material provided"}

Question:
${question || "Not provided"}

Student's answer:
${userAnswer || "Not provided"}

Explain:
1. Whether the answer is correct.
2. What the student misunderstood.
3. The correct concept.
4. Why the correct answer is correct.
5. A simple way to remember it.

Do not shame the student.
Teach the concept clearly.
`;
        }


        /* =========================
           EXAM MODE
        ========================= */

        else if (task === "exam") {

            instruction = `
You are Knowvia Exam Mode.

Topic:
${topic || "Not provided"}

Difficulty:
${difficulty || "intermediate"}

Study material:
${material || "No material provided"}

Generate an exam-style practice set.

Include:
- 5 multiple-choice questions
- 3 short-answer questions
- 2 important long-answer questions

Focus on questions that a student could realistically encounter in an academic examination.

Return the questions clearly with headings.
Do not provide answers immediately.
`;
        }


        /* =========================
           ASK MY NOTES
        ========================= */

        else if (task === "ask_notes") {

            instruction = `
You are Knowvia's Ask My Notes feature.

Answer the student's question using ONLY the supplied study material.

Study material:
${material || "No material provided"}

Student question:
${question || "No question provided"}

Rules:
- Use the supplied material as the primary source.
- If the answer is not present in the material, clearly say:
  "This information is not available in the supplied notes."
- Do not pretend information is present when it is not.
- Explain the answer clearly.
`;
        }


        /* =========================
           WEAK TOPIC ANALYSIS
        ========================= */

        else if (task === "weak_topics") {

            instruction = `
You are Knowvia's learning-analysis engine.

Analyze the student's quiz performance.

Topic:
${topic || "Not provided"}

Quiz result:
${quizResult || "Not provided"}

Study material:
${material || "Not provided"}

Identify:
1. Weak concepts
2. Strong concepts
3. Likely misconceptions
4. What the student should revise first
5. A short personalized revision plan

Be practical and concise.
`;
        }


        /* =========================
           STUDY SESSION
        ========================= */

        else if (task === "study_session") {

            instruction = `
You are Knowvia's AI study-session planner.

Topic:
${topic || "Not provided"}

Difficulty:
${difficulty || "beginner"}

Study material:
${material || "No material provided"}

Create an active study session.

Include:

1. Learn
2. Understand
3. Practice
4. Recall
5. Self-test
6. Final revision

Make the session practical and focused.
`;
        }


        /* =========================
           UNKNOWN TASK
        ========================= */

        else {

            return res.status(400).json({
                error: "Unknown Knowvia AI task"
            });

        }


        /* =====================================================
           OPENAI RESPONSES API
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
                    model: "gpt-5.6-luna",
                    input: instruction
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            console.error("OpenAI error:", data);

            return res.status(response.status).json({
                error: data?.error?.message || "OpenAI request failed"
            });

        }


        /* =====================================================
           EXTRACT AI TEXT
        ===================================================== */

        let answer = "";

        if (data.output_text) {

            answer = data.output_text;

        } else if (Array.isArray(data.output)) {

            for (const item of data.output) {

                if (!Array.isArray(item.content)) {
                    continue;
                }

                for (const content of item.content) {

                    if (content.type === "output_text") {

                        answer += content.text || "";

                    }

                }

            }

        }


        if (!answer) {

            return res.status(500).json({
                error: "AI returned an empty response"
            });

        }


        return res.status(200).json({

            success: true,

            task: task,

            answer: answer

        });


    } catch (error) {

        console.error("Knowvia backend error:", error);

        return res.status(500).json({

            error: "Knowvia AI request failed"

        });

    }

}
