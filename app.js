/* ============================================================
   KNOWVIA - AI CONNECTED APP
   PART 1
   AI CONNECTION + SOURCE / PDF / HANDWRITTEN MATERIAL SUPPORT
   ============================================================ */

(function () {
    "use strict";

    /* ============================================================
       BASIC ELEMENT REFERENCES
       ============================================================ */

    const topicInput = document.getElementById("topic");
    const difficultyInput = document.getElementById("difficulty");
    const generateBtn = document.getElementById("generateBtn");

    const summarySection = document.getElementById("summary");
    const summaryContent = document.getElementById("summaryContent");

    const flashcardsSection = document.getElementById("flashcards");
    const flashcard = document.getElementById("flashcard");
    const cardQuestion = document.getElementById("cardQuestion");
    const cardAnswer = document.getElementById("cardAnswer");
    const prevCard = document.getElementById("prevCard");
    const nextCard = document.getElementById("nextCard");
    const cardProgress = document.getElementById("cardProgress");
    const flipCard = document.getElementById("flipCard");

    const quizSection = document.getElementById("quiz");
    const quizContainer = document.getElementById("quizContainer");

    const themeBtn = document.getElementById("themeBtn");


    /* ============================================================
       GLOBAL STATE
       ============================================================ */

    let currentFlashcards = [];
    let currentCardIndex = 0;

    let currentQuiz = [];
    let currentQuizIndex = 0;
    let currentQuizAnswers = [];

    let currentMaterial = "";
    let currentSourceType = "topic";
    let currentTopic = "";

    let isGenerating = false;


    /* ============================================================
       HELPER - ESCAPE HTML
       Prevents AI-generated text from breaking the page.
       ============================================================ */

    function escapeHTML(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* ============================================================
       HELPER - FORMAT AI TEXT
       Converts simple AI markdown into readable HTML.
       ============================================================ */

    function formatAIResponse(text) {
        if (!text) {
            return "";
        }

        let formatted = escapeHTML(text);

        formatted = formatted.replace(
            /^### (.*)$/gm,
            "<h4>$1</h4>"
        );

        formatted = formatted.replace(
            /^## (.*)$/gm,
            "<h3>$1</h3>"
        );

        formatted = formatted.replace(
            /^# (.*)$/gm,
            "<h2>$1</h2>"
        );

        formatted = formatted.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

        formatted = formatted.replace(
            /\*(.*?)\*/g,
            "<em>$1</em>"
        );

        formatted = formatted.replace(
            /^\s*[-•]\s+(.*)$/gm,
            "<li>$1</li>"
        );

        formatted = formatted.replace(
            /(<li>.*<\/li>)/gs,
            "<ul>$1</ul>"
        );

        formatted = formatted.replace(
            /\n{2,}/g,
            "</p><p>"
        );

        formatted = formatted.replace(
            /\n/g,
            "<br>"
        );

        return "<p>" + formatted + "</p>";
    }


    /* ============================================================
       HELPER - TRY TO PARSE JSON
       Used later for flashcards and quiz.
       ============================================================ */

    function parseJSON(text) {
        if (!text) {
            return null;
        }

        if (typeof text !== "string") {
            return text;
        }

        let cleaned = text.trim();

        /* Remove markdown code fences */

        cleaned = cleaned.replace(/^```json\s*/i, "");
        cleaned = cleaned.replace(/^```\s*/i, "");
        cleaned = cleaned.replace(/\s*```$/i, "");

        try {
            return JSON.parse(cleaned);
        } catch (error) {
            /* Try to locate JSON inside the response */

            const firstBrace = cleaned.indexOf("{");
            const lastBrace = cleaned.lastIndexOf("}");

            if (firstBrace !== -1 && lastBrace !== -1) {
                try {
                    return JSON.parse(
                        cleaned.substring(firstBrace, lastBrace + 1)
                    );
                } catch (e) {
                    /* Continue */
                }
            }

            const firstBracket = cleaned.indexOf("[");
            const lastBracket = cleaned.lastIndexOf("]");

            if (firstBracket !== -1 && lastBracket !== -1) {
                try {
                    return JSON.parse(
                        cleaned.substring(firstBracket, lastBracket + 1)
                    );
                } catch (e) {
                    /* Continue */
                }
            }
        }

        return null;
    }


    /* ============================================================
       HELPER - TOAST MESSAGE
       ============================================================ */

    function toast(message, type = "info") {

        let existing = document.getElementById("knowviaToast");

        if (!existing) {
            existing = document.createElement("div");
            existing.id = "knowviaToast";

            existing.style.position = "fixed";
            existing.style.bottom = "25px";
            existing.style.right = "25px";
            existing.style.zIndex = "99999";
            existing.style.maxWidth = "350px";
            existing.style.padding = "14px 18px";
            existing.style.borderRadius = "12px";
            existing.style.fontSize = "14px";
            existing.style.fontWeight = "600";
            existing.style.boxShadow = "0 8px 30px rgba(0,0,0,0.2)";
            existing.style.transition = "opacity 0.3s ease";

            document.body.appendChild(existing);
        }

        existing.textContent = message;

        if (type === "error") {
            existing.style.background = "#dc2626";
            existing.style.color = "#ffffff";
        } else if (type === "success") {
            existing.style.background = "#16a34a";
            existing.style.color = "#ffffff";
        } else {
            existing.style.background = "#2563eb";
            existing.style.color = "#ffffff";
        }

        existing.style.opacity = "1";

        clearTimeout(existing._timeout);

        existing._timeout = setTimeout(function () {
            existing.style.opacity = "0";
        }, 3500);
    }


    /* ============================================================
       HELPER - BUSY STATE
       ============================================================ */

    function setBusy(button, busy, busyText = "Working...") {

        if (!button) {
            return;
        }

        if (busy) {

            if (!button.dataset.originalText) {
                button.dataset.originalText = button.textContent;
            }

            button.disabled = true;
            button.textContent = busyText;

        } else {

            button.disabled = false;

            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            }
        }
    }


    /* ============================================================
       MAIN AI FUNCTION
       Sends requests to:
       
       /api/chat

       IMPORTANT:
       The OpenAI API key is NEVER stored in this JavaScript file.

       It remains safely inside Vercel environment variables.
       ============================================================ */

    async function callKnowviaAI(payload) {

        try {

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

                throw new Error(
                    "The AI server returned an invalid response."
                );

            }


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    data.message ||
                    "AI request failed."
                );

            }


            if (!data.success) {

                throw new Error(
                    data.error ||
                    "AI could not generate the requested content."
                );

            }


            return data.answer || "";

        } catch (error) {

            console.error("Knowvia AI Error:", error);

            throw error;
        }
    }


    /* ============================================================
       CREATE SOURCE CONTROL UI
       
       The current HTML does not need to be manually changed.
       This JavaScript creates the controls automatically.
       ============================================================ */

    function createSourceControls() {

        if (document.getElementById("knowviaSourceControls")) {
            return;
        }


        const generateButton =
            document.getElementById("generateBtn");

        if (!generateButton) {
            return;
        }


        const wrapper = document.createElement("div");

        wrapper.id = "knowviaSourceControls";

        wrapper.innerHTML = `

            <div class="knowvia-source-box">

                <div class="knowvia-source-title">
                    <span>📚</span>
                    <span>Study Source</span>
                </div>

                <div class="knowvia-source-options">

                    <button
                        type="button"
                        class="knowvia-source-btn active"
                        data-source="topic">
                        📖 Topic
                    </button>

                    <button
                        type="button"
                        class="knowvia-source-btn"
                        data-source="notes">
                        📝 Typed Notes
                    </button>

                    <button
                        type="button"
                        class="knowvia-source-btn"
                        data-source="image">
                        ✍️ Handwritten Notes
                    </button>

                    <button
                        type="button"
                        class="knowvia-source-btn"
                        data-source="pdf">
                        📄 PDF
                    </button>

                </div>

                <div
                    id="knowviaNotesArea"
                    class="knowvia-source-area"
                    style="display:none;">

                    <textarea
                        id="knowviaNotesInput"
                        placeholder="Paste or type your study material here..."
                        rows="8"></textarea>

                    <div class="knowvia-source-help">
                        Paste your notes and Knowvia will create
                        a summary, flashcards and quiz from them.
                    </div>

                </div>


                <div
                    id="knowviaImageArea"
                    class="knowvia-source-area"
                    style="display:none;">

                    <label class="knowvia-upload-label">

                        <span class="knowvia-upload-icon">
                            📷
                        </span>

                        <span>
                            Upload handwritten notes
                        </span>

                        <input
                            type="file"
                            id="knowviaImageInput"
                            accept="image/*"
                            hidden>

                    </label>

                    <div
                        id="knowviaImagePreview"
                        class="knowvia-image-preview">
                    </div>

                    <div
                        id="knowviaOCRStatus"
                        class="knowvia-source-help">
                    </div>

                </div>


                <div
                    id="knowviaPdfArea"
                    class="knowvia-source-area"
                    style="display:none;">

                    <label class="knowvia-upload-label">

                        <span class="knowvia-upload-icon">
                            📄
                        </span>

                        <span>
                            Upload PDF notes / study material
                        </span>

                        <input
                            type="file"
                            id="knowviaPdfInput"
                            accept="application/pdf"
                            hidden>

                    </label>

                    <div
                        id="knowviaPdfInfo"
                        class="knowvia-source-help">
                    </div>

                </div>

            </div>
        `;


        generateButton.parentNode.insertBefore(
            wrapper,
            generateButton
        );


        addSourceControlStyles();

        setupSourceControls();
    }


    /* ============================================================
       SOURCE CONTROL STYLES
       ============================================================ */

    function addSourceControlStyles() {

        if (document.getElementById("knowviaSourceStyles")) {
            return;
        }


        const style = document.createElement("style");

        style.id = "knowviaSourceStyles";

        style.textContent = `

            .knowvia-source-box {
                margin: 20px 0;
                padding: 20px;
                border-radius: 18px;
                border: 1px solid rgba(100,100,100,0.15);
                background: rgba(255,255,255,0.65);
            }

            .knowvia-source-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 17px;
                font-weight: 700;
                margin-bottom: 14px;
            }

            .knowvia-source-options {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 16px;
            }

            .knowvia-source-btn {
                border: 1px solid rgba(100,100,100,0.2);
                background: transparent;
                padding: 10px 15px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                transition: 0.2s ease;
            }

            .knowvia-source-btn:hover {
                transform: translateY(-1px);
            }

            .knowvia-source-btn.active {
                background: #2563eb;
                color: white;
                border-color: #2563eb;
            }

            .knowvia-source-area {
                margin-top: 12px;
            }

            #knowviaNotesInput {
                width: 100%;
                box-sizing: border-box;
                resize: vertical;
                padding: 14px;
                border-radius: 12px;
                border: 1px solid rgba(100,100,100,0.2);
                font-family: inherit;
                font-size: 14px;
                background: rgba(255,255,255,0.8);
            }

            .knowvia-upload-label {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                min-height: 80px;
                border: 2px dashed rgba(100,100,100,0.25);
                border-radius: 14px;
                cursor: pointer;
                padding: 15px;
                text-align: center;
                transition: 0.2s ease;
            }

            .knowvia-upload-label:hover {
                border-color: #2563eb;
                background: rgba(37,99,235,0.05);
            }

            .knowvia-upload-icon {
                font-size: 25px;
            }

            .knowvia-source-help {
                margin-top: 10px;
                font-size: 13px;
                line-height: 1.5;
                opacity: 0.75;
            }

            .knowvia-image-preview {
                margin-top: 15px;
                text-align: center;
            }

            .knowvia-image-preview img {
                max-width: 100%;
                max-height: 350px;
                border-radius: 12px;
                object-fit: contain;
                box-shadow: 0 4px 15px rgba(0,0,0,0.12);
            }

            body.dark-mode .knowvia-source-box,
            body.dark .knowvia-source-box {
                background: rgba(30,30,30,0.75);
                border-color: rgba(255,255,255,0.12);
            }

            body.dark-mode #knowviaNotesInput,
            body.dark #knowviaNotesInput {
                background: rgba(20,20,20,0.8);
                color: white;
                border-color: rgba(255,255,255,0.15);
            }

            body.dark-mode .knowvia-source-btn,
            body.dark .knowvia-source-btn {
                color: white;
                border-color: rgba(255,255,255,0.2);
            }

            @media (max-width: 600px) {

                .knowvia-source-options {
                    flex-direction: column;
                }

                .knowvia-source-btn {
                    width: 100%;
                }

            }

        `;

        document.head.appendChild(style);
    }


    /* ============================================================
       SOURCE CONTROL EVENTS
       ============================================================ */

    function setupSourceControls() {

        const sourceButtons =
            document.querySelectorAll(
                ".knowvia-source-btn"
            );


        sourceButtons.forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    sourceButtons.forEach(function (btn) {
                        btn.classList.remove("active");
                    });

                    button.classList.add("active");

                    currentSourceType =
                        button.dataset.source;


                    const notesArea =
                        document.getElementById(
                            "knowviaNotesArea"
                        );

                    const imageArea =
                        document.getElementById(
                            "knowviaImageArea"
                        );

                    const pdfArea =
                        document.getElementById(
                            "knowviaPdfArea"
                        );


                    if (notesArea) {
                        notesArea.style.display =
                            currentSourceType === "notes"
                                ? "block"
                                : "none";
                    }


                    if (imageArea) {
                        imageArea.style.display =
                            currentSourceType === "image"
                                ? "block"
                                : "none";
                    }


                    if (pdfArea) {
                        pdfArea.style.display =
                            currentSourceType === "pdf"
                                ? "block"
                                : "none";
                    }


                    if (
                        currentSourceType === "topic"
                    ) {

                        toast(
                            "Topic mode selected.",
                            "info"
                        );

                    } else if (
                        currentSourceType === "notes"
                    ) {

                        toast(
                            "Paste your notes below.",
                            "info"
                        );

                    } else if (
                        currentSourceType === "image"
                    ) {

                        toast(
                            "Upload a clear image of your handwritten notes.",
                            "info"
                        );

                    } else if (
                        currentSourceType === "pdf"
                    ) {

                        toast(
                            "Upload your PDF study material.",
                            "info"
                        );

                    }

                }
            );

        });


        setupImageUpload();

        setupPDFUpload();
    }


    /* ============================================================
       HANDWRITTEN NOTE IMAGE UPLOAD
       ============================================================ */

    function setupImageUpload() {

        const input =
            document.getElementById(
                "knowviaImageInput"
            );

        if (!input) {
            return;
        }


        input.addEventListener(
            "change",
            async function () {

                const file = input.files[0];

                if (!file) {
                    return;
                }


                if (!file.type.startsWith("image/")) {

                    toast(
                        "Please select an image file.",
                        "error"
                    );

                    input.value = "";
                    return;
                }


                const preview =
                    document.getElementById(
                        "knowviaImagePreview"
                    );

                const status =
                    document.getElementById(
                        "knowviaOCRStatus"
                    );


                if (preview) {

                    const imageURL =
                        URL.createObjectURL(file);

                    preview.innerHTML = `
                        <img
                            src="${imageURL}"
                            alt="Handwritten notes preview">
                    `;
                }


                if (status) {

                    status.textContent =
                        "Reading handwritten notes...";
                }


                try {

                    currentMaterial =
                        await extractTextFromImage(file);


                    if (!currentMaterial.trim()) {

                        throw new Error(
                            "No readable text was found in the image."
                        );

                    }


                    if (status) {

                        status.textContent =
                            "✓ Handwritten notes read successfully. " +
                            "Knowvia can now create study material from them.";
                    }


                    toast(
                        "Handwritten notes processed successfully.",
                        "success"
                    );


                } catch (error) {

                    console.error(
                        "OCR Error:",
                        error
                    );


                    currentMaterial = "";


                    if (status) {

                        status.textContent =
                            "Could not read the image. " +
                            "Try a clearer, well-lit image.";
                    }


                    toast(
                        error.message ||
                        "Could not read handwritten notes.",
                        "error"
                    );

                }

            }
        );
    }


    /* ============================================================
       LOAD TESSERACT.JS
       
       Tesseract is used to read text from handwritten/image notes.
       It is loaded only when the user selects an image.
       ============================================================ */

    async function loadTesseract() {

        if (window.Tesseract) {
            return window.Tesseract;
        }


        return new Promise(function (resolve, reject) {

            const existingScript =
                document.querySelector(
                    'script[data-knowvia-tesseract]'
                );


            if (existingScript) {

                existingScript.addEventListener(
                    "load",
                    function () {
                        resolve(window.Tesseract);
                    }
                );

                existingScript.addEventListener(
                    "error",
                    function () {
                        reject(
                            new Error(
                                "Could not load handwriting recognition."
                            )
                        );
                    }
                );

                return;
            }


            const script =
                document.createElement("script");

            script.src =
                "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

            script.async = true;

            script.dataset.knowviaTesseract =
                "true";


            script.onload = function () {

                if (window.Tesseract) {
                    resolve(window.Tesseract);
                } else {
                    reject(
                        new Error(
                            "Handwriting recognition library loaded incorrectly."
                        )
                    );
                }

            };


            script.onerror = function () {

                reject(
                    new Error(
                        "Could not load handwriting recognition library."
                    )
                );

            };


            document.head.appendChild(script);

        });
    }


    /* ============================================================
       IMAGE → TEXT
       ============================================================ */

    async function extractTextFromImage(file) {

        const Tesseract =
            await loadTesseract();


        if (!Tesseract) {

            throw new Error(
                "OCR library is unavailable."
            );

        }


        const result =
            await Tesseract.recognize(
                file,
                "eng",
                {
                    logger: function (message) {

                        const status =
                            document.getElementById(
                                "knowviaOCRStatus"
                            );

                        if (
                            status &&
                            message &&
                            message.status
                        ) {

                            const progress =
                                message.progress
                                    ? Math.round(
                                        message.progress * 100
                                    )
                                    : 0;

                            status.textContent =
                                "Reading notes... " +
                                progress +
                                "%";

                        }

                    }
                }
            );


        if (
            !result ||
            !result.data ||
            !result.data.text
        ) {

            return "";
        }


        return result.data.text.trim();
    }


    /* ============================================================
       PDF UPLOAD
       ============================================================ */

    function setupPDFUpload() {

        const input =
            document.getElementById(
                "knowviaPdfInput"
            );

        if (!input) {
            return;
        }


        input.addEventListener(
            "change",
            async function () {

                const file = input.files[0];

                if (!file) {
                    return;
                }


                if (
                    file.type !==
                    "application/pdf"
                ) {

                    toast(
                        "Please select a PDF file.",
                        "error"
                    );

                    input.value = "";

                    return;
                }


                const info =
                    document.getElementById(
                        "knowviaPdfInfo"
                    );


                if (info) {

                    info.textContent =
                        "Reading PDF...";
                }


                try {

                    currentMaterial =
                        await extractTextFromPDF(file);


                    if (!currentMaterial.trim()) {

                        throw new Error(
                            "No readable text was found in this PDF."
                        );

                    }


                    if (info) {

                        info.innerHTML =
                            `
                            <strong>✓ PDF processed</strong><br>
                            ${escapeHTML(file.name)}
                            <br>
                            ${currentMaterial.length.toLocaleString()}
                            characters extracted.
                            `;
                    }


                    toast(
                        "PDF processed successfully.",
                        "success"
                    );


                } catch (error) {

                    console.error(
                        "PDF Error:",
                        error
                    );


                    currentMaterial = "";


                    if (info) {

                        info.textContent =
                            error.message ||
                            "Could not read this PDF.";
                    }


                    toast(
                        error.message ||
                        "Could not process the PDF.",
                        "error"
                    );

                }

            }
        );
    }


    /* ============================================================
       LOAD PDF.JS
       
       PDF.js extracts selectable text from PDF pages.
       ============================================================ */

    async function loadPDFJS() {

        if (window.pdfjsLib) {
            return window.pdfjsLib;
        }


        return new Promise(function (resolve, reject) {

            const existingScript =
                document.querySelector(
                    'script[data-knowvia-pdfjs]'
                );


            if (existingScript) {

                existingScript.addEventListener(
                    "load",
                    function () {

                        if (window.pdfjsLib) {
                            resolve(window.pdfjsLib);
                        } else {
                            reject(
                                new Error(
                                    "PDF reader loaded incorrectly."
                                )
                            );
                        }

                    }
                );


                existingScript.addEventListener(
                    "error",
                    function () {

                        reject(
                            new Error(
                                "Could not load the PDF reader."
                            )
                        );

                    }
                );

                return;
            }


            const script =
                document.createElement("script");


            script.src =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";


            script.async = true;

            script.dataset.knowviaPdfjs =
                "true";


            script.onload = function () {

                if (!window.pdfjsLib) {

                    reject(
                        new Error(
                            "PDF reader is unavailable."
                        )
                    );

                    return;
                }


                try {

                    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

                } catch (error) {

                    console.warn(
                        "Could not configure PDF worker.",
                        error
                    );

                }


                resolve(
                    window.pdfjsLib
                );

            };


            script.onerror = function () {

                reject(
                    new Error(
                        "Could not load PDF.js."
                    )
                );

            };


            document.head.appendChild(script);

        });
    }


    /* ============================================================
       PDF → TEXT
       
       Reads text from every page.
       ============================================================ */

    async function extractTextFromPDF(file) {

        const pdfjsLib =
            await loadPDFJS();


        const arrayBuffer =
            await file.arrayBuffer();


        const typedArray =
            new Uint8Array(
                arrayBuffer
            );


        const pdf =
            await pdfjsLib.getDocument(
                {
                    data: typedArray
                }
            ).promise;


        let completeText = "";


        for (
            let pageNumber = 1;
            pageNumber <= pdf.numPages;
            pageNumber++
        ) {

            const page =
                await pdf.getPage(
                    pageNumber
                );


            const textContent =
                await page.getTextContent();


            const pageText =
                textContent.items
                    .map(function (item) {
                        return item.str || "";
                    })
                    .join(" ");


            completeText +=
                "\n\n--- Page " +
                pageNumber +
                " ---\n\n" +
                pageText;


            const info =
                document.getElementById(
                    "knowviaPdfInfo"
                );


            if (info) {

                info.textContent =
                    "Reading PDF page " +
                    pageNumber +
                    " of " +
                    pdf.numPages +
                    "...";

            }

        }


        return completeText.trim();
    }


    /* ============================================================
       GET CURRENT STUDY MATERIAL
       
       Decides what should be sent to the AI.
       ============================================================ */

    function getStudyMaterial() {

        if (
            currentSourceType === "topic"
        ) {

            return "";

        }


        if (
            currentSourceType === "notes"
        ) {

            const notesInput =
                document.getElementById(
                    "knowviaNotesInput"
                );


            if (!notesInput) {
                return "";
            }


            return notesInput.value.trim();

        }


        if (
            currentSourceType === "image"
        ) {

            return currentMaterial.trim();

        }


        if (
            currentSourceType === "pdf"
        ) {

            return currentMaterial.trim();

        }


        return "";
    }


    /* ============================================================
       BUILD AI CONTEXT
       
       This is used by the remaining parts of app.js.
       ============================================================ */

    function buildAIContext() {

        const difficulty =
            difficultyInput
                ? difficultyInput.value
                : "beginner";


        const topic =
            topicInput
                ? topicInput.value.trim()
                : "";


        const material =
            getStudyMaterial();


        return {

            topic: topic,

            difficulty: difficulty,

            material: material,

            sourceType: currentSourceType

        };
    }


    /* ============================================================
       INITIALIZE SOURCE CONTROLS
       ============================================================ */

    createSourceControls();


    /* ============================================================
       BASIC THEME BUTTON
       
       The complete dark-mode behavior will be enhanced in Part 3.
       ============================================================ */

    if (themeBtn) {

        themeBtn.addEventListener(
            "click",
            function () {

                document.body.classList.toggle(
                    "dark-mode"
                );

                document.body.classList.toggle(
                    "dark"
                );


                const isDark =
                    document.body.classList.contains(
                        "dark-mode"
                    );


                themeBtn.textContent =
                    isDark
                        ? "☀"
                        : "◐";

            }
        );

    }


  


    /* ============================================================
       EXPOSE IMPORTANT FUNCTIONS
       
       Parts 2 and 3 can use these functions safely.
       ============================================================ */

    window.Knowvia = {

        callAI: callKnowviaAI,

        formatAIResponse: formatAIResponse,

        parseJSON: parseJSON,

        escapeHTML: escapeHTML,

        toast: toast,

        setBusy: setBusy,

        buildAIContext: buildAIContext,

        getStudyMaterial: getStudyMaterial,

        extractTextFromPDF: extractTextFromPDF,

        extractTextFromImage: extractTextFromImage,

        get currentSource() {
            return currentSourceType;
        },

        get currentMaterial() {
            return currentMaterial;
        },

        get currentTopic() {
            return currentTopic;
        }

    };


})();
/* ============================================================
   KNOWVIA - PART 2
   AI SUMMARY + FLASHCARDS + QUIZ
   ============================================================ */


/* ============================================================
   STUDY PACK STATE
   ============================================================ */

let studySummary = "";
let studyFlashcards = [];
let studyQuiz = [];

let quizScore = 0;
let quizAnswered = false;


/* ============================================================
   SHOW LOADING MESSAGE
   ============================================================ */

function showStudyLoading(message) {

    if (summaryContent) {

        summaryContent.innerHTML = `
            <div class="knowvia-loading">

                <div class="knowvia-spinner"></div>

                <h3>${escapeHTML(message)}</h3>

                <p>
                    Knowvia AI is preparing your study material...
                </p>

            </div>
        `;

    }

}


/* ============================================================
   GENERATE AI SUMMARY
   ============================================================ */

async function generateAISummary(context) {

    const answer =
        await callKnowviaAI({

            task: "summary",

            topic: context.topic,

            difficulty: context.difficulty,

            material: context.material

        });


    if (!answer || !answer.trim()) {

        throw new Error(
            "AI returned an empty summary."
        );

    }


    return answer.trim();
}


/* ============================================================
   NORMALIZE FLASHCARDS
   ============================================================ */

function normalizeFlashcards(data) {

    let cards = data;


    /*
     * Sometimes AI may return:
     *
     * {
     *   "flashcards": [...]
     * }
     *
     * Handle that format too.
     */

    if (
        data &&
        !Array.isArray(data) &&
        Array.isArray(data.flashcards)
    ) {

        cards = data.flashcards;

    }


    if (!Array.isArray(cards)) {

        return [];

    }


    return cards
        .map(function (card) {

            if (!card) {
                return null;
            }


            const question =
                card.question ||
                card.front ||
                card.q ||
                "";


            const answer =
                card.answer ||
                card.back ||
                card.a ||
                "";


            if (
                !String(question).trim() ||
                !String(answer).trim()
            ) {

                return null;

            }


            return {

                question:
                    String(question).trim(),

                answer:
                    String(answer).trim()

            };

        })
        .filter(Boolean);

}


/* ============================================================
   GENERATE AI FLASHCARDS
   ============================================================ */

async function generateAIFlashcards(context) {

    const answer =
        await callKnowviaAI({

            task: "flashcards",

            topic: context.topic,

            difficulty: context.difficulty,

            material: context.material

        });


    let parsed =
        parseJSON(answer);


    /*
     * If the AI response is not directly JSON,
     * try to extract it.
     */

    if (!parsed) {

        const match =
            answer.match(
                /\[[\s\S]*\]/
            );


        if (match) {

            parsed =
                parseJSON(match[0]);

        }

    }


    const cards =
        normalizeFlashcards(parsed);


    /*
     * Fallback:
     *
     * If the model accidentally returns normal text,
     * create one useful flashcard from the response.
     */

    if (
        cards.length === 0 &&
        answer.trim()
    ) {

        return [

            {

                question:
                    "What are the important points about " +
                    (
                        context.topic ||
                        "this study material"
                    ) +
                    "?",

                answer:
                    answer.trim()

            }

        ];

    }


    return cards;

}


/* ============================================================
   NORMALIZE QUIZ
   ============================================================ */

function normalizeQuiz(data) {

    let questions = data;


    /*
     * Handle:
     *
     * {
     *   "quiz": [...]
     * }
     */

    if (
        data &&
        !Array.isArray(data) &&
        Array.isArray(data.quiz)
    ) {

        questions =
            data.quiz;

    }


    if (!Array.isArray(questions)) {

        return [];

    }


    return questions
        .map(function (question) {

            if (!question) {
                return null;
            }


            const text =
                question.question ||
                question.q ||
                "";


            let options =
                question.options ||
                question.choices ||
                [];


            if (!Array.isArray(options)) {

                options =
                    Object.values(options);

            }


            options =
                options
                    .map(function (option) {
                        return String(option);
                    })
                    .filter(function (option) {
                        return option.trim() !== "";
                    });


            let correctAnswer =
                question.correctAnswer;


            if (
                correctAnswer === undefined
            ) {

                correctAnswer =
                    question.answer;

            }


            if (
                correctAnswer === undefined
            ) {

                correctAnswer =
                    question.correct;

            }


            /*
             * AI may return the correct answer as:
             *
             * 0
             * 1
             * 2
             * 3
             *
             * or:
             *
             * "A"
             * "B"
             * "C"
             * "D"
             *
             * or the actual answer text.
             */


            let correctIndex =
                Number(correctAnswer);


            if (
                !Number.isInteger(correctIndex) ||
                correctIndex < 0 ||
                correctIndex >= options.length
            ) {

                correctIndex = -1;

            }


            if (correctIndex === -1) {

                const letters = [
                    "A",
                    "B",
                    "C",
                    "D",
                    "E"
                ];


                const answerString =
                    String(
                        correctAnswer || ""
                    ).trim();


                const letterIndex =
                    letters.indexOf(
                        answerString.toUpperCase()
                    );


                if (
                    letterIndex >= 0 &&
                    letterIndex < options.length
                ) {

                    correctIndex =
                        letterIndex;

                }

            }


            if (correctIndex === -1) {

                const answerString =
                    String(
                        correctAnswer || ""
                    ).trim()
                    .toLowerCase();


                const foundIndex =
                    options.findIndex(
                        function (option) {

                            return (
                                option
                                    .trim()
                                    .toLowerCase() ===
                                answerString
                            );

                        }
                    );


                if (foundIndex >= 0) {

                    correctIndex =
                        foundIndex;

                }

            }


            /*
             * Some AI responses use:
             *
             * correctAnswer: "2"
             *
             * which Number() already handles.
             */


            if (
                !String(text).trim() ||
                options.length < 2
            ) {

                return null;

            }


            return {

                question:
                    String(text).trim(),

                options:
                    options,

                correctIndex:
                    correctIndex,

                explanation:
                    String(
                        question.explanation ||
                        question.reason ||
                        ""
                    ).trim()

            };

        })
        .filter(Boolean);

}


/* ============================================================
   GENERATE AI QUIZ
   ============================================================ */

async function generateAIQuiz(context) {

    const answer =
        await callKnowviaAI({

            task: "quiz",

            topic: context.topic,

            difficulty: context.difficulty,

            material: context.material

        });


    let parsed =
        parseJSON(answer);


    if (!parsed) {

        const match =
            answer.match(
                /\[[\s\S]*\]/
            );


        if (match) {

            parsed =
                parseJSON(match[0]);

        }

    }


    return normalizeQuiz(parsed);

}


/* ============================================================
   RENDER SUMMARY
   ============================================================ */

function renderSummary(summary) {

    if (!summaryContent) {
        return;
    }


    summaryContent.innerHTML = `

        <div class="knowvia-ai-summary">

            <div class="knowvia-ai-badge">
                🤖 AI Generated
            </div>

            <div class="knowvia-summary-text">
                ${formatAIResponse(summary)}
            </div>

        </div>

    `;

}


/* ============================================================
   FLASHCARD DISPLAY
   ============================================================ */

function showFlashcard() {

    if (!flashcard) {
        return;
    }


    if (
        !studyFlashcards ||
        studyFlashcards.length === 0
    ) {

        if (cardQuestion) {

            cardQuestion.textContent =
                "No flashcards available.";

        }


        if (cardAnswer) {

            cardAnswer.textContent =
                "Try generating the study material again.";

        }


        if (cardProgress) {

            cardProgress.textContent =
                "Card 0 / 0";

        }


        return;

    }


    const card =
        studyFlashcards[
            currentCardIndex
        ];


    if (!card) {
        return;
    }


    if (cardQuestion) {

        cardQuestion.innerHTML =
            formatAIResponse(
                card.question
            );

    }


    if (cardAnswer) {

        cardAnswer.innerHTML =
            formatAIResponse(
                card.answer
            );

    }


    if (cardProgress) {

        cardProgress.textContent =
            "Card " +
            (currentCardIndex + 1) +
            " / " +
            studyFlashcards.length;

    }


    flashcard.classList.remove(
        "flipped"
    );

}


/* ============================================================
   FLASHCARD - NEXT
   ============================================================ */

function nextFlashcard() {

    if (
        studyFlashcards.length === 0
    ) {

        return;

    }


    currentCardIndex++;


    if (
        currentCardIndex >=
        studyFlashcards.length
    ) {

        currentCardIndex = 0;

    }


    showFlashcard();

}


/* ============================================================
   FLASHCARD - PREVIOUS
   ============================================================ */

function previousFlashcard() {

    if (
        studyFlashcards.length === 0
    ) {

        return;

    }


    currentCardIndex--;


    if (currentCardIndex < 0) {

        currentCardIndex =
            studyFlashcards.length - 1;

    }


    showFlashcard();

}


/* ============================================================
   FLASHCARD - FLIP
   ============================================================ */

function flipCurrentFlashcard() {

    if (!flashcard) {
        return;
    }


    flashcard.classList.toggle(
        "flipped"
    );

}


/* ============================================================
   SETUP FLASHCARD BUTTONS
   ============================================================ */

function setupFlashcardControls() {

    if (nextCard) {

        nextCard.addEventListener(
            "click",
            nextFlashcard
        );

    }


    if (prevCard) {

        prevCard.addEventListener(
            "click",
            previousFlashcard
        );

    }


    if (flipCard) {

        flipCard.addEventListener(
            "click",
            flipCurrentFlashcard
        );

    }


    /*
     * Allow clicking the flashcard itself
     * to flip it.
     */

    if (flashcard) {

        flashcard.addEventListener(
            "click",
            function () {

                flipCurrentFlashcard();

            }
        );

    }

}


/* ============================================================
   RENDER QUIZ
   ============================================================ */

function renderQuiz() {

    if (!quizContainer) {
        return;
    }


    currentQuizIndex = 0;

    quizScore = 0;

    currentQuizAnswers =
        new Array(
            studyQuiz.length
        ).fill(null);


    if (
        !studyQuiz ||
        studyQuiz.length === 0
    ) {

        quizContainer.innerHTML = `

            <div class="knowvia-empty-quiz">

                <div style="font-size:40px;">
                    📝
                </div>

                <h3>
                    Quiz could not be loaded
                </h3>

                <p>
                    Please generate the study material again.
                </p>

            </div>

        `;

        return;

    }


    renderQuizQuestion();

}


/* ============================================================
   RENDER CURRENT QUIZ QUESTION
   ============================================================ */

function renderQuizQuestion() {

    if (!quizContainer) {
        return;
    }


    const question =
        studyQuiz[
            currentQuizIndex
        ];


    if (!question) {

        showQuizResult();

        return;

    }


    const total =
        studyQuiz.length;


    const progress =
        currentQuizIndex + 1;


    quizContainer.innerHTML = `

        <div class="knowvia-quiz-card">

            <div class="knowvia-quiz-header">

                <span>
                    Question ${progress} of ${total}
                </span>

                <span>
                    Score: ${quizScore}
                </span>

            </div>


            <div class="knowvia-quiz-progress">

                <div
                    class="knowvia-quiz-progress-bar"
                    style="width:${(progress / total) * 100}%;">
                </div>

            </div>


            <h3 class="knowvia-question">

                ${escapeHTML(
                    question.question
                )}

            </h3>


            <div class="knowvia-options">

                ${question.options
                    .map(
                        function (
                            option,
                            index
                        ) {

                            return `

                                <button
                                    type="button"
                                    class="knowvia-option"
                                    data-index="${index}">

                                    <span class="knowvia-option-letter">
                                        ${String.fromCharCode(
                                            65 + index
                                        )}
                                    </span>

                                    <span>
                                        ${escapeHTML(
                                            option
                                        )}
                                    </span>

                                </button>

                            `;

                        }
                    )
                    .join("")}

            </div>


            <div
                id="knowviaQuizFeedback"
                class="knowvia-quiz-feedback">
            </div>


            <div class="knowvia-quiz-actions">

                <button
                    type="button"
                    id="knowviaNextQuestion"
                    class="knowvia-next-question"
                    disabled>

                    ${
                        progress === total
                            ? "Finish Quiz"
                            : "Next Question"
                    }

                </button>

            </div>

        </div>

    `;


    const options =
        quizContainer.querySelectorAll(
            ".knowvia-option"
        );


    options.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    answerQuizQuestion(
                        Number(
                            button.dataset.index
                        )
                    );

                }
            );

        }
    );


    const nextButton =
        document.getElementById(
            "knowviaNextQuestion"
        );


    if (nextButton) {

        nextButton.addEventListener(
            "click",
            function () {

                currentQuizIndex++;

                if (
                    currentQuizIndex >=
                    studyQuiz.length
                ) {

                    showQuizResult();

                } else {

                    renderQuizQuestion();

                }

            }
        );

    }

}


/* ============================================================
   ANSWER QUIZ QUESTION
   ============================================================ */

function answerQuizQuestion(selectedIndex) {

    if (quizAnswered) {
        return;
    }


    quizAnswered = true;


    const question =
        studyQuiz[
            currentQuizIndex
        ];


    if (!question) {
        return;
    }


    currentQuizAnswers[
        currentQuizIndex
    ] = selectedIndex;


    const isCorrect =
        selectedIndex ===
        question.correctIndex;


    if (isCorrect) {

        quizScore++;

    }


    const options =
        quizContainer.querySelectorAll(
            ".knowvia-option"
        );


    options.forEach(
        function (button, index) {

            button.disabled = true;


            if (
                index ===
                question.correctIndex
            ) {

                button.classList.add(
                    "correct"
                );

            }


            if (
                index === selectedIndex &&
                !isCorrect
            ) {

                button.classList.add(
                    "wrong"
                );

            }

        }
    );


    const feedback =
        document.getElementById(
            "knowviaQuizFeedback"
        );


    if (feedback) {

        if (isCorrect) {

            feedback.innerHTML = `

                <div class="knowvia-correct-message">

                    ✓ Correct!

                </div>

                ${
                    question.explanation
                        ? `
                            <div class="knowvia-explanation">
                                ${formatAIResponse(
                                    question.explanation
                                )}
                            </div>
                        `
                        : ""
                }

            `;

        } else {

            const correctAnswer =
                question.correctIndex >= 0
                    ? question.options[
                        question.correctIndex
                    ]
                    : "See the correct option above.";


            feedback.innerHTML = `

                <div class="knowvia-wrong-message">

                    ✗ Not quite.

                </div>

                <div class="knowvia-correct-answer">

                    Correct answer:
                    <strong>
                        ${escapeHTML(
                            correctAnswer
                        )}
                    </strong>

                </div>

                ${
                    question.explanation
                        ? `
                            <div class="knowvia-explanation">
                                ${formatAIResponse(
                                    question.explanation
                                )}
                            </div>
                        `
                        : ""
                }

            `;

        }

    }


    const nextButton =
        document.getElementById(
            "knowviaNextQuestion"
        );


    if (nextButton) {

        nextButton.disabled = false;

    }


    /*
     * Reset for the next question only when
     * the user actually moves forward.
     */

    setTimeout(
        function () {

            quizAnswered = false;

        },
        100
    );

}


/* ============================================================
   QUIZ RESULT
   ============================================================ */

function showQuizResult() {

    if (!quizContainer) {
        return;
    }


    const total =
        studyQuiz.length;


    const percentage =
        total > 0
            ? Math.round(
                (quizScore / total) * 100
            )
            : 0;


    let message = "";


    if (percentage >= 90) {

        message =
            "Excellent! You have a strong understanding of this topic.";

    } else if (percentage >= 75) {

        message =
            "Great work! You understand most of the important concepts.";

    } else if (percentage >= 50) {

        message =
            "Good attempt. Review the concepts you missed and try again.";

    } else {

        message =
            "Keep practicing. Go through the summary and flashcards once more.";

    }


    quizContainer.innerHTML = `

        <div class="knowvia-quiz-result">

            <div class="knowvia-result-icon">
                ${
                    percentage >= 75
                        ? "🎉"
                        : percentage >= 50
                            ? "👍"
                            : "📚"
                }
            </div>


            <h2>
                Quiz Completed!
            </h2>


            <div class="knowvia-score-circle">

                <strong>
                    ${percentage}%
                </strong>

                <span>
                    ${quizScore} / ${total}
                </span>

            </div>


            <p class="knowvia-result-message">
                ${escapeHTML(message)}
            </p>


            <div class="knowvia-result-actions">

                <button
                    type="button"
                    id="knowviaRetryQuiz">

                    🔄 Retry Quiz

                </button>

            </div>

        </div>

    `;


    const retryButton =
        document.getElementById(
            "knowviaRetryQuiz"
        );


    if (retryButton) {

        retryButton.addEventListener(
            "click",
            function () {

                renderQuiz();

            }
        );

    }

}


/* ============================================================
   CREATE AI STUDY PACK
   ============================================================ */

async function generateCompleteStudyPack() {

    if (isGenerating) {
        return;
    }


    const context =
        buildAIContext();


    /*
     * Validate input.
     */

    if (
        !context.topic &&
        !context.material
    ) {

        toast(
            "Enter a topic or provide study material first.",
            "error"
        );

        return;

    }


    /*
     * For material modes, make sure
     * actual material exists.
     */

    if (
        context.sourceType !== "topic" &&
        !context.material
    ) {

        if (
            context.sourceType === "notes"
        ) {

            toast(
                "Please type or paste your notes first.",
                "error"
            );

        } else if (
            context.sourceType === "image"
        ) {

            toast(
                "Please upload handwritten notes first.",
                "error"
            );

        } else if (
            context.sourceType === "pdf"
        ) {

            toast(
                "Please upload a PDF first.",
                "error"
            );

        }


        return;

    }


    isGenerating = true;


    setBusy(
        generateBtn,
        true,
        "Generating..."
    );


    /*
     * Store current context.
     */

    currentTopic =
        context.topic;


    currentMaterial =
        context.material;


    /*
     * Reset previous content.
     */

    studySummary = "";

    studyFlashcards = [];

    studyQuiz = [];

    currentFlashcards = [];

    currentCardIndex = 0;


    showStudyLoading(
        "Generating your AI study pack..."
    );


    /*
     * Hide/prepare old sections.
     */

    if (flashcardsSection) {

        flashcardsSection.style.display =
            "block";

    }


    if (quizSection) {

        quizSection.style.display =
            "block";

    }


    try {

        /*
         * Run the three AI tasks together.
         *
         * This makes generation faster than
         * waiting for each request separately.
         */

        const results =
            await Promise.all([

                generateAISummary(
                    context
                ),

                generateAIFlashcards(
                    context
                ),

                generateAIQuiz(
                    context
                )

            ]);


        studySummary =
            results[0];


        studyFlashcards =
            results[1];


        studyQuiz =
            results[2];


        /*
         * Keep compatibility with the
         * original flashcard variables.
         */

        currentFlashcards =
            studyFlashcards;


        currentCardIndex = 0;


        /*
         * Render summary.
         */

        renderSummary(
            studySummary
        );


        /*
         * Render flashcards.
         */

        showFlashcard();


        /*
         * Render quiz.
         */

        renderQuiz();


        /*
         * Scroll to summary.
         */

        if (summarySection) {

            summarySection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }


        toast(
            "Your AI study pack is ready! 🎉",
            "success"
        );


    } catch (error) {

        console.error(
            "Study Pack Error:",
            error
        );


        if (summaryContent) {

            summaryContent.innerHTML = `

                <div class="knowvia-error-state">

                    <div style="font-size:40px;">
                        ⚠️
                    </div>

                    <h3>
                        AI generation failed
                    </h3>

                    <p>
                        ${
                            escapeHTML(
                                error.message ||
                                "Something went wrong."
                            )
                        }
                    </p>

                    <p>
                        Please check your Vercel deployment
                        and OpenAI API configuration.
                    </p>

                </div>

            `;

        }


        toast(
            error.message ||
            "Could not generate study material.",
            "error"
        );


    } finally {

        isGenerating = false;


        setBusy(
            generateBtn,
            false
        );

    }

}


/* ============================================================
   GENERATE BUTTON
   ============================================================ */

if (generateBtn) {

    generateBtn.addEventListener(
        "click",
        generateCompleteStudyPack
    );

}


/* ============================================================
   SETUP FLASHCARD CONTROLS
   ============================================================ */

setupFlashcardControls();


/* ============================================================
   ADD AI STUDY PACK STYLES
   ============================================================ */

function addStudyPackStyles() {

    if (
        document.getElementById(
            "knowviaStudyPackStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement("style");


    style.id =
        "knowviaStudyPackStyles";


    style.textContent = `

        /* =========================================
           LOADING
           ========================================= */

        .knowvia-loading {
            text-align: center;
            padding: 45px 20px;
        }


        .knowvia-spinner {
            width: 42px;
            height: 42px;
            margin: 0 auto 20px;
            border: 4px solid rgba(100,100,100,0.2);
            border-top-color: #2563eb;
            border-radius: 50%;
            animation: knowviaSpin 0.8s linear infinite;
        }


        @keyframes knowviaSpin {

            to {
                transform: rotate(360deg);
            }

        }


        /* =========================================
           AI BADGE
           ========================================= */

        .knowvia-ai-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 11px;
            border-radius: 20px;
            background: rgba(37,99,235,0.1);
            color: #2563eb;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 15px;
        }


        .knowvia-summary-text {
            line-height: 1.75;
        }


        .knowvia-summary-text h2,
        .knowvia-summary-text h3,
        .knowvia-summary-text h4 {
            margin-top: 20px;
            margin-bottom: 10px;
        }


        .knowvia-summary-text ul {
            padding-left: 25px;
        }


        /* =========================================
           QUIZ
           ========================================= */

        .knowvia-quiz-card {
            padding: 22px;
            border-radius: 18px;
            border: 1px solid rgba(100,100,100,0.15);
            background: rgba(255,255,255,0.7);
        }


        .knowvia-quiz-header {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 12px;
        }


        .knowvia-quiz-progress {
            height: 7px;
            background: rgba(100,100,100,0.12);
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 25px;
        }


        .knowvia-quiz-progress-bar {
            height: 100%;
            background: #2563eb;
            border-radius: 10px;
            transition: width 0.3s ease;
        }


        .knowvia-question {
            font-size: 20px;
            line-height: 1.5;
            margin-bottom: 22px;
        }


        .knowvia-options {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }


        .knowvia-option {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            padding: 14px 16px;
            border: 1px solid rgba(100,100,100,0.2);
            background: transparent;
            border-radius: 12px;
            text-align: left;
            cursor: pointer;
            font-size: 15px;
            transition: 0.2s ease;
        }


        .knowvia-option:hover:not(:disabled) {
            border-color: #2563eb;
            transform: translateY(-1px);
        }


        .knowvia-option:disabled {
            cursor: default;
        }


        .knowvia-option.correct {
            border-color: #16a34a;
            background: rgba(22,163,74,0.1);
        }


        .knowvia-option.wrong {
            border-color: #dc2626;
            background: rgba(220,38,38,0.1);
        }


        .knowvia-option-letter {
            width: 30px;
            height: 30px;
            min-width: 30px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(100,100,100,0.1);
            font-weight: 700;
        }


        .knowvia-quiz-feedback {
            margin-top: 18px;
        }


        .knowvia-correct-message {
            color: #16a34a;
            font-weight: 800;
            font-size: 17px;
        }


        .knowvia-wrong-message {
            color: #dc2626;
            font-weight: 800;
            font-size: 17px;
        }


        .knowvia-correct-answer {
            margin-top: 8px;
            line-height: 1.5;
        }


        .knowvia-explanation {
            margin-top: 10px;
            padding: 12px;
            border-radius: 10px;
            background: rgba(100,100,100,0.06);
            line-height: 1.6;
        }


        .knowvia-quiz-actions {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
        }


        .knowvia-next-question {
            padding: 11px 18px;
            border: none;
            border-radius: 10px;
            background: #2563eb;
            color: white;
            font-weight: 700;
            cursor: pointer;
        }


        .knowvia-next-question:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }


        /* =========================================
           QUIZ RESULT
           ========================================= */

        .knowvia-quiz-result {
            text-align: center;
            padding: 40px 20px;
        }


        .knowvia-result-icon {
            font-size: 50px;
            margin-bottom: 10px;
        }


        .knowvia-score-circle {
            width: 130px;
            height: 130px;
            margin: 25px auto;
            border-radius: 50%;
            border: 8px solid rgba(37,99,235,0.15);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }


        .knowvia-score-circle strong {
            font-size: 30px;
        }


        .knowvia-score-circle span {
            font-size: 13px;
            opacity: 0.7;
        }


        .knowvia-result-message {
            max-width: 550px;
            margin: 0 auto 25px;
            line-height: 1.6;
        }


        .knowvia-result-actions button {
            border: none;
            padding: 12px 20px;
            border-radius: 10px;
            background: #2563eb;
            color: white;
            font-weight: 700;
            cursor: pointer;
        }


        /* =========================================
           ERROR
           ========================================= */

        .knowvia-error-state {
            text-align: center;
            padding: 40px 20px;
        }


        .knowvia-error-state h3 {
            margin-top: 10px;
        }


        .knowvia-error-state p {
            line-height: 1.6;
        }


        /* =========================================
           DARK MODE
           ========================================= */

        body.dark-mode .knowvia-quiz-card,
        body.dark .knowvia-quiz-card {

            background: rgba(25,25,25,0.8);

            border-color:
                rgba(255,255,255,0.12);

        }


        body.dark-mode .knowvia-option,
        body.dark .knowvia-option {

            color: white;

            border-color:
                rgba(255,255,255,0.18);

        }


        body.dark-mode .knowvia-explanation,
        body.dark .knowvia-explanation {

            background:
                rgba(255,255,255,0.06);

        }


        body.dark-mode .knowvia-quiz-progress,
        body.dark .knowvia-quiz-progress {

            background:
                rgba(255,255,255,0.12);

        }


        /* =========================================
           MOBILE
           ========================================= */

        @media (max-width: 600px) {

            .knowvia-quiz-card {
                padding: 16px;
            }


            .knowvia-question {
                font-size: 18px;
            }


            .knowvia-quiz-header {
                font-size: 12px;
            }

        }

    `;


    document.head.appendChild(style);

}


addStudyPackStyles();


/* ============================================================
   END PART 2
   ============================================================ */
/* ============================================================
   KNOWVIA - PART 3
   TEACH ME + STUDY SESSION + EXAM MODE
   ASK MY NOTES + WEAK TOPIC DETECTOR
   EXPLAIN MY MISTAKE + FINAL UI
   ============================================================ */


/* ============================================================
   ADVANCED FEATURE STATE
   ============================================================ */

let lastQuizResult = null;

let weakTopics = [];

let studySessionData = null;

let examData = null;

let askNotesHistory = [];


/* ============================================================
   CREATE FEATURE BUTTONS
   ============================================================ */

function createAdvancedFeatureButtons() {

    if (
        document.getElementById(
            "knowviaAdvancedFeatures"
        )
    ) {

        return;
    }


    const container =
        document.createElement("div");


    container.id =
        "knowviaAdvancedFeatures";


    container.innerHTML = `

        <div class="knowvia-feature-heading">

            <span>✨</span>

            <div>

                <h2>
                    AI Study Tools
                </h2>

                <p>
                    Go beyond summaries and flashcards.
                </p>

            </div>

        </div>


        <div class="knowvia-feature-grid">

            <button
                type="button"
                class="knowvia-feature-card"
                data-feature="teach">

                <span class="knowvia-feature-icon">
                    👨‍🏫
                </span>

                <strong>
                    Teach Me
                </strong>

                <small>
                    Learn step-by-step
                </small>

            </button>


            <button
                type="button"
                class="knowvia-feature-card"
                data-feature="session">

                <span class="knowvia-feature-icon">
                    ⏱️
                </span>

                <strong>
                    Study Session
                </strong>

                <small>
                    Guided learning session
                </small>

            </button>


            <button
                type="button"
                class="knowvia-feature-card"
                data-feature="exam">

                <span class="knowvia-feature-icon">
                    📝
                </span>

                <strong>
                    Exam Mode
                </strong>

                <small>
                    Practice exam questions
                </small>

            </button>


            <button
                type="button"
                class="knowvia-feature-card"
                data-feature="ask">

                <span class="knowvia-feature-icon">
                    💬
                </span>

                <strong>
                    Ask My Notes
                </strong>

                <small>
                    Ask questions from your material
                </small>

            </button>


            <button
                type="button"
                class="knowvia-feature-card"
                data-feature="weak">

                <span class="knowvia-feature-icon">
                    🎯
                </span>

                <strong>
                    Weak Topic Detector
                </strong>

                <small>
                    Find what needs practice
                </small>

            </button>


            <button
                type="button"
                class="knowvia-feature-card"
                data-feature="mistake">

                <span class="knowvia-feature-icon">
                    ❌
                </span>

                <strong>
                    Explain My Mistake
                </strong>

                <small>
                    Understand wrong answers
                </small>

            </button>

        </div>

    `;


    /*
     * Put advanced features after quiz.
     */

    if (quizSection) {

        quizSection.parentNode.insertBefore(
            container,
            quizSection.nextSibling
        );

    } else if (summarySection) {

        summarySection.parentNode.insertBefore(
            container,
            summarySection.nextSibling
        );

    } else {

        document.body.appendChild(
            container
        );

    }


    setupAdvancedFeatureEvents();

}


/* ============================================================
   FEATURE BUTTON EVENTS
   ============================================================ */

function setupAdvancedFeatureEvents() {

    const buttons =
        document.querySelectorAll(
            ".knowvia-feature-card"
        );


    buttons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const feature =
                        button.dataset.feature;


                    handleAdvancedFeature(
                        feature
                    );

                }
            );

        }
    );

}


/* ============================================================
   HANDLE ADVANCED FEATURE
   ============================================================ */

async function handleAdvancedFeature(
    feature
) {

    const context =
        buildAIContext();


    if (
        !context.topic &&
        !context.material
    ) {

        toast(
            "Generate study material first.",
            "error"
        );

        return;
    }


    if (feature === "teach") {

        await openTeachMe(
            context
        );

        return;

    }


    if (feature === "session") {

        await openStudySession(
            context
        );

        return;

    }


    if (feature === "exam") {

        await openExamMode(
            context
        );

        return;

    }


    if (feature === "ask") {

        openAskMyNotes(
            context
        );

        return;

    }


    if (feature === "weak") {

        await openWeakTopicDetector(
            context
        );

        return;

    }


    if (feature === "mistake") {

        openExplainMistake(
            context
        );

        return;

    }

}


/* ============================================================
   MODAL CREATOR
   ============================================================ */

function createKnowviaModal(
    title,
    icon = "✨"
) {

    const existing =
        document.getElementById(
            "knowviaModal"
        );


    if (existing) {

        existing.remove();

    }


    const modal =
        document.createElement("div");


    modal.id =
        "knowviaModal";


    modal.className =
        "knowvia-modal";


    modal.innerHTML = `

        <div class="knowvia-modal-overlay"></div>


        <div
            class="knowvia-modal-window"
            role="dialog"
            aria-modal="true">

            <div class="knowvia-modal-header">

                <div class="knowvia-modal-title">

                    <span>
                        ${icon}
                    </span>

                    <h2>
                        ${escapeHTML(title)}
                    </h2>

                </div>


                <button
                    type="button"
                    class="knowvia-modal-close"
                    id="knowviaModalClose">

                    ×

                </button>

            </div>


            <div
                id="knowviaModalBody"
                class="knowvia-modal-body">

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const closeButton =
        document.getElementById(
            "knowviaModalClose"
        );


    const overlay =
        modal.querySelector(
            ".knowvia-modal-overlay"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeKnowviaModal
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeKnowviaModal
        );

    }


    document.addEventListener(
        "keydown",
        function handleEscape(event) {

            if (
                event.key === "Escape" &&
                document.getElementById(
                    "knowviaModal"
                )
            ) {

                closeKnowviaModal();

            }

        },
        {
            once: true
        }
    );


    return modal;

}


