/* =========================================================
   KNOWVIA - APP.JS
   AI Study Assistant
   ========================================================= */

const $ = (id) => document.getElementById(id);

/* =========================================================
   STATE
   ========================================================= */

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

/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const topicInput = $("topic");
const typedNotes = $("typedNotes");
const handwrittenInput = $("handwrittenInput");
const handwrittenStatus = $("handwrittenStatus");
const pdfInput = $("pdfInput");
const pdfStatus = $("pdfStatus");

const difficultyInput = $("difficulty");
const questionStyleInput = $("questionStyle");

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

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function setStatus(message, type = "") {
  if (!generateStatus) return;

  generateStatus.textContent = message;
  generateStatus.className = "status";

  if (type) {
    generateStatus.classList.add(type);
  }
}

function setElementStatus(element, message) {
  if (!element) return;
  element.textContent = message;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* =========================================================
   SOURCE TABS
   ========================================================= */

document.querySelectorAll(".source-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const source = tab.dataset.source;

    if (!source) return;

    state.source = source;

    document.querySelectorAll(".source-tab").forEach((item) => {
      item.classList.toggle("active", item === tab);
    });

    document.querySelectorAll(".source-panel").forEach((panel) => {
      panel.classList.remove("active");
    });

    const panel = $(`${source}Panel`);

    if (panel) {
      panel.classList.add("active");
    }
  });
});

/* =========================================================
   THEME
   ========================================================= */

if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    const dark = document.body.classList.contains("dark-mode");

    try {
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    } catch (_) {}

    themeBtn.textContent = dark ? "☀️" : "🌙";
  });
}

/* =========================================================
   READ MATERIAL
   ========================================================= */

function getTopicValue() {
  return topicInput ? topicInput.value.trim() : "";
}

function getTypedNotes() {
  return typedNotes ? typedNotes.value.trim() : "";
}

function getCurrentMaterial() {
  if (state.source === "topic") {
    return getTopicValue();
  }

  if (state.source === "typed") {
    return getTypedNotes();
  }

  if (state.source === "handwritten") {
    return state.material || "";
  }

  if (state.source === "pdf") {
    return state.material || "";
  }

  return "";
}

function getTitle() {
  if (state.source === "topic") {
    return getTopicValue() || "Study Topic";
  }

  if (state.source === "typed") {
    return "My Notes";
  }

  if (state.source === "handwritten") {
    return "Handwritten Notes";
  }

  if (state.source === "pdf") {
    return "PDF Notes";
  }

  return "Study Material";
}

/* =========================================================
   IMAGE OCR
   ========================================================= */

let tesseractLoaded = false;

async function loadTesseract() {
  if (window.Tesseract) {
    tesseractLoaded = true;
    return window.Tesseract;
  }

  if (tesseractLoaded) {
    return window.Tesseract;
  }

  await new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src*="tesseract"]'
    );

    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);
  });

  tesseractLoaded = true;

  if (!window.Tesseract) {
    throw new Error("OCR library could not be loaded.");
  }

  return window.Tesseract;
}

async function performOCR(source, statusElement) {
  try {
    setElementStatus(statusElement, "Reading handwriting...");

    const Tesseract = await loadTesseract();

    const result = await Tesseract.recognize(source, "eng", {
      logger: (info) => {
        if (
          info &&
          info.status === "recognizing text" &&
          typeof info.progress === "number"
        ) {
          const percent = Math.round(info.progress * 100);
          setElementStatus(
            statusElement,
            `Reading handwriting... ${percent}%`
          );
        }
      }
    });

    const text = result?.data?.text?.trim() || "";

    if (!text) {
      throw new Error("No readable text was found.");
    }

    state.material = text;

    setElementStatus(
      statusElement,
      "✓ Handwritten notes converted to text."
    );

    return text;
  } catch (error) {
    console.error("OCR error:", error);

    setElementStatus(
      statusElement,
      `Could not read the image: ${error.message}`
    );

    throw error;
  }
}

