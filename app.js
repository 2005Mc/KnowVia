/* =========================================================
   KNOWVIA - FRONTEND
   Gemini 3.5 Flash-Lite backend
========================================================= */

"use strict";


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
   ELEMENTS
========================================================= */

const $ = (id) => document.getElementById(id);

const topicInput = $("topic");
const typedNotes = $("typedNotes");

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

const understandingBar = $("understandingBar");
const understandingScore = $("understandingScore");

const recallBar = $("recallBar");
const recallScore = $("recallScore");

const applicationBar = $("applicationBar");
const applicationScore = $("applicationScore");

const studyDnaBtn = $("studyDnaBtn");
const studyDnaContent = $("studyDnaContent");

const weakTopicsBtn = $("weakTopicsBtn");
const weakTopicsContent = $("weakTopicsContent");

const explainMistakeBtn = $("explainMistakeBtn");
const mistakeContent = $("mistakeContent");

const knowledgeMapBtn = $("knowledgeMapBtn");
const knowledgeMapContent = $("knowledgeMapContent");

const themeBtn = $("themeBtn");


/* =========================================================
   THEME
   No localStorage
========================================================= */

themeBtn?.addEventListener("click", () => {

  document.body.classList.toggle("dark");

  themeBtn.textContent =
    document.body.classList.contains("dark")
      ? "☀"
      : "☾";
});


/* =========================================================
   SOURCE TABS
========================================================= */

document.querySelectorAll(".source-tab").forEach((tab) => {

  tab.addEventListener("click", () => {

    document.querySelectorAll(".source-tab")
      .forEach((item) => item.classList.remove("active"));

    document.querySelectorAll(".source-panel")
      .forEach((panel) => panel.classList.remove("active"));

    tab.classList.add("active");

    state.source = tab.dataset.source;

    const panel = $(`${state.source}Panel`);

    if (panel) {
      panel.classList.add("active");
    }
  });

});


/* =========================================================
   HANDWRITTEN OCR
========================================================= */

$("handwrittenInput")?.addEventListener("change", async (event) => {

  const file = event.target.files?.[0];

  if (!file) return;

  const status = $("handwrittenStatus");

  try {

    status.textContent = "Reading handwriting... please wait.";

    const result = await Tesseract.recognize(
      file,
      "eng",
      {
        logger: (info) => {

          if (info.status === "recognizing text") {

            const percent =
              Math.round((info.progress || 0) * 100);

            status.textContent =
              `Reading handwriting... ${percent}%`;
          }
        }
      }
    );

    const text = result?.data?.text?.trim() || "";

    if (!text) {
      throw new Error("No readable text was found.");
    }

    state.material = text;

    status.textContent =
      "Handwritten notes successfully converted to text.";

  } catch (error) {

    console.error(error);

    state.material = "";

    status.textContent =
      "Could not read the handwriting. Please use a clearer image.";
  }

});


/* =========================================================
   PDF TEXT EXTRACTION
========================================================= */

$("pdfInput")?.addEventListener("change", async (event) => {

  const file = event.target.files?.[0];

  if (!file) return;

  const status = $("pdfStatus");

  try {

    status.textContent = "Reading PDF...";

    const buffer = await file.arrayBuffer();

    const pdfjsLib =
      await import(
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs"
      );

    const pdf = await pdfjsLib.getDocument({
      data: buffer
    }).promise;

    let text = "";

    for (let pageNumber = 1;
         pageNumber <= pdf.numPages;
         pageNumber++) {

      const page =
        await pdf.getPage(pageNumber);

      const content =
        await page.getTextContent();

      const pageText =
        content.items
          .map(item => item.str || "")
          .join(" ");

      text += pageText + "\n\n";

      status.textContent =
        `Reading PDF... page ${pageNumber}/${pdf.numPages}`;
    }

    text = text.trim();

    if (!text) {

      throw new Error(
        "This PDF does not contain selectable text."
      );
    }

    state.material = text;

    status.textContent =
      `PDF successfully read (${pdf.numPages} pages).`;

  } catch (error) {

    console.error(error);

    state.material = "";

    status.textContent =
      error.message ||
      "Could not read this PDF.";
  }

});


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


  /*
     Read as text first.

     This prevents the confusing:
     "server returned invalid response"

     and gives us the actual server error.
  */

  const raw = await response.text();

  let data;

  try {

    data = raw ? JSON.parse(raw) : {};

  } catch (error) {

    console.error("Raw server response:", raw);

    throw new Error(
      `Server error (${response.status}). Please redeploy the API.`
    );
  }


  if (!response.ok) {

    throw new Error(
      data.error ||
      `AI request failed (${response.status}).`
    );
  }


  return data;
}