/* ============================================================
   CLOSE MODAL
   ============================================================ */

function closeKnowviaModal() {

    const modal =
        document.getElementById(
            "knowviaModal"
        );


    if (modal) {

        modal.remove();

    }

}


/* ============================================================
   TEACH ME
   ============================================================ */

async function openTeachMe(
    context
) {

    const modal =
        createKnowviaModal(
            "Teach Me",
            "👨‍🏫"
        );


    const body =
        modal.querySelector(
            "#knowviaModalBody"
        );


    body.innerHTML = `

        <div class="knowvia-feature-loading">

            <div class="knowvia-spinner"></div>

            <h3>
                Your AI teacher is preparing...
            </h3>

            <p>
                Knowvia will explain the topic step-by-step
                at the selected difficulty level.
            </p>

        </div>

    `;


    try {

        const answer =
            await callKnowviaAI({

                task: "teach",

                topic:
                    context.topic,

                difficulty:
                    context.difficulty,

                material:
                    context.material

            });


        body.innerHTML = `

            <div class="knowvia-feature-result">

                <div class="knowvia-ai-badge">
                    👨‍🏫 AI Teacher
                </div>

                <div class="knowvia-result-content">

                    ${formatAIResponse(answer)}

                </div>

            </div>

        `;


    } catch (error) {

        body.innerHTML =
            createFeatureError(
                error
            );

    }

}


