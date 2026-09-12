"use strict";

/* =========================================================
   KNOWVIA - FRONTEND
   Gemini-only
   No OpenAI
   No database
   No localStorage
   ========================================================= */

const state = {
    source: "topic",
    material: "",
    topic: "",
    difficulty: "medium",
    questionStyle: "mixed",

    studyPack: null,

    flashcards: [],
    currentCard: 0,
    cardFlipped: false,
    confidence: {},

    quiz: [],
    quizAnswers: [],
    quizScore: 0,

    weakTopics: [],
    lastMistake: null
};


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}

function clean(value) {
    return String(value || "").trim();
}

function escapeHTML(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showMessage(element, message) {
    if (element) {
        element.innerHTML = `<p>${escapeHTML(message)}</p>`;
    }
}


/* =========================================================
   API CALL
   ========================================================= */

async function callAPI(payload) {

    const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    let data;

    try {
        data = await response.json();
    } catch (error) {
        throw new Error("Server returned an invalid response.");
    }

    if (!response.ok) {
        throw new Error(
            data.error || `Server error: ${response.status}`
        );
    }

    return data;
}


/* =========================================================
   SOURCE TABS
   ========================================================= */

function setupSourceTabs() {

    const tabs = document.querySelectorAll(".source-tab");

    tabs.forEach(tab => {

        tab.addEventListener("click", function () {

            tabs.forEach(t => t.classList.remove("active"));

            this.classList.add("active");

            state.source =
                this.dataset.source || "topic";

            document.querySelectorAll(
                ".source-panel"
            ).forEach(panel => {
                panel.style.display = "none";
            });

            const panel =
                $(state.source + "Panel");

            if (panel) {
                panel.style.display = "";
            }
        });
    });

    const topicPanel = $("topicPanel");

    if (topicPanel) {
        topicPanel.style.display = "";
    }
}


/* =========================================================
   GET CURRENT MATERIAL
   ========================================================= */

function getCurrentMaterial() {

    if (state.source === "topic") {

        const topic = clean(
            $("topic")?.value
        );

        if (!topic) {
            throw new Error(
                "Please enter a topic."
            );
        }

        state.topic = topic;
        return topic;
    }

    if (state.source === "typed") {

        const notes = clean(
            $("typedNotes")?.value
        );

        if (!notes) {
            throw new Error(
                "Please enter your notes."
            );
        }

        return notes;
    }

    if (
        state.source === "handwritten" ||
        state.source === "pdf"
    ) {

        if (!state.material) {
            throw new Error(
                "Please upload and process the file first."
            );
        }

        return state.material;
    }

    throw new Error(
        "Please provide study material."
    );
}


/* =========================================================
   DIFFICULTY
   ========================================================= */

function getDifficulty() {

    const value =
        clean($("difficulty")?.value)
        .toLowerCase();

    /*
       Your HTML may use:
       beginner / intermediate / advanced
       or
       easy / medium / hard
    */

    if (
        value === "beginner" ||
        value === "easy"
    ) {
        return "easy";
    }

    if (
        value === "advanced" ||
        value === "hard"
    ) {
        return "hard";
    }

    return "medium";
}


function getQuestionStyle() {

    return clean(
        $("questionStyle")?.value
    ) || "mixed";
}


/* =========================================================
   GENERATE STUDY PACK
   ========================================================= */

async function generateStudyPack() {

    const button = $("generateBtn");

    try {

        const material =
            getCurrentMaterial();

        state.difficulty =
            getDifficulty();

        state.questionStyle =
            getQuestionStyle();

        state.material =
            material;

        if (button) {
            button.disabled = true;
            button.innerText =
                "Generating...";
        }

        const status =
            $("generateStatus");

        if (status) {
            status.innerText =
                "Knowvia is creating your study pack...";
        }

        const response =
            await callAPI({

                task: "study_pack",

                material: material,

                difficulty:
                    state.difficulty,

                questionStyle:
                    state.questionStyle
            });

        if (
            !response.result ||
            !response.result.studyMatter
        ) {
            throw new Error(
                "Incomplete study pack received."
            );
        }

        state.studyPack =
            response.result;

        state.flashcards =
            normalizeFlashcards(
                response.result.flashcards
            );

        state.quiz =
            normalizeQuiz(
                response.result.quiz
            );

        if (state.flashcards.length !== 10) {
            throw new Error(
                "Knowvia must generate exactly 10 flashcards."
            );
        }

        if (state.quiz.length !== 10) {
            throw new Error(
                "Knowvia must generate exactly 10 quiz questions."
            );
        }

        state.currentCard = 0;
        state.cardFlipped = false;
        state.confidence = {};

        state.quizAnswers = [];
        state.quizScore = 0;
        state.lastMistake = null;
        state.weakTopics = [];

        renderSummary();
        renderFlashcard();
        renderQuiz();
        resetInsights();

        if ($("weakTopicsContent")) {
            $("weakTopicsContent").innerHTML =
                "<p>Complete the quiz to detect weak topics.</p>";
        }

        if ($("mistakeContent")) {
            $("mistakeContent").innerHTML =
                "<p>Complete the quiz to use Explain My Mistake.</p>";
        }

        if ($("knowledgeMapContent")) {
            $("knowledgeMapContent").innerHTML =
                "<p>Generate the Knowledge Map after creating your study pack.</p>";
        }

        if (status) {
            status.innerText =
                "Study pack generated successfully.";
        }

        document
            .getElementById("summary")
            ?.scrollIntoView({
                behavior: "smooth"
            });

    } catch (error) {

        console.error(error);

        if ($("generateStatus")) {
            $("generateStatus").innerText =
                error.message;
        }

        if ($("summaryContent")) {
            showMessage(
                $("summaryContent"),
                error.message
            );
        }

        alert(error.message);

    } finally {

        if (button) {
            button.disabled = false;
            button.innerText =
                "Generate Study Pack";
        }
    }
}


/* =========================================================
   FLASHCARD NORMALIZATION
   ========================================================= */

function normalizeFlashcards(cards) {

    if (!Array.isArray(cards)) {
        return [];
    }

    return cards
        .map(card => ({
            question: clean(
                card.question ||
                card.front
            ),

            answer: clean(
                card.answer ||
                card.back
            )
        }))
        .filter(card =>
            card.question &&
            card.answer
        )
        .slice(0, 10);
}


/* =========================================================
   QUIZ NORMALIZATION
   ========================================================= */

function normalizeQuiz(quiz) {

    if (!Array.isArray(quiz)) {
        return [];
    }

    return quiz
        .map(question => {

            const options =
                Array.isArray(question.options)
                    ? question.options
                        .map(clean)
                        .slice(0, 4)
                    : [];

            return {

                question:
                    clean(question.question),

                options: options,

                correctAnswer:
                    Number(
                        question.correctAnswer
                    ),

                explanation:
                    clean(
                        question.explanation
                    )
            };
        })
        .filter(question => {

            return (
                question.question &&
                question.options.length === 4 &&
                Number.isInteger(
                    question.correctAnswer
                ) &&
                question.correctAnswer >= 0 &&
                question.correctAnswer <= 3
            );
        })
        .slice(0, 10);
}


/* =========================================================
   SUMMARY
   ========================================================= */

function renderSummary() {

    const container =
        $("summaryContent");

    if (!container) return;

    const data =
        state.studyPack?.studyMatter;

    if (!data) return;

    let html = "";

    addSection(
        "Introduction",
        data.introduction
    );

    addSection(
        "Definition",
        data.definition
    );

    addSection(
        "Core Concept",
        data.coreConcept
    );

    addSection(
        "Key Concepts",
        data.keyConcepts
    );

    addSection(
        "Types",
        data.types
    );

    addSection(
        "Components",
        data.components
    );

    addSection(
        "How It Works",
        data.working
    );

    addSection(
        "Characteristics",
        data.characteristics
    );

    addSection(
        "Examples",
        data.examples
    );

    addSection(
        "Applications",
        data.applications
    );

    addSection(
        "Advantages",
        data.advantages
    );

    addSection(
        "Limitations",
        data.limitations
    );

    addSection(
        "Comparison",
        data.comparison
    );

    addSection(
        "Important Exam Points",
        data.importantExamPoints
    );

    addSection(
        "Quick Revision",
        data.quickRevision
    );

    container.innerHTML =
        `<h2>${escapeHTML(
            state.topic || "Study Material"
        )}</h2>
        ${html}`;


    function addSection(title, value) {

        if (
            value === undefined ||
            value === null ||
            value === ""
        ) {
            return;
        }

        let content = "";

        if (Array.isArray(value)) {

            content =
                "<ul>" +
                value.map(item =>
                    `<li>${escapeHTML(item)}</li>`
                ).join("") +
                "</ul>";

        } else {

            content =
                `<p>${escapeHTML(value)}</p>`;
        }

        html += `
            <div class="study-section">
                <h3>${escapeHTML(title)}</h3>
                ${content}
            </div>
        `;
    }
}


/* =========================================================
   FLASHCARDS
   ========================================================= */

function renderFlashcard() {

    const question =
        $("cardQuestion");

    const answer =
        $("cardAnswer");

    const progress =
        $("cardProgress");

    if (!question || !answer) {
        return;
    }

    if (!state.flashcards.length) {

        question.innerText =
            "Generate a study pack first.";

        answer.innerText =
            "Your flashcards will appear here.";

        if (progress) {
            progress.innerText =
                "Card 0 / 0";
        }

        return;
    }

    const card =
        state.flashcards[
            state.currentCard
        ];

    question.innerText =
        card.question;

    answer.innerText =
        card.answer;

    if (progress) {
        progress.innerText =
            `Card ${
                state.currentCard + 1
            } / ${
                state.flashcards.length
            }`;
    }

    const flashcard =
        $("flashcard");

    if (flashcard) {

        flashcard.classList.toggle(
            "flipped",
            state.cardFlipped
        );
    }

    document
        .querySelectorAll(
            ".confidence-btn"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.confidence ===
                state.confidence[
                    state.currentCard
                ]
            );
        });
}


