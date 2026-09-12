"use strict";

/* =========================================================
   KNOWVIA - FRONTEND
   ========================================================= */

const state = {
  studyPack: null,
  flashcards: [],
  currentCard: 0,
  cardFlipped: false,
  confidence: {},
  quiz: [],
  quizResults: [],
  source: "topic",
  difficulty: "Medium",
  questionStyle: "Mixed",
  material: "",
  weakTopics: [],
  lastMistake: null
};

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatText(text) {
  if (!text) return "";

  return escapeHTML(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n+/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

function setStatus(message, type = "") {
  const el = $("generateStatus");
  if (!el) return;

  el.textContent = message;
  el.className = "status-message";

  if (type) {
    el.classList.add(type);
  }
}

function setFeatureOutput(html) {
  const el = $("featureOutput");
  if (!el) return;
  el.innerHTML = html;
}

function showLoading(message = "Thinking...") {
  setStatus(message);
}

function getTopic() {
  const topic = $("topic");
  return topic ? topic.value.trim() : "";
}

/* =========================================================
   API
   ========================================================= */

async function api(task, extra = {}) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      task,
      difficulty: state.difficulty,
      questionStyle: state.questionStyle,
      ...extra
    })
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
      data?.message ||
      "Something went wrong while contacting Gemini."
    );
  }

  return data;
}

/* =========================================================
   SOURCE HANDLING
   ========================================================= */

function getCurrentMaterial() {
  if (state.source === "topic") {
    return getTopic();
  }

  if (state.source === "typed") {
    return ($("typedNotes")?.value || "").trim();
  }

  if (state.source === "handwritten") {
    return ($("handwrittenInput")?.value || "").trim();
  }

  if (state.source === "pdf") {
    return state.material || "";
  }

  return "";
}

function buildStudyMaterialText() {
  if (!state.studyPack) {
    return state.material || getCurrentMaterial();
  }

  const s = state.studyPack.studyMatter || state.studyPack;

  const sections = [];

  const add = (title, value) => {
    if (!value) return;

    if (Array.isArray(value)) {
      if (value.length) {
        sections.push(
          `${title}:\n${value.map((x) => `- ${x}`).join("\n")}`
        );
      }
    } else {
      sections.push(`${title}:\n${value}`);
    }
  };

  add("Introduction", s.introduction);
  add("Definition", s.definition);
  add("Core Concept", s.coreConcept);
  add("Key Concepts", s.keyConcepts);
  add("Types", s.types);
  add("Components", s.components);
  add("Working", s.working);
  add("Characteristics", s.characteristics);
  add("Examples", s.examples);
  add("Applications", s.applications);
  add("Advantages", s.advantages);
  add("Limitations", s.limitations);
  add("Comparison", s.comparison);
  add("Important Exam Points", s.importantExamPoints);
  add("Quick Revision", s.quickRevision);

  return sections.join("\n\n");
}

/* =========================================================
   SOURCE TABS
   ========================================================= */

function setupSourceTabs() {
  const tabs = document.querySelectorAll(".source-tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      state.source = tab.dataset.source || "topic";

      document.querySelectorAll(".source-panel").forEach((panel) => {
        panel.style.display = "none";
      });

      const panel = $(`${state.source}Panel`);

      if (panel) {
        panel.style.display = "block";
      }
    });
  });
}

/* =========================================================
   GENERATE STUDY PACK
   ========================================================= */