/* ============================================================
   STUDY SESSION
   ============================================================ */

async function openStudySession(
    context
) {

    const modal =
        createKnowviaModal(
            "Study Session",
            "⏱️"
        );


    const body =
        modal.querySelector(
            "#knowviaModalBody"
        );


    body.innerHTML = `

        <div class="knowvia-feature-loading">

            <div class="knowvia-spinner"></div>

            <h3>
                Building your study session...
            </h3>

            <p>
                Knowvia is creating a focused learning plan.
            </p>

        </div>

    `;


    try {

        const answer =
            await callKnowviaAI({

                task: "study_session",

                topic:
                    context.topic,

                difficulty:
                    context.difficulty,

                material:
                    context.material

            });


        studySessionData =
            answer;


        body.innerHTML = `

            <div class="knowvia-session-result">

                <div class="knowvia-ai-badge">
                    ⏱️ Personalized Study Session
                </div>

                <div class="knowvia-result-content">

                    ${formatAIResponse(answer)}

                </div>


                <div class="knowvia-session-tip">

                    💡 <strong>Tip:</strong>
                    Focus on one concept at a time.
                    After each section, try recalling
                    the idea without looking at your notes.

                </div>

            </div>

        `;


    } catch (error) {

        body.innerHTML =
            createFeatureError(
                error
            );

    }

}