if (handwrittenInput) {
  handwrittenInput.addEventListener("change", async () => {
    const file = handwrittenInput.files?.[0];

    if (!file) return;

    try {
      await performOCR(file, handwrittenStatus);
    } catch (_) {
      state.material = "";
    }
  });
}

/* =========================================================
   PDF.JS
   ========================================================= */

let pdfJsLoaded = false;

async function loadPDFJS() {
  if (window.pdfjsLib) {
    pdfJsLoaded = true;
    return window.pdfjsLib;
  }

  if (pdfJsLoaded) {
    return window.pdfjsLib;
  }

  await new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src*="pdf.min.js"]'
    );

    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";

    script.type = "module";

    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);
  });

  if (!window.pdfjsLib) {
    throw new Error("PDF reader could not be loaded.");
  }

  pdfJsLoaded = true;

  return window.pdfjsLib;
}

/*
  PDF extraction.

  First we try to read selectable PDF text.
  If almost no text exists, we use OCR on rendered pages.
*/

async function extractPDFText(file, statusElement) {
  const pdfjsLib = await loadPDFJS();

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer
  }).promise;

  let allText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    setElementStatus(
      statusElement,
      `Reading PDF page ${pageNumber} of ${pdf.numPages}...`
    );

    const page = await pdf.getPage(pageNumber);

    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => item.str || "")
      .join(" ")
      .trim();

    if (pageText) {
      allText += `\n\n[Page ${pageNumber}]\n${pageText}`;
    }
  }

  const cleanedText = allText
    .replace(/\s+/g, " ")
    .replace(/\[Page (\d+)\]/g, "\n\n[Page $1]\n")
    .trim();

  /*
    If PDF contains useful selectable text,
    return it directly.
  */

  if (cleanedText.replace(/\[Page \d+\]/g, "").trim().length >= 50) {
    setElementStatus(
      statusElement,
      `✓ PDF text extracted from ${pdf.numPages} page(s).`
    );

    return cleanedText;
  }

  /*
    Scanned PDF fallback:
    render pages and OCR them.
  */

  setElementStatus(
    statusElement,
    "PDF appears scanned. Starting OCR..."
  );

  const Tesseract = await loadTesseract();

  let ocrText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    setElementStatus(
      statusElement,
      `OCR reading page ${pageNumber} of ${pdf.numPages}...`
    );

    const page = await pdf.getPage(pageNumber);

    const viewport = page.getViewport({
      scale: 1.8
    });

    const canvas = document.createElement("canvas");

    const context = canvas.getContext("2d");

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({
      canvasContext: context,
      viewport
    }).promise;

    const result = await Tesseract.recognize(
      canvas,
      "eng",
      {
        logger: (info) => {
          if (
            info &&
            info.status === "recognizing text" &&
            typeof info.progress === "number"
          ) {
            const percent = Math.round(info.progress * 100);

            setElementStatus(
              statusElement,
              `OCR page ${pageNumber}/${pdf.numPages}: ${percent}%`
            );
          }
        }
      }
    );

    const pageText = result?.data?.text?.trim() || "";

    if (pageText) {
      ocrText += `\n\n[Page ${pageNumber}]\n${pageText}`;
    }
  }

  if (!ocrText.trim()) {
    throw new Error(
      "No readable text was found in this PDF."
    );
  }

  setElementStatus(
    statusElement,
    `✓ PDF OCR completed: ${pdf.numPages} page(s).`
  );

  return ocrText.trim();
}

if (pdfInput) {
  pdfInput.addEventListener("change", async () => {
    const file = pdfInput.files?.[0];

    if (!file) return;

    try {
      state.material = "";

      const text = await extractPDFText(
        file,
        pdfStatus
      );

      state.material = text;
    } catch (error) {
      console.error("PDF error:", error);

      setElementStatus(
        pdfStatus,
        `Could not read PDF: ${error.message}`
      );

      state.material = "";
    }
  });
}