async function generateStudyPack() {
  const material = getCurrentMaterial();

  if (!material) {
    setStatus(
      "Please enter a topic or provide study material first.",
      "error"
    );
    return;
  }

  state.difficulty = $("difficulty")?.value || "Medium";
  state.questionStyle = $("questionStyle")?.value || "Mixed";
  state.material = material;

  const btn = $("generateBtn");

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating...";
  }

  showLoading(
    `Creating a ${state.difficulty.toLowerCase()}-level study pack...`
  );

  try {
    const data = await api("study_pack", {
      material
    });

    if (!data.result) {
      throw new Error("Gemini did not return a study pack.");
    }

    state.studyPack = data.result;

    const studyMatter =
      state.studyPack.studyMatter || state.studyPack;

    state.flashcards = Array.isArray(state.studyPack.flashcards)
      ? state.studyPack.flashcards.slice(0, 10)
      : [];

    state.quiz = Array.isArray(state.studyPack.quiz)
      ? state.studyPack.quiz.slice(0, 10)
      : [];

    if (state.flashcards.length !== 10) {
      throw new Error(
        `Gemini returned ${state.flashcards.length} flashcards instead of 10. Please generate again.`
      );
    }

    if (state.quiz.length !== 10) {
      throw new Error(
        `Gemini returned ${state.quiz.length} quiz questions instead of 10. Please generate again.`
      );
    }

    state.material = buildStudyMaterialText();

    state.currentCard = 0;
    state.cardFlipped = false;
    state.confidence = {};
    state.quizResults = [];
    state.weakTopics = [];
    state.lastMistake = null;

    renderSummary();
    renderFlashcards();
    renderQuiz();
    resetInsights();

    setStatus(
      `${state.difficulty} study pack generated successfully.`,
      "success"
    );

    document
      .getElementById("summary")
      ?.scrollIntoView({ behavior: "smooth" });

  } catch (error) {
    console.error(error);

    setStatus(
      error.message || "Could not generate the study pack.",
      "error"
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Generate Study Pack";
    }
  }
}

/* =========================================================
   SUMMARY
   ========================================================= */

function renderSection(title, content) {
  if (!content) return "";

  let html = "";

  if (Array.isArray(content)) {
    if (!content.length) return "";

    html = `
      <h3>${escapeHTML(title)}</h3>
      <ul>
        ${content
          .map((item) => `<li>${formatText(item)}</li>`)
          .join("")}
      </ul>
    `;
  } else {
    html = `
      <h3>${escapeHTML(title)}</h3>
      <p>${formatText(content)}</p>
    `;
  }

  return html;
}

function renderSummary() {
  const container = $("summaryContent");

  if (!container) return;

  if (!state.studyPack) {
    container.innerHTML = `
      <div class="empty-state">
        Generate a study pack to see your study matter.
      </div>
    `;
    return;
  }

  const s =
    state.studyPack.studyMatter ||
    state.studyPack;

  let html = "";

  html += `
    <div class="study-level">
      <strong>Difficulty:</strong>
      ${escapeHTML(state.difficulty)}
    </div>
  `;

  html += renderSection("Introduction", s.introduction);
  html += renderSection("Definition", s.definition);
  html += renderSection("Core Concept", s.coreConcept);
  html += renderSection("Key Concepts", s.keyConcepts);
  html += renderSection("Types", s.types);
  html += renderSection("Components", s.components);
  html += renderSection("Working", s.working);
  html += renderSection("Characteristics", s.characteristics);
  html += renderSection("Examples", s.examples);
  html += renderSection("Applications", s.applications);
  html += renderSection("Advantages", s.advantages);
  html += renderSection("Limitations", s.limitations);
  html += renderSection("Comparison", s.comparison);
  html += renderSection(
    "Important Exam Points",
    s.importantExamPoints
  );
  html += renderSection(
    "Quick Revision",
    s.quickRevision
  );

  container.innerHTML = html;
}

/* =========================================================
   FLASHCARDS
   ========================================================= */

function renderFlashcards() {
  const card = $("flashcard");

  if (!card) return;

  if (!state.flashcards.length) {
    card.innerHTML = `
      <div class="empty-state">
        Generate a study pack to create flashcards.
      </div>
    `;
    return;
  }

  const item = state.flashcards[state.currentCard];

  card.innerHTML = `
    <div
      class="flashcard-front-content"
      style="display:${state.cardFlipped ? "none" : "block"}"
    >
      <span class="card-label">QUESTION</span>

      <h3>
        ${escapeHTML(item.question)}
      </h3>

      <p class="flip-hint">
        Click the card to reveal the answer
      </p>
    </div>

    <div
      class="flashcard-back-content"
      style="display:${state.cardFlipped ? "block" : "none"}"
    >
      <span class="card-label">ANSWER</span>

      <p>
        ${formatText(item.answer)}
      </p>

      <p class="flip-hint">
        Click the card to return
      </p>
    </div>
  `;

  card.onclick = function () {
    state.cardFlipped = !state.cardFlipped;
    renderFlashcards();
  };

  const progress = $("cardProgress");

  if (progress) {
    progress.textContent =
      `${state.currentCard + 1} / ${state.flashcards.length}`;
  }

  updateConfidenceButtons();
}