/* ============================================================
   EXAM MODE
   ============================================================ */

async function openExamMode(
    context
) {

    const modal =
        createKnowviaModal(
            "Exam Mode",
            "📝"
        );


    const body =
        modal.querySelector(
            "#knowviaModalBody"
        );


    body.innerHTML = `

        <div class="knowvia-feature-loading">

            <div class="knowvia-spinner"></div>

            <h3>
                Creating exam questions...
            </h3>

            <p>
                Knowvia is preparing questions
                based on your study material.
            </p>

        </div>

    `;


    try {

        const answer =
            await callKnowviaAI({

                task: "exam",

                topic:
                    context.topic,

                difficulty:
                    context.difficulty,

                material:
                    context.material

            });


        examData =
            answer;


        body.innerHTML = `

            <div class="knowvia-exam-result">

                <div class="knowvia-ai-badge">
                    📝 AI Exam Mode
                </div>

                <div class="knowvia-result-content">

                    ${formatAIResponse(answer)}

                </div>


                <div class="knowvia-exam-tip">

                    📌 Try answering the questions
                    yourself before checking the explanations.

                </div>

            </div>

        `;


    } catch (error) {

        body.innerHTML =
            createFeatureError(
                error
            );

    }

}


/* ============================================================
   ASK MY NOTES
   ============================================================ */