/* =========================================================
   JSON EXTRACTION
========================================================= */

function extractJSON(data) {

  if (!data) {
    throw new Error("Empty AI response.");
  }


  if (
    typeof data === "object" &&
    !Array.isArray(data) &&
    (
      data.summary ||
      data.flashcards ||
      data.quiz ||
      data.studyDNA ||
      data.weakTopics ||
      data.nodes
    )
  ) {
    return data;
  }


  let text = "";

  if (typeof data === "string") {
    text = data;
  }

  else if (typeof data.answer === "string") {
    text = data.answer;
  }

  else if (typeof data.result === "string") {
    text = data.result;
  }


  if (!text) {
    throw new Error("AI returned an empty response.");
  }


  text = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();


  try {
    return JSON.parse(text);
  } catch (error) {

    const first =
      text.indexOf("{");

    const last =
      text.lastIndexOf("}");

    if (first >= 0 && last > first) {

      return JSON.parse(
        text.slice(first, last + 1)
      );
    }

    throw new Error(
      "The AI returned an invalid JSON response."
    );
  }
}


/* =========================================================
   TEXT EXTRACTION
========================================================= */

function extractText(data) {

  if (!data) {
    return "";
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data.answer === "string") {
    return data.answer;
  }

  if (typeof data.result === "string") {
    return data.result;
  }

  return "";
}


/* =========================================================
   GET SOURCE
========================================================= */

function getSourceData() {

  if (state.source === "topic") {

    const topic =
      topicInput.value.trim();

    if (!topic) {
      throw new Error("Please enter a topic.");
    }

    return {
      title: topic,
      material: topic
    };
  }


  if (state.source === "typed") {

    const notes =
      typedNotes.value.trim();

    if (!notes) {
      throw new Error("Please enter your notes.");
    }

    return {
      title: "Typed Notes",
      material: notes
    };
  }


  if (state.source === "handwritten") {

    if (!state.material) {
      throw new Error(
        "Please upload handwritten notes first."
      );
    }

    return {
      title: "Handwritten Notes",
      material: state.material
    };
  }


  if (state.source === "pdf") {

    if (!state.material) {
      throw new Error(
        "Please upload and read a PDF first."
      );
    }

    return {
      title: "PDF Notes",
      material: state.material
    };
  }


  throw new Error("Please choose a source.");
}


/* =========================================================
   GENERATE STUDY PACK
========================================================= */

generateBtn?.addEventListener(
  "click",
  generateStudyPack
);


async function generateStudyPack() {

  if (state.busy) return;

  try {

    state.busy = true;

    generateBtn.disabled = true;

    generateStatus.textContent =
      "Creating your study pack...";


    const source =
      getSourceData();


    state.title = source.title;
    state.material = source.material;

    state.difficulty =
      difficultyInput.value;

    state.questionStyle =
      questionStyleInput.value;


    const data =
      await callKnowviaAI({

        task: "study_pack",

        topic: source.title,

        material: source.material,

        difficulty: state.difficulty,

        quizStyle: state.questionStyle

      });


    const pack =
      extractJSON(data);


    state.flashcards =
      Array.isArray(pack.flashcards)
        ? pack.flashcards
        : [];

    state.cardIndex = 0;


    state.quiz =
      Array.isArray(pack.quiz)
        ? pack.quiz
        : [];

    state.quizAnswers =
      new Array(state.quiz.length)
        .fill(null);

    state.lastMistake = null;


    renderSummary(pack.summary);

    renderFlashcard();

    renderQuiz();

    resetInsights();


    generateStatus.textContent =
      "Study pack ready ✓";


    document
      .getElementById("summarySection")
      ?.scrollIntoView({
        behavior: "smooth"
      });


  } catch (error) {

    console.error(error);

    generateStatus.textContent =
      error.message ||
      "Something went wrong.";

  } finally {

    state.busy = false;

    generateBtn.disabled = false;
  }
}