function flipCard() {
  if (!state.flashcards.length) return;

  state.cardFlipped = !state.cardFlipped;
  renderFlashcards();
}

function nextCard() {
  if (!state.flashcards.length) return;

  state.currentCard =
    (state.currentCard + 1) % state.flashcards.length;

  state.cardFlipped = false;

  renderFlashcards();
}

function prevCard() {
  if (!state.flashcards.length) return;

  state.currentCard =
    (state.currentCard - 1 + state.flashcards.length) %
    state.flashcards.length;

  state.cardFlipped = false;

  renderFlashcards();
}

function setConfidence(level) {
  if (!state.flashcards.length) return;

  state.confidence[state.currentCard] = level;

  updateConfidenceButtons();
}

function updateConfidenceButtons() {
  const buttons =
    document.querySelectorAll("[data-confidence]");

  buttons.forEach((button) => {
    button.classList.remove("active");

    const level = button.dataset.confidence;

    if (
      state.confidence[state.currentCard] === level
    ) {
      button.classList.add("active");
    }
  });
}

/* =========================================================
   QUIZ
   ========================================================= */

function renderQuiz() {
  const container = $("quizContainer");

  if (!container) return;

  if (!state.quiz.length) {
    container.innerHTML = `
      <div class="empty-state">
        Generate a study pack to start the quiz.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="quiz-header">
      <h3>
        ${escapeHTML(state.difficulty)} Quiz
      </h3>

      <p>
        10 questions · 4 options each
      </p>
    </div>

    <div class="quiz-list">
      ${state.quiz
        .map((q, index) => {
          const options = Array.isArray(q.options)
            ? q.options
            : [];

          return `
            <div
              class="quiz-question"
              data-question="${index}"
            >
              <h4>
                ${index + 1}. ${formatText(q.question)}
              </h4>

              <div class="quiz-options">
                ${options
                  .slice(0, 4)
                  .map(
                    (option, optionIndex) => `
                      <button
                        type="button"
                        class="quiz-option"
                        data-question="${index}"
                        data-option="${optionIndex}"
                      >
                        ${String.fromCharCode(65 + optionIndex)}.
                        ${formatText(option)}
                      </button>
                    `
                  )
                  .join("")}
              </div>

              <div
                class="quiz-feedback"
                id="quiz-feedback-${index}"
              ></div>
            </div>
          `;
        })
        .join("")}
    </div>

    <div
      id="quizScore"
      class="quiz-score"
      style="display:none"
    ></div>
  `;

  container
    .querySelectorAll(".quiz-option")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const questionIndex =
          Number(button.dataset.question);

        const optionIndex =
          Number(button.dataset.option);

        handleQuizAnswer(
          questionIndex,
          optionIndex
        );
      });
    });
}

function handleQuizAnswer(questionIndex, optionIndex) {
  const question = state.quiz[questionIndex];

  if (!question) return;

  const alreadyAnswered =
    state.quizResults.find(
      (r) => r.questionIndex === questionIndex
    );

  if (alreadyAnswered) return;

  const correctAnswer =
    Number(question.correctAnswer);

  const isCorrect =
    optionIndex === correctAnswer;

  state.quizResults.push({
    questionIndex,
    selected: optionIndex,
    correct: correctAnswer,
    isCorrect
  });

  const questionBox =
    document.querySelector(
      `.quiz-question[data-question="${questionIndex}"]`
    );

  if (!questionBox) return;

  const buttons =
    questionBox.querySelectorAll(".quiz-option");

  buttons.forEach((button) => {
    button.disabled = true;

    const value =
      Number(button.dataset.option);

    if (value === correctAnswer) {
      button.classList.add("correct");
    }

    if (value === optionIndex && !isCorrect) {
      button.classList.add("wrong");
    }
  });

  const feedback =
    $(`quiz-feedback-${questionIndex}`);

  if (feedback) {
    feedback.innerHTML = `
      <strong>
        ${isCorrect ? "Correct" : "Review this one"}
      </strong>
      <p>
        ${formatText(
          question.explanation ||
          "Review the study matter for this question."
        )}
      </p>
    `;
  }

  state.lastMistake = isCorrect
    ? state.lastMistake
    : {
        question,
        selected: optionIndex,
        correct: correctAnswer
      };

  updateUnderstanding();
}