function openAskMyNotes(
    context
) {

    const modal =
        createKnowviaModal(
            "Ask My Notes",
            "💬"
        );


    const body =
        modal.querySelector(
            "#knowviaModalBody"
        );


    body.innerHTML = `

        <div class="knowvia-ask-notes">

            <div class="knowvia-ask-intro">

                <div class="knowvia-ai-badge">
                    💬 Ask My Notes
                </div>

                <p>
                    Ask a question about the material
                    you provided. Knowvia will answer
                    using your study material.
                </p>

            </div>


            <textarea
                id="knowviaAskInput"
                class="knowvia-ask-input"
                rows="4"
                placeholder="Example: Explain the difference between supervised and unsupervised learning."></textarea>


            <button
                type="button"
                id="knowviaAskButton"
                class="knowvia-primary-button">

                Ask Knowvia

            </button>


            <div
                id="knowviaAskAnswer"
                class="knowvia-ask-answer">
            </div>

        </div>

    `;


    const askButton =
        document.getElementById(
            "knowviaAskButton"
        );


    const askInput =
        document.getElementById(
            "knowviaAskInput"
        );


    const answerBox =
        document.getElementById(
            "knowviaAskAnswer"
        );


    if (askButton) {

        askButton.addEventListener(
            "click",
            async function () {

                const question =
                    askInput.value.trim();


                if (!question) {

                    toast(
                        "Enter a question first.",
                        "error"
                    );

                    return;

                }


                setBusy(
                    askButton,
                    true,
                    "Thinking..."
                );


                answerBox.innerHTML = `

                    <div class="knowvia-feature-loading">

                        <div class="knowvia-spinner"></div>

                        <p>
                            Searching your study material...
                        </p>

                    </div>

                `;


                try {

                    const answer =
                        await callKnowviaAI({

                            task: "ask_notes",

                            topic:
                                context.topic,

                            difficulty:
                                context.difficulty,

                            material:
                                context.material,

                            question:
                                question

                        });


                    askNotesHistory.push({

                        question:
                            question,

                        answer:
                            answer

                    });


                    answerBox.innerHTML = `

                        <div class="knowvia-answer-card">

                            <div class="knowvia-answer-label">
                                🤖 Knowvia
                            </div>

                            ${formatAIResponse(
                                answer
                            )}

                        </div>

                    `;


                } catch (error) {

                    answerBox.innerHTML =
                        createFeatureError(
                            error
                        );

                } finally {

                    setBusy(
                        askButton,
                        false
                    );

                }

            }
        );

    }

}