/* =========================================================
   API CALL
   ========================================================= */

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
  } catch (_) {
    throw new Error(
      "The server returned an invalid response."
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
      data?.message ||
      "AI request failed."
    );
  }

  /*
    New chat.js consistently returns:
      { answer: "..." }

    This also accepts a direct result as a fallback.
  */

  if (
    data &&
    typeof data.answer === "string" &&
    data.answer.trim()
  ) {
    return data;
  }

  if (
    data &&
    typeof data.result === "string" &&
    data.result.trim()
  ) {
    return {
      answer: data.result
    };
  }

  /*
    If the backend accidentally returns the JSON object
    directly, convert it into the expected answer format.
  */

  if (data && typeof data === "object") {
    const possibleObject =
      data.summary ||
      data.flashcards ||
      data.quiz ||
      data.questions ||
      data.topics;

    if (possibleObject) {
      return {
        answer: JSON.stringify(data)
      };
    }
  }

  throw new Error(
    "AI returned an empty response."
  );
}

/* =========================================================
   JSON PARSER
   ========================================================= */

function parseAIJSON(value) {
  if (typeof value !== "string") {
    return value;
  }

  let text = value.trim();

  /*
    Remove markdown code fences.
  */

  text = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  /*
    First normal JSON.parse.
  */

  try {
    return JSON.parse(text);
  } catch (_) {}

  /*
    Try to find the first JSON object.
  */

  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");

  if (objectStart !== -1 && objectEnd > objectStart) {
    const objectText = text.slice(
      objectStart,
      objectEnd + 1
    );

    try {
      return JSON.parse(objectText);
    } catch (_) {}
  }

  /*
    Try JSON array.
  */

  const arrayStart = text.indexOf("[");
  const arrayEnd = text.lastIndexOf("]");

  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    const arrayText = text.slice(
      arrayStart,
      arrayEnd + 1
    );

    try {
      return JSON.parse(arrayText);
    } catch (_) {}
  }

  throw new Error(
    "The AI returned data in an unexpected format."
  );
}

/* =========================================================
   GENERATE STUDY PACK
   ========================================================= */

