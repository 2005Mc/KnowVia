// ============================================================
// KNOWVIA - FRONTEND
// ============================================================

const state = {
  studyPack: null,
  flashcards: [],
  currentCard: 0,
  cardFlipped: false,
  cardConfidence: {},
  quiz: [],
  quizResults: [],
  retestQuiz: [],
  source: "topic",
  difficulty: "Medium",
  questionStyle: "Mixed",
  material: ""
};

// ============================================================
// DOM
// ============================================================

const $ = (id) =>
  document.getElementById(id);

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

  const response = await fetch(
    "/api/chat",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

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
      data?.error ||
      "AI request failed."
    );
  }

  return data;
}

function extractJSON(data) {

  if (
    data?.result &&
    typeof data.result === "object"
  ) {
    return data.result;
  }

  if (data?.answer) {

    let text =
      String(data.answer).trim();

    text = text.replace(
      /^```json\s*/i,
      ""
    );

    text = text.replace(
      /^```\s*/i,
      ""
    );

    text = text.replace(
      /\s*```$/i,
      ""
    );

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  return null;
}

function extractTextResponse(data) {
  if (typeof data?.answer === "string") {
    return data.answer;
  }

  if (typeof data?.result === "string") {
    return data.result;
  }

  if (typeof data?.text === "string") {
    return data.text;
  }

  return "No response was returned.";
}

// ============================================================
// SOURCE TABS
// ============================================================

function setupSourceTabs() {

  const tabs =
    document.querySelectorAll(
      ".source-tab"
    );

  tabs.forEach((tab) => {

    tab.addEventListener(
      "click",
      () => {

        tabs.forEach((item) =>
          item.classList.remove(
            "active"
          )
        );

        tab.classList.add(
          "active"
        );

        state.source =
          tab.dataset.source ||
          "topic";

        document
          .querySelectorAll(
            ".source-panel"
          )
          .forEach((panel) => {
            panel.classList.remove(
              "active"
            );
          });

        const panel =
          $(`${state.source}Panel`);

        if (panel) {
          panel.classList.add(
            "active"
          );
        }
      }
    );
  });
}

// ============================================================
// MATERIAL
// ============================================================

function getCurrentMaterial() {

  const topic =
    $("topic")?.value?.trim() ||
    "";

  const typedNotes =
    $("typedNotes")?.value?.trim() ||
    "";

  if (state.source === "topic") {
    return topic;
  }

  if (state.source === "typed") {
    return typedNotes;
  }

  if (state.source === "handwritten") {
    return (
      $("handwrittenInput")
        ?.value
        ?.trim() ||
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
    $("topic")?.value?.trim() ||
    "Study Topic";

  const material =
    getCurrentMaterial();

  if (!material) {

    showMessage(
      $("generateStatus"),
      "Please enter a topic or provide study material."
    );

    return;
  }

  const difficulty =
    $("difficulty")?.value ||
    "Medium";

  const questionStyle =
    $("questionStyle")?.value ||
    "Mixed";

  state.difficulty =
    difficulty;

  state.questionStyle =
    questionStyle;

  state.material =
    material;

  showMessage(
    $("generateStatus"),
    "Generating your study pack..."
  );

  const button =
    $("generateBtn");

  if (button) {
    button.disabled = true;
    button.textContent =
      "Generating...";
  }

  try {

    const data =
      await callKnowviaAI({
        task: "study_pack",
        topic,
        difficulty,
        material,
        quizStyle:
          questionStyle
      });

    const pack =
      extractJSON(data);

    if (!pack) {
      throw new Error(
        "The AI returned an invalid study pack."
      );
    }

    if (
      !Array.isArray(
        pack.flashcards
      ) ||
      pack.flashcards.length < 10
    ) {
      throw new Error(
        "The AI did not return 10 flashcards. Please generate again."
      );
    }

    if (
      !Array.isArray(pack.quiz) ||
      pack.quiz.length < 10
    ) {
      throw new Error(
        "The AI did not return 10 quiz questions. Please generate again."
      );
    }

    state.studyPack =
      pack;

    state.flashcards =
      pack.flashcards.slice(0, 10);

    state.quiz =
      pack.quiz.slice(0, 10);

    state.currentCard = 0;
    state.cardFlipped = false;
    state.cardConfidence = {};
    state.quizResults = [];
    state.retestQuiz = [];

    renderSummary(pack);
    renderFlashcards();
    renderQuiz();
    resetInsights();

    showMessage(
      $("generateStatus"),
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
      $("generateStatus"),
      error.message ||
      "Something went wrong."
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent =
        "Generate Study Pack";
    }
  }
}

// ============================================================
// SUMMARY
// ============================================================

function renderList(
  items
) {

  if (!Array.isArray(items)) {
    return "";
  }

  return items
    .filter(Boolean)
    .map(
      (item) =>
        `<li>${escapeHTML(item)}</li>`
    )
    .join("");
}

function renderSection(
  title,
  value
) {

  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {

    if (!value.length) {
      return "";
    }

    return `
      <section class="study-section">
        <h3>${escapeHTML(title)}</h3>
        <ul>
          ${renderList(value)}
        </ul>
      </section>
    `;
  }

  return `
    <section class="study-section">
      <h3>${escapeHTML(title)}</h3>
      <p>
        ${escapeHTML(value)}
      </p>
    </section>
  `;
}

function renderSummary(pack) {

  const container =
    $("summaryContent");

  if (!container) return;

  const study =
    pack.studyMatter || {};

  container.innerHTML = `

    <div class="summary-main">

      <h3>Summary</h3>

      <p>
        ${escapeHTML(
          pack.summary || ""
        )}
      </p>

    </div>

    ${renderSection(
      "Introduction",
      study.introduction
    )}

    ${renderSection(
      "Definition",
      study.definition
    )}

    ${renderSection(
      "Core Concept",
      study.coreConcept
    )}

    ${renderSection(
      "Key Concepts",
      study.keyConcepts
    )}

    ${renderSection(
      "Types / Classification",
      study.types
    )}

    ${renderSection(
      "Components / Elements",
      study.components
    )}

    ${renderSection(
      "Working / Process / Mechanism",
      study.working
    )}

    ${renderSection(
      "Important Characteristics",
      study.characteristics
    )}

    ${renderSection(
      "Examples",
      study.examples
    )}

    ${renderSection(
      "Applications",
      study.applications
    )}

    ${renderSection(
      "Advantages",
      study.advantages
    )}

    ${renderSection(
      "Limitations",
      study.limitations
    )}

    ${renderSection(
      "Comparison",
      study.comparison
    )}

    ${renderSection(
      "Important Exam Points",
      study.examPoints
    )}

    ${renderSection(
      "Quick Revision",
      study.quickRevision
    )}

  `;
}

// ============================================================
// FLASHCARDS
// ============================================================

function renderFlashcards() {

  const question =
    $("cardQuestion");

  const answer =
    $("cardAnswer");

  const progress =
    $("cardProgress");

  const card =
    $("flashcard");

  if (!question || !answer) {
    return;
  }

  if (!state.flashcards.length) {

    question.textContent =
      "Generate a study pack to create flashcards.";

    answer.textContent = "";

    if (progress) {
      progress.textContent =
        "0 / 10";
    }

    return;
  }

  const item =
    state.flashcards[
      state.currentCard
    ];

  question.textContent =
    item?.question ||
    "No question available.";

  answer.textContent =
    item?.answer ||
    "No answer available.";

  if (progress) {

    progress.textContent =
      `${state.currentCard + 1} / 10`;
  }

  state.cardFlipped = false;

  if (card) {
    card.classList.remove(
      "flipped"
    );
  }
}

function flipCard() {

  const card =
    $("flashcard");

  if (!card) return;

  state.cardFlipped =
    !state.cardFlipped;

  card.classList.toggle(
    "flipped",
    state.cardFlipped
  );
}

function nextCard() {

  if (!state.flashcards.length) {
    return;
  }

  state.currentCard =
    (state.currentCard + 1) %
    state.flashcards.length;

  renderFlashcards();
}

function prevCard() {

  if (!state.flashcards.length) {
    return;
  }

  state.currentCard =
    (
      state.currentCard -
      1 +
      state.flashcards.length
    ) %
    state.flashcards.length;

  renderFlashcards();
}

// ============================================================
// FLASHCARD CONFIDENCE
// ============================================================

function setupConfidenceButtons() {

  document
    .querySelectorAll(
      "[data-confidence]"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const level =
            button.dataset.confidence;

          state.cardConfidence[
            state.currentCard
          ] = level;

          document
            .querySelectorAll(
              "[data-confidence]"
            )
            .forEach((item) =>
              item.classList.remove(
                "selected"
              )
            );

          button.classList.add(
            "selected"
          );
        }
      );
    });
}

// ============================================================
// QUIZ
// ============================================================

function renderQuiz() {

  const container =
    $("quizContainer");

  if (!container) return;

  if (!state.quiz.length) {

    container.innerHTML =
      "<p>Generate a study pack to start the quiz.</p>";

    return;
  }

  container.innerHTML = `

    <div class="quiz-header">
      <h3>10-Question Quiz</h3>
      <div id="quizScore">
        Answer all 10 questions.
      </div>
    </div>

    ${state.quiz
      .map(
        (item, index) => {

          const options =
            Array.isArray(
              item.options
            )
              ? item.options.slice(
                  0,
                  4
                )
              : [];

          return `
            <div
              class="quiz-question"
              data-index="${index}"
            >

              <h3>
                ${index + 1}.
                ${escapeHTML(
                  item.question
                )}
              </h3>

              <div class="quiz-options">

                ${options
                  .map(
                    (
                      option,
                      optionIndex
                    ) => `
                      <button
                        type="button"
                        class="quiz-option"
                        data-question="${index}"
                        data-option="${optionIndex}"
                      >
                        ${escapeHTML(
                          option
                        )}
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
        }
      )
      .join("")}

  `;

  container
    .querySelectorAll(
      ".quiz-option"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        handleQuizAnswer
      );
    });
}

function handleQuizAnswer(event) {

  const button =
    event.currentTarget;

  const questionIndex =
    Number(
      button.dataset.question
    );

  const selected =
    Number(
      button.dataset.option
    );

  const question =
    state.quiz[
      questionIndex
    ];

  if (!question) {
    return;
  }

  const correct =
    Number(
      question.correctAnswer
    );

  const container =
    button.closest(
      ".quiz-question"
    );

  if (!container) {
    return;
  }

  if (
    state.quizResults.some(
      (item) =>
        item.questionIndex ===
        questionIndex
    )
  ) {
    return;
  }

  const buttons =
    container.querySelectorAll(
      ".quiz-option"
    );

  buttons.forEach(
    (item) => {
      item.disabled = true;
    }
  );

  if (selected === correct) {

    button.classList.add(
      "correct"
    );

  } else {

    button.classList.add(
      "wrong"
    );

    buttons.forEach(
      (item) => {

        if (
          Number(
            item.dataset.option
          ) === correct
        ) {
          item.classList.add(
            "correct"
          );
        }
      }
    );
  }

  const feedback =
    $(
      `quizFeedback${questionIndex}`
    );

  if (feedback) {

    feedback.textContent =
      question.explanation ||
      "Review this concept once more.";
  }

  state.quizResults.push({

    questionIndex,

    question:
      question.question,

    selectedAnswer:
      question.options?.[
        selected
      ] || "",

    correctAnswer:
      question.options?.[
        correct
      ] || "",

    isCorrect:
      selected === correct
  });

  updateUnderstanding();
  updateQuizScore();
}

function updateQuizScore() {

  const score =
    $("quizScore");

  if (!score) return;

  const answered =
    state.quizResults.length;

  const correct =
    state.quizResults.filter(
      (item) =>
        item.isCorrect
    ).length;

  if (answered < 10) {

    score.textContent =
      `${answered}/10 answered • ${correct} correct`;

    return;
  }

  const percentage =
    Math.round(
      (correct / 10) * 100
    );

  score.textContent =
    `Final Score: ${correct}/10 (${percentage}%)`;
}

// ============================================================
// INSIGHTS
// ============================================================

function updateUnderstanding() {

  const results =
    state.quizResults;

  if (!results.length) {
    return;
  }

  const correct =
    results.filter(
      (item) =>
        item.isCorrect
    ).length;

  const score =
    Math.round(
      (correct /
        results.length) *
        100
    );

  if ($("understandingBar")) {
    $("understandingBar")
      .style.width =
      `${score}%`;
  }

  if ($("understandingScore")) {
    $("understandingScore")
      .textContent =
      `${score}%`;
  }

  const recall =
    Math.min(
      100,
      score + 5
    );

  const application =
    Math.max(
      0,
      score - 5
    );

  if ($("recallBar")) {
    $("recallBar")
      .style.width =
      `${recall}%`;
  }

  if ($("recallScore")) {
    $("recallScore")
      .textContent =
      `${recall}%`;
  }

  if ($("applicationBar")) {
    $("applicationBar")
      .style.width =
      `${application}%`;
  }

  if ($("applicationScore")) {
    $("applicationScore")
      .textContent =
      `${application}%`;
  }
}

function resetInsights() {

  [
    "understandingBar",
    "recallBar",
    "applicationBar"
  ].forEach(
    (id) => {

      if ($(id)) {
        $(id).style.width =
          "0%";
      }
    }
  );

  [
    "understandingScore",
    "recallScore",
    "applicationScore"
  ].forEach(
    (id) => {

      if ($(id)) {
        $(id).textContent =
          "0%";
      }
    }
  );

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
// WEAK TOPICS + RETEST
// ============================================================

async function targetedRetest() {

  const output =
    $("weakTopicsContent");

  if (!output) return;

  if (!state.quizResults.length) {

    output.innerHTML =
      "<p>Please answer some quiz questions first.</p>";

    return;
  }

  output.innerHTML =
    "<p>Analyzing your weak topics and creating a targeted re-test...</p>";

  try {

    const data =
      await callKnowviaAI({

        task:
          "weak_topics",

        quizResults:
          state.quizResults

      });

    const result =
      extractJSON(data);

    const topics =
      Array.isArray(
        result?.weakTopics
      )
        ? result.weakTopics
        : [];

    const retest =
      Array.isArray(
        result?.retestQuiz
      )
        ? result.retestQuiz
        : [];

    state.retestQuiz =
      retest.slice(0, 5);

    output.innerHTML = `

      ${
        topics.length
          ? `
            <h4>Topics to revise</h4>

            <ul>
              ${topics
                .map(
                  (topic) =>
                    `<li>${escapeHTML(
                      topic
                    )}</li>`
                )
                .join("")}
            </ul>
          `
          : `
            <p>
              No major weak topics detected.
            </p>
          `
      }

      ${
        result?.explanation
          ? `
            <p>
              ${escapeHTML(
                result.explanation
              )}
            </p>
          `
          : ""
      }

      ${
        state.retestQuiz.length
          ? `
            <h4>Targeted Re-test</h4>

            <div class="retest-quiz">

              ${state.retestQuiz
                .map(
                  (
                    item,
                    index
                  ) => `
                    <div class="quiz-question">

                      <h3>
                        ${index + 1}.
                        ${escapeHTML(
                          item.question
                        )}
                      </h3>

                      <div class="quiz-options">

                        ${item.options
                          .slice(
                            0,
                            4
                          )
                          .map(
                            (
                              option,
                              optionIndex
                            ) => `
                              <button
                                type="button"
                                class="quiz-option retest-option"
                                data-retest="${index}"
                                data-option="${optionIndex}"
                              >
                                ${escapeHTML(
                                  option
                                )}
                              </button>
                            `
                          )
                          .join("")}

                      </div>

                      <div
                        class="quiz-feedback"
                        id="retestFeedback${index}"
                      ></div>

                    </div>
                  `
                )
                .join("")}

            </div>
          `
          : ""
      }

    `;

    output
      .querySelectorAll(
        ".retest-option"
      )
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            handleRetestAnswer
          );

        }
      );

  } catch (error) {

    output.innerHTML =
      `<p>${escapeHTML(
        error.message
      )}</p>`;
  }
}

function handleRetestAnswer(
  event
) {

  const button =
    event.currentTarget;

  const index =
    Number(
      button.dataset.retest
    );

  const selected =
    Number(
      button.dataset.option
    );

  const item =
    state.retestQuiz[index];

  if (!item) return;

  const correct =
    Number(
      item.correctAnswer
    );

  const container =
    button.closest(
      ".quiz-question"
    );

  if (!container) return;

  const buttons =
    container.querySelectorAll(
      ".retest-option"
    );

  buttons.forEach(
    (item) => {
      item.disabled = true;
    }
  );

  if (selected === correct) {

    button.classList.add(
      "correct"
    );

  } else {

    button.classList.add(
      "wrong"
    );

    buttons.forEach(
      (item) => {

        if (
          Number(
            item.dataset.option
          ) === correct
        ) {
          item.classList.add(
            "correct"
          );
        }
      }
    );
  }

  const feedback =
    $(
      `retestFeedback${index}`
    );

  if (feedback) {

    feedback.textContent =
      item.explanation ||
      "Review this concept again.";
  }
}

// ============================================================
// EXPLAIN MISTAKE
// ============================================================

async function explainMistake() {

  const output =
    $("mistakeContent");

  if (!output) return;

  const mistake =
    [...state.quizResults]
      .reverse()
      .find(
        (item) =>
          !item.isCorrect
      );

  if (!mistake) {

    output.innerHTML =
      "<p>No incorrect answer found yet.</p>";

    return;
  }

  output.innerHTML =
    "<p>Explaining your mistake...</p>";

  try {

    const data =
      await callKnowviaAI({

        task:
          "explain_mistake",

        question:
          mistake.question,

        studentAnswer:
          mistake.selectedAnswer,

        correctAnswer:
          mistake.correctAnswer

      });

    output.innerHTML = `
      <p>
        ${escapeHTML(
          extractTextResponse(data)
        ).replace(
          /\n/g,
          "<br>"
        )}
      </p>
    `;

  } catch (error) {

    output.innerHTML =
      `<p>${escapeHTML(
        error.message
      )}</p>`;
  }
}

// ============================================================
// KNOWLEDGE MAP
// ============================================================

async function generateKnowledgeMap() {

  const output =
    $("knowledgeMapContent");

  if (!output) return;

  if (!state.quizResults.length) {

    output.innerHTML =
      "<p>Complete the quiz first.</p>";

    return;
  }

  output.innerHTML =
    "<p>Building your knowledge map...</p>";

  try {

    const data =
      await callKnowviaAI({

        task:
          "knowledge_map",

        quizResults:
          state.quizResults

      });

    const result =
      extractJSON(data);

    const nodes =
      Array.isArray(
        result?.nodes
      )
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
                  ${escapeHTML(
                    node.topic
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    node.status
                  )}
                </span>

                <p>
                  ${escapeHTML(
                    node.reason
                  )}
                </p>

              </div>
            `
          )
          .join("")}

      </div>

    `;

  } catch (error) {

    output.innerHTML =
      `<p>${escapeHTML(
        error.message
      )}</p>`;
  }
}

// ============================================================
// EXTRA AI FEATURES
// ============================================================

async function runFeature(
  task,
  title
) {

  const output =
    $("featureOutput");

  if (!output) return;

  const topic =
    $("topic")?.value?.trim() ||
    state.studyPack?.topic ||
    "the current study topic";

  const material =
    state.material ||
    getCurrentMaterial() ||
    JSON.stringify(
      state.studyPack?.studyMatter ||
      {}
    );

  output.innerHTML = `
    <h3>
      ${escapeHTML(title)}
    </h3>

    <p>
      Thinking...
    </p>
  `;

  try {

    const data =
      await callKnowviaAI({

        task,

        topic,

        material,

        difficulty:
          state.difficulty

      });

    const answer =
      extractTextResponse(data);

    output.innerHTML = `
      <h3>
        ${escapeHTML(title)}
      </h3>

      <div class="feature-answer">
        ${escapeHTML(answer)
          .replace(
            /\n/g,
            "<br>"
          )}
      </div>
    `;

    output.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  } catch (error) {

    output.innerHTML =
      `<p>${escapeHTML(
        error.message
      )}</p>`;
  }
}

// ============================================================
// ASK MY NOTES
// ============================================================

async function askMyNotes() {

  const question =
    window.prompt(
      "What do you want to ask about your notes?"
    );

  if (!question) {
    return;
  }

  const material =
    state.material ||
    getCurrentMaterial();

  if (!material) {

    const output =
      $("featureOutput");

    if (output) {
      output.innerHTML =
        "<p>Please provide notes first.</p>";
    }

    return;
  }

  const output =
    $("featureOutput");

  if (!output) return;

  output.innerHTML =
    "<p>Searching your notes...</p>";

  try {

    const data =
      await callKnowviaAI({

        task:
          "ask_notes",

        question,

        material

      });

    output.innerHTML = `

      <h3>
        Ask My Notes
      </h3>

      <div class="feature-answer">
        ${escapeHTML(
          extractTextResponse(data)
        ).replace(
          /\n/g,
          "<br>"
        )}
      </div>

    `;

  } catch (error) {

    output.innerHTML =
      `<p>${escapeHTML(
        error.message
      )}</p>`;
  }
}

// ============================================================
// HANDWRITTEN OCR
// ============================================================

async function processHandwrittenImage(
  file
) {

  const status =
    $("handwrittenStatus");

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
                  (info.progress || 0) *
                    100
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
      result?.data?.text?.trim() ||
      "";

    if ($("handwrittenInput")) {

      $("handwrittenInput")
        .value = text;
    }

    state.material =
      text;

    showMessage(
      status,
      text
        ? "Handwritten notes extracted successfully."
        : "No readable text found."
    );

  } catch (error) {

    console.error(error);

    showMessage(
      status,
      "Could not read the handwritten image."
    );
  }
}

// ============================================================
// PDF
// ============================================================

async function extractPDFText(
  file
) {

  const status =
    $("pdfStatus");

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
      await pdfjsLib
        .getDocument({
          data: buffer
        })
        .promise;

    let fullText = "";

    for (
      let pageNumber = 1;
      pageNumber <=
      pdf.numPages;
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
            (item) =>
              item.str
          )
          .join(" ");

      fullText +=
        `\n\nPage ${pageNumber}\n${pageText}`;
    }

    fullText =
      fullText.trim();

    state.material =
      fullText;

    if (!fullText) {

      showMessage(
        status,
        "This PDF has no selectable text. Scanned PDF OCR needs to be added separately."
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

  const button =
    $("themeBtn");

  if (!button) return;

  button.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "dark"
      );

      const dark =
        document.body.classList.contains(
          "dark"
        );

      button.textContent =
        dark ? "☀️" : "🌙";
    }
  );
}

// ============================================================
// EVENTS
// ============================================================

function setupEvents() {

  $("generateBtn")
    ?.addEventListener(
      "click",
      generateStudyPack
    );

  $("flipCard")
    ?.addEventListener(
      "click",
      flipCard
    );

  $("nextCard")
    ?.addEventListener(
      "click",
      nextCard
    );

  $("prevCard")
    ?.addEventListener(
      "click",
      prevCard
    );

  $("weakTopicsBtn")
    ?.addEventListener(
      "click",
      targetedRetest
    );

  $("explainMistakeBtn")
    ?.addEventListener(
      "click",
      explainMistake
    );

  $("knowledgeMapBtn")
    ?.addEventListener(
      "click",
      generateKnowledgeMap
    );

  $("teachBtn")
    ?.addEventListener(
      "click",
      () =>
        runFeature(
          "teach",
          "Teach Me"
        )
    );

  $("studySessionBtn")
    ?.addEventListener(
      "click",
      () =>
        runFeature(
          "study_session",
          "Study Session"
        )
    );

  $("examModeBtn")
    ?.addEventListener(
      "click",
      () =>
        runFeature(
          "exam",
          "Exam Mode"
        )
    );

  $("askNotesBtn")
    ?.addEventListener(
      "click",
      askMyNotes
    );

  $("handwrittenInput")
    ?.addEventListener(
      "change",
      (event) => {

        const file =
          event.target.files?.[0];

        processHandwrittenImage(
          file
        );
      }
    );

  $("pdfInput")
    ?.addEventListener(
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
    .querySelectorAll(
      'a[href^="#"]'
    )
    .forEach((link) => {

      link.addEventListener(
        "click",
        (event) => {

          const target =
            document.querySelector(
              link.getAttribute(
                "href"
              )
            );

          if (!target) {
            return;
          }

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
    setupConfidenceButtons();

    renderFlashcards();
    resetInsights();

  }
);