function flipFlashcard() {

    if (!state.flashcards.length) {
        return;
    }

    state.cardFlipped =
        !state.cardFlipped;

    renderFlashcard();
}


function nextFlashcard() {

    if (!state.flashcards.length) {
        return;
    }

    state.currentCard =
        (
            state.currentCard + 1
        ) %
        state.flashcards.length;

    state.cardFlipped = false;

    renderFlashcard();
}


function previousFlashcard() {

    if (!state.flashcards.length) {
        return;
    }

    state.currentCard =
        (
            state.currentCard -
            1 +
            state.flashcards.length
        ) %
        state.flashcards.length;

    state.cardFlipped = false;

    renderFlashcard();
}


/* =========================================================
   QUIZ
   ========================================================= */

function renderQuiz() {

    const container =
        $("quizContainer");

    if (!container) return;

    if (!state.quiz.length) {

        container.innerHTML =
            "<p>Generate a study pack first.</p>";

        return;
    }

    let html = `
        <div class="quiz-header">
            <h3>
                ${escapeHTML(
                    state.difficulty
                )} Level Quiz
            </h3>

            <p>
                10 questions • 4 options each
            </p>
        </div>
    `;

    state.quiz.forEach(
        (question, index) => {

            html += `
                <div class="quiz-question">

                    <h3>
                        ${index + 1}.
                        ${escapeHTML(
                            question.question
                        )}
                    </h3>

                    <div class="quiz-options">
            `;

            question.options.forEach(
                (option, optionIndex) => {

                    html += `
                        <label class="quiz-option">

                            <input
                                type="radio"
                                name="quiz-${index}"
                                value="${optionIndex}"
                            >

                            <span>
                                ${escapeHTML(option)}
                            </span>

                        </label>
                    `;
                }
            );

            html += `
                    </div>

                    <div
                        id="quizExplanation-${index}"
                        class="quiz-explanation"
                        style="display:none;"
                    ></div>

                </div>
            `;
        }
    );

    html += `
        <button
            type="button"
            id="submitQuizBtn"
            class="generate-btn"
        >
            Check My Score
        </button>

        <div
            id="quizScoreResult"
            class="quiz-score-result"
        ></div>
    `;

    container.innerHTML = html;

    $("submitQuizBtn")
        ?.addEventListener(
            "click",
            gradeQuiz
        );
}


