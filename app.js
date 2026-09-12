/* =========================================================
   KNOWVIA - AI STUDY COMPANION
   Corrected AI Frontend
   ========================================================= */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const state = {
    source: "topic",
    material: "",
    title: "",
    difficulty: "beginner",
    flashcards: [],
    cardIndex: 0,
    quiz: [],
    quizAnswers: [],
    lastMistake: null,
    busy: false
  };

  /* =========================================================
     EXISTING HTML ELEMENTS
     ========================================================= */

  const els = {
    themeBtn: $("themeBtn"),

    topicInput: $("topicInput") || $("topic"),

    difficultyInput:
      $("difficultyInput") || $("difficulty"),

    generateBtn: $("generateBtn"),

    summaryContent: $("summaryContent"),

    flashcard: $("flashcard"),
    cardQuestion: $("cardQuestion"),
    cardAnswer: $("cardAnswer"),

    prevCard: $("prevCard"),
    nextCard: $("nextCard"),

    cardProgress: $("cardProgress"),
    flipCard: $("flipCard"),

    quizContainer: $("quizContainer"),
    quizSection: $("quiz")
  };


  /* =========================================================
     HELPERS
     ========================================================= */

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function getDifficulty() {
    return String(
      els.difficultyInput?.value || "beginner"
    ).toLowerCase();
  }


  function getTopic() {
    return String(
      els.topicInput?.value || ""
    ).trim();
  }


  function getCurrentTitle() {
    return (
      state.title ||
      getTopic() ||
      "Study Topic"
    );
  }


  function difficultyLabel(level = getDifficulty()) {
    const labels = {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced"
    };

    return labels[level] || level;
  }


  function setBusy(button, busy, busyText = "Working...") {
    if (!button) return;

    if (busy) {
      button.dataset.originalText =
        button.textContent;

      button.disabled = true;
      button.textContent = busyText;
    } else {
      button.disabled = false;

      button.textContent =
        button.dataset.originalText ||
        button.textContent;
    }
  }


  function toast(message, type = "info") {
    let box = $("kvToast");

    if (!box) {
      box = document.createElement("div");
      box.id = "kvToast";

      document.body.appendChild(box);
    }

    box.className = `kv-toast ${type}`;
    box.textContent = message;

    clearTimeout(box._timer);

    box._timer = setTimeout(() => {
      box.remove();
    }, 3500);
  }


  /* =========================================================
     MARKDOWN FORMATTER
     ========================================================= */

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

    const lines = s.split("\n");

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


  /* =========================================================
     JSON PARSER
     ========================================================= */

  function parseJSON(text) {

    if (typeof text !== "string") {
      return text;
    }

    let cleaned = text.trim();

    cleaned = cleaned
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (_) {}

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

    throw new Error(
      "AI returned data in an unexpected format."
    );
  }


  /* =========================================================
     API CALL
     ========================================================= */

  async function callKnowviaAI(payload) {

    const response = await fetch(
      "/api/chat",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(payload)
      }
    );

    let data = {};

    try {
      data = await response.json();
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


  function ensureTopic() {

    const topic = getTopic();

    if (!topic && !state.material) {
      throw new Error(
        "Please enter a topic or upload notes first."
      );
    }

    return topic ||
      "Uploaded Study Material";
  }


  function ensureMaterial() {
    return (
      state.material ||
      getTopic()
    );
  }


  /* =========================================================
     DYNAMIC STYLES
     ========================================================= */

  function injectStyles() {

    if ($("knowviaDynamicStyles")) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "knowviaDynamicStyles";

    style.textContent = `

      .kv-tools {
        margin: 20px 0;
        display: grid;
        gap: 14px;
      }

      .kv-source-row,
      .kv-feature-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .kv-source-btn,
      .kv-feature-btn {
        border: 1px solid rgba(100,100,120,.22);
        border-radius: 12px;
        padding: 10px 14px;
        background: var(--card-bg, #fff);
        color: inherit;
        cursor: pointer;
        font-weight: 600;
      }

      .kv-source-btn.active,
      .kv-feature-btn:hover {
        transform: translateY(-1px);
      }

      .kv-upload-box {
        display: none;
        padding: 14px;
        border: 1px dashed rgba(100,100,120,.35);
        border-radius: 14px;
      }

      .kv-upload-box.show {
        display: block;
      }

      .kv-upload-box input {
        width: 100%;
        margin-top: 8px;
      }

      .kv-status {
        font-size: .92rem;
        opacity: .75;
      }

      .kv-modal {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0,0,0,.58);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .kv-modal.show {
        display: flex;
      }

      .kv-modal-card {
        width: min(850px, 95vw);
        max-height: 88vh;
        overflow: auto;
        border-radius: 20px;
        padding: 24px;
        background: var(--card-bg, #fff);
        color: inherit;
        box-shadow: 0 20px 70px rgba(0,0,0,.25);
      }

      .kv-modal-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        margin-bottom: 18px;
      }

      .kv-close {
        border: 0;
        background: transparent;
        font-size: 25px;
        cursor: pointer;
      }

      .kv-loading {
        padding: 30px 10px;
        text-align: center;
        font-weight: 600;
      }

      .kv-ai-response h2,
      .kv-ai-response h3,
      .kv-ai-response h4 {
        margin-top: 20px;
      }

      .kv-ai-response li {
        margin: 7px 0;
      }

      .kv-quiz-question {
        padding: 18px;
        margin: 14px 0;
        border-radius: 15px;
        border: 1px solid rgba(100,100,120,.18);
      }

      .kv-option {
        display: block;
        margin: 8px 0;
        padding: 10px;
        border-radius: 10px;
        cursor: pointer;
      }

      .kv-option:hover {
        background: rgba(127,127,127,.08);
      }

      .kv-quiz-submit {
        border: 0;
        border-radius: 12px;
        padding: 11px 18px;
        cursor: pointer;
        font-weight: 700;
      }

      .kv-score {
        padding: 18px;
        border-radius: 15px;
        margin-bottom: 16px;
        border: 1px solid rgba(100,100,120,.18);
      }

      .kv-toast {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 10001;
        max-width: min(420px, 90vw);
        padding: 13px 16px;
        border-radius: 12px;
        background: #222;
        color: #fff;
        box-shadow: 0 10px 35px rgba(0,0,0,.25);
      }

      .kv-toast.error {
        background: #a92727;
      }

      .kv-toast.success {
        background: #24733d;
      }

      .kv-file-name {
        margin-top: 8px;
        font-size: .9rem;
        opacity: .8;
      }

      .kv-mini-btn {
        margin-top: 10px;
        padding: 9px 13px;
        border-radius: 10px;
        cursor: pointer;
        border: 1px solid rgba(100,100,120,.25);
        background: transparent;
        color: inherit;
      }

    `;

    document.head.appendChild(style);
  }


  /* =========================================================
     SOURCE CONTROLS
     ========================================================= */

  function createSourceTools() {

    if ($("kvTools")) {
      return;
    }

    const anchor =
      els.generateBtn?.closest(
        ".input-section"
      ) ||
      els.generateBtn?.parentElement ||
      els.summaryContent?.parentElement;

    if (!anchor) {
      return;
    }

    const tools =
      document.createElement("div");

    tools.id = "kvTools";
    tools.className = "kv-tools";

    tools.innerHTML = `

      <div class="kv-source-row">

        <button
          type="button"
          class="kv-source-btn active"
          data-source="topic">
          Topic
        </button>

        <button
          type="button"
          class="kv-source-btn"
          data-source="notes">
          Typed Notes
        </button>

        <button
          type="button"
          class="kv-source-btn"
          data-source="image">
          Handwritten Notes
        </button>

        <button
          type="button"
          class="kv-source-btn"
          data-source="pdf">
          PDF
        </button>

      </div>


      <div
        class="kv-upload-box"
        id="kvNotesBox">

        <strong>
          Paste your notes
        </strong>

        <textarea
          id="kvNotesInput"
          rows="7"
          placeholder="Paste your class notes here...">
        </textarea>

        <button
          type="button"
          class="kv-mini-btn"
          id="kvUseNotes">
          Use these notes
        </button>

      </div>


      <div
        class="kv-upload-box"
        id="kvImageBox">

        <strong>
          Upload a handwritten-note image
        </strong>

        <input
          id="kvImageInput"
          type="file"
          accept="image/*">

        <div
          class="kv-file-name"
          id="kvImageName">
        </div>

      </div>


      <div
        class="kv-upload-box"
        id="kvPdfBox">

        <strong>
          Upload a PDF
        </strong>

        <input
          id="kvPdfInput"
          type="file"
          accept="application/pdf,.pdf">

        <div
          class="kv-file-name"
          id="kvPdfName">
        </div>

      </div>


      <div
        class="kv-status"
        id="kvSourceStatus">

        Enter a topic and choose a difficulty,
        then click Generate Study Pack.

      </div>

    `;

    anchor.insertAdjacentElement(
      "afterend",
      tools
    );


    document
      .querySelectorAll(
        ".kv-source-btn"
      )
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {
            setSource(
              btn.dataset.source
            );
          }
        );

      });


    $("kvUseNotes")
      ?.addEventListener(
        "click",
        () => {

          state.material =
            $("kvNotesInput")
              ?.value
              .trim() || "";

          if (!state.material) {

            toast(
              "Please paste some notes first.",
              "error"
            );

            return;
          }

          $("kvSourceStatus")
            .textContent =
            `Typed notes ready: ${
              state.material.length.toLocaleString()
            } characters.`;

          toast(
            "Notes added.",
            "success"
          );
        }
      );


    $("kvImageInput")
      ?.addEventListener(
        "change",
        handleImageUpload
      );


    $("kvPdfInput")
      ?.addEventListener(
        "change",
        handlePDFUpload
      );
  }


  function setSource(source) {

    state.source = source;

    document
      .querySelectorAll(
        ".kv-source-btn"
      )
      .forEach(btn => {

        btn.classList.toggle(
          "active",
          btn.dataset.source === source
        );

      });


    $("kvNotesBox")
      ?.classList.toggle(
        "show",
        source === "notes"
      );


    $("kvImageBox")
      ?.classList.toggle(
        "show",
        source === "image"
      );


    $("kvPdfBox")
      ?.classList.toggle(
        "show",
        source === "pdf"
      );


    const status =
      $("kvSourceStatus");


    if (source === "topic") {

      if (status) {
        status.textContent =
          "Topic mode: AI builds the study material from the topic itself.";
      }

    } else if (source === "notes") {

      if (status) {
        status.textContent =
          "Notes mode: AI will stay grounded in the notes you provide.";
      }

    } else if (source === "image") {

      if (status) {
        status.textContent =
          "Handwritten mode: Knowvia will OCR the image before studying it.";
      }

    } else {

      if (status) {
        status.textContent =
          "PDF mode: Knowvia will extract the PDF text before studying it.";
      }

    }
  }


  /* =========================================================
     LOAD EXTERNAL LIBRARIES
     ========================================================= */

  async function loadScript(
    src,
    test
  ) {

    if (test()) {
      return;
    }

    await new Promise(
      (resolve, reject) => {

        const script =
          document.createElement(
            "script"
          );

        script.src = src;

        script.onload =
          resolve;

        script.onerror =
          () => reject(
            new Error(
              `Could not load ${src}`
            )
          );

        document.head.appendChild(
          script
        );
      }
    );
  }


  /* =========================================================
     HANDWRITTEN IMAGE OCR
     ========================================================= */

  async function handleImageUpload(
    event
  ) {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    $("kvImageName")
      .textContent =
      `Reading: ${file.name}...`;

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
          "No readable text was found in the image."
        );
      }


      $("kvImageName")
        .textContent =
        `${file.name} — OCR complete (${
          state.material.length.toLocaleString()
        } characters)`;


      $("kvSourceStatus")
        .textContent =
        "Handwritten notes are ready. Click Generate Study Pack.";


      toast(
        "Handwritten notes extracted.",
        "success"
      );

    } catch (error) {

      $("kvImageName")
        .textContent = "";

      toast(
        error.message ||
        "OCR failed.",
        "error"
      );
    }
  }


  /* =========================================================
     PDF EXTRACTION
     ========================================================= */

  async function handlePDFUpload(
    event
  ) {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    $("kvPdfName")
      .textContent =
      `Reading: ${file.name}...`;

    try {

      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
        () => !!window.pdfjsLib
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


      let text = "";


      for (
        let pageNo = 1;
        pageNo <= pdf.numPages;
        pageNo++
      ) {

        const page =
          await pdf.getPage(
            pageNo
          );


        const content =
          await page.getTextContent();


        const pageText =
          content.items
            .map(
              item => item.str
            )
            .join(" ");


        text +=
          `\n\n[Page ${pageNo}]\n${pageText}`;
      }


      state.material =
        text.trim();


      if (!state.material) {

        throw new Error(
          "This PDF did not contain selectable text. Try a clearer PDF or use the handwritten image option."
        );

      }


      $("kvPdfName")
        .textContent =
        `${file.name} — extracted ${
          state.material.length.toLocaleString()
        } characters`;


      $("kvSourceStatus")
        .textContent =
        "PDF text is ready. Click Generate Study Pack.";


      toast(
        "PDF extracted successfully.",
        "success"
      );

    } catch (error) {

      $("kvPdfName")
        .textContent = "";

      toast(
        error.message ||
        "PDF extraction failed.",
        "error"
      );
    }
  }


  /* =========================================================
     FEATURE BAR
     ========================================================= */

  function createFeatureBar() {

    if ($("kvFeatureBar")) {
      return;
    }

    const bar =
      document.createElement(
        "div"
      );

    bar.id =
      "kvFeatureBar";

    bar.className =
      "kv-tools";


    bar.innerHTML = `

      <div>

        <h3>
          Knowvia AI Tools
        </h3>

        <div class="kv-feature-row">

          <button
            type="button"
            class="kv-feature-btn"
            id="teachBtn">
            Teach Me
          </button>

          <button
            type="button"
            class="kv-feature-btn"
            id="studySessionBtn">
            Study Session
          </button>

          <button
            type="button"
            class="kv-feature-btn"
            id="examModeBtn">
            Exam Mode
          </button>

          <button
            type="button"
            class="kv-feature-btn"
            id="askNotesBtn">
            Ask My Notes
          </button>

          <button
            type="button"
            class="kv-feature-btn"
            id="weakTopicsBtn">
            Weak Topic Detector
          </button>

          <button
            type="button"
            class="kv-feature-btn"
            id="explainMistakeBtn">
            Explain My Mistake
          </button>

        </div>

      </div>

    `;


    const summarySection =
      els.summaryContent
        ?.closest("section") ||
      els.summaryContent
        ?.parentElement;


    if (summarySection) {

      summarySection.insertAdjacentElement(
        "afterend",
        bar
      );

    } else {

      document.body.appendChild(
        bar
      );

    }


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


    $("weakTopicsBtn")
      ?.addEventListener(
        "click",
        weakTopicDetector
      );


    $("explainMistakeBtn")
      ?.addEventListener(
        "click",
        explainMistake
      );
  }


  /* =========================================================
     GENERATE STUDY PACK
     ========================================================= */

  async function generateStudyPack() {

    if (state.busy) {
      return;
    }

    let topic;

    try {

      topic =
        ensureTopic();

    } catch (error) {

      toast(
        error.message,
        "error"
      );

      return;
    }


    const difficulty =
      getDifficulty();

    const material =
      ensureMaterial();


    state.title =
      topic;

    state.difficulty =
      difficulty;

    state.busy =
      true;


    setBusy(
      els.generateBtn,
      true,
      "Generating..."
    );


    if (els.summaryContent) {

      els.summaryContent.innerHTML = `

        <div class="kv-loading">

          Knowvia is building a
          ${escapeHTML(
            difficultyLabel(
              difficulty
            )
          )}
          study pack for

          <strong>
            ${escapeHTML(topic)}
          </strong>...

        </div>

      `;
    }


    try {

      /*
       * Generate summary, flashcards and quiz
       * independently but at the same time.
       */

      const [
        summaryResult,
        flashcardResult,
        quizResult
      ] =
        await Promise.all([

          callKnowviaAI({
            task: "summary",
            topic,
            difficulty,
            material
          }),

          callKnowviaAI({
            task: "flashcards",
            topic,
            difficulty,
            material
          }),

          callKnowviaAI({
            task: "quiz",
            topic,
            difficulty,
            material
          })

        ]);


      /* SUMMARY */

      if (els.summaryContent) {

        els.summaryContent.innerHTML =
          formatMarkdown(
            summaryResult.answer
          );

      }


      /* FLASHCARDS */

      const flashData =
        parseJSON(
          flashcardResult.answer
        );


      state.flashcards =
        Array.isArray(
          flashData
        )
          ? flashData
          : (
              flashData.flashcards ||
              []
            );


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


      state.cardIndex = 0;

      renderFlashcard();


      /* QUIZ */

      const quizData =
        parseJSON(
          quizResult.answer
        );


      state.quiz =
        Array.isArray(
          quizData
        )
          ? quizData
          : (
              quizData.questions ||
              []
            );


      state.quizAnswers = [];
      state.lastMistake = null;


      renderQuiz();


      els.summaryContent
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });


      toast(
        `Study pack ready: ${
          difficultyLabel(
            difficulty
          )
        } level.`,
        "success"
      );


    } catch (error) {

      if (els.summaryContent) {

        els.summaryContent.innerHTML = `

          <div class="kv-ai-response">

            <h3>
              Something went wrong
            </h3>

            <p>
              ${escapeHTML(
                error.message
              )}
            </p>

            <p>
              Check that your Vercel API
              function and OPENAI_API_KEY
              are configured correctly.
            </p>

          </div>

        `;
      }


      toast(
        error.message,
        "error"
      );

    } finally {

      state.busy = false;

      setBusy(
        els.generateBtn,
        false
      );

    }
  }


  /* =========================================================
     FLASHCARDS
     ========================================================= */

  function renderFlashcard() {

    if (
      !els.cardQuestion ||
      !els.cardAnswer
    ) {
      return;
    }


    if (!state.flashcards.length) {

      els.cardQuestion.textContent =
        "Generate a study pack first.";

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


    /*
     * Always return to front when moving
     * to another card.
     */

    els.flashcard
      ?.classList
      .remove("flipped");
  }


  /*
   * IMPORTANT FIX:
   *
   * The previous version had two click handlers
   * attached to the flashcard.
   *
   * That could toggle the class twice.
   *
   * Now there is only one card click handler.
   */

  function flipCard(event) {

    if (event) {

      const target =
        event.target;

      /*
       * Do not flip twice when clicking
       * a button inside the card.
       */

      if (
        target?.closest?.(
          "button"
        )
      ) {
        return;
      }
    }


    els.flashcard
      ?.classList
      .toggle(
        "flipped"
      );
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


  /* =========================================================
     QUIZ
     ========================================================= */

  function renderQuiz() {

    if (!els.quizContainer) {
      return;
    }


    if (!state.quiz.length) {

      els.quizContainer.innerHTML =
        `<p>
          Generate a study pack to create
          an AI quiz.
        </p>`;

      return;
    }


    els.quizContainer.innerHTML = `

      <div class="kv-score">

        <strong>
          ${escapeHTML(
            difficultyLabel(
              state.difficulty
            )
          )}
          Quiz
        </strong>

        <div>
          ${
            state.quiz.length
          }
          questions based on your
          current material.
        </div>

      </div>


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
                class="kv-quiz-question"
                data-question="${i}">

                <h4>
                  ${i + 1}.
                  ${escapeHTML(
                    q.question ||
                    ""
                  )}
                </h4>


                ${options
                  .map(
                    (
                      option,
                      j
                    ) => `

                      <label
                        class="kv-option">

                        <input
                          type="radio"
                          name="kvq${i}"
                          value="${j}">

                        ${escapeHTML(
                          typeof option ===
                          "string"
                            ? option
                            : (
                                option.text ||
                                option.label ||
                                ""
                              )
                        )}

                      </label>

                    `
                  )
                  .join("")}

              </div>

            `;
          }
        )
        .join("")}


      <button
        type="button"
        class="kv-quiz-submit"
        id="kvSubmitQuiz">

        Check My Score

      </button>


      <div
        id="kvQuizResult">
      </div>

    `;


    $("kvSubmitQuiz")
      ?.addEventListener(
        "click",
        gradeQuiz
      );
  }


  function getOptionText(option) {

    return typeof option ===
      "string"

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
          Number.isFinite(
            Number(
              q.correctAnswer
            )
          )
            ? Number(
                q.correctAnswer
              )
            : 0;


        const correct =
          value !== null &&
          value ===
            correctValue;


        if (
          value !== null
        ) {
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

                value: index,

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

      }
    );


    state.quizAnswers =
      answers;


    const firstMistake =
      answers.find(
        item =>
          !item.correct &&
          item.value !== null
      );


    state.lastMistake =
      firstMistake ||
      null;


    const percentage =
      state.quiz.length

        ? Math.round(
            (
              score /
              state.quiz.length
            ) *
            100
          )

        : 0;


    const result =
      $("kvQuizResult");


    if (result) {

      result.innerHTML = `

        <div class="kv-score">

          <h3>
            Score:
            ${score}/${state.quiz.length}
            (${percentage}%)
          </h3>

          <p>
            Answered:
            ${answered}/${state.quiz.length}
          </p>

          <p>

            ${
              percentage >= 80

                ? "Excellent understanding."

                : percentage >= 60

                  ? "Good start. Review the questions you missed."

                  : "Review the topic and try the quiz again."

            }

          </p>

        </div>

      `;
    }


    if (firstMistake) {

      toast(
        "You have a mistake available for Explain My Mistake.",
        "info"
      );

    }
  }


  /* =========================================================
     MODAL
     ========================================================= */

  function createModal() {

    if ($("kvModal")) {
      return;
    }


    const modal =
      document.createElement(
        "div"
      );


    modal.id =
      "kvModal";

    modal.className =
      "kv-modal";


    modal.innerHTML = `

      <div
        class="kv-modal-card">

        <div
          class="kv-modal-head">

          <h2
            id="kvModalTitle">
            Knowvia AI
          </h2>

          <button
            type="button"
            class="kv-close"
            id="kvModalClose">

            ×

          </button>

        </div>


        <div
          id="kvModalBody">
        </div>

      </div>

    `;


    document.body.appendChild(
      modal
    );


    $("kvModalClose")
      ?.addEventListener(
        "click",
        closeModal
      );


    modal.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          modal
        ) {
          closeModal();
        }

      }
    );
  }


  function openModal(
    title,
    body = ""
  ) {

    createModal();


    $("kvModalTitle")
      .textContent =
      title;


    $("kvModalBody")
      .innerHTML =
      body;


    $("kvModal")
      .classList
      .add("show");
  }


  function closeModal() {

    $("kvModal")
      ?.classList
      .remove("show");
  }


  async function runModalTask(
    title,
    payload,
    loading =
      "Knowvia is thinking..."
  ) {

    openModal(
      title,
      `
        <div class="kv-loading">
          ${escapeHTML(
            loading
          )}
        </div>
      `
    );


    try {

      const result =
        await callKnowviaAI(
          payload
        );


      $("kvModalBody")
        .innerHTML =
        formatMarkdown(
          result.answer
        );

    } catch (error) {

      $("kvModalBody")
        .innerHTML =
        `<p>
          ${escapeHTML(
            error.message
          )}
        </p>`;

    }
  }


  /* =========================================================
     TEACH ME
     ========================================================= */

  async function teachMe() {

    let material;

    try {

      ensureTopic();

      material =
        ensureMaterial();

    } catch (error) {

      toast(
        error.message,
        "error"
      );

      return;
    }


    await runModalTask(

      "Teach Me",

      {

        task: "teach",

        topic:
          getCurrentTitle(),

        difficulty:
          getDifficulty(),

        material

      },

      "AI teacher is preparing a step-by-step lesson..."

    );
  }


  /* =========================================================
     STUDY SESSION
     ========================================================= */

  async function studySession() {

    let material;

    try {

      ensureTopic();

      material =
        ensureMaterial();

    } catch (error) {

      toast(
        error.message,
        "error"
      );

      return;
    }


    await runModalTask(

      "Study Session",

      {

        task:
          "study_session",

        topic:
          getCurrentTitle(),

        difficulty:
          getDifficulty(),

        material

      },

      "Building a focused study session..."

    );
  }


  /* =========================================================
     EXAM MODE
     ========================================================= */

  async function examMode() {

    let material;

    try {

      ensureTopic();

      material =
        ensureMaterial();

    } catch (error) {

      toast(
        error.message,
        "error"
      );

      return;
    }


    await runModalTask(

      "Exam Mode",

      {

        task: "exam",

        topic:
          getCurrentTitle(),

        difficulty:
          getDifficulty(),

        material

      },

      "Generating exam-oriented questions and answers..."

    );
  }


  /* =========================================================
     ASK MY NOTES
     ========================================================= */

  async function askMyNotes() {

    let material;

    try {

      ensureTopic();

      material =
        ensureMaterial();

    } catch (error) {

      toast(
        error.message,
        "error"
      );

      return;
    }


    openModal(

      "Ask My Notes",

      `

        <p>
          Ask a question.
          Knowvia will answer using
          your current topic/notes.
        </p>


        <textarea
          id="kvAskInput"
          rows="5"
          style="width:100%;"
          placeholder="Example: Explain the difference between supervised and unsupervised learning.">
        </textarea>


        <button
          type="button"
          class="kv-mini-btn"
          id="kvAskSubmit">

          Ask Knowvia

        </button>


        <div
          id="kvAskResult">
        </div>

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

            toast(
              "Please enter a question.",
              "error"
            );

            return;
          }


          const resultBox =
            $("kvAskResult");


          resultBox.innerHTML =
            `
              <div class="kv-loading">
                Searching your study material...
              </div>
            `;


          try {

            const result =
              await callKnowviaAI({

                task:
                  "ask_notes",

                topic:
                  getCurrentTitle(),

                difficulty:
                  getDifficulty(),

                material,

                question

              });


            resultBox.innerHTML =
              formatMarkdown(
                result.answer
              );

          } catch (error) {

            resultBox.innerHTML =
              `<p>
                ${escapeHTML(
                  error.message
                )}
              </p>`;

          }

        }
      );
  }


  /* =========================================================
     WEAK TOPIC DETECTOR
     ========================================================= */

  async function weakTopicDetector() {

    let material;

    try {

      material =
        ensureMaterial();

    } catch (error) {

      toast(
        error.message,
        "error"
      );

      return;
    }


    openModal(

      "Weak Topic Detector",

      `

        <p>
          Enter your quiz score or paste
          your recent performance.
        </p>


        <textarea
          id="kvWeakInput"
          rows="6"
          style="width:100%;"
          placeholder="Example: Computer Networks 4/10, OS 8/10, DBMS 5/10">
        </textarea>


        <button
          type="button"
          class="kv-mini-btn"
          id="kvWeakSubmit">

          Detect Weak Topics

        </button>


        <div
          id="kvWeakResult">
        </div>

      `
    );


    $("kvWeakSubmit")
      ?.addEventListener(
        "click",
        async () => {

          const quizResult =
            $("kvWeakInput")
              ?.value
              .trim();


          if (!quizResult) {

            toast(
              "Please enter some performance data.",
              "error"
            );

            return;
          }


          const resultBox =
            $("kvWeakResult");


          resultBox.innerHTML =
            `
              <div class="kv-loading">
                Analyzing your weak areas...
              </div>
            `;


          try {

            const result =
              await callKnowviaAI({

                task:
                  "weak_topics",

                topic:
                  getCurrentTitle(),

                difficulty:
                  getDifficulty(),

                material,

                quizResult

              });


            resultBox.innerHTML =
              formatMarkdown(
                result.answer
              );

          } catch (error) {

            resultBox.innerHTML =
              `<p>
                ${escapeHTML(
                  error.message
                )}
              </p>`;

          }

        }
      );
  }


  /* =========================================================
     EXPLAIN MY MISTAKE
     ========================================================= */

  async function explainMistake() {

    const mistake =
      state.lastMistake ||
      state.quizAnswers.find(
        item =>
          item &&
          !item.correct
      );


    if (!mistake) {

      toast(
        "First answer a quiz question incorrectly.",
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


    await runModalTask(

      "Explain My Mistake",

      {

        task:
          "explain_mistake",

        topic:
          getCurrentTitle(),

        difficulty:
          getDifficulty(),

        material:
          ensureMaterial(),

        question:
          mistake.question,

        userAnswer:
          selected,

        quizResult:
          correct

      },

      "AI is analyzing why the answer was wrong..."

    );
  }


  /* =========================================================
     DARK MODE
     ========================================================= */

  function setupTheme() {

    if (!els.themeBtn) {
      return;
    }


    els.themeBtn.addEventListener(
      "click",
      () => {

        const isDark =
          document.body
            .classList
            .toggle(
              "dark-mode"
            );


        document.body
          .classList
          .toggle(
            "dark",
            isDark
          );


        els.themeBtn.textContent =
          isDark
            ? "☀"
            : "◐";

      }
    );
  }


  /* =========================================================
     EVENTS
     ========================================================= */

  function setupEvents() {

    els.generateBtn
      ?.addEventListener(
        "click",
        generateStudyPack
      );


    /*
     * ONLY ONE click handler
     * for the flashcard.
     *
     * This fixes the previous
     * flip problem.
     */

    els.flashcard
      ?.addEventListener(
        "click",
        flipCard
      );


    /*
     * Flip button has its own
     * handler and stops propagation.
     */

    els.flipCard
      ?.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          flipCard();

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


    setupTheme();
  }


  /* =========================================================
     INITIALIZE
     ========================================================= */

  function init() {

    injectStyles();

    createSourceTools();

    createFeatureBar();

    createModal();

    setupEvents();

    renderFlashcard();

    console.log(
      "Knowvia AI frontend initialized."
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