/* =========================================================
   SUMMARY
========================================================= */

function renderSummary(summary) {

  if (!summary) {

    summaryContent.innerHTML =
      `<p class="empty-state">
        No summary was generated.
      </p>`;

    return;
  }


  summaryContent.innerHTML = `
    <div class="summary-text">
      ${formatText(summary)}
    </div>
  `;
}


/* =========================================================
   FLASHCARDS
========================================================= */

function renderFlashcard() {

  flashcard.classList.remove("flipped");


  if (!state.flashcards.length) {

    cardQuestion.textContent =
      "No flashcards available.";

    cardAnswer.textContent =
      "Generate a study pack first.";

    cardProgress.textContent =
      "0 / 0";

    return;
  }


  const card =
    state.flashcards[state.cardIndex];


  cardQuestion.textContent =
    card.question || "Question";

  cardAnswer.textContent =
    card.answer || "Answer";


  cardProgress.textContent =
    `${state.cardIndex + 1} / ${state.flashcards.length}`;
}


prevCard?.addEventListener("click", () => {

  if (!state.flashcards.length) return;

  state.cardIndex =
    Math.max(0, state.cardIndex - 1);

  renderFlashcard();
});


nextCard?.addEventListener("click", () => {

  if (!state.flashcards.length) return;

  state.cardIndex =
    Math.min(
      state.flashcards.length - 1,
      state.cardIndex + 1
    );

  renderFlashcard();
});


flipCard?.addEventListener("click", () => {

  if (!state.flashcards.length) return;

  flashcard.classList.toggle("flipped");
});


document
  .querySelectorAll("[data-confidence]")
  .forEach((button) => {

    button.addEventListener("click", () => {

      button.style.borderColor = "#2563eb";

      setTimeout(() => {
        button.style.borderColor = "";
      }, 700);
    });

  });


/* =========================================================
   QUIZ
========================================================= */

function renderQuiz() {

  if (!state.quiz.length) {

    quizContainer.innerHTML = `
      <div class="content-card">
        <p class="empty-state">
          No quiz questions were generated.
        </p>
      </div>
    `;

    return;
  }


  quizContainer.innerHTML = `

    <div class="quiz-result">
      <span>Quiz</span><br>
      <strong>${state.quiz.length} Questions</strong>
      <p>Select one answer for each question.</p>
    </div>

    ${state.quiz.map((question, index) => {

      const options =
        Array.isArray(question.options)
          ? question.options
          : [];


      return `

        <article class="quiz-card">

          <div class="quiz-number">
            Question ${index + 1}
          </div>

          <div class="quiz-question">
            ${escapeHTML(question.question || "")}
          </div>

          <div class="quiz-options">

            ${options.map((option, optionIndex) => `

              <label
                class="quiz-option"
                data-question="${index}"
                data-option="${optionIndex}">

                <input
                  type="radio"
                  name="quiz-${index}"
                  value="${optionIndex}"
                  data-question="${index}"
                  data-option="${optionIndex}"
                >

                <span>
                  ${escapeHTML(option)}
                </span>

              </label>

            `).join("")}

          </div>

          <div
            class="quiz-explanation"
            id="explanation-${index}"
            hidden>
          </div>

        </article>

      `;

    }).join("")}


    <button
      id="submitQuiz"
      class="quiz-submit"
      type="button">
      Submit Quiz
    </button>

  `;


  quizContainer
    .querySelectorAll("input[type=radio]")
    .forEach((input) => {

      input.addEventListener("change", () => {

        const questionIndex =
          Number(input.dataset.question);

        const optionIndex =
          Number(input.dataset.option);


        state.quizAnswers[questionIndex] =
          optionIndex;


        quizContainer
          .querySelectorAll(
            `.quiz-option[data-question="${questionIndex}"]`
          )
          .forEach((label) => {

            label.classList.remove("selected");
          });


        input
          .closest(".quiz-option")
          ?.classList.add("selected");

      });

    });


  $("submitQuiz")
    ?.addEventListener(
      "click",
      submitQuiz
    );
}