/* =========================================================
   GRADE QUIZ
   ========================================================= */

function gradeQuiz() {

    let score = 0;

    state.quizAnswers = [];

    state.lastMistake = null;

    state.quiz.forEach(
        (question, index) => {

            const selected =
                document.querySelector(
                    `input[name="quiz-${index}"]:checked`
                );

            const selectedValue =
                selected
                    ? Number(selected.value)
                    : null;

            const isCorrect =
                selectedValue !== null &&
                selectedValue ===
                question.correctAnswer;

            if (isCorrect) {
                score++;
            }

            const result = {

                question:
                    question.question,

                selectedAnswer:
                    selectedValue === null
                        ? null
                        : question.options[
                            selectedValue
                        ],

                correctAnswer:
                    question.options[
                        question.correctAnswer
                    ],

                selectedValue:
                    selectedValue,

                correctValue:
                    question.correctAnswer,

                correct:
                    isCorrect,

                options:
                    question.options
            };

            state.quizAnswers.push(result);

            if (
                !isCorrect &&
                selectedValue !== null &&
                !state.lastMistake
            ) {
                state.lastMistake =
                    result;
            }

            const explanation =
                $(
                    `quizExplanation-${index}`
                );

            if (explanation) {

                explanation.style.display =
                    "block";

                explanation.innerHTML = `
                    <strong>
                        ${
                            isCorrect
                                ? "Correct"
                                : "Review this question"
                        }
                    </strong>

                    <p>
                        ${escapeHTML(
                            question.explanation
                        )}
                    </p>
                `;
            }
        }
    );

    state.quizScore =
        score;

    const percentage =
        Math.round(
            score /
            state.quiz.length *
            100
        );

    const result =
        $("quizScoreResult");

    if (result) {

        result.innerHTML = `
            <div class="quiz-result">

                <h2>
                    Score: ${score}/10
                </h2>

                <p>
                    ${percentage}%
                </p>

                <p>
                    ${
                        percentage >= 80
                            ? "Excellent work!"
                            : percentage >= 60
                                ? "Good job. Review the questions you missed."
                                : "Review the study matter and try again."
                    }
                </p>

            </div>
        `;
    }

    updateInsights();

    if ($("mistakeContent")) {

        if (state.lastMistake) {

            $("mistakeContent").innerHTML =
                "<p>You have an incorrect answer ready for Explain My Mistake.</p>";

        } else {

            $("mistakeContent").innerHTML =
                "<p>No incorrect answered questions were found.</p>";
        }
    }

    document
        .getElementById("insights")
        ?.scrollIntoView({
            behavior: "smooth"
        });
}


