// ============================================================
// KNOWVIA - FRONTEND
// Gemini API is called through /api/chat
// Never put GEMINI_API_KEY in this file.
// ============================================================


// ============================================================
// STATE
// ============================================================

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


// ============================================================
// ELEMENTS
// ============================================================

const $ = (id) => document.getElementById(id);

const sourceTabs = document.querySelectorAll(".source-tab");

const topicPanel = $("topicPanel");
const typedPanel = $("typedPanel");
const handwrittenPanel = $("handwrittenPanel");
const pdfPanel = $("pdfPanel");

const topicInput = $("topic");
const typedNotes = $("typedNotes");
const handwrittenInput = $("handwrittenInput");
const handwrittenStatus = $("handwrittenStatus");

const pdfInput = $("pdfInput");
const pdfStatus = $("pdfStatus");

const difficultySelect = $("difficulty");
const questionStyleSelect = $("questionStyle");

const generateBtn = $("generateBtn");
const generateStatus = $("generateStatus");

const summaryContent = $("summaryContent");

const flashcard = $("flashcard");
const cardQuestion = $("cardQuestion");
const cardAnswer = $("cardAnswer");

const prevCard = $("prevCard");
const flipCard = $("flipCard");
const nextCard = $("nextCard");
const cardProgress = $("cardProgress");

const confidenceButtons = document.querySelectorAll(
  "[data-confidence]"
);

const quizContainer = $("quizContainer");

const insights = $("insights");

const understandingBar = $("understandingBar");
const understandingScore = $("understandingScore");

const recallBar = $("recallBar");
const recallScore = $("recallScore");

const applicationBar = $("applicationBar");
const applicationScore = $("applicationScore");

const weakTopicsContent = $("weakTopicsContent");
const weakTopicsBtn = $("weakTopicsBtn");

const mistakeContent = $("mistakeContent");
const explainMistakeBtn = $("explainMistakeBtn");

const knowledgeMapContent = $("knowledgeMapContent");
const knowledgeMapBtn = $("knowledgeMapBtn");

const teachBtn = $("teachBtn");
const studySessionBtn = $("studySessionBtn");
const examModeBtn = $("examModeBtn");
const askNotesBtn = $("askNotesBtn");

const featureOutput = $("featureOutput");

const themeBtn = $("themeBtn");


// ============================================================
// INITIAL SETUP
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  setupSourceTabs();
  setupTheme();
  setupButtons();
  setupKeyboardShortcuts();

  updateSourcePanels();
  updateFlashcardUI();
  updateInsightsVisibility();
});


// ============================================================
// SOURCE TABS
// ============================================================

function setupSourceTabs() {
  sourceTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const source = tab.dataset.source;

      if (!source) return;

      state.source = source;

      sourceTabs.forEach((item) => {
        item.classList.toggle(
          "active",
          item.dataset.source === source
        );
      });

      updateSourcePanels();
    });
  });
}


function updateSourcePanels() {
  if (topicPanel) {
    topicPanel.style.display =
      state.source === "topic" ? "" : "none";
  }

  if (typedPanel) {
    typedPanel.style.display =
      state.source === "typed" ? "" : "none";
  }

  if (handwrittenPanel) {
    handwrittenPanel.style.display =
      state.source === "handwritten" ? "" : "none";
  }

  if (pdfPanel) {
    pdfPanel.style.display =
      state.source === "pdf" ? "" : "none";
  }
}


// ============================================================
// THEME
// ============================================================

function setupTheme() {
  if (!themeBtn) return;

  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    const dark =
      document.body.classList.contains("dark-mode");

    themeBtn.textContent = dark ? "☀️" : "🌙";
  });
}


// ============================================================
// BUTTON SETUP
// ============================================================