async function generateStudyPack() {
  if (state.busy) return;

  let material = getCurrentMaterial();

  if (!material) {
    setStatus(
      "Please enter a topic, add notes, upload handwriting, or upload a PDF.",
      "error"
    );
    return;
  }

  /*
    Prevent sending an extremely large PDF/notes payload.
    The backend also limits it.
  */

  material = material.slice(0, 50000);

  state.material = material;
  state.title = getTitle();

  state.difficulty =
    difficultyInput?.value || "beginner";

  state.questionStyle =
    questionStyleInput?.value || "mixed";

  state.busy = true;

  if (generateBtn) {
    generateBtn.disabled = true;
  }

  setStatus(
    "Knowvia is creating your study pack...",
    ""
  );

  try {
    const result = await callKnowviaAI({
      task: "study_pack",

      topic: state.title,

      difficulty: state.difficulty,

      material: state.material,

      quizStyle: state.questionStyle
    });

    const pack = parseAIJSON(result.answer);

    if (!pack || typeof pack !== "object") {
      throw new Error(
        "Invalid study pack received."
      );
    }

    renderStudyPack(pack);

    setStatus(
      "✓ Your study pack is ready!",
      "success"
    );

    /*
      Scroll to summary.
    */

    const summarySection =
      document.getElementById("summary");

    if (summarySection) {
      summarySection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  } catch (error) {
    console.error("Study pack error:", error);

    setStatus(
      error.message ||
      "Something went wrong while generating your study pack.",
      "error"
    );
  } finally {
    state.busy = false;

    if (generateBtn) {
      generateBtn.disabled = false;
    }
  }
}

if (generateBtn) {
  generateBtn.addEventListener(
    "click",
    generateStudyPack
  );
}

/* =========================================================
   RENDER STUDY PACK
   ========================================================= */

function renderStudyPack(pack) {
  /*
    SUMMARY
  */

  if (summaryContent) {
    const summary =
      pack.summary ||
      "No summary was generated.";

    summaryContent.innerHTML = formatAIText(
      summary
    );
  }

  /*
    FLASHCARDS
  */

  state.flashcards =
    Array.isArray(pack.flashcards)
      ? pack.flashcards
      : [];

  state.cardIndex = 0;

  renderFlashcard();

  /*
    QUIZ
  */

  state.quiz =
    Array.isArray(pack.quiz)
      ? pack.quiz
      : [];

  state.quizAnswers = new Array(
    state.quiz.length
  ).fill(null);

  renderQuiz();

  /*
    INSIGHTS
  */

  if (insights) {
    insights.style.display = "";
  }

  calculateInsights();
}

/* =========================================================
   FORMAT AI TEXT
   ========================================================= */

function formatAIText(text) {
  if (!text) {
    return "<p>No content available.</p>";
  }

  let value = escapeHTML(text);

  value = value.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

  value = value.replace(
    /\n\n+/g,
    "</p><p>"
  );

  value = value.replace(
    /\n/g,
    "<br>"
  );

  return `<p>${value}</p>`;
}

/* =========================================================
   FLASHCARDS
   ========================================================= */

function renderFlashcard() {
  if (!state.flashcards.length) {
    if (cardQuestion) {
      cardQuestion.textContent =
        "Generate a study pack to create flashcards.";
    }

    if (cardAnswer) {
      cardAnswer.textContent = "";
    }

    if (cardProgress) {
      cardProgress.textContent = "0 / 0";
    }

    return;
  }

  const card =
    state.flashcards[state.cardIndex];

  if (!card) return;

  if (cardQuestion) {
    cardQuestion.textContent =
      card.question || "Question";
  }

  if (cardAnswer) {
    cardAnswer.textContent =
      card.answer || "Answer";
  }

  if (cardProgress) {
    cardProgress.textContent =
      `${state.cardIndex + 1} / ${state.flashcards.length}`;
  }

  if (flashcard) {
    flashcard.classList.remove("flipped");
  }
}

if (prevCard) {
  prevCard.addEventListener("click", () => {
    if (!state.flashcards.length) return;

    state.cardIndex =
      (state.cardIndex - 1 + state.flashcards.length) %
      state.flashcards.length;

    renderFlashcard();
  });
}

if (nextCard) {
  nextCard.addEventListener("click", () => {
    if (!state.flashcards.length) return;

    state.cardIndex =
      (state.cardIndex + 1) %
      state.flashcards.length;

    renderFlashcard();
  });
}

if (flipCard) {
  flipCard.addEventListener("click", () => {
    if (!flashcard) return;

    flashcard.classList.toggle("flipped");
  });
}

/* =========================================================
   FLASHCARD CONFIDENCE
   ========================================================= */

document
  .querySelectorAll("[data-confidence]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const confidence =
        button.dataset.confidence;

      button.classList.add("selected");

      setTimeout(() => {
        button.classList.remove("selected");
      }, 500);

      /*
        Confidence can later be used by the weak-topic
        system. No database/localStorage is required.
      */

      console.log(
        "Flashcard confidence:",
        confidence
      );
    });
  });

/* =========================================================
   QUIZ
   ========================================================= */