function updateUnderstanding() {
  const total = state.quiz.length || 10;
  const answered = state.quizResults.length;
  const correct = state.quizResults.filter(
    (r) => r.isCorrect
  ).length;

  const understanding =
    total ? Math.round((correct / total) * 100) : 0;

  const recall =
    total ? Math.round((answered / total) * 100) : 0;

  const application = understanding;

  setProgress("understandingBar", understanding);
  setProgress("recallBar", recall);
  setProgress("applicationBar", application);

  setText("understandingScore", `${understanding}%`);
  setText("recallScore", `${recall}%`);
  setText("applicationScore", `${application}%`);

  if (answered === total) {
    const scoreBox = $("quizScore");

    if (scoreBox) {
      scoreBox.style.display = "block";

      scoreBox.innerHTML = `
        <h3>Quiz completed</h3>
        <p>
          You scored
          <strong>${correct}/${total}</strong>
        </p>
        <p>
          ${Math.round((correct / total) * 100)}%
          overall score
        </p>
      `;
    }
  }
}

function setProgress(id, value) {
  const el = $(id);

  if (!el) return;

  el.style.width =
    `${Math.max(0, Math.min(100, value))}%`;
}

function setText(id, value) {
  const el = $(id);

  if (el) {
    el.textContent = value;
  }
}

function resetInsights() {
  setProgress("understandingBar", 0);
  setProgress("recallBar", 0);
  setProgress("applicationBar", 0);

  setText("understandingScore", "0%");
  setText("recallScore", "0%");
  setText("applicationScore", "0%");

  if ($("weakTopicsContent")) {
    $("weakTopicsContent").innerHTML = `
      <p>Complete the quiz to detect weak topics.</p>
    `;
  }

  if ($("mistakeContent")) {
    $("mistakeContent").innerHTML = `
      <p>Answer a question incorrectly to analyse the mistake.</p>
    `;
  }

  if ($("knowledgeMapContent")) {
    $("knowledgeMapContent").innerHTML = `
      <p>Generate a study pack to build your knowledge map.</p>
    `;
  }
}

/* =========================================================
   WEAK TOPIC DETECTOR
   ========================================================= */

async function detectWeakTopics() {
  if (!state.studyPack || !state.quiz.length) {
    setFeatureOutput(
      "<p>Generate and attempt the quiz first.</p>"
    );
    return;
  }

  const wrongQuestions = state.quizResults
    .filter((r) => !r.isCorrect)
    .map((r) => {
      const q = state.quiz[r.questionIndex];

      return {
        question: q.question,
        selectedAnswer: q.options?.[r.selected],
        correctAnswer: q.options?.[r.correct]
      };
    });

  if (!wrongQuestions.length) {
    $("weakTopicsContent").innerHTML = `
      <p>
        Great! No weak topics were detected from your answered questions.
      </p>
    `;

    return;
  }

  const content = $("weakTopicsContent");

  if (content) {
    content.innerHTML =
      "<p>Analysing your incorrect answers...</p>";
  }

  try {
    const data = await api("weak_topics", {
      material: buildStudyMaterialText(),
      wrongQuestions
    });

    state.weakTopics =
      Array.isArray(data.result?.weakTopics)
        ? data.result.weakTopics
        : [];

    if (!content) return;

    if (!state.weakTopics.length) {
      content.innerHTML =
        "<p>No clear weak topics detected.</p>";
      return;
    }

    content.innerHTML = `
      <ul>
        ${state.weakTopics
          .map((topic) => `
            <li>
              <strong>${escapeHTML(topic.topic || topic)}</strong>
              ${
                topic.reason
                  ? `<br>${formatText(topic.reason)}`
                  : ""
              }
            </li>
          `)
          .join("")}
      </ul>
    `;

  } catch (error) {
    console.error(error);

    if (content) {
      content.innerHTML =
        `<p>${escapeHTML(error.message)}</p>`;
    }
  }
}