/* =========================================================
   INSIGHTS
   ========================================================= */

function resetInsights() {

    setMetric(
        $("understandingBar"),
        $("understandingScore"),
        0
    );

    setMetric(
        $("recallBar"),
        $("recallScore"),
        0
    );

    setMetric(
        $("applicationBar"),
        $("applicationScore"),
        0
    );
}


function updateInsights() {

    const total =
        state.quiz.length || 10;

    const score =
        state.quizScore || 0;

    const understanding =
        Math.round(
            score / total * 100
        );

    const lowConfidence =
        Object.values(
            state.confidence
        ).filter(
            value => value === "low"
        ).length;

    const recall =
        Math.max(
            0,
            Math.min(
                100,
                understanding +
                10 -
                lowConfidence * 5
            )
        );

    const answered =
        state.quizAnswers.filter(
            item =>
                item.selectedValue !== null
        ).length;

    const correct =
        state.quizAnswers.filter(
            item =>
                item.correct
        ).length;

    const application =
        answered
            ? Math.round(
                correct /
                answered *
                100
            )
            : 0;

    setMetric(
        $("understandingBar"),
        $("understandingScore"),
        understanding
    );

    setMetric(
        $("recallBar"),
        $("recallScore"),
        recall
    );

    setMetric(
        $("applicationBar"),
        $("applicationScore"),
        application
    );
}


function setMetric(
    bar,
    label,
    value
) {

    if (bar) {
        bar.style.width =
            `${value}%`;
    }

    if (label) {
        label.innerText =
            `${value}%`;
    }
}


/* =========================================================
   WEAK TOPIC DETECTOR
   ========================================================= */