function renderQuiz() {
  if (!quizContainer) return;

  if (!state.quiz.length) {
    quizContainer.innerHTML =
      `<p class="empty-state">
        Generate a study pack to create a quiz.
      </p>`;

    return;
  }

  quizContainer.innerHTML = state.quiz
    .map((question, index) => {
      const options = Array.isArray(
        question.options
      )
        ? question.options
        : [];

      return `
        <div class="quiz-question" data-index="${index}">
          <h3>
            ${index + 1}. ${escapeHTML(
              question.question || ""
            )}
          </h3>

          <div class="quiz-options">
            ${options
              .map(
                (option, optionIndex) => `
                  <button
                    type="button"
                    class="quiz-option"
                    data-question="${index}"
                    data-option="${optionIndex}"
                  >
                    ${String.fromCharCode(
                      65 + optionIndex
                    )}.
                    ${escapeHTML(option)}
                  </button>
                `
              )
              .join("")}
          </div>

          <div
            class="quiz-feedback"
            id="quizFeedback-${index}"
          ></div>
        </div>
      `;
    })
    .join("");

  quizContainer
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

  const questionIndex = Number(
    button.dataset.question
  );

  const selectedOption = Number(
    button.dataset.option
  );

  const question =
    state.quiz[questionIndex];

  if (!question) return;

  /*
    Prevent changing an already answered question.
  */

  if (
    state.quizAnswers[questionIndex] !== null
  ) {
    return;
  }

  state.quizAnswers[questionIndex] =
    selectedOption;

  const correctAnswer =
    Number(question.correctAnswer);

  const buttons = document.querySelectorAll(
    `[data-question="${questionIndex}"]`
  );

  buttons.forEach((item) => {
    item.disabled = true;

    const option =
      Number(item.dataset.option);

    if (option === correctAnswer) {
      item.classList.add("correct");
    }

    if (
      option === selectedOption &&
      option !== correctAnswer
    ) {
      item.classList.add("wrong");
    }
  });

  const feedback =
    $(`quizFeedback-${questionIndex}`);

  const isCorrect =
    selectedOption === correctAnswer;

  if (feedback) {
    feedback.innerHTML = `
      <div class="${
        isCorrect
          ? "correct-feedback"
          : "wrong-feedback"
      }">
        <strong>
          ${isCorrect ? "✓ Correct!" : "✗ Incorrect"}
        </strong>

        ${
          question.explanation
            ? `<p>${escapeHTML(
                question.explanation
              )}</p>`
            : ""
        }
      </div>
    `;
  }

  if (!isCorrect) {
    state.lastMistake = {
      question:
        question.question || "",

      selectedAnswer:
        question.options?.[selectedOption] ||
        "",

      correctAnswer:
        question.options?.[correctAnswer] ||
        "",

      topic:
        question.topic ||
        state.title
    };

    showMistakeButton();
  }

  calculateInsights();
}

/* =========================================================
   QUIZ RESULTS
   ========================================================= */

function getQuizScore() {
  if (!state.quiz.length) {
    return 0;
  }

  let correct = 0;

  state.quiz.forEach((question, index) => {
    if (
      state.quizAnswers[index] !== null &&
      Number(state.quizAnswers[index]) ===
        Number(question.correctAnswer)
    ) {
      correct++;
    }
  });

  return Math.round(
    (correct / state.quiz.length) * 100
  );
}

/* =========================================================
   INSIGHTS
   ========================================================= */

function setProgress(bar, scoreElement, score) {
  const safeScore = Math.max(
    0,
    Math.min(100, Number(score) || 0)
  );

  if (bar) {
    bar.style.width = `${safeScore}%`;
  }

  if (scoreElement) {
    scoreElement.textContent =
      `${safeScore}%`;
  }
}

function calculateInsights() {
  const answered = state.quizAnswers.filter(
    (answer) => answer !== null
  ).length;

  const score = getQuizScore();

  const understanding =
    answered === 0
      ? 0
      : score;

  const recall =
    state.flashcards.length
      ? Math.min(
          100,
          Math.round(
            (answered /
              Math.max(
                state.quiz.length,
                1
              )) *
              100
          )
        )
      : 0;

  const application =
    Math.round(
      (understanding * 0.7) +
      (recall * 0.3)
    );

  setProgress(
    understandingBar,
    understandingScore,
    understanding
  );

  setProgress(
    recallBar,
    recallScore,
    recall
  );

  setProgress(
    applicationBar,
    applicationScore,
    application
  );
}

/* =========================================================
   WEAK TOPICS
   ========================================================= */