/* =========================================================
   SUBMIT QUIZ
========================================================= */

function submitQuiz() {

  let correct = 0;

  state.lastMistake = null;


  state.quiz.forEach((question, index) => {

    const selected =
      state.quizAnswers[index];

    const correctAnswer =
      Number(question.correctAnswer);


    const options =
      quizContainer.querySelectorAll(
        `.quiz-option[data-question="${index}"]`
      );


    options.forEach((label) => {

      const option =
        Number(label.dataset.option);

      label.classList.remove(
        "correct",
        "wrong"
      );


      if (option === correctAnswer) {
        label.classList.add("correct");
      }

      if (
        selected !== null &&
        selected !== correctAnswer &&
        option === selected
      ) {
        label.classList.add("wrong");
      }

    });


    const explanation =
      $(`explanation-${index}`);


    if (explanation) {

      explanation.hidden = false;

      explanation.textContent =
        question.explanation ||
        `Correct answer: ${
          question.options?.[correctAnswer] || ""
        }`;
    }


    if (selected === correctAnswer) {

      correct++;

    } else if (
      selected !== null &&
      state.lastMistake === null
    ) {

      state.lastMistake = {
        question: question.question,
        studentAnswer:
          question.options?.[selected] || "No answer",
        correctAnswer:
          question.options?.[correctAnswer] || "",
        explanation:
          question.explanation || "",
        topic:
          question.topic || state.title
      };

    }

  });


  const total =
    state.quiz.length;

  const percentage =
    total
      ? Math.round((correct / total) * 100)
      : 0;


  showQuizScore(correct, total, percentage);

  updateInsights(correct, total);


  if (state.lastMistake) {

    mistakeContent.innerHTML = `
      <p>
        You have a mistake ready to analyze.
        Click <strong>Explain My Mistake</strong>.
      </p>
    `;

  } else {

    mistakeContent.innerHTML = `
      <p>
        Excellent! No incorrect answer was found.
      </p>
    `;
  }


  document
    .getElementById("insightsSection")
    ?.scrollIntoView({
      behavior: "smooth"
    });
}


/* =========================================================
   QUIZ SCORE
========================================================= */

function showQuizScore(correct, total, percentage) {

  const existing =
    quizContainer.querySelector(".quiz-result");

  if (!existing) return;


  existing.innerHTML = `
    <span>Your Quiz Score</span>
    <br>
    <strong>${correct} / ${total}</strong>
    <p>${percentage}% correct</p>
  `;
}


/* =========================================================
   INSIGHTS
========================================================= */

