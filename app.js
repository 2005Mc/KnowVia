// ============================================================
// KNOWVIA - FRONTEND
// ============================================================

const state = {
  studyPack: null,
  flashcards: [],
  currentCard: 0,
  cardFlipped: false,
  quiz: [],
  quizResults: [],
  source: "topic",
  difficulty: "Medium",
  questionStyle: "Mixed",
  material: ""
};

// ============================================================
// DOM HELPERS
// ============================================================

const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showMessage(element, message) {
  if (element) {
    element.textContent = message;
  }
}

// ============================================================
// API
// ============================================================

async function callKnowviaAI(payload) {
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
  } catch {
    throw new Error(
      "The server returned an invalid response."
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error || "AI request failed."
    );
  }

  return data;
}

function extractStudyPack(data) {
  if (data?.result && typeof data.result === "object") {
    return data.result;
  }

  if (data?.answer) {
    try {
      return JSON.parse(data.answer);
    } catch {}
  }

  return data;
}

function extractJSON(data) {
  if (data?.result && typeof data.result === "object") {
    return data.result;
  }

  if (data?.answer) {
    let text = data.answer.trim();

    text = text.replace(/^```json\s*/i, "");
    text = text.replace(/^```\s*/i, "");
    text = text.replace(/\s*```$/i, "");

    try {
      return JSON.parse(text);
    } catch {}
  }

  return data;
}

function extractTextResponse(data) {
  return (
    data?.answer ||
    data?.result ||
    data?.text ||
    "No response was returned."
  );
}

// ============================================================
// SOURCE TABS
// ============================================================

function setupSourceTabs() {
  const tabs = document.querySelectorAll(".source-tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) =>
        item.classList.remove("active")
      );

      tab.classList.add("active");

      state.source = tab.dataset.source || "topic";

      document
        .querySelectorAll(".source-panel")
        .forEach((panel) => {
          panel.classList.remove("active");
        });

      const panel = $(`${state.source}Panel`);

      if (panel) {
        panel.classList.add("active");
      }
    });
  });
}

// ============================================================
// GET INPUT
// ============================================================

function getCurrentMaterial() {
  const topic = $("topic")?.value?.trim() || "";
  const typedNotes =
    $("typedNotes")?.value?.trim() || "";

  if (state.source === "topic") {
    return topic;
  }

  if (state.source === "typed") {
    return typedNotes;
  }

  if (state.source === "handwritten") {
    return (
      $("handwrittenInput")?.value?.trim() ||
      ""
    );
  }

  if (state.source === "pdf") {
    return state.material || "";
  }

  return topic || typedNotes;
}

// ============================================================
// GENERATE STUDY PACK
// ============================================================

async function generateStudyPack() {
  const topic =
    $("topic")?.value?.trim() || "Study Topic";

  const material = getCurrentMaterial();

  const difficulty =
    $("difficulty")?.value || "Medium";

  const questionStyle =
    $("questionStyle")?.value || "Mixed";

  state.difficulty = difficulty;
  state.questionStyle = questionStyle;
  state.material = material;

  const status = $("generateStatus");

  showMessage(status, "Generating your study pack...");

  const button = $("generateBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Generating...";
  }

  try {
    const data = await callKnowviaAI({
      task: "study_pack",
      topic,
      difficulty,
      material,
      quizStyle: questionStyle
    });

    const pack = extractStudyPack(data);

    if (!pack || !pack.summary) {
      throw new Error(
        "The AI returned an incomplete study pack."
      );
    }

    state.studyPack = pack;
    state.flashcards = Array.isArray(pack.flashcards)
      ? pack.flashcards
      : [];

    state.quiz = Array.isArray(pack.quiz)
      ? pack.quiz
      : [];

    state.quizResults = [];

    renderSummary(pack);
    renderFlashcards();
    renderQuiz();
    resetInsights();

    showMessage(
      status,
      "Study pack generated successfully!"
    );

    document
      .querySelector("#summary")
      ?.scrollIntoView({
        behavior: "smooth"
      });

  } catch (error) {
    console.error(error);

    showMessage(
      status,
      error.message || "Something went wrong."
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Generate Study Pack";
    }
  }
}

// ============================================================
// SUMMARY
// ============================================================

function renderSummary(pack) {
  const container = $("summaryContent");

  if (!container) return;

  const concepts = Array.isArray(pack.keyConcepts)
    ? pack.keyConcepts
    : [];

  container.innerHTML = `
    <div class="summary-main">
      <h3>Summary</h3>
      <p>${escapeHTML(pack.summary)}</p>
    </div>

    ${
      concepts.length
        ? `
      <div class="key-concepts">
        <h3>Key Concepts</h3>
        <ul>
          ${concepts
            .map(
              (item) =>
                `<li>${escapeHTML(item)}</li>`
            )
            .join("")}
        </ul>
      </div>
    `
        : ""
    }
  `;
}

// ============================================================
// FLASHCARDS
// ============================================================

function renderFlashcards() {
  const question = $("cardQuestion");
  const answer = $("cardAnswer");
  const progress = $("cardProgress");
  const card = $("flashcard");

  if (!question || !answer) return;

  if (!state.flashcards.length) {
    question.textContent =
      "Generate a study pack to create flashcards.";
    answer.textContent = "";
    return;
  }

  const item =
    state.flashcards[state.currentCard];

  question.textContent =
    item?.question || "No question available.";

  answer.textContent =
    item?.answer || "No answer available.";

  if (progress) {
    progress.textContent =
      `${state.currentCard + 1} / ${state.flashcards.length}`;
  }

  state.cardFlipped = false;

  if (card) {
    card.classList.remove("flipped");
  }
}

function flipCard() {
  const card = $("flashcard");

  if (!card) return;

  state.cardFlipped = !state.cardFlipped;

  card.classList.toggle(
    "flipped",
    state.cardFlipped
  );
}

function nextCard() {
  if (!state.flashcards.length) return;

  state.currentCard =
    (state.currentCard + 1) %
    state.flashcards.length;

  renderFlashcards();
}

function prevCard() {
  if (!state.flashcards.length) return;

  state.currentCard =
    (state.currentCard - 1 +
      state.flashcards.length) %
    state.flashcards.length;

  renderFlashcards();
}

// ============================================================
// QUIZ
// ============================================================

function renderQuiz() {
  const container = $("quizContainer");

  if (!container) return;

  if (!state.quiz.length) {
    container.innerHTML =
      "<p>Generate a study pack to start the quiz.</p>";
    return;
  }

  container.innerHTML = state.quiz
    .map((item, index) => {
      const options = Array.isArray(item.options)
        ? item.options
        : [];

      return `
        <div class="quiz-question" data-index="${index}">
          <h3>
            ${index + 1}. ${escapeHTML(item.question)}
          </h3>

          <div class="quiz-options">
            ${options
              .slice(0, 4)
              .map(
                (option, optionIndex) => `
                  <button
                    class="quiz-option"
                    data-question="${index}"
                    data-option="${optionIndex}"
                  >
                    ${escapeHTML(option)}
                  </button>
                `
              )
              .join("")}
          </div>

          <div
            class="quiz-feedback"
            id="quizFeedback${index}"
          ></div>
        </div>
      `;
    })
    .join("");

  container
    .querySelectorAll(".quiz-option")
    .forEach((button) => {
      button.addEventListener(
        "click",
        handleQuizAnswer
      );
    });
}

function handleQuizAnswer(event) {
  const button = event.currentTarget;

  const questionIndex =
    Number(button.dataset.question);

  const selected =
    Number(button.dataset.option);

  const question =
    state.quiz[questionIndex];

  if (!question) return;

  const correct =
    Number(question.correctAnswer);

  const questionContainer =
    button.closest(".quiz-question");

  if (!questionContainer) return;

  const buttons =
    questionContainer.querySelectorAll(
      ".quiz-option"
    );

  buttons.forEach((item) => {
    item.disabled = true;
  });

  if (selected === correct) {
    button.classList.add("correct");
  } else {
    button.classList.add("wrong");

    buttons.forEach((item) => {
      if (
        Number(item.dataset.option) === correct
      ) {
        item.classList.add("correct");
      }
    });
  }

  const feedback = $(
    `quizFeedback${questionIndex}`
  );

  if (feedback) {
    feedback.textContent =
      question.explanation ||
      "Review this concept once more.";
  }

  state.quizResults.push({
    question: question.question,
    selectedAnswer:
      question.options?.[selected] || "",
    correctAnswer:
      question.options?.[correct] || "",
    isCorrect: selected === correct
  });

  updateUnderstanding();
}

// ============================================================
// INSIGHTS
// ============================================================

function updateUnderstanding() {
  const results = state.quizResults;

  if (!results.length) return;

  const correct = results.filter(
    (item) => item.isCorrect
  ).length;

  const score = Math.round(
    (correct / results.length) * 100
  );

  const bar = $("understandingBar");
  const text = $("understandingScore");

  if (bar) {
    bar.style.width = `${score}%`;
  }

  if (text) {
    text.textContent = `${score}%`;
  }

  const recallScore =
    Math.min(100, score + 5);

  const applicationScore =
    Math.max(0, score - 5);

  if ($("recallBar")) {
    $("recallBar").style.width =
      `${recallScore}%`;
  }

  if ($("recallScore")) {
    $("recallScore").textContent =
      `${recallScore}%`;
  }

  if ($("applicationBar")) {
    $("applicationBar").style.width =
      `${applicationScore}%`;
  }

  if ($("applicationScore")) {
    $("applicationScore").textContent =
      `${applicationScore}%`;
  }
}

function resetInsights() {
  [
    "understandingBar",
    "recallBar",
    "applicationBar"
  ].forEach((id) => {
    if ($(id)) {
      $(id).style.width = "0%";
    }
  });

  [
    "understandingScore",
    "recallScore",
    "applicationScore"
  ].forEach((id) => {
    if ($(id)) {
      $(id).textContent = "0%";
    }
  });

  if ($("weakTopicsContent")) {
    $("weakTopicsContent").innerHTML =
      "<p>Complete the quiz to detect weak topics.</p>";
  }

  if ($("mistakeContent")) {
    $("mistakeContent").innerHTML =
      "<p>Answer a quiz question to explain a mistake.</p>";
  }

  if ($("knowledgeMapContent")) {
    $("knowledgeMapContent").innerHTML =
      "<p>Complete the quiz to build your knowledge map.</p>";
  }
}

// ============================================================
// WEAK TOPICS
// ============================================================

async function targetedRetest() {
  const output = $("weakTopicsContent");

  if (!output) return;

  if (!state.quizResults.length) {
    output.innerHTML =
      "<p>Please complete some quiz questions first.</p>";
    return;
  }

  output.innerHTML =
    "<p>Analyzing your weak topics...</p>";

  try {
    const data = await callKnowviaAI({
      task: "weak_topics",
      quizResults: state.quizResults
    });

    const result = extractJSON(data);

    const topics = Array.isArray(
      result?.weakTopics
    )
      ? result.weakTopics
      : [];

    output.innerHTML = `
      ${
        topics.length
          ? `
        <h4>Topics to revise</h4>
        <ul>
          ${topics
            .map(
              (topic) =>
                `<li>${escapeHTML(topic)}</li>`
            )
            .join("")}
        </ul>
      `
          : "<p>No major weak topics detected.</p>"
      }

      ${
        result?.explanation
          ? `<p>${escapeHTML(
              result.explanation
            )}</p>`
          : ""
      }
    `;
  } catch (error) {
    output.innerHTML =
      `<p>${escapeHTML(error.message)}</p>`;
  }
}

// ============================================================
// EXPLAIN MISTAKE
// ============================================================

async function explainMistake() {
  const output = $("mistakeContent");

  if (!output) return;

  const mistake =
    [...state.quizResults]
      .reverse()
      .find((item) => !item.isCorrect);

  if (!mistake) {
    output.innerHTML =
      "<p>No incorrect answer found yet.</p>";
    return;
  }

  output.innerHTML =
    "<p>Explaining your mistake...</p>";

  try {
    const data = await callKnowviaAI({
      task: "explain_mistake",
      question: mistake.question,
      studentAnswer: mistake.selectedAnswer,
      correctAnswer: mistake.correctAnswer
    });

    output.innerHTML =
      `<p>${escapeHTML(
        extractTextResponse(data)
      )}</p>`;
  } catch (error) {
    output.innerHTML =
      `<p>${escapeHTML(error.message)}</p>`;
  }
}

// ============================================================
// KNOWLEDGE MAP
// ============================================================

async function generateKnowledgeMap() {
  const output = $("knowledgeMapContent");

  if (!output) return;

  if (!state.quizResults.length) {
    output.innerHTML =
      "<p>Complete the quiz first.</p>";
    return;
  }

  output.innerHTML =
    "<p>Building your knowledge map...</p>";

  try {
    const data = await callKnowviaAI({
      task: "knowledge_map",
      quizResults: state.quizResults
    });

    const result = extractJSON(data);

    const nodes = Array.isArray(result?.nodes)
      ? result.nodes
      : [];

    if (!nodes.length) {
      output.innerHTML =
        "<p>No knowledge map data was returned.</p>";
      return;
    }

    output.innerHTML = `
      <div class="knowledge-map-list">
        ${nodes
          .map(
            (node) => `
              <div class="knowledge-node">
                <strong>
                  ${escapeHTML(node.topic)}
                </strong>

                <span>
                  ${escapeHTML(node.status)}
                </span>

                <p>
                  ${escapeHTML(node.reason)}
                </p>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  } catch (error) {
    output.innerHTML =
      `<p>${escapeHTML(error.message)}</p>`;
  }
}

// ============================================================
// EXTRA AI FEATURES
// ============================================================

async function runFeature(task, title) {
  const output = $("featureOutput");

  if (!output) return;

  const topic =
    $("topic")?.value?.trim() ||
    "the current study topic";

  output.innerHTML =
    `<h3>${escapeHTML(title)}</h3>
     <p>Thinking...</p>`;

  try {
    const data = await callKnowviaAI({
      task,
      topic,
      material: state.material ||
        getCurrentMaterial(),
      difficulty: state.difficulty
    });

    const answer = extractTextResponse(data);

    output.innerHTML = `
      <h3>${escapeHTML(title)}</h3>
      <div class="feature-answer">
        ${escapeHTML(answer)
          .replace(/\n/g, "<br>")}
      </div>
    `;

    output.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  } catch (error) {
    output.innerHTML =
      `<p>${escapeHTML(error.message)}</p>`;
  }
}

async function askMyNotes() {
  const question =
    prompt("What do you want to ask about your notes?");

  if (!question) return;

  const output = $("featureOutput");

  if (!output) return;

  output.innerHTML =
    "<p>Searching your notes...</p>";

  try {
    const data = await callKnowviaAI({
      task: "ask_notes",
      question,
      material:
        state.material ||
        getCurrentMaterial()
    });

    output.innerHTML = `
      <h3>Ask My Notes</h3>
      <div class="feature-answer">
        ${escapeHTML(
          extractTextResponse(data)
        ).replace(/\n/g, "<br>")}
      </div>
    `;
  } catch (error) {
    output.innerHTML =
      `<p>${escapeHTML(error.message)}</p>`;
  }
}

// ============================================================
// HANDWRITTEN OCR
// ============================================================

async function processHandwrittenImage(file) {
  const status = $("handwrittenStatus");

  if (!file) return;

  if (!window.Tesseract) {
    showMessage(
      status,
      "OCR library is not available."
    );
    return;
  }

  showMessage(
    status,
    "Reading handwriting... Please wait."
  );

  try {
    const result =
      await Tesseract.recognize(
        file,
        "eng",
        {
          logger: (info) => {
            if (
              info.status ===
              "recognizing text"
            ) {
              const percent =
                Math.round(
                  (info.progress || 0) * 100
                );

              showMessage(
                status,
                `Reading handwriting... ${percent}%`
              );
            }
          }
        }
      );

    const text =
      result?.data?.text?.trim() || "";

    if ($("handwrittenInput")) {
      $("handwrittenInput").value = text;
    }

    state.material = text;

    showMessage(
      status,
      text
        ? "Handwritten notes extracted successfully."
        : "No readable text found."
    );

  } catch (error) {
    showMessage(
      status,
      "Could not read the handwritten image."
    );

    console.error(error);
  }
}

// ============================================================
// PDF TEXT EXTRACTION
// ============================================================

async function extractPDFText(file) {
  const status = $("pdfStatus");

  if (!file) return;

  if (!window.pdfjsLib) {
    showMessage(
      status,
      "PDF library is not available."
    );
    return;
  }

  showMessage(
    status,
    "Reading PDF..."
  );

  try {
    const buffer =
      await file.arrayBuffer();

    const pdf =
      await pdfjsLib.getDocument({
        data: buffer
      }).promise;

    let fullText = "";

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {
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

    state.material = fullText;

    if (!fullText) {
      showMessage(
        status,
        "This PDF does not contain selectable text. Image/scanned PDF OCR is not enabled yet."
      );
      return;
    }

    showMessage(
      status,
      `PDF extracted successfully (${pdf.numPages} pages).`
    );

  } catch (error) {
    console.error(error);

    showMessage(
      status,
      "Could not read this PDF."
    );
  }
}

// ============================================================
// DARK MODE
// ============================================================

function setupTheme() {
  const button = $("themeBtn");

  if (!button) return;

  button.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const dark =
      document.body.classList.contains("dark");

    button.textContent =
      dark ? "☀️" : "🌙";
  });
}

// ============================================================
// EVENTS
// ============================================================

function setupEvents() {
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

  $("weakTopicsBtn")?.addEventListener(
    "click",
    targetedRetest
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
    () =>
      runFeature(
        "teach",
        "Teach Me"
      )
  );

  $("studySessionBtn")?.addEventListener(
    "click",
    () =>
      runFeature(
        "study_session",
        "Study Session"
      )
  );

  $("examModeBtn")?.addEventListener(
    "click",
    () =>
      runFeature(
        "exam",
        "Exam Mode"
      )
  );

  $("askNotesBtn")?.addEventListener(
    "click",
    askMyNotes
  );

  $("handwrittenInput")?.addEventListener(
    "change",
    (event) => {
      const file =
        event.target.files?.[0];

      processHandwrittenImage(file);
    }
  );

  $("pdfInput")?.addEventListener(
    "change",
    (event) => {
      const file =
        event.target.files?.[0];

      extractPDFText(file);
    }
  );
}

// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {
  document
    .querySelectorAll('a[href^="#"]')
    .forEach((link) => {
      link.addEventListener(
        "click",
        (event) => {
          const target =
            document.querySelector(
              link.getAttribute("href")
            );

          if (!target) return;

          event.preventDefault();

          target.scrollIntoView({
            behavior: "smooth"
          });
        }
      );
    });
}

// ============================================================
// START
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupSourceTabs();
    setupTheme();
    setupEvents();
    setupNavigation();
    renderFlashcards();
    resetInsights();
  }
);