function setupButtons() {

  if (generateBtn) {
    generateBtn.addEventListener(
      "click",
      generateStudyPack
    );
  }

  if (prevCard) {
    prevCard.addEventListener(
      "click",
      showPreviousCard
    );
  }

  if (nextCard) {
    nextCard.addEventListener(
      "click",
      showNextCard
    );
  }

  if (flipCard) {
    flipCard.addEventListener(
      "click",
      flipCurrentCard
    );
  }

  confidenceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const confidence = button.dataset.confidence;

      if (!confidence) return;

      button.classList.add("selected");

      setTimeout(() => {
        button.classList.remove("selected");
      }, 700);
    });
  });

  if (weakTopicsBtn) {
    weakTopicsBtn.addEventListener(
      "click",
      targetedRetest
    );
  }

  if (explainMistakeBtn) {
    explainMistakeBtn.addEventListener(
      "click",
      explainMistake
    );
  }

  if (knowledgeMapBtn) {
    knowledgeMapBtn.addEventListener(
      "click",
      generateKnowledgeMap
    );
  }

  if (teachBtn) {
    teachBtn.addEventListener(
      "click",
      () => runFeature("teach")
    );
  }

  if (studySessionBtn) {
    studySessionBtn.addEventListener(
      "click",
      () => runFeature("study_session")
    );
  }

  if (examModeBtn) {
    examModeBtn.addEventListener(
      "click",
      () => runFeature("exam")
    );
  }

  if (askNotesBtn) {
    askNotesBtn.addEventListener(
      "click",
      askMyNotes
    );
  }

  if (pdfInput) {
    pdfInput.addEventListener(
      "change",
      handlePDFUpload
    );
  }

  if (handwrittenInput) {
    handwrittenInput.addEventListener(
      "change",
      handleHandwrittenUpload
    );
  }
}


// ============================================================
// STATUS
// ============================================================

function setStatus(message, type = "") {
  if (!generateStatus) return;

  generateStatus.textContent = message;

  generateStatus.className = "status";

  if (type) {
    generateStatus.classList.add(type);
  }
}


function setFeatureStatus(message) {
  if (!featureOutput) return;

  featureOutput.innerHTML = `
    <div class="feature-message">
      ${escapeHTML(message)}
    </div>
  `;
}


// ============================================================
// API CALL
// ============================================================

async function callKnowviaAI(payload) {

  const response = await fetch("/api/chat", {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify(payload)
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The server returned an invalid response."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      "AI request failed."
    );
  }

  /*
    Gemini backend can return:

    1. Normal text:
       { result: "..." }

    2. Compatibility text:
       { answer: "..." }

    3. Study-pack JSON directly:
       { summary: "...", flashcards: [...], quiz: [...] }
  */

  return data;
}


// ============================================================
// MATERIAL COLLECTION
// ============================================================

function getCurrentMaterial() {

  if (state.source === "topic") {
    return "";
  }

  if (state.source === "typed") {
    return textValue(typedNotes);
  }

  if (state.source === "handwritten") {
    return state.material || "";
  }

  if (state.source === "pdf") {
    return state.material || "";
  }

  return "";
}


function getCurrentTitle() {

  if (state.source === "topic") {
    return textValue(topicInput);
  }

  if (state.source === "typed") {
    return "Typed Notes";
  }

  if (state.source === "handwritten") {
    return "Handwritten Notes";
  }

  if (state.source === "pdf") {
    return "PDF Notes";
  }

  return "Knowvia Study Material";
}


function textValue(element) {
  return element
    ? String(element.value || "").trim()
    : "";
}


// ============================================================
// GENERATE STUDY PACK
// ============================================================