function updateInsights(correct, total) {

  const understanding =
    total
      ? Math.round((correct / total) * 100)
      : 0;

  const recall =
    Math.min(
      100,
      understanding + 5
    );

  const application =
    Math.max(
      0,
      Math.round(understanding * 0.9)
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


function resetInsights() {

  setProgress(
    understandingBar,
    understandingScore,
    0
  );

  setProgress(
    recallBar,
    recallScore,
    0
  );

  setProgress(
    applicationBar,
    applicationScore,
    0
  );


  studyDnaContent.innerHTML = `
    <p class="empty-state">
      Complete the quiz to discover your study DNA.
    </p>
  `;

  weakTopicsContent.innerHTML = `
    <p class="empty-state">
      Complete the quiz to identify weak topics.
    </p>
  `;

  mistakeContent.innerHTML = `
    <p class="empty-state">
      Answer a quiz question incorrectly to analyze your mistake.
    </p>
  `;

  knowledgeMapContent.innerHTML = `
    <p class="empty-state">
      Complete the quiz to build your knowledge map.
    </p>
  `;
}


function setProgress(bar, text, value) {

  const safe =
    Math.max(
      0,
      Math.min(100, value)
    );

  if (bar) {
    bar.style.width = `${safe}%`;
  }

  if (text) {
    text.textContent = `${safe}%`;
  }
}


/* =========================================================
   STUDY DNA
========================================================= */
function analyzeStudyDNA() {
  if (!state.quiz || state.quiz.length === 0) {
    showFeatureOutput(
      "Study DNA",
      "Generate and complete a quiz first. Your Study DNA is created from your quiz performance."
    );
    return;
  }

  const total = state.quiz.length;

  let correct = 0;
  let attempted = 0;
  let skipped = 0;

  const topicStats = {};

  state.quiz.forEach((question, index) => {
    const answer = state.quizAnswers[index];

    const topic =
      question.topic ||
      "General";

    if (!topicStats[topic]) {
      topicStats[topic] = {
        total: 0,
        correct: 0,
        attempted: 0
      };
    }

    topicStats[topic].total++;

    if (
      answer === null ||
      answer === undefined ||
      answer === ""
    ) {
      skipped++;
      return;
    }

    attempted++;

    topicStats[topic].attempted++;

    if (Number(answer) === Number(question.correctAnswer)) {
      correct++;
      topicStats[topic].correct++;
    }
  });

  const accuracy =
    attempted > 0
      ? Math.round((correct / attempted) * 100)
      : 0;

  const completion =
    total > 0
      ? Math.round((attempted / total) * 100)
      : 0;

  let learningLevel = "";
  let learningStyle = "";
  let recommendation = "";

  if (accuracy >= 85) {
    learningLevel = "Strong understanding";
    recommendation =
      "You have a strong grasp of the topic. Focus next on advanced applications, difficult questions and exam-style problems.";
  } else if (accuracy >= 70) {
    learningLevel = "Good understanding";
    recommendation =
      "Your fundamentals are good. Revise the concepts you missed and practice application-based questions.";
  } else if (accuracy >= 50) {
    learningLevel = "Developing understanding";
    recommendation =
      "You understand some important concepts, but your knowledge needs reinforcement. Review the summary and retry the weak areas.";
  } else {
    learningLevel = "Needs reinforcement";
    recommendation =
      "Start by revising the fundamentals and key concepts. Then attempt another quiz before moving to advanced questions.";
  }

  if (completion < 60) {
    learningStyle =
      "You tend to leave questions unanswered. Try attempting more questions so Knowvia can understand your learning pattern better.";
  } else if (accuracy >= 80) {
    learningStyle =
      "You learn effectively through active recall and question-based practice.";
  } else if (accuracy >= 60) {
    learningStyle =
      "You benefit from a combination of concept revision and active practice.";
  } else {
    learningStyle =
      "You would benefit most from concept-first learning followed by repeated practice.";
  }

  const topicEntries = Object.entries(topicStats);

  topicEntries.sort((a, b) => {
    const accuracyA =
      a[1].attempted > 0
        ? a[1].correct / a[1].attempted
        : 0;

    const accuracyB =
      b[1].attempted > 0
        ? b[1].correct / b[1].attempted
        : 0;

    return accuracyA - accuracyB;
  });

  const weakTopics = topicEntries
    .filter(([_, data]) => {
      if (data.attempted === 0) return true;

      return (
        data.correct / data.attempted < 0.7
      );
    })
    .slice(0, 3);

  const strongTopics = [...topicEntries]
    .sort((a, b) => {
      const accuracyA =
        a[1].attempted > 0
          ? a[1].correct / a[1].attempted
          : 0;

      const accuracyB =
        b[1].attempted > 0
          ? b[1].correct / b[1].attempted
          : 0;

      return accuracyB - accuracyA;
    })
    .filter(([_, data]) => data.attempted > 0)
    .slice(0, 3);

  let weakHTML = "";

  if (weakTopics.length > 0) {
    weakHTML = weakTopics
      .map(([topic, data]) => {
        const topicAccuracy =
          data.attempted > 0
            ? Math.round(
                (data.correct / data.attempted) * 100
              )
            : 0;

        return `
          <div class="dna-topic">
            <strong>${escapeHTML(topic)}</strong>
            <span>${topicAccuracy}% accuracy</span>
          </div>
        `;
      })
      .join("");
  } else {
    weakHTML = `
      <div class="dna-empty">
        No major weak topic was detected from this quiz.
      </div>
    `;
  }

  let strongHTML = "";

  if (strongTopics.length > 0) {
    strongHTML = strongTopics
      .map(([topic, data]) => {
        const topicAccuracy =
          data.attempted > 0
            ? Math.round(
                (data.correct / data.attempted) * 100
              )
            : 0;

        return `
          <div class="dna-topic">
            <strong>${escapeHTML(topic)}</strong>
            <span>${topicAccuracy}% accuracy</span>
          </div>
        `;
      })
      .join("");
  } else {
    strongHTML = `
      <div class="dna-empty">
        Complete more questions to identify your strongest areas.
      </div>
    `;
  }

  const html = `
    <div class="dna-header">
      <h3>Your Study DNA</h3>
      <p>Based on your actual performance in the current quiz.</p>
    </div>

    <div class="dna-stats">
      <div class="dna-stat">
        <strong>${accuracy}%</strong>
        <span>Accuracy</span>
      </div>

      <div class="dna-stat">
        <strong>${correct}/${attempted}</strong>
        <span>Correct</span>
      </div>

      <div class="dna-stat">
        <strong>${completion}%</strong>
        <span>Completed</span>
      </div>

      <div class="dna-stat">
        <strong>${skipped}</strong>
        <span>Skipped</span>
      </div>
    </div>

    <div class="dna-section">
      <h4>Learning Level</h4>
      <p>${learningLevel}</p>
    </div>

    <div class="dna-section">
      <h4>Your Learning Pattern</h4>
      <p>${learningStyle}</p>
    </div>

    <div class="dna-section">
      <h4>Strong Areas</h4>
      ${strongHTML}
    </div>

    <div class="dna-section">
      <h4>Areas That Need More Practice</h4>
      ${weakHTML}
    </div>

    <div class="dna-section">
      <h4>Recommended Next Step</h4>
      <p>${recommendation}</p>
    </div>
  `;

  showFeatureOutput("Study DNA", html);
}


/* =========================================================
   WEAK TOPICS
========================================================= */

weakTopicsBtn?.addEventListener(
  "click",
  findWeakTopics
);


async function findWeakTopics() {

  if (!state.quiz.length) {

    weakTopicsContent.innerHTML = `
      <p class="empty-state">
        Generate a study pack and complete the quiz first.
      </p>
    `;

    return;
  }


  weakTopicsBtn.disabled = true;

  weakTopicsBtn.textContent =
    "Analyzing...";


  try {

    const data =
      await callKnowviaAI({

        task: "weak_topics",

        topic: state.title,

        quizResults:
          buildQuizResults()

      });


    const result =
      extractJSON(data);


    renderWeakTopics(result);


  } catch (error) {

    weakTopicsContent.innerHTML = `
      <p>
        ${escapeHTML(error.message)}
      </p>
    `;

  } finally {

    weakTopicsBtn.disabled = false;

    weakTopicsBtn.textContent =
      "Find Weak Topics";
  }
}


function renderWeakTopics(result) {

  const weak =
    Array.isArray(result.weakTopics)
      ? result.weakTopics
      : [];


  if (!weak.length) {

    weakTopicsContent.innerHTML = `
      <p>
        No major weak topics detected. Keep practicing!
      </p>
    `;

    return;
  }


  weakTopicsContent.innerHTML = `

    <h4>Topics to revisit</h4>

    <ul>

      ${weak.map((item) => {

        if (typeof item === "string") {

          return `<li>${escapeHTML(item)}</li>`;
        }

        return `
          <li>
            <strong>
              ${escapeHTML(item.topic || "Topic")}
            </strong>
            —
            ${escapeHTML(
              item.reason || "Needs more practice."
            )}
          </li>
        `;

      }).join("")}

    </ul>

  `;
}


/* =========================================================
   EXPLAIN MY MISTAKE
========================================================= */

explainMistakeBtn?.addEventListener(
  "click",
  explainMistake
);


async function explainMistake() {

  if (!state.lastMistake) {

    mistakeContent.innerHTML = `
      <p class="empty-state">
        First answer at least one quiz question incorrectly.
      </p>
    `;

    return;
  }


  explainMistakeBtn.disabled = true;

  explainMistakeBtn.textContent =
    "Explaining...";


  try {

    const data =
      await callKnowviaAI({

        task: "explain_mistake",

        topic: state.title,

        question:
          state.lastMistake.question,

        studentAnswer:
          state.lastMistake.studentAnswer,

        correctAnswer:
          state.lastMistake.correctAnswer,

        explanation:
          state.lastMistake.explanation

      });


    const result =
      extractText(data);


    mistakeContent.innerHTML = `
      <div class="summary-text">
        ${formatText(result)}
      </div>
    `;


  } catch (error) {

    mistakeContent.innerHTML = `
      <p>
        ${escapeHTML(error.message)}
      </p>
    `;

  } finally {

    explainMistakeBtn.disabled = false;

    explainMistakeBtn.textContent =
      "Explain My Mistake";
  }
}


/* =========================================================
   KNOWLEDGE MAP
========================================================= */

knowledgeMapBtn?.addEventListener(
  "click",
  generateKnowledgeMap
);


async function generateKnowledgeMap() {

  if (!state.quiz.length) {

    knowledgeMapContent.innerHTML = `
      <p class="empty-state">
        Generate a study pack and complete the quiz first.
      </p>
    `;

    return;
  }


  knowledgeMapBtn.disabled = true;

  knowledgeMapBtn.textContent =
    "Building...";


  try {

    const data =
      await callKnowviaAI({

        task: "knowledge_map",

        topic: state.title,

        quizResults:
          buildQuizResults()

      });


    const map =
      extractJSON(data);


    renderKnowledgeMap(map);


  } catch (error) {

    knowledgeMapContent.innerHTML = `
      <p>
        ${escapeHTML(error.message)}
      </p>
    `;

  } finally {

    knowledgeMapBtn.disabled = false;

    knowledgeMapBtn.textContent =
      "Build Knowledge Map";
  }
}


function renderKnowledgeMap(map) {

  const nodes =
    Array.isArray(map.nodes)
      ? map.nodes
      : [];


  if (!nodes.length) {

    knowledgeMapContent.innerHTML = `
      <p>
        Knowledge map could not be generated.
      </p>
    `;

    return;
  }


  knowledgeMapContent.innerHTML = `

    <h4>${escapeHTML(
      map.title || state.title
    )}</h4>

    <ul>

      ${nodes.map((node) => {

        if (typeof node === "string") {

          return `<li>${escapeHTML(node)}</li>`;
        }

        return `
          <li>
            <strong>
              ${escapeHTML(
                node.name || "Concept"
              )}
            </strong>

            ${
              node.description
                ? ` — ${escapeHTML(node.description)}`
                : ""
            }

            ${
              Array.isArray(node.connections) &&
              node.connections.length
                ? `<br>
                   <small>
                     Connected to:
                     ${escapeHTML(
                       node.connections.join(", ")
                     )}
                   </small>`
                : ""
            }

          </li>
        `;

      }).join("")}

    </ul>

  `;
}


/* =========================================================
   QUIZ RESULTS
========================================================= */

function buildQuizResults() {

  return state.quiz.map(
    (question, index) => {

      const selected =
        state.quizAnswers[index];

      const correct =
        Number(question.correctAnswer);


      return {

        question:
          question.question || "",

        topic:
          question.topic || state.title,

        selectedAnswer:
          selected !== null &&
          question.options
            ? question.options[selected]
            : "No answer",

        correctAnswer:
          question.options
            ? question.options[correct]
            : "",

        isCorrect:
          selected === correct

      };

    }
  );
}


/* =========================================================
   FORMATTING
========================================================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatText(text) {

  return escapeHTML(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n+/g, "</p><p>")
    .replace(/\n/g, "<br>");
}


/* =========================================================
   INITIAL STATE
========================================================= */

resetInsights();

renderFlashcard();