async function detectWeakTopics() {

    if (!state.quizAnswers.length) {

        alert(
            "Complete the quiz first."
        );

        return;
    }

    const wrongAnswers =
        state.quizAnswers.filter(
            item =>
                !item.correct
        );

    if (!wrongAnswers.length) {

        $("weakTopicsContent").innerHTML =
            "<p>No weak topics detected because all answered questions were correct.</p>";

        return;
    }

    const material =
        state.material ||
        JSON.stringify(
            state.studyPack.studyMatter
        );

    try {

        $("weakTopicsContent").innerHTML =
            "<p>Analysing your mistakes...</p>";

        const response =
            await callAPI({

                task: "weak_topics",

                material: material,

                topic: state.topic,

                difficulty:
                    state.difficulty,

                wrongQuestions:
                    wrongAnswers
            });

        const weak =
            response.result?.weakTopics ||
            [];

        state.weakTopics =
            Array.isArray(weak)
                ? weak
                : [];

        if (!state.weakTopics.length) {

            $("weakTopicsContent").innerHTML =
                "<p>No clear weak topic was identified.</p>";

            return;
        }

        let html = "<div>";

        state.weakTopics.forEach(
            (item, index) => {

                const topic =
                    typeof item === "string"
                        ? item
                        : item.topic;

                const reason =
                    typeof item === "string"
                        ? ""
                        : item.reason;

                html += `
                    <div class="weak-topic">
                        <h4>
                            ${index + 1}.
                            ${escapeHTML(topic)}
                        </h4>

                        <p>
                            ${escapeHTML(reason)}
                        </p>
                    </div>
                `;
            }
        );

        html += `
            <button
                type="button"
                id="targetedRetestBtn"
                class="generate-btn"
            >
                Targeted Re-test
            </button>
        `;

        html += "</div>";

        $("weakTopicsContent").innerHTML =
            html;

        $("targetedRetestBtn")
            ?.addEventListener(
                "click",
                targetedRetest
            );

    } catch (error) {

        $("weakTopicsContent").innerHTML =
            `<p>${escapeHTML(
                error.message
            )}</p>`;
    }
}


/* =========================================================
   TARGETED RE-TEST
   ========================================================= */

async function targetedRetest() {

    if (!state.weakTopics.length) {

        alert(
            "Detect weak topics first."
        );

        return;
    }

    const topics =
        state.weakTopics
            .map(item =>
                typeof item === "string"
                    ? item
                    : item.topic
            )
            .join(", ");

    try {

        $("quizContainer").innerHTML =
            "<p>Creating your targeted re-test...</p>";

        const response =
            await callAPI({

                task: "quiz",

                material:
                    state.material,

                topic:
                    state.topic,

                difficulty:
                    state.difficulty,

                questionStyle:
                    state.questionStyle,

                focusTopics:
                    topics
            });

        const quiz =
            normalizeQuiz(
                response.result
            );

        if (quiz.length !== 10) {

            throw new Error(
                "Targeted re-test must contain exactly 10 questions."
            );
        }

        state.quiz =
            quiz;

        state.quizAnswers =
            [];

        state.quizScore =
            0;

        state.lastMistake =
            null;

        renderQuiz();

        document
            .getElementById("quiz")
            ?.scrollIntoView({
                behavior: "smooth"
            });

    } catch (error) {

        $("quizContainer").innerHTML =
            `<p>${escapeHTML(
                error.message
            )}</p>`;
    }
}


/* =========================================================
   EXPLAIN MY MISTAKE
   ========================================================= */

async function explainMistake() {

    if (!state.lastMistake) {

        alert(
            "First complete the quiz and answer at least one question incorrectly."
        );

        return;
    }

    try {

        $("mistakeContent").innerHTML =
            "<p>Explaining your mistake...</p>";

        const response =
            await callAPI({

                task:
                    "explain_mistake",

                material:
                    state.material,

                topic:
                    state.topic,

                difficulty:
                    state.difficulty,

                question:
                    state.lastMistake.question,

                selectedAnswer:
                    state.lastMistake.selectedAnswer,

                correctAnswer:
                    state.lastMistake.correctAnswer
            });

        $("mistakeContent").innerHTML =
            formatAIText(
                response.answer
            );

    } catch (error) {

        $("mistakeContent").innerHTML =
            `<p>${escapeHTML(
                error.message
            )}</p>`;
    }
}


/* =========================================================
   KNOWLEDGE MAP
   ========================================================= */

