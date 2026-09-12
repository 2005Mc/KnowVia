(() => {
"use strict";

/* =========================================================
   KNOWVIA FRONTEND
   Works with the existing Knowvia index.html.
   No database. No localStorage. Gemini only.
   ========================================================= */

const state = {
  source: "topic",
  material: "",
  title: "",
  difficulty: "Beginner",
  questionStyle: "Mixed",
  flashcards: [],
  cardIndex: 0,
  quiz: [],
  quizAnswers: [],
  lastMistake: null,
  busy: false,
  studyMatter: null
};

const $ = id => document.getElementById(id);
const all = sel => [...document.querySelectorAll(sel)];

const el = {
  topic: $("topic"),
  typedNotes: $("typedNotes"),
  handwrittenInput: $("handwrittenInput"),
  handwrittenStatus: $("handwrittenStatus"),
  pdfInput: $("pdfInput"),
  pdfStatus: $("pdfStatus"),
  difficulty: $("difficulty"),
  questionStyle: $("questionStyle"),
  generateBtn: $("generateBtn"),
  generateStatus: $("generateStatus"),
  summaryContent: $("summaryContent"),
  flashcard: $("flashcard"),
  cardQuestion: $("cardQuestion"),
  cardAnswer: $("cardAnswer"),
  prevCard: $("prevCard"),
  flipCard: $("flipCard"),
  nextCard: $("nextCard"),
  cardProgress: $("cardProgress"),
  quizContainer: $("quizContainer"),
  insights: $("insights"),
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
  featureOutput: $("featureOutput"),
  themeBtn: $("themeBtn")
};

function setStatus(message, type = "") {
  if (!el.generateStatus) return;
  el.generateStatus.textContent = message || "";
  el.generateStatus.dataset.type = type;
}

function setBusy(value) {
  state.busy = value;
  if (el.generateBtn) {
    el.generateBtn.disabled = value;
    el.generateBtn.textContent = value
      ? "Generating..."
      : "Generate Study Pack  →";
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

function textToHTML(text) {
  return escapeHTML(text || "").replace(/\n/g, "<br>");
}

function listHTML(items) {
  if (!Array.isArray(items) || !items.length) return "";

  return `<ul>${
    items.map(x => `<li>${escapeHTML(x)}</li>`).join("")
  }</ul>`;
}

function section(title, value) {
  if (!value || (Array.isArray(value) && !value.length)) return "";

  const content = Array.isArray(value)
    ? listHTML(value)
    : `<p>${textToHTML(value)}</p>`;

  return `
    <section class="knowvia-study-section">
      <h3>${escapeHTML(title)}</h3>
      ${content}
    </section>
  `;
}

function injectQuizStyles() {
  if ($("knowviaRuntimeStyles")) return;

  const style = document.createElement("style");

  style.id = "knowviaRuntimeStyles";

  style.textContent = `
    #quizContainer {
      display:block !important;
      width:100% !important;
    }

    #quizContainer .kv-quiz-card {
      display:block !important;
      width:100% !important;
      box-sizing:border-box !important;
      margin:0 0 22px !important;
      padding:22px !important;
      border-radius:18px !important;
      border:1px solid rgba(100,116,139,.22) !important;
      background:var(--card-bg, #fff) !important;
      overflow:hidden !important;
    }

    #quizContainer .kv-question {
      display:block !important;
      margin:0 0 18px !important;
      font-size:1.05rem !important;
      line-height:1.55 !important;
    }

    #quizContainer .kv-options {
      display:flex !important;
      flex-direction:column !important;
      gap:10px !important;
      width:100% !important;
    }

    #quizContainer .kv-option {
      display:flex !important;
      align-items:flex-start !important;
      gap:10px !important;
      width:100% !important;
      box-sizing:border-box !important;
      padding:13px 15px !important;
      border:1px solid rgba(100,116,139,.25) !important;
      border-radius:12px !important;
      background:transparent !important;
      cursor:pointer !important;
      text-align:left !important;
      white-space:normal !important;
      line-height:1.45 !important;
    }

    #quizContainer .kv-option input {
      flex:0 0 auto !important;
      margin-top:3px !important;
    }

    #quizContainer .kv-option.correct {
      border-color:#16a34a !important;
    }

    #quizContainer .kv-option.wrong {
      border-color:#dc2626 !important;
    }

    #quizContainer .kv-feedback {
      margin-top:14px !important;
      padding:13px 15px !important;
      border-radius:12px !important;
      line-height:1.5 !important;
    }

    #quizContainer .kv-explanation {
      margin-top:10px !important;
      line-height:1.5 !important;
    }

    #featureOutput {
      white-space:normal !important;
      line-height:1.65 !important;
    }

    #featureOutput h3 {
      margin-top:18px;
    }

    .kv-map-node {
      padding:14px;
      border:1px solid rgba(100,116,139,.22);
      border-radius:14px;
      margin:10px 0;
    }

    .kv-tool-row {
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      margin:15px 0;
    }

    .kv-tool-row button {
      cursor:pointer;
    }
  `;

  document.head.appendChild(style);
}

async function callKnowviaAI(payload) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type":"application/json"
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.text();

  let data = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      `Server returned non-JSON data (${response.status}). Please redeploy the latest api/chat.js.`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error || `AI request failed (${response.status}).`
    );
  }

  return data;
}

function responseValue(data) {
  if (data?.result !== undefined) return data.result;

  if (data?.answer !== undefined) return data.answer;

  return data;
}

function currentMaterial() {
  return state.material || "";
}

function renderSummary() {
  const sm = state.studyMatter || {};

  if (!el.summaryContent) return;

  el.summaryContent.innerHTML =
    section("Introduction", sm.introduction) +
    section("Definition", sm.definition) +
    section("Core Concept", sm.coreConcept) +
    section("Key Concepts", sm.keyConcepts) +
    section("Types", sm.types) +
    section("Components", sm.components) +
    section("How It Works", sm.working) +
    section("Characteristics", sm.characteristics) +
    section("Examples", sm.examples) +
    section("Applications", sm.applications) +
    section("Advantages", sm.advantages) +
    section("Limitations", sm.limitations) +
    section("Comparison", sm.comparison) +
    section("Important Exam Points", sm.importantExamPoints) +
    section("Quick Revision", sm.quickRevision);
}

function renderFlashcard() {
  if (!el.cardQuestion || !el.cardAnswer) return;

  if (!state.flashcards.length) {
    el.cardQuestion.textContent =
      "Generate a study pack to create flashcards.";

    el.cardAnswer.textContent = "";

    if (el.cardProgress) {
      el.cardProgress.textContent = "";
    }

    return;
  }

  const card = state.flashcards[state.cardIndex];

  el.cardQuestion.textContent = card.question;
  el.cardAnswer.textContent = card.answer;

  if (el.cardProgress) {
    el.cardProgress.textContent =
      `${state.cardIndex + 1} / ${state.flashcards.length}`;
  }

  el.flashcard?.classList.remove("flipped");
}

function renderQuiz() {
  if (!el.quizContainer) return;

  if (!state.quiz.length) {
    el.quizContainer.innerHTML =
      "<p>Generate a study pack to start the quiz.</p>";

    return;
  }

  el.quizContainer.innerHTML = state.quiz.map((q, i) => `
    <article class="kv-quiz-card" data-question="${i}">

      <div class="kv-question">
        <strong>${i + 1}.</strong>
        ${escapeHTML(q.question)}
      </div>

      <div class="kv-options">

        ${q.options.map((option, j) => `
          <label class="kv-option" data-option="${j}">

            <input
              type="radio"
              name="quiz-${i}"
              value="${j}"
            >

            <span>${escapeHTML(option)}</span>

          </label>
        `).join("")}

      </div>

      <div class="kv-feedback" hidden></div>

      <div class="kv-explanation" hidden></div>

    </article>
  `).join("");

  el.quizContainer
    .querySelectorAll("input[type=radio]")
    .forEach(input => {

      input.addEventListener("change", () => {

        const i =
          Number(
            input.closest(".kv-quiz-card").dataset.question
          );

        answerQuiz(i, Number(input.value));
      });

    });
}

function answerQuiz(index, answer) {
  const q = state.quiz[index];

  if (!q) return;

  const card =
    el.quizContainer.querySelector(
      `[data-question="${index}"]`
    );

  const feedback =
    card?.querySelector(".kv-feedback");

  const explanation =
    card?.querySelector(".kv-explanation");

  const options =
    [...card.querySelectorAll(".kv-option")];

  state.quizAnswers[index] = answer;

  options.forEach((o, j) => {

    o.classList.toggle(
      "correct",
      j === Number(q.correctAnswer)
    );

    o.classList.toggle(
      "wrong",
      j === answer &&
      j !== Number(q.correctAnswer)
    );

  });

  const correct =
    answer === Number(q.correctAnswer);

  if (feedback) {

    feedback.hidden = false;

    feedback.innerHTML = correct
      ? "<strong>✓ Correct</strong>"
      : "<strong>✗ Not quite.</strong>";
  }

  if (explanation) {

    explanation.hidden = false;

    explanation.innerHTML =
      `<strong>Explanation:</strong> ${escapeHTML(q.explanation)}`;
  }

  if (!correct) {

    state.lastMistake = {
      question: q.question,
      selectedAnswer: q.options[answer],
      correctAnswer:
        q.options[Number(q.correctAnswer)],
      explanation: q.explanation
    };
  }

  calculateInsights();
}

function calculateInsights() {
  if (!state.quiz.length) return;

  const answered =
    state.quizAnswers.filter(
      v => v !== undefined
    ).length;

  const correct =
    state.quizAnswers.reduce(
      (n, a, i) =>
        n +
        (
          a !== undefined &&
          a === Number(state.quiz[i].correctAnswer)
            ? 1
            : 0
        ),
      0
    );

  const accuracy =
    answered
      ? Math.round(correct / answered * 100)
      : 0;

  const recall =
    answered
      ? Math.min(
          100,
          Math.round(
            accuracy * .9 +
            answered / state.quiz.length * 10
          )
        )
      : 0;

  const application =
    answered
      ? Math.min(
          100,
          Math.round(
            accuracy * .8 +
            (
              state.difficulty
                .toLowerCase()
                .includes("hard")
                ? 15
                : 8
            )
          )
        )
      : 0;

  setMetric(
    el.understandingBar,
    el.understandingScore,
    accuracy
  );

  setMetric(
    el.recallBar,
    el.recallScore,
    recall
  );

  setMetric(
    el.applicationBar,
    el.applicationScore,
    application
  );

  if (el.insights) {

    el.insights.textContent =
      answered
        ? `${correct}/${answered} answered correctly (${accuracy}%). Keep practising the questions you missed.`
        : "Answer the quiz to see your learning insights.";
  }
}

function setMetric(bar, score, value) {

  if (bar) {
    bar.style.width = `${value}%`;
  }

  if (score) {
    score.textContent = `${value}%`;
  }
}

function cleanText(value) {
  return String(value ?? "").trim();
}

async function generateStudyPack() {

  if (state.busy) return;

  const source = state.source;

  let material = "";
  let title = "";

  if (source === "topic") {

    title =
      cleanText(el.topic?.value);

    material = title;

  } else if (source === "typed") {

    material =
      cleanText(el.typedNotes?.value);

    title =
      material.slice(0, 70) ||
      "Typed Notes";

  } else if (source === "handwritten") {

    material =
      cleanText(
        el.handwrittenInput?.dataset.extractedText
      );

    title =
      material.slice(0, 70) ||
      "Handwritten Notes";

  } else if (source === "pdf") {

    material =
      cleanText(
        el.pdfInput?.dataset.extractedText
      );

    title =
      material.slice(0, 70) ||
      "PDF Notes";
  }

  if (!material) {

    setStatus(
      "Please provide a topic, notes, handwritten image, or PDF first.",
      "error"
    );

    return;
  }

  state.material = material;
  state.title = title;

  state.difficulty =
    el.difficulty?.value ||
    "Beginner";

  state.questionStyle =
    el.questionStyle?.value ||
    "Mixed";

  setBusy(true);

  setStatus(
    "Generating your study pack...",
    "loading"
  );

  try {

    const data =
      await callKnowviaAI({
        task: "study_pack",
        topic: title,
        material,
        difficulty: state.difficulty,
        questionStyle: state.questionStyle
      });

    const pack =
      responseValue(data);

    if (
      !pack ||
      typeof pack !== "object"
    ) {
      throw new Error(
        "Study pack response was empty."
      );
    }

    state.studyMatter =
      pack.studyMatter || {};

    state.flashcards =
      Array.isArray(pack.flashcards)
        ? pack.flashcards
        : [];

    state.quiz =
      Array.isArray(pack.quiz)
        ? pack.quiz
        : [];

    state.quizAnswers = [];

    state.lastMistake = null;

    state.cardIndex = 0;

    if (
      state.flashcards.length !== 10 ||
      state.quiz.length !== 10
    ) {
      throw new Error(
        "The AI returned an incomplete study pack. Please try again."
      );
    }

    renderSummary();

    renderFlashcard();

    renderQuiz();

    clearInsights();

    setStatus(
      "Study pack ready ✓",
      "success"
    );

    document
      .getElementById("summary")
      ?.scrollIntoView({
        behavior:"smooth",
        block:"start"
      });

  } catch (error) {

    console.error(error);

    setStatus(
      error.message ||
      "Could not generate the study pack.",
      "error"
    );

  } finally {

    setBusy(false);
  }
}

function clearInsights() {

  [
    "understandingBar",
    "recallBar",
    "applicationBar"
  ].forEach(id => {

    if ($(id)) {
      $(id).style.width = "0%";
    }

  });

  [
    "understandingScore",
    "recallScore",
    "applicationScore"
  ].forEach(id => {

    if ($(id)) {
      $(id).textContent = "0%";
    }

  });

  if (el.insights) {
    el.insights.textContent =
      "Answer the quiz to see your learning insights.";
  }

  if (el.weakTopicsContent) {
    el.weakTopicsContent.innerHTML = "";
  }

  if (el.mistakeContent) {
    el.mistakeContent.innerHTML = "";
  }

  if (el.knowledgeMapContent) {
    el.knowledgeMapContent.innerHTML = "";
  }
}

function setFeatureOutput(html) {

  if (!el.featureOutput) return;

  el.featureOutput.innerHTML = html;

  el.featureOutput.scrollIntoView({
    behavior:"smooth",
    block:"nearest"
  });
}

async function runTextFeature(task, label) {

  if (!currentMaterial()) {

    setFeatureOutput(
      "<p>Please generate a study pack first.</p>"
    );

    return;
  }

  setFeatureOutput(
    `<p><strong>${label}</strong> is preparing...</p>`
  );

  try {

    const data =
      await callKnowviaAI({
        task,
        topic: state.title,
        material: currentMaterial(),
        difficulty: state.difficulty,
        questionStyle: state.questionStyle
      });

    const answer =
      String(
        responseValue(data) || ""
      );

    setFeatureOutput(`
      <h2>${escapeHTML(label)}</h2>
      <div>${textToHTML(answer)}</div>
    `);

  } catch (e) {

    setFeatureOutput(
      `<p><strong>Error:</strong> ${escapeHTML(e.message)}</p>`
    );
  }
}

async function askMyNotes() {

  if (!currentMaterial()) {

    setFeatureOutput(
      "<p>Please generate a study pack first.</p>"
    );

    return;
  }

  const question =
    window.prompt(
      "What do you want to ask about your notes?"
    );

  if (!question?.trim()) return;

  setFeatureOutput(
    "<p>Searching your notes...</p>"
  );

  try {

    const data =
      await callKnowviaAI({
        task: "ask_notes",
        topic: state.title,
        material: currentMaterial(),
        question: question.trim()
      });

    setFeatureOutput(`
      <h2>Ask My Notes</h2>
      <p>
        <strong>Q:</strong>
        ${escapeHTML(question)}
      </p>
      <div>
        ${textToHTML(responseValue(data))}
      </div>
    `);

  } catch (e) {

    setFeatureOutput(
      `<p><strong>Error:</strong> ${escapeHTML(e.message)}</p>`
    );
  }
}

async function detectWeakTopics() {

  if (!state.quiz.length) {

    if (el.weakTopicsContent) {
      el.weakTopicsContent.innerHTML =
        "<p>Complete some quiz questions first.</p>";
    }

    return;
  }

  const wrongQuestions =
    state.quiz
      .map((q, i) => ({
        q,
        answer: state.quizAnswers[i]
      }))
      .filter(
        x =>
          x.answer !== undefined &&
          x.answer !== Number(x.q.correctAnswer)
      )
      .map(x => ({
        question: x.q.question,
        selectedAnswer:
          x.q.options[x.answer],
        correctAnswer:
          x.q.options[
            Number(x.q.correctAnswer)
          ],
        explanation: x.q.explanation
      }));

  if (!wrongQuestions.length) {

    el.weakTopicsContent.innerHTML =
      "<p>No wrong answers yet. Great work! 🎉</p>";

    return;
  }

  el.weakTopicsContent.innerHTML =
    "<p>Detecting your weak topics...</p>";

  try {

    const data =
      await callKnowviaAI({
        task: "weak_topics",
        material: currentMaterial(),
        wrongQuestions
      });

    const result =
      responseValue(data);

    const topics =
      Array.isArray(result)
        ? result
        : (result?.weakTopics || []);

    el.weakTopicsContent.innerHTML =
      topics.length
        ? `
          <div>
            ${topics.map(t => `
              <div class="kv-map-node">
                <strong>
                  ${escapeHTML(t.topic)}
                </strong>

                <p>
                  ${escapeHTML(t.reason)}
                </p>
              </div>
            `).join("")}
          </div>
        `
        : "<p>No clear weak topic detected yet.</p>";

  } catch (e) {

    el.weakTopicsContent.innerHTML =
      `<p><strong>Error:</strong> ${escapeHTML(e.message)}</p>`;
  }
}

async function explainMistake() {

  if (!state.lastMistake) {

    if (el.mistakeContent) {
      el.mistakeContent.innerHTML =
        "<p>Answer a quiz question incorrectly first.</p>";
    }

    return;
  }

  el.mistakeContent.innerHTML =
    "<p>Explaining your mistake...</p>";

  try {

    const data =
      await callKnowviaAI({
        task: "explain_mistake",
        material: currentMaterial(),
        question: state.lastMistake.question,
        selectedAnswer:
          state.lastMistake.selectedAnswer,
        correctAnswer:
          state.lastMistake.correctAnswer
      });

    el.mistakeContent.innerHTML =
      `<div>${textToHTML(responseValue(data))}</div>`;

  } catch (e) {

    el.mistakeContent.innerHTML =
      `<p><strong>Error:</strong> ${escapeHTML(e.message)}</p>`;
  }
}

async function generateKnowledgeMap() {

  if (!currentMaterial()) {

    el.knowledgeMapContent.innerHTML =
      "<p>Generate a study pack first.</p>";

    return;
  }

  el.knowledgeMapContent.innerHTML =
    "<p>Building your knowledge map...</p>";

  try {

    const data =
      await callKnowviaAI({
        task:"knowledge_map",
        material:currentMaterial()
      });

    const result =
      responseValue(data);

    const nodes =
      Array.isArray(result)
        ? result
        : (
            result?.knowledgeMap ||
            result?.nodes ||
            []
          );

    el.knowledgeMapContent.innerHTML =
      nodes.length
        ? nodes.map(n => `
            <div class="kv-map-node">

              <strong>
                ${escapeHTML(n.topic)}
              </strong>

              <p>
                ${escapeHTML(n.description)}
              </p>

              ${
                Array.isArray(n.relatedTo) &&
                n.relatedTo.length
                  ? `
                    <small>
                      Related:
                      ${escapeHTML(
                        n.relatedTo.join(", ")
                      )}
                    </small>
                  `
                  : ""
              }

            </div>
          `).join("")
        : "<p>No map data was returned.</p>";

  } catch (e) {

    el.knowledgeMapContent.innerHTML =
      `<p><strong>Error:</strong> ${escapeHTML(e.message)}</p>`;
  }
}

function showStudyDNA() {

  if (!state.quiz.length) {

    setFeatureOutput(
      "<p>Generate a study pack and answer the quiz to build your Study DNA.</p>"
    );

    return;
  }

  const answered =
    state.quizAnswers.filter(
      x => x !== undefined
    ).length;

  const correct =
    state.quizAnswers.reduce(
      (n,a,i) =>
        n +
        (
          a !== undefined &&
          a === Number(
            state.quiz[i].correctAnswer
          )
            ? 1
            : 0
        ),
      0
    );

  const accuracy =
    answered
      ? Math.round(
          correct / answered * 100
        )
      : 0;

  const attemptedRate =
    Math.round(
      answered /
      state.quiz.length *
      100
    );

  const confidence =
    accuracy >= 80
      ? "Strong"
      : accuracy >= 60
        ? "Developing"
        : "Needs reinforcement";

  setFeatureOutput(`
    <h2>Study DNA</h2>

    <div class="kv-map-node">

      <strong>
        Learning profile: ${confidence}
      </strong>

      <p>
        Quiz accuracy: ${accuracy}%
      </p>

      <p>
        Questions attempted:
        ${answered}/${state.quiz.length}
        (${attemptedRate}%)
      </p>

      <p>
        Your next best step is to review
        incorrect answers and run the
        Weak Topic Detector.
      </p>

    </div>
  `);
}

function bindSources() {

  all(".source-tab").forEach(tab => {

    tab.addEventListener("click", () => {

      state.source =
        tab.dataset.source || "topic";

      all(".source-tab")
        .forEach(x =>
          x.classList.toggle(
            "active",
            x === tab
          )
        );

      [
        "topic",
        "typed",
        "handwritten",
        "pdf"
      ].forEach(name => {

        const panel =
          $(`${name}Panel`);

        if (panel) {
          panel.hidden =
            state.source !== name;
        }

      });
    });
  });
}

async function readImageOCR(file, statusEl) {

  if (!window.Tesseract) {
    throw new Error(
      "OCR library is not loaded."
    );
  }

  if (statusEl) {
    statusEl.textContent =
      "Reading handwriting...";
  }

  const result =
    await Tesseract.recognize(
      file,
      "eng",
      {
        logger: m => {

          if (
            statusEl &&
            m?.status
          ) {

            statusEl.textContent =
              `${m.status} ${
                Math.round(
                  (m.progress || 0) * 100
                )
              }%`;
          }

        }
      }
    );

  return cleanText(
    result?.data?.text
  );
}

function bindHandwritten() {

  el.handwrittenInput?.addEventListener(
    "change",
    async () => {

      const file =
        el.handwrittenInput.files?.[0];

      if (!file) return;

      try {

        const text =
          await readImageOCR(
            file,
            el.handwrittenStatus
          );

        el.handwrittenInput
          .dataset.extractedText =
          text;

        if (el.handwrittenStatus) {

          el.handwrittenStatus.textContent =
            text
              ? "Handwritten notes read ✓"
              : "No readable text found.";
        }

      } catch (e) {

        if (el.handwrittenStatus) {
          el.handwrittenStatus.textContent =
            e.message;
        }
      }
    }
  );
}

async function extractPDF(file) {

  if (!window.pdfjsLib) {
    throw new Error(
      "PDF.js is not loaded."
    );
  }

  const buffer =
    await file.arrayBuffer();

  const pdf =
    await pdfjsLib.getDocument({
      data:buffer
    }).promise;

  const pages = [];

  for (
    let p = 1;
    p <= pdf.numPages;
    p++
  ) {

    const page =
      await pdf.getPage(p);

    const content =
      await page.getTextContent();

    pages.push(
      content.items
        .map(x => x.str)
        .join(" ")
    );
  }

  const text =
    cleanText(
      pages.join("\n")
    );

  if (!text) {

    throw new Error(
      "This PDF has no selectable text. Please use the Handwritten Notes image option for scanned pages."
    );
  }

  return text;
}

function bindPDF() {

  el.pdfInput?.addEventListener(
    "change",
    async () => {

      const file =
        el.pdfInput.files?.[0];

      if (!file) return;

      try {

        if (el.pdfStatus) {
          el.pdfStatus.textContent =
            "Reading PDF...";
        }

        const text =
          await extractPDF(file);

        el.pdfInput
          .dataset.extractedText =
          text;

        if (el.pdfStatus) {

          el.pdfStatus.textContent =
            `PDF read successfully ✓ (${text.length} characters)`;
        }

      } catch (e) {

        if (el.pdfStatus) {
          el.pdfStatus.textContent =
            e.message;
        }
      }
    }
  );
}

function bindFlashcards() {

  el.prevCard?.addEventListener(
    "click",
    () => {

      if (!state.flashcards.length) return;

      state.cardIndex =
        (
          state.cardIndex -
          1 +
          state.flashcards.length
        ) %
        state.flashcards.length;

      renderFlashcard();
    }
  );

  el.nextCard?.addEventListener(
    "click",
    () => {

      if (!state.flashcards.length) return;

      state.cardIndex =
        (
          state.cardIndex +
          1
        ) %
        state.flashcards.length;

      renderFlashcard();
    }
  );

  el.flipCard?.addEventListener(
    "click",
    () =>
      el.flashcard?.classList.toggle(
        "flipped"
      )
  );

  all("[data-confidence]").forEach(
    btn =>
      btn.addEventListener(
        "click",
        () => {

          btn.parentElement
            ?.querySelectorAll(
              "[data-confidence]"
            )
            .forEach(
              x =>
                x.classList.remove(
                  "selected"
                )
            );

          btn.classList.add(
            "selected"
          );
        }
      )
  );
}

function bindFeatures() {

  el.generateBtn?.addEventListener(
    "click",
    generateStudyPack
  );

  el.weakTopicsBtn?.addEventListener(
    "click",
    detectWeakTopics
  );

  el.explainMistakeBtn?.addEventListener(
    "click",
    explainMistake
  );

  el.knowledgeMapBtn?.addEventListener(
    "click",
    generateKnowledgeMap
  );

  el.teachBtn?.addEventListener(
    "click",
    () =>
      runTextFeature(
        "teach",
        "Teach Me"
      )
  );

  el.studySessionBtn?.addEventListener(
    "click",
    () =>
      runTextFeature(
        "study_session",
        "Study Session"
      )
  );

  el.examModeBtn?.addEventListener(
    "click",
    () =>
      runTextFeature(
        "exam",
        "Exam Mode"
      )
  );

  el.askNotesBtn?.addEventListener(
    "click",
    askMyNotes
  );

  [
    "studyDnaBtn",
    "studyDNABtn",
    "studyDna",
    "studyDNA"
  ].forEach(id => {

    const b = $(id);

    b?.addEventListener(
      "click",
      showStudyDNA
    );
  });
}

function bindTheme() {

  el.themeBtn?.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "dark"
      );

      document.documentElement.classList.toggle(
        "dark"
      );
    }
  );
}

document.addEventListener(
  "DOMContentLoaded",
  () => {

    injectQuizStyles();

    bindSources();

    bindHandwritten();

    bindPDF();

    bindFlashcards();

    bindFeatures();

    bindTheme();

    renderFlashcard();

    renderQuiz();

    clearInsights();
  }
);

})();