/* =========================================================
   TARGETED RETEST
   ========================================================= */

async function targetedRetest() {
  if (!state.studyPack) {
    setFeatureOutput(
      "<p>Generate a study pack first.</p>"
    );
    return;
  }

  if (!state.weakTopics.length) {
    await detectWeakTopics();
  }

  const topics =
    state.weakTopics.length
      ? state.weakTopics
          .map((x) => x.topic || x)
          .join(", ")
      : "the concepts you answered incorrectly";

  setFeatureOutput(`
    <div class="feature-card">
      <h3>Targeted Re-test</h3>
      <p>Generating questions focused on: ${escapeHTML(topics)}</p>
    </div>
  `);

  try {
    const data = await api("quiz", {
      material: buildStudyMaterialText(),
      focusTopics: topics,
      count: 10
    });

    const questions = Array.isArray(data.result)
      ? data.result
      : data.result?.quiz;

    if (!Array.isArray(questions) || !questions.length) {
      throw new Error("No re-test questions were returned.");
    }

    state.quiz = questions.slice(0, 10);
    state.quizResults = [];
    state.lastMistake = null;

    renderQuiz();

    document
      .getElementById("quizContainer")
      ?.scrollIntoView({ behavior: "smooth" });

    setFeatureOutput(`
      <div class="feature-card">
        <h3>Targeted Re-test ready</h3>
        <p>
          The new quiz focuses on the concepts you need to practise.
        </p>
      </div>
    `);

  } catch (error) {
    console.error(error);

    setFeatureOutput(`
      <div class="feature-card error">
        ${escapeHTML(error.message)}
      </div>
    `);
  }
}

/* =========================================================
   EXPLAIN MY MISTAKE
   ========================================================= */

async function explainMistake() {
  if (!state.lastMistake) {
    setFeatureOutput(`
      <div class="feature-card">
        <h3>Explain My Mistake</h3>
        <p>Answer a quiz question incorrectly first.</p>
      </div>
    `);
    return;
  }

  const mistake = state.lastMistake;

  setFeatureOutput(
    "<p>Analysing your mistake...</p>"
  );

  try {
    const data = await api("explain_mistake", {
      material: buildStudyMaterialText(),
      question: mistake.question.question,
      selectedAnswer:
        mistake.question.options?.[mistake.selected],
      correctAnswer:
        mistake.question.options?.[mistake.correct]
    });

    setFeatureOutput(`
      <div class="feature-card">
        <h3>Why you made this mistake</h3>
        <div>
          ${formatText(data.answer || "No explanation returned.")}
        </div>
      </div>
    `);

  } catch (error) {
    setFeatureOutput(`
      <div class="feature-card error">
        ${escapeHTML(error.message)}
      </div>
    `);
  }
}

/* =========================================================
   KNOWLEDGE MAP
   ========================================================= */

async function generateKnowledgeMap() {
  if (!state.studyPack) {
    setFeatureOutput(
      "<p>Generate a study pack first.</p>"
    );
    return;
  }

  const container = $("knowledgeMapContent");

  if (container) {
    container.innerHTML =
      "<p>Building your knowledge map...</p>";
  }

  try {
    const data = await api("knowledge_map", {
      material: buildStudyMaterialText()
    });

    const map =
      data.result?.map ||
      data.result?.knowledgeMap ||
      data.result;

    if (!container) return;

    if (typeof map === "string") {
      container.innerHTML = `
        <div class="knowledge-map-text">
          ${formatText(map)}
        </div>
      `;
      return;
    }

    if (Array.isArray(map)) {
      container.innerHTML = `
        <ul>
          ${map
            .map((item) => `
              <li>${formatText(
                typeof item === "string"
                  ? item
                  : item.topic || JSON.stringify(item)
              )}</li>
            `)
            .join("")}
        </ul>
      `;
      return;
    }

    container.innerHTML = `
      <pre>${escapeHTML(JSON.stringify(map, null, 2))}</pre>
    `;

  } catch (error) {
    if (container) {
      container.innerHTML =
        `<p>${escapeHTML(error.message)}</p>`;
    }
  }
}