async function generateKnowledgeMap() {

    try {

        $("knowledgeMapContent").innerHTML =
            "<p>Generating knowledge map...</p>";

        const response =
            await callAPI({

                task:
                    "knowledge_map",

                material:
                    state.material,

                topic:
                    state.topic
            });

        const nodes =
            response.result?.nodes ||
            response.result?.knowledgeMap ||
            [];

        if (!Array.isArray(nodes) ||
            !nodes.length) {

            throw new Error(
                "No knowledge map was returned."
            );
        }

        let html = "";

        nodes.forEach(
            node => {

                html += `
                    <div class="knowledge-node">

                        <h4>
                            ${escapeHTML(
                                node.topic
                            )}
                        </h4>

                        <p>
                            ${escapeHTML(
                                node.description
                            )}
                        </p>

                        ${
                            Array.isArray(
                                node.relatedTo
                            )
                            ? `
                                <small>
                                    Related to:
                                    ${escapeHTML(
                                        node.relatedTo.join(
                                            ", "
                                        )
                                    )}
                                </small>
                              `
                            : ""
                        }

                    </div>
                `;
            }
        );

        $("knowledgeMapContent").innerHTML =
            html;

    } catch (error) {

        $("knowledgeMapContent").innerHTML =
            `<p>${escapeHTML(
                error.message
            )}</p>`;
    }
}


/* =========================================================
   TEACH ME
   ========================================================= */

async function teachMe() {

    await runTextFeature(
        "teach",
        "Teach Me"
    );
}


/* =========================================================
   STUDY SESSION
   ========================================================= */

async function studySession() {

    await runTextFeature(
        "study_session",
        "Study Session"
    );
}


/* =========================================================
   EXAM MODE
   ========================================================= */

async function examMode() {

    await runTextFeature(
        "exam",
        "Exam Mode"
    );
}


/* =========================================================
   ASK MY NOTES
   ========================================================= */

async function askMyNotes() {

    const question =
        prompt(
            "What do you want to ask about your notes?"
        );

    if (!question) {
        return;
    }

    await runTextFeature(
        "ask_notes",
        "Ask My Notes",
        {
            question: question
        }
    );
}


/* =========================================================
   GENERIC TEXT FEATURE
   ========================================================= */

async function runTextFeature(
    task,
    title,
    extra = {}
) {

    try {

        const material =
            state.material ||
            JSON.stringify(
                state.studyPack?.studyMatter ||
                {}
            );

        $("featureOutput").innerHTML =
            `
            <h3>${escapeHTML(title)}</h3>
            <p>Knowvia is preparing this...</p>
            `;

        const response =
            await callAPI({

                task: task,

                material:
                    material,

                topic:
                    state.topic,

                difficulty:
                    state.difficulty,

                questionStyle:
                    state.questionStyle,

                ...extra
            });

        $("featureOutput").innerHTML =
            `
            <h3>${escapeHTML(title)}</h3>
            ${formatAIText(
                response.answer
            )}
            `;

    } catch (error) {

        $("featureOutput").innerHTML =
            `
            <h3>${escapeHTML(title)}</h3>
            <p>${escapeHTML(
                error.message
            )}</p>
            `;
    }
}


/* =========================================================
   FORMAT AI TEXT
   ========================================================= */

function formatAIText(value) {

    if (!value) {
        return "<p>No answer returned.</p>";
    }

    let html =
        escapeHTML(value);

    html =
        html.replace(
            /^### (.+)$/gm,
            "<h4>$1</h4>"
        );

    html =
        html.replace(
            /^## (.+)$/gm,
            "<h3>$1</h3>"
        );

    html =
        html.replace(
            /^# (.+)$/gm,
            "<h2>$1</h2>"
        );

    html =
        html.replace(
            /\*\*(.+?)\*\*/g,
            "<strong>$1</strong>"
        );

    html =
        html.replace(
            /\n/g,
            "<br>"
        );

    return `<div>${html}</div>`;
}


/* =========================================================
   HANDWRITTEN OCR
   ========================================================= */

async function setupOCR() {

    const input =
        $("handwrittenInput");

    if (!input) {
        return;
    }

    input.addEventListener(
        "change",
        async function () {

            const file =
                this.files?.[0];

            if (!file) {
                return;
            }

            try {

                $("handwrittenStatus").innerText =
                    "Reading handwriting...";

                if (!window.Tesseract) {

                    throw new Error(
                        "OCR library is not available."
                    );
                }

                const result =
                    await Tesseract.recognize(
                        file,
                        "eng"
                    );

                state.material =
                    clean(
                        result.data.text
                    );

                state.source =
                    "handwritten";

                $("handwrittenStatus").innerText =
                    "Handwritten notes extracted successfully.";

            } catch (error) {

                $("handwrittenStatus").innerText =
                    error.message;
            }
        }
    );
}