if (weakTopicsBtn) {
  weakTopicsBtn.addEventListener(
    "click",
    targetedRetest
  );
}

async function targetedRetest() {
  if (!state.quiz.length) {
    showFeatureOutput(
      "Please generate a study pack and answer some quiz questions first."
    );

    return;
  }

  const wrongQuestions = [];

  state.quiz.forEach((question, index) => {
    const selected =
      state.quizAnswers[index];

    if (
      selected !== null &&
      Number(selected) !==
        Number(question.correctAnswer)
    ) {
      wrongQuestions.push({
        question:
          question.question || "",

        selectedAnswer:
          question.options?.[selected] || "",

        correctAnswer:
          question.options?.[
            Number(question.correctAnswer)
          ] || "",

        topic:
          question.topic ||
          state.title
      });
    }
  });

  if (!wrongQuestions.length) {
    if (weakTopicsContent) {
      weakTopicsContent.innerHTML =
        `<p>🎉 No weak topics detected yet. You answered all attempted questions correctly.</p>`;
    }

    return;
  }

  if (weakTopicsContent) {
    weakTopicsContent.innerHTML =
      "<p>Analyzing your weak topics...</p>";
  }

  try {
    const result = await callKnowviaAI({
      task: "weak_topics",

      material: state.material,

      difficulty: state.difficulty,

      quizResults: JSON.stringify(
        wrongQuestions
      )
    });

    const parsed =
      parseAIJSON(result.answer);

    renderWeakTopics(parsed);
  } catch (error) {
    console.error(
      "Weak topic error:",
      error
    );

    if (weakTopicsContent) {
      weakTopicsContent.innerHTML =
        `<p>${escapeHTML(
          error.message
        )}</p>`;
    }
  }
}

function renderWeakTopics(data) {
  if (!weakTopicsContent) return;

  if (Array.isArray(data)) {
    weakTopicsContent.innerHTML =
      data
        .map(
          (item) =>
            `<p>• ${escapeHTML(
              typeof item === "string"
                ? item
                : JSON.stringify(item)
            )}</p>`
        )
        .join("");

    return;
  }

  if (data && typeof data === "object") {
    let html = "";

    if (data.weakTopics) {
      html += `
        <h4>Weak Topics</h4>
        ${formatAIText(
          Array.isArray(data.weakTopics)
            ? data.weakTopics.join("\n")
            : data.weakTopics
        )}
      `;
    }

    if (data.explanation) {
      html += `
        <h4>Why</h4>
        ${formatAIText(data.explanation)}
      `;
    }

    if (data.retestQuestions) {
      html += `
        <h4>Targeted Re-test</h4>
        ${formatAIText(
          Array.isArray(
            data.retestQuestions
          )
            ? data.retestQuestions
                .map(
                  (q, i) =>
                    `${i + 1}. ${
                      q.question || q
                    }`
                )
                .join("\n")
            : data.retestQuestions
        )}
      `;
    }

    weakTopicsContent.innerHTML =
      html ||
      formatAIText(
        JSON.stringify(data, null, 2)
      );

    return;
  }

  weakTopicsContent.innerHTML =
    formatAIText(data);
}

/* =========================================================
   EXPLAIN MY MISTAKE
   ========================================================= */

function showMistakeButton() {
  if (!explainMistakeBtn) return;

  explainMistakeBtn.disabled = false;
  explainMistakeBtn.style.display = "";
}

if (explainMistakeBtn) {
  explainMistakeBtn.addEventListener(
    "click",
    explainMistake
  );
}