/* ============================================================
   WEAK TOPIC DETECTOR
   ============================================================ */

async function openWeakTopicDetector(
    context
) {

    const modal =
        createKnowviaModal(
            "Weak Topic Detector",
            "🎯"
        );


    const body =
        modal.querySelector(
            "#knowviaModalBody"
        );


    body.innerHTML = `

        <div class="knowvia-feature-loading">

            <div class="knowvia-spinner"></div>

            <h3>
                Analyzing your learning...
            </h3>

            <p>
                Knowvia is looking for concepts
                that may need more practice.
            </p>

        </div>

    `;


    /*
     * If the user has completed a quiz,
     * send its result to the AI.
     */

    let quizResultText = "";


    if (
        studyQuiz &&
        studyQuiz.length > 0
    ) {

        const total =
            studyQuiz.length;


        quizResultText =
            "Quiz score: " +
            quizScore +
            " out of " +
            total +
            ".\n";


        studyQuiz.forEach(
            function (
                question,
                index
            ) {

                const selected =
                    currentQuizAnswers[index];


                const correct =
                    question.correctIndex;


                quizResultText +=
                    "\nQuestion " +
                    (index + 1) +
                    ": ";


                if (
                    selected === null ||
                    selected === undefined
                ) {

                    quizResultText +=
                        "Not answered.";

                } else if (
                    selected === correct
                ) {

                    quizResultText +=
                        "Correct.";

                } else {

                    quizResultText +=
                        "Incorrect.";

                }

            }
        );

    } else {

        quizResultText =
            "No completed quiz is available yet.";

    }


    try {

        const answer =
            await callKnowviaAI({

                task: "weak_topics",

                topic:
                    context.topic,

                difficulty:
                    context.difficulty,

                material:
                    context.material,

                quizResult:
                    quizResultText

            });


        weakTopics =
            answer;


        body.innerHTML = `

            <div class="knowvia-weak-result">

                <div class="knowvia-ai-badge">
                    🎯 Learning Analysis
                </div>

                <div class="knowvia-result-content">

                    ${formatAIResponse(answer)}

                </div>


                <div class="knowvia-weak-tip">

                    💡 Review the weakest concepts first,
                    then retake the quiz to measure improvement.

                </div>

            </div>

        `;


    } catch (error) {

        body.innerHTML =
            createFeatureError(
                error
            );

    }

}