/* =========================================================
   PDF TEXT EXTRACTION
   ========================================================= */

async function setupPDF() {

    const input =
        $("pdfInput");

    if (!input) {
        return;
    }

    input.addEventListener(
        "change",
        async function () {

            const file =
                this.files?.[0];

            if (!file) {
                return;
            }

            try {

                $("pdfStatus").innerText =
                    "Reading PDF...";

                if (!window.pdfjsLib) {

                    throw new Error(
                        "PDF.js is not available."
                    );
                }

                const buffer =
                    await file.arrayBuffer();

                const pdf =
                    await pdfjsLib
                        .getDocument({
                            data: buffer
                        })
                        .promise;

                let text = "";

                for (
                    let page = 1;
                    page <= pdf.numPages;
                    page++
                ) {

                    const pdfPage =
                        await pdf.getPage(
                            page
                        );

                    const content =
                        await pdfPage
                            .getTextContent();

                    const pageText =
                        content.items
                            .map(
                                item =>
                                    item.str
                            )
                            .join(" ");

                    text +=
                        `\n\nPage ${page}\n${pageText}`;
                }

                state.material =
                    clean(text);

                state.source =
                    "pdf";

                $("pdfStatus").innerText =
                    "PDF text extracted successfully.";

            } catch (error) {

                $("pdfStatus").innerText =
                    error.message;
            }
        }
    );
}


/* =========================================================
   THEME
   ========================================================= */

function setupTheme() {

    const button =
        $("themeBtn");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        function () {

            document.body.classList.toggle(
                "dark-mode"
            );

            document.body.classList.toggle(
                "dark"
            );
        }
    );
}


/* =========================================================
   CONFIDENCE
   ========================================================= */

function setupConfidence() {

    document
        .querySelectorAll(
            ".confidence-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    const level =
                        this.dataset.confidence;

                    state.confidence[
                        state.currentCard
                    ] = level;

                    renderFlashcard();
                }
            );
        });
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    document
        .querySelectorAll(
            'a[href^="#"]'
        )
        .forEach(link => {

            link.addEventListener(
                "click",
                function (event) {

                    const id =
                        this.getAttribute(
                            "href"
                        );

                    const target =
                        document.querySelector(
                            id
                        );

                    if (target) {

                        event.preventDefault();

                        target.scrollIntoView({
                            behavior:
                                "smooth"
                        });
                    }
                }
            );
        });
}


/* =========================================================
   EVENT BINDINGS
   ========================================================= */

function setupButtons() {

    $("generateBtn")
        ?.addEventListener(
            "click",
            generateStudyPack
        );

    $("flipCard")
        ?.addEventListener(
            "click",
            flipFlashcard
        );

    $("nextCard")
        ?.addEventListener(
            "click",
            nextFlashcard
        );

    $("prevCard")
        ?.addEventListener(
            "click",
            previousFlashcard
        );

    $("flashcard")
        ?.addEventListener(
            "click",
            flipFlashcard
        );

    $("weakTopicsBtn")
        ?.addEventListener(
            "click",
            detectWeakTopics
        );

    $("explainMistakeBtn")
        ?.addEventListener(
            "click",
            explainMistake
        );

    $("knowledgeMapBtn")
        ?.addEventListener(
            "click",
            generateKnowledgeMap
        );

    $("teachBtn")
        ?.addEventListener(
            "click",
            teachMe
        );

    $("studySessionBtn")
        ?.addEventListener(
            "click",
            studySession
        );

    $("examModeBtn")
        ?.addEventListener(
            "click",
            examMode
        );

    $("askNotesBtn")
        ?.addEventListener(
            "click",
            askMyNotes
        );
}


/* =========================================================
   INITIALIZE
   ========================================================= */

function initKnowvia() {

    setupSourceTabs();
    setupButtons();
    setupConfidence();
    setupOCR();
    setupPDF();
    setupTheme();
    setupNavigation();

    renderFlashcard();
    resetInsights();

    console.log(
        "Knowvia frontend loaded successfully."
    );
}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initKnowvia
    );

} else {

    initKnowvia();
}
