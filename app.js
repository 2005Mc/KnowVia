/* =========================================================
   KNOWVIA - AI STUDY COMPANION
   Polished Frontend
   ========================================================= */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const state = {
    source: "topic",
    material: "",
    title: "",
    difficulty: "beginner",
    quizStyle: "mixed",

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

    topicInput: $("topic"),

    difficultyInput: $("difficulty"),

    quizStyleInput: $("quizStyle"),

    generateBtn: $("generateBtn"),

    statusMessage: $("statusMessage"),

    summaryContent: $("summaryContent"),
    summaryTitle: $("summaryTitle"),
    sourcePill: $("sourcePill"),

    flashcard: $("flashcard"),
    cardQuestion: $("cardQuestion"),
    cardAnswer: $("cardAnswer"),

    prevCard: $("prevCard"),
    nextCard: $("nextCard"),
    cardProgress: $("cardProgress"),
    flipCard: $("flipCard"),

    quizContainer: $("quizContainer"),

    teachBtn: $("teachBtn"),
    sessionBtn: $("sessionBtn"),
    examBtn: $("examBtn"),
    notesAskBtn: $("notesAskBtn"),

    retryWeakBtn: $("retryWeakBtn"),

    dnaText: $("dnaText"),
    understandingBar: $("understandingBar"),
    recallBar: $("recallBar"),
    applicationBar: $("applicationBar"),

    weakTopic: $("weakTopic"),
    mistakeText: $("mistakeText"),
    knowledgeMap: $("knowledgeMap"),

    modal: $("modal"),
    modalClose: $("modalClose"),
    modalContent: $("modalContent"),

    toast: $("toast")
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


  function getQuizStyle() {
    return String(
      els.quizStyleInput?.value || "mixed"
    ).toLowerCase();
  }


  function difficultyLabel(level = getDifficulty()) {

    const labels = {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced"
    };

    return labels[level] || level;
  }


  function sourceLabel() {

    const labels = {
      topic: "Topic",
      notes: "Typed Notes",
      image: "Handwritten Notes",
      pdf: "PDF"
    };

    return labels[state.source] || "Study Material";
  }


  function toast(message, type = "info") {

    if (!els.toast) return;

    els.toast.textContent = message;

    els.toast.className =
      `toast show ${type}`;

    clearTimeout(els.toast._timer);

    els.toast._timer =
      setTimeout(() => {

        els.toast.classList.remove("show");

      }, 3500);
  }


  function setBusy(button, busy, text = "Generating...") {

    if (!button) return;

    if (busy) {

      button.dataset.originalText =
        button.innerHTML;

      button.disabled = true;

      button.innerHTML = `
        <span class="kv-spinner"></span>
        <span>${text}</span>
      `;

    } else {

      button.disabled = false;

      button.innerHTML =
        button.dataset.originalText ||
        "Generate Study Pack";
    }
  }


  /* =========================================================
     MARKDOWN
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

    let cleaned = text
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


  /* =========================================================
     API
     ========================================================= */

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


  /* =========================================================
     SOURCE TABS
     IMPORTANT:
     Uses the buttons already present in index.html.
     No duplicate buttons are created.
     ========================================================= */

  function setupSourceTabs() {

    const tabs =
      document.querySelectorAll(
        ".source-tab"
      );

    tabs.forEach(tab => {

      tab.addEventListener(
        "click",
        () => {

          const source =
            tab.dataset.source;

          setSource(source);

        }
      );

    });


    $("notesInput")
      ?.addEventListener(
        "input",
        () => {

          if (
            state.source === "notes"
          ) {

            state.material =
              $("notesInput")
                .value
                .trim();
          }

        }
      );


    $("imageInput")
      ?.addEventListener(
        "change",
        handleImageUpload
      );


    $("pdfInput")
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
      .querySelectorAll(
        ".source-tab"
      )
      .forEach(tab => {

        tab.classList.toggle(
          "active",
          tab.dataset.source === source
        );

      });


    document
      .querySelectorAll(
        ".source-panel"
      )
      .forEach(panel => {

        panel.classList.remove(
          "active"
        );

      });


    const panel =
      $(`${source}Panel`);

    panel
      ?.classList
      .add("active");


    if (source === "topic") {

      state.material = "";

    }


    updateSourceStatus();
  }


  function updateSourceStatus() {

    if (!els.statusMessage) {
      return;
    }


    const messages = {

      topic:
        "Enter a topic and choose a difficulty.",

      notes:
        "Paste your notes below. Knowvia will build the study pack from them.",

      image:
        "Upload handwritten notes. Knowvia will extract the readable text automatically.",

      pdf:
        "Upload a text-based PDF. Knowvia will extract its text before studying it."

    };


    els.statusMessage.textContent =
      messages[state.source] ||
      "";
  }


  /* =========================================================
     IMAGE OCR
     ========================================================= */

  async function handleImageUpload(event) {

    const file =
      event.target.files?.[0];

    if (!file) return;


    const preview =
      $("imagePreview");

    if (preview) {

      preview.classList.remove(
        "hidden"
      );

      preview.innerHTML = `
        <span class="kv-file-loading">
          ✦ Reading ${escapeHTML(file.name)}...
        </span>
      `;
    }


    try {

      if (!window.Tesseract) {

        await loadScript(
          "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
          () => !!window.Tesseract
        );
      }


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


      if (preview) {

        preview.innerHTML = `
          <strong>✓ ${escapeHTML(file.name)}</strong>
          <span>
            OCR complete —
            ${state.material.length.toLocaleString()}
            characters extracted
          </span>
        `;
      }


      els.statusMessage.textContent =
        "Handwritten notes ready. Click Generate Study Pack.";

      toast(
        "Handwritten notes extracted successfully.",
        "success"
      );

    } catch (error) {

      if (preview) {

        preview.innerHTML = `
          <span>
            Could not read this image.
          </span>
        `;
      }


      toast(
        error.message ||
        "OCR failed.",
        "error"
      );
    }
  }


  /* =========================================================
     PDF
     ========================================================= */

  async function handlePDFUpload(event) {

    const file =
      event.target.files?.[0];

    if (!file) return;


    const info =
      $("pdfInfo");

    if (info) {

      info.classList.remove(
        "hidden"
      );

      info.innerHTML = `
        <span class="kv-file-loading">
          ✦ Extracting ${escapeHTML(file.name)}...
        </span>
      `;
    }


    try {

      if (!window.pdfjsLib) {

        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
          () => !!window.pdfjsLib
        );
      }


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
              item =>
                item.str
            )
            .join(" ");


        text +=
          `\n\n[Page ${pageNo}]\n${pageText}`;
      }


      state.material =
        text.trim();


      if (!state.material) {

        throw new Error(
          "This PDF does not contain selectable text."
        );
      }


      if (info) {

        info.innerHTML = `
          <strong>✓ ${escapeHTML(file.name)}</strong>
          <span>
            ${pdf.numPages} pages —
            ${state.material.length.toLocaleString()}
            characters extracted
          </span>
        `;
      }


      els.statusMessage.textContent =
        "PDF ready. Click Generate Study Pack.";

      toast(
        "PDF extracted successfully.",
        "success"
      );

    } catch (error) {

      if (info) {

        info.innerHTML = `
          <span>Could not extract this PDF.</span>
        `;
      }


      toast(
        error.message ||
        "PDF extraction failed.",
        "error"
      );
    }
  }


  async function loadScript(src, test) {

    if (test()) {
      return;
    }


    await new Promise(
      (resolve, reject) => {

        const script =
          document.createElement(
            "script"
          );

        script.src =
          src;

        script.onload =
          resolve;

        script.onerror =
          () =>
            reject(
              new Error(
                "Could not load required library."
              )
            );

        document.head.appendChild(
          script
        );
      }
    );
  }


  /* =========================================================
     MATERIAL
     ========================================================= */

  function getMaterial() {

    if (state.source === "notes") {

      state.material =
        $("notesInput")
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


  /* =========================================================
     GENERATE STUDY PACK
     ========================================================= */

  async function generateStudyPack() {

    if (state.busy) {
      return;
    }


    let input;


    try {

      input =
        ensureInput();

    } catch (error) {

      toast(
        error.message,
        "error"
      );

      return;
    }


    state.title =
      input.topic;

    state.difficulty =
      getDifficulty();

    state.quizStyle =
      getQuizStyle();

    state.busy =
      true;


    setBusy(
      els.generateBtn,
      true,
      "Creating your study pack..."
    );


    showGenerationLoading();


    try {

      /*
       * IMPORTANT:
       *
       * One API request now creates:
       * Summary + Flashcards + Quiz
       *
       * This is faster than making
       * three separate AI requests.
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
            state.quizStyle
        });


      const pack =
        parseJSON(
          result.answer
        );


      /* SUMMARY */

      const summary =
        pack.summary ||
        "";


      if (els.summaryContent) {

        els.summaryContent.innerHTML =
          formatMarkdown(
            summary
          );
      }


      if (els.summaryTitle) {

        els.summaryTitle.textContent =
          `${input.topic} — ${difficultyLabel()}`;
      }


      if (els.sourcePill) {

        els.sourcePill.textContent =
          sourceLabel();
      }


      /* FLASHCARDS */

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


      /* QUIZ */

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


      updateStudyDNA();


      createStudyNavigation();


      toast(
        "Your Knowvia study pack is ready ✨",
        "success"
      );


      /*
       * Move smoothly to Summary.
       */

      document
        .getElementById(
          "summary"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });


    } catch (error) {

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


      toast(
        error.message,
        "error"
      );

    } finally {

      state.busy =
        false;


      setBusy(
        els.generateBtn,
        false
      );

    }
  }


  function showGenerationLoading() {

    if (!els.summaryContent) {
      return;
    }


    els.summaryContent.innerHTML = `

      <div class="kv-generation">

        <div class="kv-ai-orb">
          ✦
        </div>

        <h3>
          Knowvia is thinking...
        </h3>

        <p>
          Creating your personalized
          ${escapeHTML(
            difficultyLabel()
          )}
          study pack
        </p>

        <div class="kv-loading-steps">

          <span class="active">
            <i></i>
            Understanding
          </span>

          <span>
            <i></i>
            Building
          </span>

          <span>
            <i></i>
            Preparing practice
          </span>

        </div>

      </div>

    `;
  }


  /* =========================================================
     STUDY NAVIGATION
     ========================================================= */

  function createStudyNavigation() {

    if ($("kvStudyNavigation")) {
      return;
    }


    const nav =
      document.createElement(
        "div"
      );


    nav.id =
      "kvStudyNavigation";

    nav.className =
      "kv-study-navigation";


    nav.innerHTML = `

      <div class="kv-flow-label">
        YOUR STUDY FLOW
      </div>

      <div class="kv-flow">

        <button
          type="button"
          class="kv-flow-btn active"
          data-target="summary">

          <span>01</span>
          Summary

        </button>

        <div class="kv-flow-line"></div>

        <button
          type="button"
          class="kv-flow-btn"
          data-target="flashcards">

          <span>02</span>
          Flashcards

        </button>

        <div class="kv-flow-line"></div>

        <button
          type="button"
          class="kv-flow-btn"
          data-target="quiz">

          <span>03</span>
          Quiz

        </button>

      </div>

      <div class="kv-next-area">

        <button
          type="button"
          class="kv-next-btn"
          id="kvNextStep">

          Next: Flashcards
          <span>→</span>

        </button>

      </div>

    `;


    const summary =
      document.getElementById(
        "summary"
      );


    summary
      ?.querySelector(
        ".summary-card"
      )
      ?.insertAdjacentElement(
        "afterend",
        nav
      );


    nav
      .querySelectorAll(
        ".kv-flow-btn"
      )
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            goToStep(
              btn.dataset.target
            );

          }
        );

      });


    $("kvNextStep")
      ?.addEventListener(
        "click",
        nextStudyStep
      );
  }


  function goToStep(target) {

    document
      .getElementById(target)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });


    document
      .querySelectorAll(
        ".kv-flow-btn"
      )
      .forEach(btn => {

        btn.classList.toggle(
          "active",
          btn.dataset.target === target
        );

      });


    updateNextButton(target);
  }


  function nextStudyStep() {

    const sections = [
      "summary",
      "flashcards",
      "quiz"
    ];


    const current =
      sections.findIndex(
        id => {

          const element =
            document.getElementById(id);

          if (!element) {
            return false;
          }

          const rect =
            element.getBoundingClientRect();

          return (
            rect.top >= -100 &&
            rect.top < 500
          );
        }
      );


    const index =
      current === -1
        ? 0
        : current;


    const next =
      sections[
        Math.min(
          index + 1,
          sections.length - 1
        )
      ];


    goToStep(next);
  }


  function updateNextButton(target) {

    const button =
      $("kvNextStep");

    if (!button) {
      return;
    }


    const labels = {

      summary:
        "Next: Flashcards →",

      flashcards:
        "Next: Quiz →",

      quiz:
        "Back to Summary ↑"

    };


    button.innerHTML =
      labels[target] ||
      "Next →";


    if (target === "quiz") {

      button.onclick =
        () =>
          goToStep("summary");

    } else {

      button.onclick =
        nextStudyStep;

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
      .remove(
        "flipped"
      );
  }


  function flipCard(event) {

    if (
      event?.target?.closest?.(
        "button"
      )
    ) {
      return;
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
          <small>QUESTIONS</small>
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
                  data-question="${i}">

                  <div class="quiz-number">
                    QUESTION ${String(
                      i + 1
                    ).padStart(
                      2,
                      "0"
                    )}
                  </div>

                  <h3>
                    ${escapeHTML(
                      q.question ||
                      ""
                    )}
                  </h3>


                  <div class="options">

                    ${options
                      .map(
                        (
                          option,
                          j
                        ) => `

                          <label
                            class="option">

                            <input
                              type="radio"
                              name="kvq${i}"
                              value="${j}">

                            <span>
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
          id="kvSubmitQuiz">

          Check My Score →
          
        </button>

      </div>


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
          Number(
            q.correctAnswer
          );


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

      toast(
        "You have a mistake ready for Explain My Mistake 💡",
        "info"
      );
    }
  }


  /* =========================================================
     STUDY DNA
     ========================================================= */

  function updateStudyDNA() {

    if (!state.quizAnswers.length) {
      return;
    }


    const total =
      state.quizAnswers.length;


    const correct =
      state.quizAnswers.filter(
        a =>
          a.correct
      ).length;


    const understanding =
      Math.round(
        correct /
        total *
        100
      );


    const answered =
      state.quizAnswers.filter(
        a =>
          a.value !== null
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
            (
              understanding *
              0.7
            ) +
            (
              recall *
              0.3
            )
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


    if (els.dnaText) {

      els.dnaText.textContent =
        `You scored ${understanding}%. Your current learning profile shows ${recall}% answer recall and ${application}% overall application strength.`;
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


    if (els.weakTopic) {

      if (!wrong.length) {

        els.weakTopic.textContent =
          "No clear weak area yet. Excellent work!";

      } else {

        els.weakTopic.textContent =
          `${wrong.length} question${
            wrong.length === 1
              ? ""
              : "s"
          } need another review. Use Explain My Mistake to understand the first one.`;
      }
    }


    if (els.mistakeText) {

      if (state.lastMistake) {

        els.mistakeText.textContent =
          `Your first missed question is ready for a detailed explanation and memory trick.`;

      } else {

        els.mistakeText.textContent =
          "Complete the quiz to unlock mistake explanations.";
      }
    }


    if (els.knowledgeMap) {

      els.knowledgeMap.innerHTML =
        "";

      const correct =
        state.quizAnswers.filter(
          a => a.correct
        ).length;


      const total =
        state.quizAnswers.length;


      const node =
        document.createElement(
          "span"
        );


      node.className =
        correct >= total * 0.8
          ? "map-node strong"
          : "map-node weak";


      node.textContent =
        correct >= total * 0.8
          ? "Strong foundation"
          : "Needs review";


      els.knowledgeMap
        .appendChild(node);
    }
  }


  /* =========================================================
     MODAL
     ========================================================= */

  function openModal(title, content) {

    if (!els.modal) {
      return;
    }


    els.modalContent.innerHTML = `

      <div class="modal-heading">
        <span class="modal-kicker">
          KNOWVIA AI
        </span>

        <h2>
          ${escapeHTML(title)}
        </h2>
      </div>

      ${content}

    `;


    els.modal.classList.remove(
      "hidden"
    );

    document.body.classList.add(
      "modal-open"
    );
  }


  function closeModal() {

    els.modal
      ?.classList
      .add("hidden");

    document.body.classList.remove(
      "modal-open"
    );
  }


  async function runAIInModal(
    title,
    payload,
    loading
  ) {

    openModal(
      title,
      `
        <div class="kv-modal-loading">

          <div class="kv-ai-orb">
            ✦
          </div>

          <h3>
            ${escapeHTML(loading)}
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


      els.modalContent.innerHTML = `

        <div class="modal-heading">

          <span class="modal-kicker">
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

    } catch (error) {

      els.modalContent.innerHTML = `

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


  /* =========================================================
     TEACH ME
     ========================================================= */

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


  /* =========================================================
     STUDY SESSION
     ========================================================= */

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


  /* =========================================================
     EXAM MODE
     ========================================================= */

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


  /* =========================================================
     ASK MY NOTES
     ========================================================= */

  function askMyNotes() {

    const input =
      ensureInputSafe();

    if (!input) return;


    openModal(

      "Ask My Notes",

      `

        <p class="modal-description">
          Ask anything about your current
          topic or study material.
        </p>

        <textarea
          id="kvAskInput"
          rows="5"
          placeholder="Example: Explain this concept in simple words...">
        </textarea>

        <button
          type="button"
          class="generate-btn"
          id="kvAskSubmit">

          Ask Knowvia →

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


          $("kvAskResult").innerHTML = `

            <div class="kv-modal-loading small">

              <div class="kv-loading-dots">
                <i></i>
                <i></i>
                <i></i>
              </div>

              Knowvia is thinking...

            </div>

          `;


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


            $("kvAskResult").innerHTML =
              formatMarkdown(
                result.answer
              );

          } catch (error) {

            $("kvAskResult").innerHTML =
              `<p>
                ${escapeHTML(
                  error.message
                )}
              </p>`;
          }

        }
      );
  }


  function ensureInputSafe() {

    try {

      return ensureInput();

    } catch (error) {

      toast(
        error.message,
        "error"
      );

      return null;
    }
  }


  /* =========================================================
     EXPLAIN MY MISTAKE
     ========================================================= */

  async function explainMistake() {

    const mistake =
      state.lastMistake;


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


    await runAIInModal(

      "Explain My Mistake",

      {

        task:
          "explain_mistake",

        topic:
          getTopic(),

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


  /* =========================================================
     FEATURE BUTTON CONNECTIONS
     IMPORTANT:
     These use the buttons already in index.html.
     ========================================================= */

  function setupFeatureButtons() {

    els.teachBtn
      ?.addEventListener(
        "click",
        teachMe
      );


    els.sessionBtn
      ?.addEventListener(
        "click",
        studySession
      );


    els.examBtn
      ?.addEventListener(
        "click",
        examMode
      );


    els.notesAskBtn
      ?.addEventListener(
        "click",
        askMyNotes
      );


    /*
     * Clicking the Study DNA
     * "Targeted Re-test" button
     * takes the learner back to Quiz.
     */

    els.retryWeakBtn
      ?.addEventListener(
        "click",
        () => {

          goToStep("quiz");

          toast(
            "Review your weak questions and try again.",
            "info"
          );

        }
      );
  }


  /* =========================================================
     THEME
     ========================================================= */

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


          els.themeBtn.setAttribute(
            "aria-label",
            dark
              ? "Switch to light mode"
              : "Switch to dark mode"
          );

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
     * One flashcard click handler only.
     */

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
            .toggle(
              "flipped"
            );

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


    els.modalClose
      ?.addEventListener(
        "click",
        closeModal
      );


    els.modal
      ?.addEventListener(
        "click",
        event => {

          if (
            event.target ===
            els.modal
          ) {

            closeModal();
          }

        }
      );


    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Escape"
        ) {

          closeModal();
        }

      }
    );


    setupSourceTabs();

    setupFeatureButtons();

    setupTheme();
  }


  /* =========================================================
     INITIALIZE
     ========================================================= */

  function init() {

    setupEvents();

    renderFlashcard();

    console.log(
      "Knowvia polished AI frontend initialized."
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