async function explainMistake() {
  const mistake =
    state.lastMistake;

  if (!mistake) {
    showFeatureOutput(
      "Answer a quiz question incorrectly first, then use Explain My Mistake."
    );

    return;
  }

  if (mistakeContent) {
    mistakeContent.innerHTML =
      "<p>AI is explaining your mistake...</p>";
  }

  try {
    /*
      IMPORTANT:
      These names match api/chat.js:
        studentAnswer
        correctAnswer
    */

    const result = await callKnowviaAI({
      task: "explain_mistake",

      question: mistake.question,

      studentAnswer:
        mistake.selectedAnswer,

      correctAnswer:
        mistake.correctAnswer,

      topic:
        mistake.topic || state.title,

      material:
        state.material
    });

    if (mistakeContent) {
      mistakeContent.innerHTML =
        formatAIText(result.answer);
    }
  } catch (error) {
    console.error(
      "Explain mistake error:",
      error
    );

    if (mistakeContent) {
      mistakeContent.innerHTML =
        `<p>${escapeHTML(
          error.message
        )}</p>`;
    }
  }
}

/* =========================================================
   KNOWLEDGE MAP
   ========================================================= */

if (knowledgeMapBtn) {
  knowledgeMapBtn.addEventListener(
    "click",
    generateKnowledgeMap
  );
}

async function generateKnowledgeMap() {
  if (!state.material) {
    showFeatureOutput(
      "Generate a study pack first."
    );

    return;
  }

  if (knowledgeMapContent) {
    knowledgeMapContent.innerHTML =
      "<p>Building your knowledge map...</p>";
  }

  try {
    const result = await callKnowviaAI({
      task: "knowledge_map",

      material: state.material,

      topic: state.title,

      difficulty: state.difficulty
    });

    const parsed =
      parseAIJSON(result.answer);

    renderKnowledgeMap(parsed);
  } catch (error) {
    console.error(
      "Knowledge map error:",
      error
    );

    if (knowledgeMapContent) {
      knowledgeMapContent.innerHTML =
        `<p>${escapeHTML(
          error.message
        )}</p>`;
    }
  }
}

function renderKnowledgeMap(data) {
  if (!knowledgeMapContent) return;

  if (
    data &&
    typeof data === "object"
  ) {
    let html = "";

    if (data.title) {
      html += `
        <h3>${escapeHTML(
          data.title
        )}</h3>
      `;
    }

    if (data.nodes) {
      const nodes = Array.isArray(
        data.nodes
      )
        ? data.nodes
        : [data.nodes];

      html += `
        <div class="knowledge-map-list">
          ${nodes
            .map((node) => {
              if (
                typeof node === "string"
              ) {
                return `<div class="knowledge-node">${escapeHTML(
                  node
                )}</div>`;
              }

              return `
                <div class="knowledge-node">
                  <strong>
                    ${escapeHTML(
                      node.name ||
                      node.topic ||
                      "Concept"
                    )}
                  </strong>

                  ${
                    node.description
                      ? `<p>${escapeHTML(
                          node.description
                        )}</p>`
                      : ""
                  }
                </div>
              `;
            })
            .join("")}
        </div>
      `;
    }

    if (data.connections) {
      html += `
        <h4>Connections</h4>
        ${formatAIText(
          Array.isArray(
            data.connections
          )
            ? data.connections
                .map(
                  (connection) =>
                    `• ${typeof connection === "string"
                      ? connection
                      : JSON.stringify(
                          connection
                        )}`
                )
                .join("\n")
            : data.connections
        )}
      `;
    }

    knowledgeMapContent.innerHTML =
      html ||
      formatAIText(
        JSON.stringify(data, null, 2)
      );

    return;
  }

  knowledgeMapContent.innerHTML =
    formatAIText(data);
}

/* =========================================================
   FEATURE OUTPUT / MODALS
   ========================================================= */