/* =========================================================
   TEACH ME / STUDY SESSION / EXAM MODE
   ========================================================= */

async function runFeature(feature) {
  if (!state.studyPack) {
    setFeatureOutput(`
      <div class="feature-card">
        <h3>Generate a study pack first</h3>
        <p>This feature uses your generated study matter.</p>
      </div>
    `);
    return;
  }

  const names = {
    teach: "Teach Me",
    study_session: "Study Session",
    exam: "Exam Mode"
  };

  setFeatureOutput(`
    <div class="feature-card">
      <h3>${names[feature] || "Loading"}</h3>
      <p>Preparing your personalised learning activity...</p>
    </div>
  `);

  try {
    const data = await api(feature, {
      material: buildStudyMaterialText()
    });

    setFeatureOutput(`
      <div class="feature-card">
        <h3>${escapeHTML(names[feature] || feature)}</h3>
        <div>
          ${formatText(data.answer || "No content returned.")}
        </div>
      </div>
    `);

  } catch (error) {
    console.error(error);

    setFeatureOutput(`
      <div class="feature-card error">
        ${escapeHTML(error.message)}
      </div>
    `);
  }
}

/* =========================================================
   ASK MY NOTES
   ========================================================= */

async function askMyNotes() {
  const material = getCurrentMaterial();

  if (!material && !state.studyPack) {
    setFeatureOutput(`
      <div class="feature-card">
        <h3>Ask My Notes</h3>
        <p>Add typed, handwritten, PDF or topic material first.</p>
      </div>
    `);
    return;
  }

  const question = window.prompt(
    "What do you want to ask about your notes?"
  );

  if (!question || !question.trim()) {
    return;
  }

  setFeatureOutput(
    "<p>Searching your study material...</p>"
  );

  try {
    const data = await api("ask_notes", {
      material:
        state.studyPack
          ? buildStudyMaterialText()
          : material,
      question: question.trim()
    });

    setFeatureOutput(`
      <div class="feature-card">
        <h3>Your Notes Answer</h3>
        <p>
          <strong>Question:</strong>
          ${escapeHTML(question)}
        </p>
        <div>
          ${formatText(data.answer || "No answer returned.")}
        </div>
      </div>
    `);

  } catch (error) {
    setFeatureOutput(`
      <div class="feature-card error">
        ${escapeHTML(error.message)}
      </div>
    `);
  }
}

/* =========================================================
   HANDWRITTEN NOTES OCR
   ========================================================= */

async function processHandwrittenImage(file) {
  if (!file) return;

  const status = $("handwrittenStatus");

  if (status) {
    status.textContent =
      "Reading handwriting... This may take a little time.";
  }

  try {
    if (!window.Tesseract) {
      throw new Error(
        "OCR library is not available."
      );
    }

    const result = await Tesseract.recognize(
      file,
      "eng",
      {
        logger: (info) => {
          if (
            info.status === "recognizing text" &&
            status
          ) {
            status.textContent =
              `Reading handwriting... ${Math.round(
                (info.progress || 0) * 100
              )}%`;
          }
        }
      }
    );

    const text =
      result?.data?.text?.trim() || "";

    const input = $("handwrittenInput");

    if (input) {
      input.value = text;
    }

    if (status) {
      status.textContent = text
        ? "Handwritten notes extracted successfully."
        : "No readable text was detected.";
    }

  } catch (error) {
    console.error(error);

    if (status) {
      status.textContent =
        error.message || "Could not read the image.";
    }
  }
}

function setupHandwritingOCR() {
  const possibleInputs = [
    "handwrittenFile",
    "handwrittenImage",
    "handwrittenUpload"
  ];

  for (const id of possibleInputs) {
    const input = $(id);

    if (!input) continue;

    input.addEventListener("change", () => {
      const file = input.files?.[0];

      if (file) {
        processHandwrittenImage(file);
      }
    });
  }
}

