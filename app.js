/* =========================================================
   KNOWVIA - AI STUDY COMPANION
   Complete Frontend
   Matches current index.html
   ========================================================= */

(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);

    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        source: "topic",

        material: "",
        title: "",

        difficulty: "beginner",
        questionStyle: "mixed",

        flashcards: [],
        cardIndex: 0,

        quiz: [],
        quizAnswers: [],

        lastMistake: null,

        busy: false
    };


    /* =====================================================
       ELEMENTS
    ===================================================== */

    const els = {

        themeBtn: $("themeBtn"),

        topicInput: $("topic"),

        typedNotes: $("typedNotes"),

        handwrittenInput: $("handwrittenInput"),
        handwrittenStatus: $("handwrittenStatus"),

        pdfInput: $("pdfInput"),
        pdfStatus: $("pdfStatus"),

        difficultyInput: $("difficulty"),

        questionStyleInput: $("questionStyle"),

        generateBtn: $("generateBtn"),
        generateStatus: $("generateStatus"),

        summaryContent: $("summaryContent"),

        flashcard: $("flashcard"),
        cardQuestion: $("cardQuestion"),
        cardAnswer: $("cardAnswer"),

        prevCard: $("prevCard"),
        nextCard: $("nextCard"),
        flipCard: $("flipCard"),
        cardProgress: $("cardProgress"),

        quizContainer: $("quizContainer"),

        understandingBar: $("understandingBar"),
        understandingScore: $("understandingScore"),

        recallBar: $("recallBar"),
        recallScore: $("recallScore"),

        applicationBar: $("applicationBar"),
        applicationScore: $("applicationScore"),

        weakTopicsContent: $("weakTopicsContent"),
        weakTopicsBtn: $("weakTopicsBtn"),

        mistakeContent: $("mistakeContent"),
        explainMistakeBtn: $("explainMistakeBtn"),

        knowledgeMapContent: $("knowledgeMapContent"),
        knowledgeMapBtn: $("knowledgeMapBtn"),

        teachBtn: $("teachBtn"),
        studySessionBtn: $("studySessionBtn"),
        examModeBtn: $("examModeBtn"),
        askNotesBtn: $("askNotesBtn"),

        featureOutput: $("featureOutput")
    };


    /* =====================================================
       BASIC HELPERS
    ===================================================== */

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function getTopic() {

        return String(
            els.topicInput?.value || ""
        ).trim();
    }


    function getDifficulty() {

        return String(
            els.difficultyInput?.value || "beginner"
        ).toLowerCase();
    }


    function getQuestionStyle() {

        return String(
            els.questionStyleInput?.value || "mixed"
        ).toLowerCase();
    }


    function difficultyLabel() {

        const labels = {
            beginner: "Beginner",
            intermediate: "Intermediate",
            advanced: "Advanced"
        };

        return labels[getDifficulty()] || "Beginner";
    }


    function sourceLabel() {

        const labels = {
            topic: "Topic",
            typed: "Typed Notes",
            handwritten: "Handwritten Notes",
            pdf: "PDF"
        };

        return labels[state.source] || "Study Material";
    }


    function showStatus(message) {

        if (els.generateStatus) {
            els.generateStatus.textContent = message;
        }
    }


    function showToast(message, type = "info") {

        /*
         * Works with either a toast element from an older
         * version or simply shows generation status.
         */

        const toast =
            document.getElementById("toast");

        if (toast) {

            toast.textContent = message;

            toast.className =
                `toast show ${type}`;

            clearTimeout(toast._timer);

            toast._timer =
                setTimeout(() => {

                    toast.classList.remove("show");

                }, 3500);

            return;
        }

        showStatus(message);
    }


    /* =====================================================
       MARKDOWN FORMATTER
    ===================================================== */

    function formatMarkdown(text) {

        if (!text) {
            return "<p>No response received.</p>";
        }

        let s = escapeHTML(text);

        s = s.replace(
            /^###\s+(.+)$/gm,
            "<h4>$1</h4>"
        );

        s = s.replace(
            /^##\s+(.+)$/gm,
            "<h3>$1</h3>"
        );

        s = s.replace(
            /^#\s+(.+)$/gm,
            "<h2>$1</h2>"
        );

        s = s.replace(
            /\*\*(.+?)\*\*/g,
            "<strong>$1</strong>"
        );

        s = s.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );

        const lines =
            s.split("\n");

        let html = "";
        let inList = false;

        for (const line of lines) {

            if (/^\s*[-*•]\s+/.test(line)) {

                if (!inList) {

                    html += "<ul>";

                    inList = true;
                }

                html += `
                    <li>
                        ${line.replace(
                            /^\s*[-*•]\s+/,
                            ""
                        )}
                    </li>
                `;

            } else {

                if (inList) {

                    html += "</ul>";

                    inList = false;
                }

                if (line.trim()) {

                    html += `<p>${line}</p>`;
                }
            }
        }

        if (inList) {
            html += "</ul>";
        }

        return `
            <div class="kv-ai-response">
                ${html}
            </div>
        `;
    }


    /* =====================================================
       JSON PARSER
    ===================================================== */

    function parseJSON(text) {

        if (typeof text !== "string") {
            return text;
        }

        let cleaned =
            text
                .trim()
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();

        try {

            return JSON.parse(cleaned);

        } catch (_) {}


        const firstBracket =
            cleaned.indexOf("[");

        const lastBracket =
            cleaned.lastIndexOf("]");

        if (
            firstBracket !== -1 &&
            lastBracket > firstBracket
        ) {

            try {

                return JSON.parse(
                    cleaned.slice(
                        firstBracket,
                        lastBracket + 1
                    )
                );

            } catch (_) {}
        }


        const firstBrace =
            cleaned.indexOf("{");

        const lastBrace =
            cleaned.lastIndexOf("}");

        if (
            firstBrace !== -1 &&
            lastBrace > firstBrace
        ) {

            try {

                return JSON.parse(
                    cleaned.slice(
                        firstBrace,
                        lastBrace + 1
                    )
                );

            } catch (_) {}
        }


        throw new Error(
            "AI returned data in an unexpected format."
        );
    }


    /* =====================================================
       API
    ===================================================== */

    async function callKnowviaAI(payload) {

        const response =
            await fetch(
                "/api/chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(payload)
                }
            );


        let data = {};

        try {

            data =
                await response.json();

        } catch (_) {

            throw new Error(
                "The AI server returned an invalid response."
            );
        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "AI request failed."
            );
        }


        if (!data.answer) {

            throw new Error(
                "AI returned an empty response."
            );
        }


        return data;
    }


    /* =====================================================
       SOURCE TABS
    ===================================================== */

    function setupSourceTabs() {

        document
            .querySelectorAll(".source-tab")
            .forEach(tab => {

                tab.addEventListener(
                    "click",
                    () => {

                        const source =
                            tab.dataset.source;

                        setSource(source);
                    }
                );

            });


        els.typedNotes
            ?.addEventListener(
                "input",
                () => {

                    if (
                        state.source === "typed"
                    ) {

                        state.material =
                            els.typedNotes.value.trim();
                    }

                }
            );


        els.handwrittenInput
            ?.addEventListener(
                "change",
                handleImageUpload
            );


        els.pdfInput
            ?.addEventListener(
                "change",
                handlePDFUpload
            );


        setSource("topic");
    }


    function setSource(source) {

        state.source =
            source;


        document
            .querySelectorAll(".source-tab")
            .forEach(tab => {

                tab.classList.toggle(
                    "active",
                    tab.dataset.source === source
                );

            });


        document
            .querySelectorAll(".source-panel")
            .forEach(panel => {

                panel.classList.toggle(
                    "active",
                    panel.dataset.panel === source
                );

            });


        if (source === "topic") {

            showStatus(
                "Enter a topic and choose a difficulty."
            );

        }

        else if (source === "typed") {

            showStatus(
                "Paste your notes and generate a study pack."
            );

        }

        else if (source === "handwritten") {

            showStatus(
                "Upload handwritten notes. OCR will extract the text."
            );

        }

        else if (source === "pdf") {

            showStatus(
                "Upload a PDF. Knowvia will extract its text."
            );
        }
    }


    /* =====================================================
       LOAD EXTERNAL LIBRARY
    ===================================================== */

    function loadScript(src, test) {

        if (test()) {
            return Promise.resolve();
        }


        return new Promise(
            (resolve, reject) => {

                const script =
                    document.createElement("script");

                script.src = src;

                script.onload =
                    resolve;

                script.onerror =
                    () =>
                        reject(
                            new Error(
                                "Could not load required library."
                            )
                        );

                document.head.appendChild(script);
            }
        );
    }


    /* =====================================================
       HANDWRITTEN NOTES OCR
    ===================================================== */

    async function handleImageUpload(event) {

        const file =
            event.target.files?.[0];

        if (!file) return;


        if (els.handwrittenStatus) {

            els.handwrittenStatus.innerHTML = `
                <span>
                    ✦ Reading ${escapeHTML(file.name)}...
                </span>
            `;
        }


        try {

            await loadScript(
                "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
                () => !!window.Tesseract
            );


            const result =
                await window.Tesseract.recognize(
                    file,
                    "eng"
                );


            state.material =
                result.data.text.trim();


            if (!state.material) {

                throw new Error(
                    "No readable text was found in this image."
                );
            }


            if (els.handwrittenStatus) {

                els.handwrittenStatus.innerHTML = `
                    <strong>
                        ✓ ${escapeHTML(file.name)}
                    </strong>
                    <span>
                        OCR complete —
                        ${state.material.length.toLocaleString()}
                        characters extracted
                    </span>
                `;
            }


            showStatus(
                "Handwritten notes ready. Click Generate Study Pack."
            );


            showToast(
                "Handwritten notes extracted successfully.",
                "success"
            );


        } catch (error) {

            if (els.handwrittenStatus) {

                els.handwrittenStatus.innerHTML = `
                    <span>
                        Could not read this image.
                    </span>
                `;
            }


            showToast(
                error.message ||
                "OCR failed.",
                "error"
            );
        }
    }


    /* =====================================================
       PDF EXTRACTION
       TEXT PDF + SCANNED PDF OCR
    ===================================================== */

    async function handlePDFUpload(event) {

        const file =
            event.target.files?.[0];

        if (!file) return;


        if (els.pdfStatus) {

            els.pdfStatus.innerHTML = `
                <span>
                    ✦ Reading ${escapeHTML(file.name)}...
                </span>
            `;
        }


        try {

            await loadScript(
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
                () => !!window.pdfjsLib
            );


            await loadScript(
                "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
                () => !!window.Tesseract
            );


            window.pdfjsLib
                .GlobalWorkerOptions
                .workerSrc =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


            const buffer =
                await file.arrayBuffer();


            const pdf =
                await window.pdfjsLib
                    .getDocument({
                        data: buffer
                    })
                    .promise;


            let extractedText = "";


            /*
             * First try normal PDF text extraction.
             */

            for (
                let pageNo = 1;
                pageNo <= pdf.numPages;
                pageNo++
            ) {

                const page =
                    await pdf.getPage(pageNo);


                const content =
                    await page.getTextContent();


                const pageText =
                    content.items
                        .map(
                            item =>
                                item.str || ""
                        )
                        .join(" ")
                        .trim();


                if (pageText) {

                    extractedText +=
                        `\n\n[Page ${pageNo}]\n${pageText}`;
                }
            }


            /*
             * If very little text was extracted,
             * treat the PDF as a scanned PDF.
             */

            if (
                extractedText
                    .replace(
                        /\[Page \d+\]/g,
                        ""
                    )
                    .trim()
                    .length < 50
            ) {

                extractedText = "";


                for (
                    let pageNo = 1;
                    pageNo <= pdf.numPages;
                    pageNo++
                ) {

                    if (els.pdfStatus) {

                        els.pdfStatus.innerHTML = `
                            <span>
                                ✦ OCR reading PDF page
                                ${pageNo}
                                of
                                ${pdf.numPages}...
                            </span>
                        `;
                    }


                    const page =
                        await pdf.getPage(pageNo);


                    const viewport =
                        page.getViewport({
                            scale: 1.8
                        });


                    const canvas =
                        document.createElement(
                            "canvas"
                        );


                    const context =
                        canvas.getContext(
                            "2d"
                        );


                    canvas.width =
                        viewport.width;

                    canvas.height =
                        viewport.height;


                    await page.render({
                        canvasContext:
                            context,
                        viewport:
                            viewport
                    }).promise;


                    const result =
                        await window.Tesseract.recognize(
                            canvas,
                            "eng"
                        );


                    const pageText =
                        result.data.text.trim();


                    if (pageText) {

                        extractedText +=
                            `\n\n[Page ${pageNo}]\n${pageText}`;
                    }
                }
            }


            state.material =
                extractedText.trim();


            if (!state.material) {

                throw new Error(
                    "No readable text could be extracted from this PDF."
                );
            }


            if (els.pdfStatus) {

                els.pdfStatus.innerHTML = `
                    <strong>
                        ✓ ${escapeHTML(file.name)}
                    </strong>

                    <span>
                        ${pdf.numPages} pages —
                        ${state.material.length.toLocaleString()}
                        characters extracted
                    </span>
                `;
            }


            showStatus(
                "PDF ready. Click Generate Study Pack."
            );


            showToast(
                "PDF extracted successfully.",
                "success"
            );


        } catch (error) {

            if (els.pdfStatus) {

                els.pdfStatus.innerHTML = `
                    <span>
                        Could not extract this PDF.
                    </span>
                `;
            }


            console.error(
                "PDF Error:",
                error
            );


            showToast(
                error.message ||
                "PDF extraction failed.",
                "error"
            );
        }
    }


    /* =====================================================
       MATERIAL
    ===================================================== */

    function getMaterial() {

        if (
            state.source === "typed"
        ) {

            state.material =
                els.typedNotes
                    ?.value
                    .trim() || "";
        }


        return state.material;
    }


    function ensureInput() {

        const topic =
            getTopic();


        const material =
            getMaterial();


        if (
            state.source === "topic" &&
            !topic
        ) {

            throw new Error(
                "Please enter a topic first."
            );
        }


        if (
            state.source !== "topic" &&
            !material
        ) {

            throw new Error(
                "Please provide your study material first."
            );
        }


        return {

            topic:
                topic ||
                "Uploaded Study Material",

            material
        };
    }


    function ensureInputSafe() {

        try {

            return ensureInput();

        } catch (error) {

            showToast(
                error.message,
                "error"
            );

            return null;
        }
    }


    /* =====================================================
       GENERATE STUDY PACK
    ===================================================== */

    async function generateStudyPack() {

        if (state.busy) {
            return;
        }


        let input;


        try {

            input =
                ensureInput();

        } catch (error) {

            showToast(
                error.message,
                "error"
            );

            return;
        }


        state.title =
            input.topic;

        state.difficulty =
            getDifficulty();

        state.questionStyle =
            getQuestionStyle();

        state.busy =
            true;


        if (els.generateBtn) {

            els.generateBtn.disabled =
                true;

            els.generateBtn.innerHTML = `
                <span>✦ Creating Study Pack...</span>
            `;
        }


        showStatus(
            "Knowvia is creating your personalized study pack..."
        );


        if (els.summaryContent) {

            els.summaryContent.innerHTML = `

                <div class="kv-generation">

                    <div class="kv-ai-orb">
                        ✦
                    </div>

                    <h3>
                        Knowvia is thinking...
                    </h3>

                    <p>
                        Creating your
                        ${escapeHTML(
                            difficultyLabel()
                        )}
                        study pack
                    </p>

                </div>
            `;
        }


        try {

            /*
             * IMPORTANT:
             *
             * The backend supports study_pack.
             *
             * This creates:
             * Summary + Flashcards + Quiz
             * in ONE AI request.
             */

            const result =
                await callKnowviaAI({

                    task:
                        "study_pack",

                    topic:
                        input.topic,

                    difficulty:
                        state.difficulty,

                    material:
                        input.material,

                    quizStyle:
                        state.questionStyle
                });


            const pack =
                parseJSON(
                    result.answer
                );


            /* =================================================
               SUMMARY
            ================================================= */

            if (els.summaryContent) {

                els.summaryContent.innerHTML =
                    formatMarkdown(
                        pack.summary || ""
                    );
            }


            /* =================================================
               FLASHCARDS
            ================================================= */

            state.flashcards =
                Array.isArray(
                    pack.flashcards
                )
                    ? pack.flashcards
                    : [];


            state.flashcards =
                state.flashcards
                    .map(card => ({

                        question:
                            card.question ||
                            card.front ||
                            "",

                        answer:
                            card.answer ||
                            card.back ||
                            "",

                        hint:
                            card.hint ||
                            ""

                    }))
                    .filter(
                        card =>
                            card.question &&
                            card.answer
                    );


            state.cardIndex =
                0;


            renderFlashcard();


            /* =================================================
               QUIZ
            ================================================= */

            state.quiz =
                Array.isArray(
                    pack.quiz
                )
                    ? pack.quiz
                    : [];


            state.quizAnswers =
                [];

            state.lastMistake =
                null;


            renderQuiz();


            /* =================================================
               RESET INSIGHTS
            ================================================= */

            resetInsights();


            showStatus(
                "Study pack ready ✨"
            );


            showToast(
                "Your Knowvia study pack is ready ✨",
                "success"
            );


            /*
             * Scroll to summary.
             */

            document
                .getElementById("summary")
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });


        } catch (error) {

            console.error(
                "Study Pack Error:",
                error
            );


            if (els.summaryContent) {

                els.summaryContent.innerHTML = `

                    <div class="kv-error">

                        <div class="kv-error-icon">
                            !
                        </div>

                        <h3>
                            Something went wrong
                        </h3>

                        <p>
                            ${escapeHTML(
                                error.message
                            )}
                        </p>

                    </div>

                `;
            }


            showToast(
                error.message ||
                "Something went wrong.",
                "error"
            );


        } finally {

            state.busy =
                false;


            if (els.generateBtn) {

                els.generateBtn.disabled =
                    false;

                els.generateBtn.innerHTML = `
                    <span>Generate Study Pack</span>
                    <span class="arrow">→</span>
                `;
            }
        }
    }


    /* =====================================================
       FLASHCARDS
    ===================================================== */

    function renderFlashcard() {

        if (
            !els.cardQuestion ||
            !els.cardAnswer
        ) {
            return;
        }


        if (!state.flashcards.length) {

            els.cardQuestion.textContent =
                "Generate a study pack to begin";

            els.cardAnswer.textContent =
                "Your AI flashcards will appear here.";

            if (els.cardProgress) {

                els.cardProgress.textContent =
                    "Card 0 / 0";
            }

            return;
        }


        const card =
            state.flashcards[
                state.cardIndex
            ];


        els.cardQuestion.textContent =
            card.question;


        els.cardAnswer.textContent =
            card.hint
                ? `${card.answer}\n\nHint: ${card.hint}`
                : card.answer;


        if (els.cardProgress) {

            els.cardProgress.textContent =
                `Card ${
                    state.cardIndex + 1
                } / ${
                    state.flashcards.length
                }`;
        }


        els.flashcard
            ?.classList
            .remove("flipped");
    }


    function flipCard(event) {

        if (
            event?.target?.closest?.("button")
        ) {
            return;
        }


        els.flashcard
            ?.classList
            .toggle("flipped");
    }


    function nextCard(event) {

        event?.stopPropagation();


        if (!state.flashcards.length) {
            return;
        }


        state.cardIndex =
            (
                state.cardIndex + 1
            ) %
            state.flashcards.length;


        renderFlashcard();
    }


    function previousCard(event) {

        event?.stopPropagation();


        if (!state.flashcards.length) {
            return;
        }


        state.cardIndex =
            (
                state.cardIndex -
                1 +
                state.flashcards.length
            ) %
            state.flashcards.length;


        renderFlashcard();
    }


    /* =====================================================
       QUIZ
    ===================================================== */

    function renderQuiz() {

        if (!els.quizContainer) {
            return;
        }


        if (!state.quiz.length) {

            els.quizContainer.innerHTML = `

                <div class="quiz-empty">

                    <div class="quiz-icon">
                        🎯
                    </div>

                    <h3>
                        Your quiz is waiting
                    </h3>

                    <p>
                        Generate a study pack first.
                    </p>

                </div>

            `;

            return;
        }


        els.quizContainer.innerHTML = `

            <div class="quiz-intro">

                <div>

                    <span class="quiz-kicker">
                        ${escapeHTML(
                            difficultyLabel()
                        )}
                    </span>

                    <h3>
                        Ready to test yourself?
                    </h3>

                    <p>
                        ${state.quiz.length}
                        questions generated from
                        your study material.
                    </p>

                </div>

                <div class="quiz-count">

                    ${state.quiz.length}

                    <small>
                        QUESTIONS
                    </small>

                </div>

            </div>


            <div class="quiz-questions">

                ${state.quiz
                    .map(
                        (q, i) => {

                            const options =
                                Array.isArray(
                                    q.options
                                )
                                    ? q.options
                                    : [];


                            return `

                                <div
                                    class="quiz-question"
                                    data-question="${i}"
                                >

                                    <div class="quiz-number">
                                        QUESTION
                                        ${String(
                                            i + 1
                                        ).padStart(
                                            2,
                                            "0"
                                        )}
                                    </div>

                                    <h3>
                                        ${escapeHTML(
                                            q.question || ""
                                        )}
                                    </h3>

                                    <div class="options">

                                        ${options
                                            .map(
                                                (
                                                    option,
                                                    j
                                                ) => `

                                                    <label class="option">

                                                        <input
                                                            type="radio"
                                                            name="kvq${i}"
                                                            value="${j}"
                                                        >

                                                        <span>
                                                            ${escapeHTML(
                                                                typeof option ===
                                                                "string"
                                                                    ? option
                                                                    : (
                                                                        option?.text ||
                                                                        option?.label ||
                                                                        ""
                                                                    )
                                                            )}
                                                        </span>

                                                    </label>

                                                `
                                            )
                                            .join("")}

                                    </div>

                                </div>

                            `;
                        }
                    )
                    .join("")}

            </div>


            <div class="quiz-actions">

                <span class="quiz-progress">
                    Choose your answers
                </span>

                <button
                    type="button"
                    class="generate-btn quiz-submit"
                    id="kvSubmitQuiz"
                >
                    Check My Score →
                </button>

            </div>


            <div id="kvQuizResult"></div>

        `;


        $("kvSubmitQuiz")
            ?.addEventListener(
                "click",
                gradeQuiz
            );
    }


    function getOptionText(option) {

        return typeof option === "string"
            ? option
            : (
                option?.text ||
                option?.label ||
                ""
            );
    }


    function gradeQuiz() {

        let score = 0;
        let answered = 0;

        const answers = [];


        state.quiz.forEach(
            (q, i) => {

                const selected =
                    document.querySelector(
                        `input[name="kvq${i}"]:checked`
                    );


                const value =
                    selected
                        ? Number(
                            selected.value
                        )
                        : null;


                const correctValue =
                    Number(
                        q.correctAnswer
                    );


                const correct =
                    value !== null &&
                    value === correctValue;


                if (value !== null) {
                    answered++;
                }


                if (correct) {
                    score++;
                }


                answers.push({

                    question:
                        q.question,

                    options:
                        (
                            q.options ||
                            []
                        ).map(
                            (
                                option,
                                index
                            ) => ({

                                value:
                                    index,

                                label:
                                    getOptionText(
                                        option
                                    )

                            })
                        ),

                    value,

                    correctValue,

                    correct
                });


                const questionBox =
                    document.querySelector(
                        `[data-question="${i}"]`
                    );


                if (
                    questionBox &&
                    value !== null
                ) {

                    questionBox.classList.add(
                        correct
                            ? "answered-correct"
                            : "answered-wrong"
                    );
                }

            }
        );


        state.quizAnswers =
            answers;


        state.lastMistake =
            answers.find(
                item =>
                    !item.correct &&
                    item.value !== null
            ) || null;


        const percentage =
            state.quiz.length
                ? Math.round(
                    score /
                    state.quiz.length *
                    100
                )
                : 0;


        const result =
            $("kvQuizResult");


        if (result) {

            let message =
                "Keep practicing.";

            if (percentage >= 90) {

                message =
                    "Outstanding! You really know this.";

            } else if (percentage >= 80) {

                message =
                    "Excellent understanding!";

            } else if (percentage >= 60) {

                message =
                    "Good progress. Review the missed concepts.";
            }


            result.innerHTML = `

                <div class="quiz-result">

                    <div class="result-score">
                        ${percentage}%
                    </div>

                    <div>

                        <span>
                            ${score}/${state.quiz.length}
                            correct
                        </span>

                        <h3>
                            ${message}
                        </h3>

                        <p>
                            Answered
                            ${answered}
                            of
                            ${state.quiz.length}
                            questions.
                        </p>

                    </div>

                </div>

            `;
        }


        updateStudyDNA();


        if (state.lastMistake) {

            showToast(
                "A mistake is ready for Explain My Mistake 💡",
                "info"
            );
        }
    }


    /* =====================================================
       STUDY DNA
    ===================================================== */

    function updateStudyDNA() {

        if (!state.quizAnswers.length) {
            return;
        }


        const total =
            state.quizAnswers.length;


        const correct =
            state.quizAnswers.filter(
                a => a.correct
            ).length;


        const understanding =
            Math.round(
                correct /
                total *
                100
            );


        const answered =
            state.quizAnswers.filter(
                a => a.value !== null
            ).length;


        const recall =
            Math.round(
                answered /
                total *
                100
            );


        const application =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(
                        understanding * 0.7 +
                        recall * 0.3
                    )
                )
            );


        if (els.understandingBar) {

            els.understandingBar.style.width =
                `${understanding}%`;
        }


        if (els.recallBar) {

            els.recallBar.style.width =
                `${recall}%`;
        }


        if (els.applicationBar) {

            els.applicationBar.style.width =
                `${application}%`;
        }


        if (els.understandingScore) {

            els.understandingScore.textContent =
                `${understanding}%`;
        }


        if (els.recallScore) {

            els.recallScore.textContent =
                `${recall}%`;
        }


        if (els.applicationScore) {

            els.applicationScore.textContent =
                `${application}%`;
        }


        updateInsights();
    }


    function updateInsights() {

        const wrong =
            state.quizAnswers.filter(
                a =>
                    !a.correct &&
                    a.value !== null
            );


        if (els.weakTopicsContent) {

            if (!wrong.length) {

                els.weakTopicsContent.textContent =
                    "No clear weak area yet. Excellent work!";

            } else {

                els.weakTopicsContent.textContent =
                    `${wrong.length} question${
                        wrong.length === 1
                            ? ""
                            : "s"
                    } need another review. Click Targeted Re-test for focused practice.`;
            }
        }


        if (els.mistakeContent) {

            if (state.lastMistake) {

                els.mistakeContent.textContent =
                    "Your first missed question is ready for a detailed explanation and memory trick.";

            } else {

                els.mistakeContent.textContent =
                    "Complete the quiz incorrectly once to unlock mistake explanations.";
            }
        }
    }


    function resetInsights() {

        if (els.understandingBar) {
            els.understandingBar.style.width = "0%";
        }

        if (els.recallBar) {
            els.recallBar.style.width = "0%";
        }

        if (els.applicationBar) {
            els.applicationBar.style.width = "0%";
        }

        if (els.understandingScore) {
            els.understandingScore.textContent = "—";
        }

        if (els.recallScore) {
            els.recallScore.textContent = "—";
        }

        if (els.applicationScore) {
            els.applicationScore.textContent = "—";
        }

        if (els.weakTopicsContent) {

            els.weakTopicsContent.textContent =
                "Complete the quiz to identify weak areas.";
        }

        if (els.mistakeContent) {

            els.mistakeContent.textContent =
                "Wrong answers will be explained here with a memory trick.";
        }

        if (els.knowledgeMapContent) {

            els.knowledgeMapContent.textContent =
                "Your knowledge map will appear here.";
        }
    }


    /* =====================================================
       MODAL
       ===================================================== */

    function createModal() {

        let modal =
            document.getElementById(
                "kvFeatureModal"
            );


        if (modal) {
            return modal;
        }


        modal =
            document.createElement("div");


        modal.id =
            "kvFeatureModal";


        modal.className =
            "kv-feature-modal";


        modal.innerHTML = `

            <div class="kv-feature-modal-box">

                <button
                    type="button"
                    class="kv-modal-close"
                    id="kvModalClose"
                    aria-label="Close"
                >
                    ×
                </button>

                <div
                    id="kvModalContent"
                    class="kv-modal-content"
                ></div>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        modal
            .addEventListener(
                "click",
                event => {

                    if (
                        event.target === modal
                    ) {

                        closeModal();
                    }
                }
            );


        $("kvModalClose")
            ?.addEventListener(
                "click",
                closeModal
            );


        return modal;
    }


    function openModal(title, content) {

        const modal =
            createModal();


        const contentBox =
            $("kvModalContent");


        if (contentBox) {

            contentBox.innerHTML = `

                <div class="kv-modal-heading">

                    <span>
                        KNOWVIA AI
                    </span>

                    <h2>
                        ${escapeHTML(title)}
                    </h2>

                </div>

                ${content}

            `;
        }


        modal.classList.add("show");

        document.body.classList.add(
            "modal-open"
        );
    }


    function closeModal() {

        const modal =
            $("kvFeatureModal");


        modal?.classList.remove(
            "show"
        );


        document.body.classList.remove(
            "modal-open"
        );
    }


    /* =====================================================
       AI FEATURE MODAL
    ===================================================== */

    async function runAIInModal(
        title,
        payload,
        loadingText
    ) {

        openModal(

            title,

            `

                <div class="kv-modal-loading">

                    <div class="kv-ai-orb">
                        ✦
                    </div>

                    <h3>
                        ${escapeHTML(
                            loadingText
                        )}
                    </h3>

                    <div class="kv-loading-dots">
                        <i></i>
                        <i></i>
                        <i></i>
                    </div>

                </div>

            `
        );


        try {

            const result =
                await callKnowviaAI(
                    payload
                );


            const content =
                $("kvModalContent");


            if (content) {

                content.innerHTML = `

                    <div class="kv-modal-heading">

                        <span>
                            KNOWVIA AI
                        </span>

                        <h2>
                            ${escapeHTML(title)}
                        </h2>

                    </div>

                    ${formatMarkdown(
                        result.answer
                    )}

                `;
            }


        } catch (error) {

            const content =
                $("kvModalContent");


            if (content) {

                content.innerHTML = `

                    <div class="kv-error">

                        <h3>
                            Something went wrong
                        </h3>

                        <p>
                            ${escapeHTML(
                                error.message
                            )}
                        </p>

                    </div>

                `;
            }
        }
    }


    /* =====================================================
       TEACH ME
    ===================================================== */

    async function teachMe() {

        const input =
            ensureInputSafe();


        if (!input) return;


        await runAIInModal(

            "Teach Me",

            {

                task:
                    "teach",

                topic:
                    input.topic,

                difficulty:
                    getDifficulty(),

                material:
                    input.material

            },

            "Your personal AI teacher is preparing a lesson..."
        );
    }


    /* =====================================================
       STUDY SESSION
    ===================================================== */

    async function studySession() {

        const input =
            ensureInputSafe();


        if (!input) return;


        await runAIInModal(

            "Study Session",

            {

                task:
                    "study_session",

                topic:
                    input.topic,

                difficulty:
                    getDifficulty(),

                material:
                    input.material

            },

            "Building your focused study session..."
        );
    }


    /* =====================================================
       EXAM MODE
    ===================================================== */

    async function examMode() {

        const input =
            ensureInputSafe();


        if (!input) return;


        await runAIInModal(

            "Exam Mode",

            {

                task:
                    "exam",

                topic:
                    input.topic,

                difficulty:
                    getDifficulty(),

                material:
                    input.material

            },

            "Preparing exam-oriented questions..."
        );
    }


    /* =====================================================
       ASK MY NOTES
    ===================================================== */

    function askMyNotes() {

        const input =
            ensureInputSafe();


        if (!input) return;


        openModal(

            "Ask My Notes",

            `

                <p>
                    Ask anything about your
                    current topic or study material.
                </p>

                <textarea
                    id="kvAskInput"
                    rows="5"
                    placeholder="Example: Explain this concept in simple words..."
                ></textarea>

                <button
                    type="button"
                    class="generate-btn"
                    id="kvAskSubmit"
                >
                    Ask Knowvia →
                </button>

                <div
                    id="kvAskResult"
                ></div>

            `
        );


        $("kvAskSubmit")
            ?.addEventListener(
                "click",
                async () => {

                    const question =
                        $("kvAskInput")
                            ?.value
                            .trim();


                    if (!question) {

                        showToast(
                            "Please enter a question.",
                            "error"
                        );

                        return;
                    }


                    const resultBox =
                        $("kvAskResult");


                    if (resultBox) {

                        resultBox.innerHTML = `
                            <div class="kv-modal-loading small">
                                Knowvia is thinking...
                            </div>
                        `;
                    }


                    try {

                        const result =
                            await callKnowviaAI({

                                task:
                                    "ask_notes",

                                topic:
                                    input.topic,

                                difficulty:
                                    getDifficulty(),

                                material:
                                    input.material,

                                question
                            });


                        if (resultBox) {

                            resultBox.innerHTML =
                                formatMarkdown(
                                    result.answer
                                );
                        }


                    } catch (error) {

                        if (resultBox) {

                            resultBox.innerHTML =
                                `<p>
                                    ${escapeHTML(
                                        error.message
                                    )}
                                </p>`;
                        }
                    }

                }
            );
    }


    /* =====================================================
       EXPLAIN MY MISTAKE
    ===================================================== */

    async function explainMistake() {

        const mistake =
            state.lastMistake;


        if (!mistake) {

            showToast(
                "First answer at least one quiz question incorrectly.",
                "info"
            );

            return;
        }


        const selected =
            mistake.value !== null
                ? mistake
                    .options[
                        mistake.value
                    ]?.label
                : "Not answered";


        const correct =
            mistake
                .options[
                    mistake.correctValue
                ]?.label;


        await runAIInModal(

            "Explain My Mistake",

            {

                task:
                    "explain_mistake",

                topic:
                    getTopic() ||
                    state.title,

                difficulty:
                    getDifficulty(),

                material:
                    getMaterial(),

                question:
                    mistake.question,

                userAnswer:
                    selected,

                quizResult:
                    correct

            },

            "Analyzing your mistake and finding the easiest way to remember it..."
        );
    }


    /* =====================================================
       TARGETED RE-TEST
       ===================================================== */

    async function targetedRetest() {

        if (!state.quizAnswers.length) {

            showToast(
                "Complete the quiz first so Knowvia can detect your weak areas.",
                "info"
            );

            return;
        }


        const wrong =
            state.quizAnswers.filter(
                a =>
                    !a.correct &&
                    a.value !== null
            );


        if (!wrong.length) {

            showToast(
                "Excellent! No incorrect answers were found.",
                "success"
            );

            return;
        }


        const weakQuestions =
            wrong
                .slice(0, 5)
                .map(
                    (item, index) =>
                        `${index + 1}. ${item.question}`
                )
                .join("\n");


        await runAIInModal(

            "Targeted Re-test",

            {

                task:
                    "weak_topics",

                topic:
                    getTopic() ||
                    state.title,

                difficulty:
                    getDifficulty(),

                material:
                    getMaterial(),

                quizResult:
                    `
Incorrect questions:

${weakQuestions}

Total incorrect:
${wrong.length}

Focus the analysis on the concepts behind these mistakes.
`

            },

            "Finding your weak concepts and creating targeted practice..."
        );
    }


    /* =====================================================
       KNOWLEDGE MAP
       ===================================================== */

    async function knowledgeMap() {

        const input =
            ensureInputSafe();


        if (!input) return;


        await runAIInModal(

            "Knowledge Map",

            {

                task:
                    "knowledge_map",

                topic:
                    input.topic,

                difficulty:
                    getDifficulty(),

                material:
                    input.material

            },

            "Building the connections between your concepts..."
        );
    }


    /* =====================================================
       FEATURE BUTTONS
       ===================================================== */

    function setupFeatureButtons() {

        els.teachBtn
            ?.addEventListener(
                "click",
                teachMe
            );


        els.studySessionBtn
            ?.addEventListener(
                "click",
                studySession
            );


        els.examModeBtn
            ?.addEventListener(
                "click",
                examMode
            );


        els.askNotesBtn
            ?.addEventListener(
                "click",
                askMyNotes
            );


        els.weakTopicsBtn
            ?.addEventListener(
                "click",
                targetedRetest
            );


        els.explainMistakeBtn
            ?.addEventListener(
                "click",
                explainMistake
            );


        els.knowledgeMapBtn
            ?.addEventListener(
                "click",
                knowledgeMap
            );
    }


    /* =====================================================
       CONFIDENCE BUTTONS
       ===================================================== */

    function setupConfidenceButtons() {

        document
            .querySelectorAll(
                ".confidence-btn"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".confidence-btn"
                            )
                            .forEach(btn => {

                                btn.classList.remove(
                                    "selected"
                                );

                            });


                        button.classList.add(
                            "selected"
                        );

                    }
                );

            });
    }


    /* =====================================================
       THEME
    ===================================================== */

    function setupTheme() {

        els.themeBtn
            ?.addEventListener(
                "click",
                () => {

                    const dark =
                        document.body.classList.toggle(
                            "dark"
                        );


                    els.themeBtn.textContent =
                        dark
                            ? "☀"
                            : "☾";
                }
            );
    }


    /* =====================================================
       GENERAL EVENTS
    ===================================================== */

    function setupEvents() {

        els.generateBtn
            ?.addEventListener(
                "click",
                generateStudyPack
            );


        els.flashcard
            ?.addEventListener(
                "click",
                flipCard
            );


        els.flipCard
            ?.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    els.flashcard
                        ?.classList
                        .toggle("flipped");

                }
            );


        els.nextCard
            ?.addEventListener(
                "click",
                nextCard
            );


        els.prevCard
            ?.addEventListener(
                "click",
                previousCard
            );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    closeModal();
                }

            }
        );


        setupSourceTabs();

        setupFeatureButtons();

        setupConfidenceButtons();

        setupTheme();
    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function init() {

        setupEvents();

        renderFlashcard();

        renderQuiz();

        resetInsights();

        console.log(
            "Knowvia AI frontend initialized successfully."
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();
    }

})();