/* ============================================================
   EXPLAIN MY MISTAKE
   ============================================================ */

function openExplainMistake(
    context
) {

    const modal =
        createKnowviaModal(
            "Explain My Mistake",
            "❌"
        );


    const body =
        modal.querySelector(
            "#knowviaModalBody"
        );


    body.innerHTML = `

        <div class="knowvia-mistake-form">

            <div class="knowvia-ai-badge">
                ❌ Mistake Analyzer
            </div>


            <p>
                Paste the question, your answer,
                or describe what confused you.
                Knowvia will explain the mistake simply.
            </p>


            <textarea
                id="knowviaMistakeInput"
                class="knowvia-ask-input"
                rows="7"
                placeholder="Example: I thought classification and regression are the same because both predict values. Why is my answer wrong?"></textarea>


            <button
                type="button"
                id="knowviaMistakeButton"
                class="knowvia-primary-button">

                Explain My Mistake

            </button>


            <div
                id="knowviaMistakeAnswer"
                class="knowvia-ask-answer">
            </div>

        </div>

    `;


    const button =
        document.getElementById(
            "knowviaMistakeButton"
        );


    const input =
        document.getElementById(
            "knowviaMistakeInput"
        );


    const answerBox =
        document.getElementById(
            "knowviaMistakeAnswer"
        );


    if (button) {

        button.addEventListener(
            "click",
            async function () {

                const userAnswer =
                    input.value.trim();


                if (!userAnswer) {

                    toast(
                        "Describe your mistake first.",
                        "error"
                    );

                    return;

                }


                setBusy(
                    button,
                    true,
                    "Analyzing..."
                );


                answerBox.innerHTML = `

                    <div class="knowvia-feature-loading">

                        <div class="knowvia-spinner"></div>

                        <p>
                            Understanding your mistake...
                        </p>

                    </div>

                `;


                try {

                    const answer =
                        await callKnowviaAI({

                            task:
                                "explain_mistake",

                            topic:
                                context.topic,

                            difficulty:
                                context.difficulty,

                            material:
                                context.material,

                            userAnswer:
                                userAnswer

                        });


                    answerBox.innerHTML = `

                        <div class="knowvia-answer-card">

                            <div class="knowvia-answer-label">
                                👨‍🏫 Knowvia Explanation
                            </div>

                            ${formatAIResponse(
                                answer
                            )}

                        </div>

                    `;


                } catch (error) {

                    answerBox.innerHTML =
                        createFeatureError(
                            error
                        );

                } finally {

                    setBusy(
                        button,
                        false
                    );

                }

            }
        );

    }

}


/* ============================================================
   FEATURE ERROR
   ============================================================ */

function createFeatureError(
    error
) {

    return `

        <div class="knowvia-error-state">

            <div style="font-size:40px;">
                ⚠️
            </div>

            <h3>
                Something went wrong
            </h3>

            <p>
                ${escapeHTML(
                    error &&
                    error.message
                        ? error.message
                        : "AI request failed."
                )}
            </p>

        </div>

    `;

}


/* ============================================================
   FINAL QUIZ RESULT TRACKING
   ============================================================ */

function saveQuizResult() {

    if (
        !studyQuiz ||
        studyQuiz.length === 0
    ) {

        return;

    }


    const total =
        studyQuiz.length;


    const percentage =
        Math.round(
            (quizScore / total) * 100
        );


    lastQuizResult = {

        score:
            quizScore,

        total:
            total,

        percentage:
            percentage,

        answers:
            [...currentQuizAnswers]

    };

}


/* ============================================================
   PATCH QUIZ RESULT FUNCTION
   ============================================================ */

const originalShowQuizResult =
    showQuizResult;


showQuizResult = function () {

    originalShowQuizResult();

    saveQuizResult();

};


/* ============================================================
   ADVANCED FEATURE STYLES
   ============================================================ */