function showFeatureOutput(content) {
  if (!featureOutput) {
    alert(
      typeof content === "string"
        ? content
        : "No output available."
    );

    return;
  }

  featureOutput.innerHTML =
    typeof content === "string"
      ? formatAIText(content)
      : formatAIText(
          JSON.stringify(
            content,
            null,
            2
          )
        );

  featureOutput.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

/* =========================================================
   GENERIC AI FEATURE
   ========================================================= */

async function runAIInFeature(
  task,
  extraPayload = {},
  loadingMessage = "Knowvia is thinking..."
) {
  showFeatureOutput(
    loadingMessage
  );

  try {
    const result =
      await callKnowviaAI({
        task,

        material: state.material,

        topic: state.title,

        difficulty: state.difficulty,

        ...extraPayload
      });

    showFeatureOutput(
      result.answer
    );

    return result.answer;
  } catch (error) {
    console.error(
      `${task} error:`,
      error
    );

    showFeatureOutput(
      `Error: ${error.message}`
    );

    return null;
  }
}

/* =========================================================
   TEACH ME
   ========================================================= */

if (teachBtn) {
  teachBtn.addEventListener(
    "click",
    async () => {
      if (!state.material) {
        showFeatureOutput(
          "Generate a study pack or add study material first."
        );

        return;
      }

      await runAIInFeature(
        "teach",

        {
          topic: state.title
        },

        "👩‍🏫 Knowvia is preparing a simple teaching explanation..."
      );
    }
  );
}

/* =========================================================
   STUDY SESSION
   ========================================================= */

if (studySessionBtn) {
  studySessionBtn.addEventListener(
    "click",
    async () => {
      if (!state.material) {
        showFeatureOutput(
          "Generate a study pack or add study material first."
        );

        return;
      }

      await runAIInFeature(
        "study_session",

        {
          topic: state.title
        },

        "⏱️ Knowvia is creating your study session..."
      );
    }
  );
}

/* =========================================================
   EXAM MODE
   ========================================================= */

if (examModeBtn) {
  examModeBtn.addEventListener(
    "click",
    async () => {
      if (!state.material) {
        showFeatureOutput(
          "Generate a study pack or add study material first."
        );

        return;
      }

      await runAIInFeature(
        "exam",

        {
          topic: state.title,

          questionStyle:
            state.questionStyle
        },

        "📝 Knowvia is preparing Exam Mode..."
      );
    }
  );
}

/* =========================================================
   ASK MY NOTES
   ========================================================= */

if (askNotesBtn) {
  askNotesBtn.addEventListener(
    "click",
    async () => {
      if (!state.material) {
        showFeatureOutput(
          "Please add notes or generate a study pack first."
        );

        return;
      }

      const question =
        window.prompt(
          "What do you want to ask about your notes?"
        );

      if (!question || !question.trim()) {
        return;
      }

      await runAIInFeature(
        "ask_notes",

        {
          question: question.trim()
        },

        "🔎 Searching your notes..."
      );
    }
  );
}

/* =========================================================
   EXAM PATTERN / QUESTION STYLE
   ========================================================= */

if (questionStyleInput) {
  questionStyleInput.addEventListener(
    "change",
    () => {
      state.questionStyle =
        questionStyleInput.value;
    }
  );
}

/* =========================================================
   KEYBOARD SHORTCUTS
   ========================================================= */

document.addEventListener(
  "keydown",
  (event) => {
    /*
      Ctrl + Enter = Generate
    */

    if (
      event.ctrlKey &&
      event.key === "Enter"
    ) {
      event.preventDefault();

      if (
        generateBtn &&
        !generateBtn.disabled
      ) {
        generateStudyPack();
      }
    }

    /*
      Arrow keys for flashcards
    */

    if (
      document.activeElement?.tagName !==
        "INPUT" &&
      document.activeElement?.tagName !==
        "TEXTAREA"
    ) {
      if (event.key === "ArrowLeft") {
        prevCard?.click();
      }

      if (event.key === "ArrowRight") {
        nextCard?.click();
      }

      if (event.key === " ") {
        if (state.flashcards.length) {
          event.preventDefault();
          flipCard?.click();
        }
      }
    }
  }
);

/* =========================================================
   INITIAL UI
   ========================================================= */

if (insights) {
  insights.style.display = "";
}

if (explainMistakeBtn) {
  explainMistakeBtn.disabled = true;
}

renderFlashcard();
renderQuiz();
calculateInsights();

console.log(
  "Knowvia app.js loaded successfully."
);