async function generateStudyPack() {

  if (state.busy) return;

  const topic =
    textValue(topicInput);

  const material =
    getCurrentMaterial();

  if (state.source === "topic" && !topic) {
    setStatus(
      "Please enter a topic first.",
      "error"
    );
    return;
  }

  if (
    state.source !== "topic" &&
    !material
  ) {
    setStatus(
      "Please provide some study material first.",
      "error"
    );
    return;
  }

  state.busy = true;

  if (generateBtn) {
    generateBtn.disabled = true;
  }

  setStatus(
    "Generating your study pack...",
    "loading"
  );

  try {

    state.title =
      getCurrentTitle();

    state.material =
      material;

    state.difficulty =
      difficultySelect
        ? difficultySelect.value
        : "beginner";

    state.questionStyle =
      questionStyleSelect
        ? questionStyleSelect.value
        : "mixed";


    const result =
      await callKnowviaAI({

        task: "study_pack",

        topic:
          topic || state.title,

        material:
          material,

        difficulty:
          state.difficulty,

        quizStyle:
          state.questionStyle
      });


    const pack =
      extractStudyPack(result);


    if (!pack) {
      throw new Error(
        "Gemini did not return a valid study pack."
      );
    }


    // Save data
    state.flashcards =
      Array.isArray(pack.flashcards)
        ? pack.flashcards
        : [];

    state.quiz =
      Array.isArray(pack.quiz)
        ? pack.quiz
        : [];

    state.cardIndex = 0;

    state.quizAnswers =
      new Array(state.quiz.length)
        .fill(null);

    state.lastMistake = null;


    // Render everything
    renderSummary(
      pack.summary
    );

    renderFlashcards();

    renderQuiz();

    renderPracticeQuestions(
      pack.practiceQuestions
    );

    renderExamQuestions(
      pack.examQuestions
    );

    resetInsights();


    setStatus(
      "Study pack generated successfully! 🎉",
      "success"
    );


    // Scroll to summary
    if (summaryContent) {
      summaryContent.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

  } catch (error) {

    console.error(error);

    setStatus(
      error.message ||
      "Something went wrong.",
      "error"
    );

  } finally {

    state.busy = false;

    if (generateBtn) {
      generateBtn.disabled = false;
    }
  }
}


// ============================================================
// STUDY PACK PARSER
// ============================================================

function extractStudyPack(data) {

  if (!data) return null;

  // Direct JSON response
  if (
    data.summary ||
    Array.isArray(data.flashcards) ||
    Array.isArray(data.quiz)
  ) {
    return data;
  }

  // If backend returned answer/result containing JSON
  const raw =
    data.answer ||
    data.result;

  if (!raw) return null;

  try {
    return parseJSON(raw);
  } catch (error) {
    console.error(
      "Study pack JSON error:",
      error
    );

    return null;
  }
}


// ============================================================
// JSON PARSER
// ============================================================

function parseJSON(value) {

  if (
    typeof value === "object" &&
    value !== null
  ) {
    return value;
  }

  let cleaned =
    String(value || "").trim();


  // Remove markdown fences
  cleaned =
    cleaned
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();


  try {
    return JSON.parse(cleaned);
  } catch {}


  // Extract object
  const objectStart =
    cleaned.indexOf("{");

  const objectEnd =
    cleaned.lastIndexOf("}");


  if (
    objectStart !== -1 &&
    objectEnd > objectStart
  ) {

    try {
      return JSON.parse(
        cleaned.slice(
          objectStart,
          objectEnd + 1
        )
      );
    } catch {}
  }


  // Extract array
  const arrayStart =
    cleaned.indexOf("[");

  const arrayEnd =
    cleaned.lastIndexOf("]");


  if (
    arrayStart !== -1 &&
    arrayEnd > arrayStart
  ) {

    try {
      return JSON.parse(
        cleaned.slice(
          arrayStart,
          arrayEnd + 1
        )
      );
    } catch {}
  }


  throw new Error(
    "Invalid JSON returned by AI."
  );
}


// ============================================================
// SUMMARY
// ============================================================

function renderSummary(summary) {

  if (!summaryContent) return;

  if (!summary) {
    summaryContent.innerHTML =
      "<p>No summary was generated.</p>";

    return;
  }

  summaryContent.innerHTML =
    formatAIText(summary);
}


// ============================================================
// FLASHCARDS
// ============================================================

function renderFlashcards() {

  if (!state.flashcards.length) {

    if (cardQuestion) {
      cardQuestion.textContent =
        "No flashcards available.";
    }

    if (cardAnswer) {
      cardAnswer.textContent =
        "Generate a study pack first.";
    }

    return;
  }

  updateFlashcardUI();
}


function updateFlashcardUI() {

  if (!state.flashcards.length) {

    if (cardQuestion) {
      cardQuestion.textContent =
        "Your flashcards will appear here.";
    }

    if (cardAnswer) {
      cardAnswer.textContent =
        "";
    }

    if (cardProgress) {
      cardProgress.textContent =
        "0 / 0";
    }

    return;
  }


  const card =
    state.flashcards[state.cardIndex];


  if (cardQuestion) {
    cardQuestion.textContent =
      card.question ||
      "Question";
  }


  if (cardAnswer) {
    cardAnswer.textContent =
      card.answer ||
      "Answer";
  }


  if (cardProgress) {
    cardProgress.textContent =
      `${state.cardIndex + 1} / ${state.flashcards.length}`;
  }


  if (flashcard) {
    flashcard.classList.remove("flipped");
  }
}


function showPreviousCard() {

  if (!state.flashcards.length) return;

  state.cardIndex--;

  if (state.cardIndex < 0) {
    state.cardIndex =
      state.flashcards.length - 1;
  }

  updateFlashcardUI();
}


function showNextCard() {

  if (!state.flashcards.length) return;

  state.cardIndex++;

  if (
    state.cardIndex >=
    state.flashcards.length
  ) {
    state.cardIndex = 0;
  }

  updateFlashcardUI();
}


function flipCurrentCard() {

  if (!flashcard) return;

  flashcard.classList.toggle("flipped");
}


// ============================================================
// QUIZ
// ============================================================

function renderQuiz() {

  if (!quizContainer) return;

  if (!state.quiz.length) {

    quizContainer.innerHTML = `
      <p class="empty-state">
        Generate a study pack to start the quiz.
      </p>
    `;

    return;
  }


  quizContainer.innerHTML = "";


  state.quiz.forEach((quiz, index) => {

    const questionCard =
      document.createElement("div");

    questionCard.className =
      "quiz-question";


    const title =
      document.createElement("h3");

    title.textContent =
      `${index + 1}. ${quiz.question || ""}`;


    questionCard.appendChild(title);


    const options =
      Array.isArray(quiz.options)
        ? quiz.options
        : [];


    options.forEach(
      (option, optionIndex) => {

        const label =
          document.createElement("label");

        label.className =
          "quiz-option";


        const input =
          document.createElement("input");

        input.type = "radio";

        input.name =
          `quiz-${index}`;

        input.value =
          optionIndex;


        input.addEventListener(
          "change",
          () => {

            state.quizAnswers[index] =
              optionIndex;

            updateQuizResult();
          }
        );


        const span =
          document.createElement("span");

        span.textContent =
          option;


        label.appendChild(input);

        label.appendChild(span);

        questionCard.appendChild(label);
      }
    );


    quizContainer.appendChild(
      questionCard
    );
  });


  const resultBox =
    document.createElement("div");

  resultBox.id =
    "quizResult";

  resultBox.className =
    "quiz-result";

  resultBox.innerHTML =
    "<strong>Answer the questions to see your score.</strong>";


  quizContainer.appendChild(
    resultBox
  );
}


// ============================================================
// QUIZ SCORING
// ============================================================

function calculateQuizScore() {

  let correct = 0;

  let answered = 0;


  state.quiz.forEach(
    (quiz, index) => {

      const answer =
        state.quizAnswers[index];


      if (
        answer !== null &&
        answer !== undefined
      ) {

        answered++;

        if (
          Number(answer) ===
          Number(quiz.correctAnswer)
        ) {
          correct++;
        }
      }
    }
  );


  return {
    correct,
    answered,
    total: state.quiz.length
  };
}


function updateQuizResult() {

  const resultBox =
    $("quizResult");

  if (!resultBox) return;


  const score =
    calculateQuizScore();


  if (
    score.answered <
    score.total
  ) {

    resultBox.innerHTML = `
      <strong>
        ${score.answered}/${score.total}
        answered
      </strong>
      <p>
        Complete the quiz to see your final score.
      </p>
    `;

    return;
  }


  const percentage =
    score.total
      ? Math.round(
          (score.correct /
            score.total) * 100
        )
      : 0;


  resultBox.innerHTML = `
    <strong>
      Score: ${score.correct}/${score.total}
      (${percentage}%)
    </strong>
    <p>
      ${
        percentage >= 80
          ? "Excellent work! 🎉"
          : percentage >= 60
          ? "Good job! Keep revising. 👍"
          : "Keep practicing and review your weak topics. 💪"
      }
    </p>
  `;


  state.lastMistake =
    findLastMistake();


  updateInsights(
    percentage
  );
}


function findLastMistake() {

  for (
    let i = state.quiz.length - 1;
    i >= 0;
    i--
  ) {

    const quiz =
      state.quiz[i];

    const answer =
      state.quizAnswers[i];


    if (
      answer !== null &&
      answer !== undefined &&
      Number(answer) !==
        Number(quiz.correctAnswer)
    ) {

      return {
        index: i,
        question:
          quiz.question || "",
        studentAnswer:
          quiz.options?.[answer] ||
          String(answer),
        correctAnswer:
          quiz.options?.[
            quiz.correctAnswer
          ] ||
          String(quiz.correctAnswer),
        explanation:
          quiz.explanation || "",
        topic:
          quiz.topic || "This topic"
      };
    }
  }


  return null;
}


// ============================================================
// INSIGHTS
// ============================================================

function resetInsights() {

  if (understandingBar) {
    understandingBar.style.width = "0%";
  }

  if (recallBar) {
    recallBar.style.width = "0%";
  }

  if (applicationBar) {
    applicationBar.style.width = "0%";
  }

  if (understandingScore) {
    understandingScore.textContent =
      "0%";
  }

  if (recallScore) {
    recallScore.textContent =
      "0%";
  }

  if (applicationScore) {
    applicationScore.textContent =
      "0%";
  }

  if (weakTopicsContent) {
    weakTopicsContent.innerHTML =
      "<p>Complete the quiz to detect weak topics.</p>";
  }

  if (mistakeContent) {
    mistakeContent.innerHTML =
      "<p>Your mistakes will appear here after the quiz.</p>";
  }

  if (knowledgeMapContent) {
    knowledgeMapContent.innerHTML =
      "<p>Generate a knowledge map after studying.</p>";
  }
}


function updateInsights(percentage) {

  const understanding =
    Math.min(
      100,
      percentage
    );

  const recall =
    Math.min(
      100,
      Math.round(
        percentage * 0.9
      )
    );

  const application =
    Math.min(
      100,
      Math.round(
        percentage * 0.8
      )
    );


  setInsight(
    understandingBar,
    understandingScore,
    understanding
  );

  setInsight(
    recallBar,
    recallScore,
    recall
  );

  setInsight(
    applicationBar,
    applicationScore,
    application
  );


  if (mistakeContent) {

    if (state.lastMistake) {

      mistakeContent.innerHTML = `
        <div class="mistake-preview">
          <strong>
            ${escapeHTML(
              state.lastMistake.topic
            )}
          </strong>
          <p>
            You missed:
            ${escapeHTML(
              state.lastMistake.question
            )}
          </p>
        </div>
      `;

    } else {

      mistakeContent.innerHTML = `
        <p>
          Great! No incorrect answers detected.
        </p>
      `;
    }
  }
}


function setInsight(
  bar,
  scoreElement,
  value
) {

  if (bar) {
    bar.style.width =
      `${value}%`;
  }

  if (scoreElement) {
    scoreElement.textContent =
      `${value}%`;
  }
}


function updateInsightsVisibility() {

  if (!insights) return;

  // Keep the section available.
  insights.style.display = "";
}


// ============================================================
// WEAK TOPIC DETECTOR
// ============================================================

async function targetedRetest() {

  if (!state.quiz.length) {

    if (weakTopicsContent) {
      weakTopicsContent.innerHTML =
        "<p>Please generate and complete a quiz first.</p>";
    }

    return;
  }


  const results =
    buildQuizResults();


  if (weakTopicsContent) {
    weakTopicsContent.innerHTML =
      "<p>Analyzing your weak topics...</p>";
  }


  try {

    const response =
      await callKnowviaAI({

        task: "weak_topics",

        topic:
          state.title,

        material:
          state.material,

        quizResults:
          results
      });


    const data =
      extractJSONResponse(response);


    renderWeakTopics(data);


  } catch (error) {

    console.error(error);

    if (weakTopicsContent) {
      weakTopicsContent.innerHTML = `
        <p class="error">
          ${escapeHTML(error.message)}
        </p>
      `;
    }
  }
}


function buildQuizResults() {

  return state.quiz.map(
    (quiz, index) => {

      const selected =
        state.quizAnswers[index];

      return {
        question:
          quiz.question || "",

        topic:
          quiz.topic || "General",

        selectedAnswer:
          selected !== null &&
          selected !== undefined
            ? quiz.options?.[selected] || ""
            : "",

        correctAnswer:
          quiz.options?.[
            quiz.correctAnswer
          ] || "",

        isCorrect:
          selected !== null &&
          selected !== undefined &&
          Number(selected) ===
            Number(quiz.correctAnswer)
      };
    }
  );
}


function renderWeakTopics(data) {

  if (!weakTopicsContent) return;


  const weakTopics =
    Array.isArray(data?.weakTopics)
      ? data.weakTopics
      : [];


  if (!weakTopics.length) {

    weakTopicsContent.innerHTML = `
      <div class="success-message">
        <strong>No major weak topics detected.</strong>
        <p>Keep revising to maintain your performance.</p>
      </div>
    `;

    return;
  }


  let html =
    "<div class=\"weak-topic-list\">";


  weakTopics.forEach(
    (item) => {

      html += `
        <div class="weak-topic">
          <strong>
            ${escapeHTML(
              item.topic ||
              "Weak topic"
            )}
          </strong>

          <span class="priority">
            ${escapeHTML(
              item.priority ||
              "Review"
            )}
          </span>

          <p>
            ${escapeHTML(
              item.reason ||
              "More practice is recommended."
            )}
          </p>
        </div>
      `;
    }
  );


  html += "</div>";


  if (data?.recommendation) {

    html += `
      <div class="recommendation">
        <strong>Recommendation:</strong>
        <p>
          ${escapeHTML(
            data.recommendation
          )}
        </p>
      </div>
    `;
  }


  weakTopicsContent.innerHTML =
    html;
}


// ============================================================
// EXPLAIN MY MISTAKE
// ============================================================

async function explainMistake() {

  if (!state.lastMistake) {

    if (mistakeContent) {
      mistakeContent.innerHTML = `
        <p>
          Complete the quiz and select an incorrect answer first.
        </p>
      `;
    }

    return;
  }


  if (mistakeContent) {
    mistakeContent.innerHTML =
      "<p>Explaining your mistake...</p>";
  }


  try {

    const mistake =
      state.lastMistake;


    const response =
      await callKnowviaAI({

        task: "explain_mistake",

        topic:
          state.title,

        material:
          state.material,

        question:
          mistake.question,

        studentAnswer:
          mistake.studentAnswer,

        correctAnswer:
          mistake.correctAnswer
      });


    const answer =
      extractTextResponse(
        response
      );


    if (mistakeContent) {
      mistakeContent.innerHTML =
        formatAIText(answer);
    }


  } catch (error) {

    console.error(error);

    if (mistakeContent) {
      mistakeContent.innerHTML = `
        <p class="error">
          ${escapeHTML(error.message)}
        </p>
      `;
    }
  }
}


// ============================================================
// KNOWLEDGE MAP
// ============================================================

async function generateKnowledgeMap() {

  if (!state.title) {

    if (knowledgeMapContent) {
      knowledgeMapContent.innerHTML =
        "<p>Generate a study pack first.</p>";
    }

    return;
  }


  if (knowledgeMapContent) {
    knowledgeMapContent.innerHTML =
      "<p>Building your knowledge map...</p>";
  }


  try {

    const response =
      await callKnowviaAI({

        task: "knowledge_map",

        topic:
          state.title,

        material:
          state.material,

        quizResults:
          buildQuizResults()
      });


    const data =
      extractJSONResponse(response);


    renderKnowledgeMap(data);


  } catch (error) {

    console.error(error);

    if (knowledgeMapContent) {
      knowledgeMapContent.innerHTML = `
        <p class="error">
          ${escapeHTML(error.message)}
        </p>
      `;
    }
  }
}


function renderKnowledgeMap(data) {

  if (!knowledgeMapContent) return;


  const nodes =
    Array.isArray(data?.nodes)
      ? data.nodes
      : [];


  const connections =
    Array.isArray(data?.connections)
      ? data.connections
      : [];


  let html = `
    <div class="knowledge-map">
      <h3>
        ${escapeHTML(
          data?.centralTopic ||
          data?.title ||
          "Knowledge Map"
        )}
      </h3>
  `;


  if (nodes.length) {

    html += `
      <div class="knowledge-nodes">
    `;


    nodes.forEach(
      (node) => {

        html += `
          <div class="knowledge-node">
            <strong>
              ${escapeHTML(
                node.name ||
                "Concept"
              )}
            </strong>

            <span>
              ${escapeHTML(
                node.status ||
                ""
              )}
            </span>
          </div>
        `;
      }
    );


    html += "</div>";
  }


  if (connections.length) {

    html += `
      <h4>Connections</h4>
      <ul>
    `;


    connections.forEach(
      (connection) => {

        html += `
          <li>
            <strong>
              ${escapeHTML(
                connection.from ||
                ""
              )}
            </strong>

            →
            
            <strong>
              ${escapeHTML(
                connection.to ||
                ""
              )}
            </strong>

            ${
              connection.relationship
                ? ` — ${escapeHTML(
                    connection.relationship
                  )}`
                : ""
            }
          </li>
        `;
      }
    );


    html += "</ul>";
  }


  html += "</div>";


  knowledgeMapContent.innerHTML =
    html;
}


// ============================================================
// GENERAL AI FEATURES
// ============================================================

async function runFeature(task) {

  if (!state.title) {

    setFeatureStatus(
      "Generate a study pack first."
    );

    return;
  }


  setFeatureStatus(
    "Knowvia is thinking..."
  );


  try {

    const response =
      await callKnowviaAI({

        task,

        topic:
          state.title,

        material:
          state.material,

        difficulty:
          state.difficulty
      });


    const answer =
      extractTextResponse(
        response
      );


    if (featureOutput) {
      featureOutput.innerHTML =
        formatAIText(answer);
    }


  } catch (error) {

    console.error(error);

    if (featureOutput) {
      featureOutput.innerHTML = `
        <div class="error">
          ${escapeHTML(error.message)}
        </div>
      `;
    }
  }
}


// ============================================================
// ASK MY NOTES
// ============================================================

async function askMyNotes() {

  if (!state.title) {

    setFeatureStatus(
      "Generate or provide study material first."
    );

    return;
  }


  const question =
    window.prompt(
      "What do you want to ask about your notes?"
    );


  if (!question) return;


  setFeatureStatus(
    "Searching your notes..."
  );


  try {

    const response =
      await callKnowviaAI({

        task: "ask_notes",

        topic:
          state.title,

        material:
          state.material,

        question:
          question,

        difficulty:
          state.difficulty
      });


    const answer =
      extractTextResponse(
        response
      );


    if (featureOutput) {

      featureOutput.innerHTML = `
        <div class="ask-notes-answer">

          <h3>
            Your question
          </h3>

          <p>
            ${escapeHTML(question)}
          </p>

          <h3>
            Knowvia's answer
          </h3>

          ${formatAIText(answer)}

        </div>
      `;
    }


  } catch (error) {

    console.error(error);

    setFeatureStatus(
      error.message ||
      "Unable to answer your question."
    );
  }
}


// ============================================================
// TEXT / JSON RESPONSE HELPERS
// ============================================================

function extractTextResponse(data) {

  if (!data) return "";

  if (
    typeof data === "string"
  ) {
    return data;
  }

  if (
    typeof data.answer === "string"
  ) {
    return data.answer;
  }

  if (
    typeof data.result === "string"
  ) {
    return data.result;
  }

  return "";
}


function extractJSONResponse(data) {

  if (!data) return null;


  if (
    typeof data === "object" &&
    !Array.isArray(data)
  ) {

    if (
      data.weakTopics ||
      data.nodes ||
      data.centralTopic ||
      data.title
    ) {
      return data;
    }
  }


  const raw =
    data.answer ||
    data.result;


  if (!raw) return null;


  try {
    return parseJSON(raw);
  } catch {
    return null;
  }
}


// ============================================================
// PRACTICE / EXAM QUESTIONS
// ============================================================

function renderPracticeQuestions(questions) {

  if (!Array.isArray(questions)) return;

  /*
    These are rendered into the existing quiz area
    only when useful.
  */

  if (!quizContainer) return;

  if (!questions.length) return;


  const section =
    document.createElement("div");

  section.className =
    "practice-questions";


  section.innerHTML =
    "<h3>Practice Questions</h3>";


  const list =
    document.createElement("ol");


  questions.forEach(
    (question) => {

      const item =
        document.createElement("li");

      item.textContent =
        question;

      list.appendChild(item);
    }
  );


  section.appendChild(list);

  quizContainer.appendChild(section);
}


function renderExamQuestions(questions) {

  if (!Array.isArray(questions)) return;

  if (!quizContainer) return;

  if (!questions.length) return;


  const section =
    document.createElement("div");

  section.className =
    "exam-questions";


  section.innerHTML =
    "<h3>Exam Questions</h3>";


  const list =
    document.createElement("ol");


  questions.forEach(
    (question) => {

      const item =
        document.createElement("li");

      item.textContent =
        question;

      list.appendChild(item);
    }
  );


  section.appendChild(list);

  quizContainer.appendChild(section);
}


// ============================================================
// PDF EXTRACTION
// ============================================================

async function handlePDFUpload(event) {

  const file =
    event.target.files?.[0];


  if (!file) return;


  if (
    typeof pdfjsLib ===
    "undefined"
  ) {

    if (pdfStatus) {
      pdfStatus.textContent =
        "PDF.js could not be loaded.";
    }

    return;
  }


  if (pdfStatus) {
    pdfStatus.textContent =
      "Reading PDF...";
  }


  try {

    const buffer =
      await file.arrayBuffer();


    const pdf =
      await pdfjsLib.getDocument({
        data: buffer
      }).promise;


    let extractedText = "";


    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {

      const page =
        await pdf.getPage(
          pageNumber
        );


      const content =
        await page.getTextContent();


      const pageText =
        content.items
          .map(
            item =>
              item.str || ""
          )
          .join(" ");


      extractedText +=
        pageText + "\n";
    }


    extractedText =
      extractedText.trim();


    if (!extractedText) {

      if (pdfStatus) {
        pdfStatus.textContent =
          "This PDF appears to be scanned/image-based. OCR fallback can be added if needed.";
      }

      state.material = "";

      return;
    }


    state.material =
      extractedText.slice(
        0,
        30000
      );


    if (pdfStatus) {
      pdfStatus.textContent =
        `PDF loaded successfully — ${pdf.numPages} page(s).`;
    }


  } catch (error) {

    console.error(error);

    if (pdfStatus) {
      pdfStatus.textContent =
        "Could not read this PDF.";
    }
  }
}


// ============================================================
// HANDWRITTEN IMAGE OCR
// ============================================================

async function handleHandwrittenUpload(event) {

  const file =
    event.target.files?.[0];


  if (!file) return;


  if (
    typeof Tesseract ===
    "undefined"
  ) {

    if (handwrittenStatus) {
      handwrittenStatus.textContent =
        "OCR library could not be loaded.";
    }

    return;
  }


  if (handwrittenStatus) {
    handwrittenStatus.textContent =
      "Reading handwriting... This may take a little time.";
  }


  try {

    const result =
      await Tesseract.recognize(
        file,
        "eng",
        {
          logger: (message) => {

            if (
              message.status ===
              "recognizing text"
            ) {

              const progress =
                Math.round(
                  (message.progress || 0) *
                  100
                );

              if (handwrittenStatus) {
                handwrittenStatus.textContent =
                  `Reading handwriting... ${progress}%`;
              }
            }
          }
        }
      );


    const extracted =
      result?.data?.text?.trim() ||
      "";


    if (!extracted) {

      if (handwrittenStatus) {
        handwrittenStatus.textContent =
          "No readable text was found.";
      }

      state.material = "";

      return;
    }


    state.material =
      extracted.slice(
        0,
        30000
      );


    if (handwrittenStatus) {
      handwrittenStatus.textContent =
        "Handwritten notes read successfully.";
    }


  } catch (error) {

    console.error(error);

    if (handwrittenStatus) {
      handwrittenStatus.textContent =
        "Could not read the handwriting.";
    }
  }
}


// ============================================================
// FORMAT AI TEXT
// ============================================================

function formatAIText(value) {

  if (!value) {
    return "<p>No content returned.</p>";
  }


  let html =
    escapeHTML(String(value));


  // Headings
  html =
    html.replace(
      /^### (.*)$/gm,
      "<h4>$1</h4>"
    );


  html =
    html.replace(
      /^## (.*)$/gm,
      "<h3>$1</h3>"
    );


  html =
    html.replace(
      /^# (.*)$/gm,
      "<h2>$1</h2>"
    );


  // Bold
  html =
    html.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );


  // Bullets
  html =
    html.replace(
      /^\s*[-*]\s+(.*)$/gm,
      "<li>$1</li>"
    );


  html =
    html.replace(
      /(<li>.*<\/li>\n?)+/g,
      "<ul>$&</ul>"
    );


  // Numbered lists
  html =
    html.replace(
      /^\s*\d+\.\s+(.*)$/gm,
      "<li>$1</li>"
    );


  // Paragraphs / line breaks
  html =
    html.replace(
      /\n{2,}/g,
      "</p><p>"
    );


  html =
    html.replace(
      /\n/g,
      "<br>"
    );


  return `<div class="ai-text"><p>${html}</p></div>`;
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

function setupKeyboardShortcuts() {

  document.addEventListener(
    "keydown",
    (event) => {

      // Don't interfere with typing
      const tag =
        document.activeElement?.tagName;


      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT"
      ) {
        return;
      }


      if (
        event.key ===
        "ArrowLeft"
      ) {

        showPreviousCard();
      }


      if (
        event.key ===
        "ArrowRight"
      ) {

        showNextCard();
      }


      if (
        event.key ===
        " "
      ) {

        if (state.flashcards.length) {

          event.preventDefault();

          flipCurrentCard();
        }
      }
    }
  );
}