function addAdvancedFeatureStyles() {

    if (
        document.getElementById(
            "knowviaAdvancedStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement("style");


    style.id =
        "knowviaAdvancedStyles";


    style.textContent = `

        /* =========================================
           AI FEATURE SECTION
           ========================================= */

        #knowviaAdvancedFeatures {

            margin: 35px 0;

            padding: 25px;

            border-radius: 20px;

            border:
                1px solid rgba(100,100,100,0.15);

            background:
                rgba(255,255,255,0.6);

        }


        .knowvia-feature-heading {

            display: flex;

            align-items: center;

            gap: 12px;

            margin-bottom: 20px;

        }


        .knowvia-feature-heading > span {

            font-size: 30px;

        }


        .knowvia-feature-heading h2 {

            margin: 0;

            font-size: 23px;

        }


        .knowvia-feature-heading p {

            margin:
                4px 0 0;

            opacity:
                0.7;

            font-size:
                14px;

        }


        .knowvia-feature-grid {

            display:
                grid;

            grid-template-columns:
                repeat(3, 1fr);

            gap:
                14px;

        }


        .knowvia-feature-card {

            min-height:
                145px;

            padding:
                18px;

            border:
                1px solid rgba(100,100,100,0.15);

            border-radius:
                16px;

            background:
                rgba(255,255,255,0.7);

            cursor:
                pointer;

            text-align:
                left;

            display:
                flex;

            flex-direction:
                column;

            justify-content:
                center;

            gap:
                7px;

            transition:
                transform 0.2s ease,
                box-shadow 0.2s ease,
                border-color 0.2s ease;

        }


        .knowvia-feature-card:hover {

            transform:
                translateY(-3px);

            box-shadow:
                0 10px 25px
                rgba(0,0,0,0.08);

            border-color:
                #2563eb;

        }


        .knowvia-feature-icon {

            font-size:
                30px;

            margin-bottom:
                5px;

        }


        .knowvia-feature-card strong {

            font-size:
                16px;

        }


        .knowvia-feature-card small {

            opacity:
                0.65;

            font-size:
                12px;

            line-height:
                1.4;

        }


        /* =========================================
           MODAL
           ========================================= */

        .knowvia-modal {

            position:
                fixed;

            inset:
                0;

            z-index:
                99998;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            padding:
                20px;

        }


        .knowvia-modal-overlay {

            position:
                absolute;

            inset:
                0;

            background:
                rgba(0,0,0,0.6);

            backdrop-filter:
                blur(5px);

        }


        .knowvia-modal-window {

            position:
                relative;

            z-index:
                2;

            width:
                min(850px, 100%);

            max-height:
                90vh;

            overflow:
                hidden;

            border-radius:
                20px;

            background:
                white;

            box-shadow:
                0 25px 70px
                rgba(0,0,0,0.25);

            display:
                flex;

            flex-direction:
                column;

        }


        .knowvia-modal-header {

            display:
                flex;

            align-items:
                center;

            justify-content:
                space-between;

            padding:
                18px 22px;

            border-bottom:
                1px solid
                rgba(100,100,100,0.15);

        }


        .knowvia-modal-title {

            display:
                flex;

            align-items:
                center;

            gap:
                10px;

        }


        .knowvia-modal-title h2 {

            margin:
                0;

            font-size:
                20px;

        }


        .knowvia-modal-close {

            width:
                38px;

            height:
                38px;

            border:
                none;

            border-radius:
                50%;

            background:
                rgba(100,100,100,0.1);

            font-size:
                25px;

            cursor:
                pointer;

            line-height:
                1;

        }


        .knowvia-modal-body {

            overflow:
                auto;

            padding:
                25px;

            line-height:
                1.7;

        }


        /* =========================================
           FEATURE LOADING
           ========================================= */

        .knowvia-feature-loading {

            text-align:
                center;

            padding:
                50px 20px;

        }


        .knowvia-feature-loading h3 {

            margin:
                15px 0 8px;

        }


        .knowvia-feature-loading p {

            opacity:
                0.7;

        }


        /* =========================================
           FEATURE RESULTS
           ========================================= */

        .knowvia-result-content {

            line-height:
                1.8;

        }


        .knowvia-result-content h2,
        .knowvia-result-content h3,
        .knowvia-result-content h4 {

            margin-top:
                22px;

        }


        .knowvia-session-tip,
        .knowvia-exam-tip,
        .knowvia-weak-tip {

            margin-top:
                25px;

            padding:
                15px;

            border-radius:
                12px;

            background:
                rgba(37,99,235,0.08);

            line-height:
                1.6;

        }


        /* =========================================
           ASK MY NOTES
           ========================================= */

        .knowvia-ask-input {

            width:
                100%;

            box-sizing:
                border-box;

            resize:
                vertical;

            padding:
                14px;

            margin:
                10px 0 15px;

            border:
                1px solid
                rgba(100,100,100,0.2);

            border-radius:
                12px;

            font-family:
                inherit;

            font-size:
                14px;

        }


        .knowvia-primary-button {

            padding:
                12px 20px;

            border:
                none;

            border-radius:
                10px;

            background:
                #2563eb;

            color:
                white;

            font-weight:
                700;

            cursor:
                pointer;

        }


        .knowvia-primary-button:disabled {

            opacity:
                0.6;

            cursor:
                not-allowed;

        }


        .knowvia-ask-answer {

            margin-top:
                20px;

        }


        .knowvia-answer-card {

            padding:
                18px;

            border-radius:
                14px;

            background:
                rgba(37,99,235,0.06);

            border:
                1px solid
                rgba(37,99,235,0.12);

        }


        .knowvia-answer-label {

            font-weight:
                800;

            margin-bottom:
                10px;

        }


        /* =========================================
           DARK MODE
           ========================================= */

        body.dark-mode
        #knowviaAdvancedFeatures,

        body.dark
        #knowviaAdvancedFeatures {

            background:
                rgba(25,25,25,0.8);

            border-color:
                rgba(255,255,255,0.12);

        }


        body.dark-mode
        .knowvia-feature-card,

        body.dark
        .knowvia-feature-card {

            background:
                rgba(35,35,35,0.8);

            color:
                white;

            border-color:
                rgba(255,255,255,0.12);

        }


        body.dark-mode
        .knowvia-modal-window,

        body.dark
        .knowvia-modal-window {

            background:
                #181818;

            color:
                white;

        }


        body.dark-mode
        .knowvia-modal-header,

        body.dark
        .knowvia-modal-header {

            border-color:
                rgba(255,255,255,0.12);

        }


        body.dark-mode
        .knowvia-modal-close,

        body.dark
        .knowvia-modal-close {

            background:
                rgba(255,255,255,0.1);

            color:
                white;

        }


        body.dark-mode
        .knowvia-ask-input,

        body.dark
        .knowvia-ask-input {

            background:
                #111;

            color:
                white;

            border-color:
                rgba(255,255,255,0.18);

        }


        body.dark-mode
        .knowvia-answer-card,

        body.dark
        .knowvia-answer-card {

            background:
                rgba(37,99,235,0.12);

            border-color:
                rgba(37,99,235,0.2);

        }


        /* =========================================
           MOBILE
           ========================================= */

        @media (max-width: 800px) {

            .knowvia-feature-grid {

                grid-template-columns:
                    repeat(2, 1fr);

            }

        }


        @media (max-width: 550px) {

            #knowviaAdvancedFeatures {

                padding:
                    18px;

            }


            .knowvia-feature-grid {

                grid-template-columns:
                    1fr;

            }


            .knowvia-feature-card {

                min-height:
                    110px;

            }


            .knowvia-modal {

                padding:
                    10px;

            }


            .knowvia-modal-window {

                max-height:
                    95vh;

                border-radius:
                    15px;

            }


            .knowvia-modal-body {

                padding:
                    18px;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* ============================================================
   CREATE ADVANCED FEATURES
   ============================================================ */

addAdvancedFeatureStyles();

createAdvancedFeatureButtons();


/* ============================================================
   IMPROVED DARK MODE
   ============================================================ */

function setupFinalTheme() {

    if (!themeBtn) {
        return;
    }


    /*
     * Avoid creating another click handler
     * if Part 1 already created one.
     *
     * The existing handler already toggles
     * dark-mode and dark.
     */

    function updateThemeIcon() {

        const isDark =
            document.body.classList.contains(
                "dark-mode"
            ) ||
            document.body.classList.contains(
                "dark"
            );


        themeBtn.textContent =
            isDark
                ? "☀"
                : "◐";

    }


    updateThemeIcon();

}


setupFinalTheme();


/* ============================================================
   KEYBOARD SUPPORT FOR FLASHCARDS
   ============================================================ */

document.addEventListener(
    "keydown",
    function (event) {

        /*
         * Don't interfere while typing
         * in an input or textarea.
         */

        const tag =
            event.target.tagName;


        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {

            return;

        }


        if (
            event.key === "ArrowRight"
        ) {

            nextFlashcard();

        }


        if (
            event.key === "ArrowLeft"
        ) {

            previousFlashcard();

        }


        if (
            event.key === " " &&
            flashcard
        ) {

            event.preventDefault();

            flipCurrentFlashcard();

        }

    }
);


/* ============================================================
   FINAL KNOWVIA PUBLIC API
   ============================================================ */

window.Knowvia = {

    callAI:
        callKnowviaAI,

    formatAIResponse:
        formatAIResponse,

    parseJSON:
        parseJSON,

    escapeHTML:
        escapeHTML,

    toast:
        toast,

    setBusy:
        setBusy,

    buildAIContext:
        buildAIContext,

    getStudyMaterial:
        getStudyMaterial,

    extractTextFromPDF:
        extractTextFromPDF,

    extractTextFromImage:
        extractTextFromImage,

    get currentSource() {
        return currentSourceType;
    },

    get currentMaterial() {
        return currentMaterial;
    },

    get currentTopic() {
        return currentTopic;
    },

    get summary() {
        return studySummary;
    },

    get flashcards() {
        return studyFlashcards;
    },

    get quiz() {
        return studyQuiz;
    },

    get quizScore() {
        return quizScore;
    },

    get weakTopics() {
        return weakTopics;
    },

    get studySession() {
        return studySessionData;
    },

    get exam() {
        return examData;
    }

};


/* ============================================================
   END KNOWVIA
   ============================================================ */