/* =========================================================
   PDF TEXT EXTRACTION
   ========================================================= */

async function extractPDF(file) {
  const status = $("pdfStatus");

  if (!file) return;

  if (status) {
    status.textContent =
      "Reading PDF...";
  }

  try {
    if (!window.pdfjsLib) {
      throw new Error(
        "PDF reader library is not available."
      );
    }

    const arrayBuffer =
      await file.arrayBuffer();

    const pdf =
      await pdfjsLib.getDocument({
        data: arrayBuffer
      }).promise;

    let fullText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page =
        await pdf.getPage(pageNumber);

      const content =
        await page.getTextContent();

      const pageText =
        content.items
          .map((item) => item.str)
          .join(" ");

      fullText +=
        `\n\nPage ${pageNumber}\n${pageText}`;
    }

    fullText = fullText.trim();

    if (!fullText) {
      throw new Error(
        "This PDF appears to be scanned/image-based. Selectable PDF text could not be extracted."
      );
    }

    state.material = fullText;

    if (status) {
      status.textContent =
        `PDF extracted successfully (${pdf.numPages} page${pdf.numPages === 1 ? "" : "s"}).`;
    }

  } catch (error) {
    console.error(error);

    if (status) {
      status.textContent =
        error.message || "Could not read the PDF.";
    }
  }
}

function setupPDF() {
  const input = $("pdfInput");

  if (!input) return;

  input.addEventListener("change", () => {
    const file = input.files?.[0];

    if (file) {
      extractPDF(file);
    }
  });
}

/* =========================================================
   THEME
   ========================================================= */

function setupTheme() {
  const button = $("themeBtn");

  if (!button) return;

  button.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    const dark =
      document.body.classList.contains("dark-mode");

    button.textContent =
      dark ? "☀️" : "🌙";
  });
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {
  document.querySelectorAll("a[href^='#']").forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId =
        link.getAttribute("href");

      if (!targetId || targetId === "#") return;

      const target =
        document.querySelector(targetId);

      if (target) {
        event.preventDefault();

        target.scrollIntoView({
          behavior: "smooth"
        });
      }
    });
  });
}

/* =========================================================
   BUTTONS
   ========================================================= */

function setupButtons() {
  $("generateBtn")?.addEventListener(
    "click",
    generateStudyPack
  );

  $("flipCard")?.addEventListener(
    "click",
    flipCard
  );

  $("nextCard")?.addEventListener(
    "click",
    nextCard
  );

  $("prevCard")?.addEventListener(
    "click",
    prevCard
  );

  document
    .querySelectorAll("[data-confidence]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        setConfidence(
          button.dataset.confidence
        );
      });
    });

  $("weakTopicsBtn")?.addEventListener(
    "click",
    detectWeakTopics
  );

  $("explainMistakeBtn")?.addEventListener(
    "click",
    explainMistake
  );

  $("knowledgeMapBtn")?.addEventListener(
    "click",
    generateKnowledgeMap
  );

  $("teachBtn")?.addEventListener(
    "click",
    () => runFeature("teach")
  );

  $("studySessionBtn")?.addEventListener(
    "click",
    () => runFeature("study_session")
  );

  $("examModeBtn")?.addEventListener(
    "click",
    () => runFeature("exam")
  );

  $("askNotesBtn")?.addEventListener(
    "click",
    askMyNotes
  );
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  setupSourceTabs();
  setupButtons();
  setupTheme();
  setupNavigation();
  setupHandwritingOCR();
  setupPDF();

  document
    .querySelectorAll(".source-panel")
    .forEach((panel) => {
      panel.style.display = "none";
    });

  const topicPanel = $("topicPanel");

  if (topicPanel) {
    topicPanel.style.display = "block";
  }

  const firstTab =
    document.querySelector(
      '.source-tab[data-source="topic"]'
    );

  if (firstTab) {
    firstTab.classList.add("active");
  }

  renderSummary();
  renderFlashcards();
  renderQuiz();
  resetInsights();
});
