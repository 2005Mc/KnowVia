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

  studyPack: null,

  flashcards: [],
  cardIndex: 0,

  quiz: [],
  quizAnswers: [],

  lastMistake: null,

  busy: false
};


/* =========================================================
   ELEMENT HELPER
========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   MAIN ELEMENTS
========================================================= */

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
      .forEach((item) => {
        item.classList.remove("active");
      });

    document.querySelectorAll(".source-panel")
      .forEach((panel) => {
        panel.classList.remove("active");
      });

    tab.classList.add("active");

    state.source =
      tab.dataset.source || "topic";

    const panel =
      $(`${state.source}Panel`);

    if (panel) {
      panel.classList.add("active");
    }

  });

});


/* =========================================================
   HANDWRITTEN NOTES OCR
========================================================= */

$("handwrittenInput")?.addEventListener(
  "change",
  async (event) => {

    const file =
      event.target.files?.[0];

    if (!file) return;

    const status =
      $("handwrittenStatus");

    try {

      if (!window.Tesseract) {
        throw new Error(
          "OCR library is not available."
        );
      }

      status.textContent =
        "Reading handwriting... please wait.";

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

                status.textContent =
                  `Reading handwriting... ${percent}%`;
              }
            }
          }
        );


      const text =
        result?.data?.text?.trim() || "";


      if (!text) {
        throw new Error(
          "No readable text was found."
        );
      }


      state.material = text;


      status.textContent =
        "Handwritten notes successfully converted to text.";

    } catch (error) {

      console.error(error);

      state.material = "";

      status.textContent =
        error.message ||
        "Could not read the handwriting. Please use a clearer image.";
    }

  }
);


/* =========================================================
   PDF TEXT EXTRACTION
========================================================= */

$("pdfInput")?.addEventListener(
  "change",
  async (event) => {

    const file =
      event.target.files?.[0];

    if (!file) return;

    const status =
      $("pdfStatus");


    try {

      status.textContent =
        "Reading PDF...";


      const buffer =
        await file.arrayBuffer();


      const pdfjsLib =
        await import(
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs"
        );


      const pdf =
        await pdfjsLib.getDocument({
          data: buffer
        }).promise;


      let text = "";


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
            .map(item => item.str || "")
            .join(" ");


        text +=
          pageText + "\n\n";


        status.textContent =
          `Reading PDF... page ${pageNumber}/${pdf.numPages}`;
      }


      text =
        text.trim();


      if (!text) {

        throw new Error(
          "This PDF does not contain selectable text."
        );
      }


      state.material =
        text;


      status.textContent =
        `PDF successfully read (${pdf.numPages} pages).`;

    } catch (error) {

      console.error(error);

      state.material = "";

      status.textContent =
        error.message ||
        "Could not read this PDF.";
    }

  }
);


/* =========================================================
   API CALL
========================================================= */

async function callKnowviaAI(payload) {

  const response =
    await fetch(
      "/api/chat",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(payload)
      }
    );


  const raw =
    await response.text();


  let data;


  try {

    data =
      raw
        ? JSON.parse(raw)
        : {};

  } catch (error) {

    console.error(
      "Raw server response:",
      raw
    );

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
    throw new Error(
      "Empty AI response."
    );
  }


  if (
    typeof data === "object" &&
    !Array.isArray(data)
  ) {

    if (
      data.summary ||
      data.keyFeatures ||
      data.types ||
      data.components ||
      data.howItWorks ||
      data.examples ||
      data.applications ||
      data.flashcards ||
      data.quiz ||
      data.studyDNA ||
      data.weakTopics ||
      data.nodes
    ) {

      return data;
    }
  }


  let text = "";


  if (
    typeof data === "string"
  ) {

    text = data;

  } else if (
    typeof data.answer === "string"
  ) {

    text = data.answer;

  } else if (
    typeof data.result === "string"
  ) {

    text = data.result;
  }


  if (!text) {

    throw new Error(
      "AI returned an empty response."
    );
  }


  text =
    text
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /\s*```$/i,
        ""
      )
      .trim();


  try {

    return JSON.parse(text);

  } catch (error) {

    const first =
      text.indexOf("{");

    const last =
      text.lastIndexOf("}");


    if (
      first >= 0 &&
      last > first
    ) {

      try {

        return JSON.parse(
          text.slice(
            first,
            last + 1
          )
        );

      } catch {}
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


/* =========================================================
   GET SOURCE DATA
========================================================= */

function getSourceData() {

  /* -----------------------------------------
     TOPIC
  ----------------------------------------- */

  if (
    state.source === "topic"
  ) {

    const topic =
      topicInput?.value.trim();


    if (!topic) {

      throw new Error(
        "Please enter a topic."
      );
    }


    return {
      title: topic,
      material: topic
    };
  }


  /* -----------------------------------------
     TYPED NOTES
  ----------------------------------------- */

  if (
    state.source === "typed"
  ) {

    const notes =
      typedNotes?.value.trim();


    if (!notes) {

      throw new Error(
        "Please enter your notes."
      );
    }


    return {
      title: "Typed Notes",
      material: notes
    };
  }


  /* -----------------------------------------
     HANDWRITTEN
  ----------------------------------------- */

  if (
    state.source === "handwritten"
  ) {

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


  /* -----------------------------------------
     PDF
  ----------------------------------------- */

  if (
    state.source === "pdf"
  ) {

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


  throw new Error(
    "Please choose a source."
  );
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
      "Creating your personalized study pack...";


    const source =
      getSourceData();


    state.title =
      source.title;


    state.material =
      source.material;


    state.difficulty =
      difficultyInput?.value ||
      "beginner";


    state.questionStyle =
      questionStyleInput?.value ||
      "mixed";


    /* -----------------------------------------
       SEND TO GEMINI
    ----------------------------------------- */

    const data =
      await callKnowviaAI({

        task: "study_pack",

        topic:
          source.title,

        material:
          source.material,

        difficulty:
          state.difficulty,

        quizStyle:
          state.questionStyle

      });


    /* -----------------------------------------
       READ COMPLETE PACK
    ----------------------------------------- */

    const pack =
      extractJSON(data);


    state.studyPack =
      pack;


    /* -----------------------------------------
       FLASHCARDS
    ----------------------------------------- */

    state.flashcards =
      Array.isArray(pack.flashcards)
        ? pack.flashcards
        : [];


    state.cardIndex =
      0;


    /* -----------------------------------------
       QUIZ
    ----------------------------------------- */

    state.quiz =
      Array.isArray(pack.quiz)
        ? pack.quiz
        : [];


    state.quizAnswers =
      new Array(
        state.quiz.length
      ).fill(null);


    state.lastMistake =
      null;


    /* -----------------------------------------
       RENDER EVERYTHING
    ----------------------------------------- */

    renderSummary(pack);

    renderFlashcard();

    renderQuiz();

    resetInsights();


    generateStatus.textContent =
      `${capitalize(state.difficulty)} study pack ready ✓`;


    /* -----------------------------------------
       SCROLL
    ----------------------------------------- */

    $("summarySection")
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
   COMPLETE STRUCTURED SUMMARY
========================================================= */

function renderSummary(pack) {

  if (
    !pack ||
    typeof pack !== "object"
  ) {

    summaryContent.innerHTML = `
      <p class="empty-state">
        No study pack was generated.
      </p>
    `;

    return;
  }


  const difficulty =
    pack.difficultyLevel ||
    state.difficulty;


  summaryContent.innerHTML = `

    <!-- DIFFICULTY -->
    <div class="study-level-banner">

      <span class="study-level-label">
        Study Level
      </span>

      <strong>
        ${escapeHTML(
          capitalize(difficulty)
        )}
      </strong>

      <p>
        Content is generated specifically
        for this difficulty level.
      </p>

    </div>


    <!-- SUMMARY -->
    ${renderSection(
      "📖",
      "Summary",
      pack.summary
    )}


    <!-- KEY FEATURES -->
    ${renderListSection(
      "🔑",
      "Key Features",
      pack.keyFeatures
    )}


    <!-- TYPES -->
    ${renderTypesSection(
      pack.types
    )}


    <!-- COMPONENTS -->
    ${renderComponentsSection(
      pack.components
    )}


    <!-- HOW IT WORKS -->
    ${renderNumberedSection(
      "⚙️",
      "How It Works",
      pack.howItWorks
    )}


    <!-- EXAMPLES -->
    ${renderListSection(
      "💡",
      "Examples",
      pack.examples
    )}


    <!-- APPLICATIONS -->
    ${renderListSection(
      "🌍",
      "Real-World Applications",
      pack.applications
    )}


    <!-- ADVANTAGES -->
    ${renderListSection(
      "✅",
      "Advantages",
      pack.advantages
    )}


    <!-- LIMITATIONS -->
    ${renderListSection(
      "⚠️",
      "Limitations",
      pack.limitations
    )}


    <!-- IMPORTANT POINTS -->
    ${renderListSection(
      "📌",
      "Important Points",
      pack.importantPoints
    )}


    <!-- COMMON MISTAKES -->
    ${renderListSection(
      "❌",
      "Common Mistakes",
      pack.commonMistakes
    )}


    <!-- EXAM TIPS -->
    ${renderListSection(
      "🎯",
      "Exam Tips",
      pack.examTips
    )}


    <!-- PRACTICE QUESTIONS -->
    ${renderQuestionsSection(
      "📝",
      "Practice Questions",
      pack.practiceQuestions
    )}


    <!-- EXAM QUESTIONS -->
    ${renderQuestionsSection(
      "🎓",
      "Exam Questions",
      pack.examQuestions
    )}

  `;
}


/* =========================================================
   GENERIC SECTION
========================================================= */

function renderSection(
  icon,
  title,
  content
) {

  if (!content) {
    return "";
  }


  return `

    <section class="study-section">

      <div class="study-section-title">

        <span>
          ${icon}
        </span>

        <h3>
          ${escapeHTML(title)}
        </h3>

      </div>

      <div class="study-section-content">

        ${formatText(
          content
        )}

      </div>

    </section>

  `;
}


/* =========================================================
   LIST SECTION
========================================================= */

function renderListSection(
  icon,
  title,
  items
) {

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {

    return "";
  }


  return `

    <section class="study-section">

      <div class="study-section-title">

        <span>
          ${icon}
        </span>

        <h3>
          ${escapeHTML(title)}
        </h3>

      </div>


      <div class="study-list">

        ${items.map(
          (item) => {

            let text = "";


            if (
              typeof item === "string"
            ) {

              text = item;

            } else if (
              item &&
              typeof item === "object"
            ) {

              text =
                item.description ||
                item.explanation ||
                item.text ||
                item.name ||
                "";
            }


            return `
              <div class="study-list-item">

                <span class="study-bullet">
                  •
                </span>

                <div>
                  ${formatText(
                    text
                  )}
                </div>

              </div>
            `;

          }
        ).join("")}

      </div>

    </section>

  `;
}


/* =========================================================
   TYPES SECTION
========================================================= */

function renderTypesSection(types) {

  if (
    !Array.isArray(types) ||
    types.length === 0
  ) {

    return "";
  }


  return `

    <section class="study-section">

      <div class="study-section-title">

        <span>
          🧩
        </span>

        <h3>
          Types / Classification
        </h3>

      </div>


      <div class="study-type-grid">

        ${types.map(
          (type, index) => {

            if (
              typeof type === "string"
            ) {

              return `
                <article class="study-type-card">

                  <h4>
                    ${index + 1}.
                    ${escapeHTML(type)}
                  </h4>

                </article>
              `;
            }


            return `

              <article class="study-type-card">

                <h4>
                  ${index + 1}.
                  ${escapeHTML(
                    type.name ||
                    "Type"
                  )}
                </h4>


                ${
                  type.explanation
                    ? `
                      <p>
                        ${formatText(
                          type.explanation
                        )}
                      </p>
                    `
                    : ""
                }


                ${
                  type.example
                    ? `
                      <div class="study-example">

                        <strong>
                          Example:
                        </strong>

                        <span>
                          ${formatText(
                            type.example
                          )}
                        </span>

                      </div>
                    `
                    : ""
                }

              </article>

            `;

          }
        ).join("")}

      </div>

    </section>

  `;
}


/* =========================================================
   COMPONENTS SECTION
========================================================= */

function renderComponentsSection(
  components
) {

  if (
    !Array.isArray(components) ||
    components.length === 0
  ) {

    return "";
  }


  return `

    <section class="study-section">

      <div class="study-section-title">

        <span>
          🧱
        </span>

        <h3>
          Components / Elements
        </h3>

      </div>


      <div class="study-components">

        ${components.map(
          (component, index) => {

            if (
              typeof component === "string"
            ) {

              return `
                <div class="component-item">

                  <strong>
                    ${index + 1}.
                    ${escapeHTML(
                      component
                    )}
                  </strong>

                </div>
              `;
            }


            return `

              <div class="component-item">

                <strong>
                  ${index + 1}.
                  ${escapeHTML(
                    component.name ||
                    "Component"
                  )}
                </strong>

                ${
                  component.explanation
                    ? `
                      <p>
                        ${formatText(
                          component.explanation
                        )}
                      </p>
                    `
                    : ""
                }

              </div>

            `;

          }
        ).join("")}

      </div>

    </section>

  `;
}


/* =========================================================
   NUMBERED SECTION
========================================================= */

function renderNumberedSection(
  icon,
  title,
  items
) {

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {

    return "";
  }


  return `

    <section class="study-section">

      <div class="study-section-title">

        <span>
          ${icon}
        </span>

        <h3>
          ${escapeHTML(title)}
        </h3>

      </div>


      <div class="study-steps">

        ${items.map(
          (item, index) => {

            const text =
              typeof item === "string"
                ? item
                : (
                    item?.description ||
                    item?.explanation ||
                    item?.text ||
                    ""
                  );


            return `

              <div class="study-step">

                <div class="step-number">
                  ${index + 1}
                </div>

                <div class="step-content">
                  ${formatText(text)}
                </div>

              </div>

            `;

          }
        ).join("")}

      </div>

    </section>

  `;
}


/* =========================================================
   QUESTIONS SECTION
========================================================= */

function renderQuestionsSection(
  icon,
  title,
  questions
) {

  if (
    !Array.isArray(questions) ||
    questions.length === 0
  ) {

    return "";
  }


  return `

    <section class="study-section">

      <div class="study-section-title">

        <span>
          ${icon}
        </span>

        <h3>
          ${escapeHTML(title)}
        </h3>

      </div>


      <div class="study-questions">

        ${questions.map(
          (question, index) => {

            const text =
              typeof question === "string"
                ? question
                : (
                    question?.question ||
                    question?.text ||
                    ""
                  );


            return `

              <div class="study-question">

                <strong>
                  ${index + 1}.
                </strong>

                <span>
                  ${formatText(text)}
                </span>

              </div>

            `;

          }
        ).join("")}

      </div>

    </section>

  `;
}


/* =========================================================
   FLASHCARDS
========================================================= */

function renderFlashcard() {

  if (!flashcard) return;


  flashcard.classList.remove(
    "flipped"
  );


  if (
    !state.flashcards.length
  ) {

    if (cardQuestion) {
      cardQuestion.textContent =
        "No flashcards available.";
    }

    if (cardAnswer) {
      cardAnswer.textContent =
        "Generate a study pack first.";
    }

    if (cardProgress) {
      cardProgress.textContent =
        "0 / 0";
    }

    return;
  }


  const card =
    state.flashcards[
      state.cardIndex
    ];


  if (cardQuestion) {

    cardQuestion.textContent =
      card?.question ||
      "Question";
  }


  if (cardAnswer) {

    cardAnswer.textContent =
      card?.answer ||
      "Answer";
  }


  if (cardProgress) {

    cardProgress.textContent =
      `${state.cardIndex + 1} / ${state.flashcards.length}`;
  }
}


/* =========================================================
   FLASHCARD NAVIGATION
========================================================= */

prevCard?.addEventListener(
  "click",
  () => {

    if (
      !state.flashcards.length
    ) {
      return;
    }


    state.cardIndex =
      Math.max(
        0,
        state.cardIndex - 1
      );


    renderFlashcard();

  }
);


nextCard?.addEventListener(
  "click",
  () => {

    if (
      !state.flashcards.length
    ) {
      return;
    }


    state.cardIndex =
      Math.min(
        state.flashcards.length - 1,
        state.cardIndex + 1
      );


    renderFlashcard();

  }
);


flipCard?.addEventListener(
  "click",
  () => {

    if (
      !state.flashcards.length
    ) {
      return;
    }


    flashcard.classList.toggle(
      "flipped"
    );

  }
);


/* =========================================================
   FLASHCARD CONFIDENCE
========================================================= */

document
  .querySelectorAll(
    "[data-confidence]"
  )
  .forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            "[data-confidence]"
          )
          .forEach(
            item => {
              item.classList.remove(
                "selected"
              );
            }
          );


        button.classList.add(
          "selected"
        );

      }
    );

  });


/* =========================================================
   QUIZ
========================================================= */

function renderQuiz() {

  if (!quizContainer) return;


  if (
    !state.quiz.length
  ) {

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

      <span>
        ${capitalize(
          state.difficulty
        )} Quiz
      </span>

      <br>

      <strong>
        ${state.quiz.length}
        Questions
      </strong>

      <p>
        Select one answer for each question.
      </p>

    </div>


    ${state.quiz.map(
      (question, index) => {

        const options =
          Array.isArray(
            question.options
          )
            ? question.options
            : [];


        return `

          <article class="quiz-card">

            <div class="quiz-number">
              Question ${index + 1}
            </div>


            <div class="quiz-question">

              ${escapeHTML(
                question.question ||
                ""
              )}

            </div>


            <div class="quiz-options">

              ${options.map(
                (
                  option,
                  optionIndex
                ) => `

                  <label
                    class="quiz-option"
                    data-question="${index}"
                    data-option="${optionIndex}"
                  >

                    <input
                      type="radio"
                      name="quiz-${index}"
                      value="${optionIndex}"
                      data-question="${index}"
                      data-option="${optionIndex}"
                    >

                    <span>
                      ${escapeHTML(
                        option
                      )}
                    </span>

                  </label>

                `
              ).join("")}

            </div>


            <div
              class="quiz-explanation"
              id="explanation-${index}"
              hidden>
            </div>


          </article>

        `;

      }
    ).join("")}


    <button
      id="submitQuiz"
      class="quiz-submit"
      type="button"
    >
      Submit Quiz
    </button>

  `;


  /* -----------------------------------------
     OPTION EVENTS
  ----------------------------------------- */

  quizContainer
    .querySelectorAll(
      "input[type=radio]"
    )
    .forEach(
      (input) => {

        input.addEventListener(
          "change",
          () => {

            const questionIndex =
              Number(
                input.dataset.question
              );


            const optionIndex =
              Number(
                input.dataset.option
              );


            state.quizAnswers[
              questionIndex
            ] =
              optionIndex;


            quizContainer
              .querySelectorAll(
                `.quiz-option[data-question="${questionIndex}"]`
              )
              .forEach(
                (label) => {

                  label.classList.remove(
                    "selected"
                  );

                }
              );


            input
              .closest(
                ".quiz-option"
              )
              ?.classList.add(
                "selected"
              );

          }
        );

      }
    );


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

  state.lastMistake =
    null;


  state.quiz.forEach(
    (question, index) => {

      const selected =
        state.quizAnswers[index];


      const correctAnswer =
        Number(
          question.correctAnswer
        );


      const options =
        quizContainer.querySelectorAll(
          `.quiz-option[data-question="${index}"]`
        );


      options.forEach(
        (label) => {

          const option =
            Number(
              label.dataset.option
            );


          label.classList.remove(
            "correct",
            "wrong"
          );


          if (
            option ===
            correctAnswer
          ) {

            label.classList.add(
              "correct"
            );
          }


          if (
            selected !== null &&
            selected !== undefined &&
            selected !== correctAnswer &&
            option === selected
          ) {

            label.classList.add(
              "wrong"
            );
          }

        }
      );


      const explanation =
        $(
          `explanation-${index}`
        );


      if (explanation) {

        explanation.hidden =
          false;


        explanation.textContent =
          question.explanation ||
          `Correct answer: ${
            question.options?.[
              correctAnswer
            ] || ""
          }`;
      }


      if (
        selected ===
        correctAnswer
      ) {

        correct++;

      } else if (
        selected !== null &&
        selected !== undefined &&
        state.lastMistake === null
      ) {

        state.lastMistake = {

          question:
            question.question,

          studentAnswer:
            question.options?.[
              selected
            ] ||
            "No answer",

          correctAnswer:
            question.options?.[
              correctAnswer
            ] ||
            "",

          explanation:
            question.explanation ||
            "",

          topic:
            question.topic ||
            state.title
        };
      }

    }
  );


  const total =
    state.quiz.length;


  const percentage =
    total
      ? Math.round(
          (correct / total) * 100
        )
      : 0;


  showQuizScore(
    correct,
    total,
    percentage
  );


  updateInsights(
    correct,
    total
  );


  if (
    state.lastMistake
  ) {

    mistakeContent.innerHTML = `

      <p>
        You have an incorrect answer
        ready to analyze.
      </p>

      <p>
        Click
        <strong>
          Explain My Mistake
        </strong>
        to understand the mistake.
      </p>

    `;

  } else {

    mistakeContent.innerHTML = `

      <p>
        🎉 Excellent!
        No incorrect answer was found.
      </p>

    `;
  }


  $("insightsSection")
    ?.scrollIntoView({
      behavior: "smooth"
    });
}


/* =========================================================
   QUIZ SCORE
========================================================= */

function showQuizScore(
  correct,
  total,
  percentage
) {

  const existing =
    quizContainer.querySelector(
      ".quiz-result"
    );


  if (!existing) return;


  existing.innerHTML = `

    <span>
      Your Quiz Score
    </span>

    <br>

    <strong>
      ${correct} / ${total}
    </strong>

    <p>
      ${percentage}% correct
    </p>

  `;
}


/* =========================================================
   INSIGHTS
========================================================= */

function updateInsights(
  correct,
  total
) {

  const understanding =
    total
      ? Math.round(
          (correct / total) * 100
        )
      : 0;


  /*
     These are session indicators.
     Study DNA gives deeper analysis.
  */

  const recall =
    Math.min(
      100,
      understanding + 5
    );


  const application =
    Math.max(
      0,
      Math.round(
        understanding * 0.9
      )
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
   RESET INSIGHTS
========================================================= */

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


  if (studyDnaContent) {

    studyDnaContent.innerHTML = `

      <p class="empty-state">
        Complete the quiz to discover
        your Study DNA.
      </p>

    `;
  }


  if (weakTopicsContent) {

    weakTopicsContent.innerHTML = `

      <p class="empty-state">
        Complete the quiz to identify
        weak topics.
      </p>

    `;
  }


  if (mistakeContent) {

    mistakeContent.innerHTML = `

      <p class="empty-state">
        Answer a quiz question incorrectly
        to analyze your mistake.
      </p>

    `;
  }


  if (knowledgeMapContent) {

    knowledgeMapContent.innerHTML = `

      <p class="empty-state">
        Complete the quiz to build
        your knowledge map.
      </p>

    `;
  }

}


/* =========================================================
   PROGRESS BAR
========================================================= */

function setProgress(
  bar,
  text,
  value
) {

  const safe =
    Math.max(
      0,
      Math.min(
        100,
        Number(value) || 0
      )
    );


  if (bar) {

    bar.style.width =
      `${safe}%`;
  }


  if (text) {

    text.textContent =
      `${safe}%`;
  }
}


/* =========================================================
   STUDY DNA
========================================================= */

studyDnaBtn?.addEventListener(
  "click",
  analyzeStudyDNA
);


function analyzeStudyDNA() {

  if (
    !state.quiz ||
    state.quiz.length === 0
  ) {

    studyDnaContent.innerHTML = `

      <p class="empty-state">
        Generate and complete a quiz
        first. Your Study DNA is based
        on your current quiz performance.
      </p>

    `;

    return;
  }


  const total =
    state.quiz.length;


  let correct = 0;

  let attempted = 0;

  let skipped = 0;


  const topicStats = {};


  state.quiz.forEach(
    (question, index) => {

      const answer =
        state.quizAnswers[index];


      const topic =
        question.topic ||
        "General";


      if (
        !topicStats[topic]
      ) {

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


      topicStats[topic]
        .attempted++;


      if (
        Number(answer) ===
        Number(
          question.correctAnswer
        )
      ) {

        correct++;

        topicStats[topic]
          .correct++;
      }

    }
  );


  const accuracy =
    attempted > 0
      ? Math.round(
          (correct / attempted) * 100
        )
      : 0;


  const completion =
    total > 0
      ? Math.round(
          (attempted / total) * 100
        )
      : 0;


  let learningLevel;

  let learningStyle;

  let recommendation;


  if (accuracy >= 85) {

    learningLevel =
      "Strong understanding";


    recommendation =
      "Move towards advanced applications, challenging questions and exam-style problems.";

  } else if (accuracy >= 70) {

    learningLevel =
      "Good understanding";


    recommendation =
      "Revise the concepts you missed and practice more application-based questions.";

  } else if (accuracy >= 50) {

    learningLevel =
      "Developing understanding";


    recommendation =
      "Review the important concepts and weak areas before moving to harder questions.";

  } else {

    learningLevel =
      "Needs reinforcement";


    recommendation =
      "Start with fundamentals and key concepts, then retry the quiz.";
  }


  if (completion < 60) {

    learningStyle =
      "You left several questions unanswered. Attempting more questions will give Knowvia a clearer picture of your learning performance.";

  } else if (accuracy >= 80) {

    learningStyle =
      "You are performing well with active recall and question-based practice.";

  } else if (accuracy >= 60) {

    learningStyle =
      "You benefit from combining concept revision with active practice.";

  } else {

    learningStyle =
      "You would benefit from concept-first learning followed by repeated practice.";
  }


  const topicEntries =
    Object.entries(
      topicStats
    );


  topicEntries.sort(
    (a, b) => {

      const accuracyA =
        a[1].attempted > 0
          ? a[1].correct /
            a[1].attempted
          : 0;


      const accuracyB =
        b[1].attempted > 0
          ? b[1].correct /
            b[1].attempted
          : 0;


      return accuracyA -
        accuracyB;
    }
  );


  const weakTopics =
    topicEntries
      .filter(
        ([_, data]) => {

          if (
            data.attempted === 0
          ) {

            return true;
          }


          return (
            data.correct /
            data.attempted
          ) < 0.7;

        }
      )
      .slice(0, 3);


  const strongTopics =
    [...topicEntries]
      .sort(
        (a, b) => {

          const accuracyA =
            a[1].attempted > 0
              ? a[1].correct /
                a[1].attempted
              : 0;


          const accuracyB =
            b[1].attempted > 0
              ? b[1].correct /
                b[1].attempted
              : 0;


          return accuracyB -
            accuracyA;
        }
      )
      .filter(
        ([_, data]) =>
          data.attempted > 0
      )
      .slice(0, 3);


  const weakHTML =
    weakTopics.length
      ? weakTopics.map(
          ([topic, data]) => {

            const topicAccuracy =
              data.attempted > 0
                ? Math.round(
                    (
                      data.correct /
                      data.attempted
                    ) * 100
                  )
                : 0;


            return `

              <div class="dna-topic">

                <strong>
                  ${escapeHTML(
                    topic
                  )}
                </strong>

                <span>
                  ${topicAccuracy}%
                  accuracy
                </span>

              </div>

            `;

          }
        ).join("")
      : `

          <div class="dna-empty">
            No major weak topic was detected.
          </div>

        `;


  const strongHTML =
    strongTopics.length
      ? strongTopics.map(
          ([topic, data]) => {

            const topicAccuracy =
              data.attempted > 0
                ? Math.round(
                    (
                      data.correct /
                      data.attempted
                    ) * 100
                  )
                : 0;


            return `

              <div class="dna-topic">

                <strong>
                  ${escapeHTML(
                    topic
                  )}
                </strong>

                <span>
                  ${topicAccuracy}%
                  accuracy
                </span>

              </div>

            `;

          }
        ).join("")
      : `

          <div class="dna-empty">
            Complete more questions to
            identify your strongest areas.
          </div>

        `;


  studyDnaContent.innerHTML = `

    <div class="dna-header">

      <h3>
        Your Study DNA
      </h3>

      <p>
        Based on your actual performance
        in the current quiz.
      </p>

    </div>


    <div class="dna-stats">

      <div class="dna-stat">

        <strong>
          ${accuracy}%
        </strong>

        <span>
          Accuracy
        </span>

      </div>


      <div class="dna-stat">

        <strong>
          ${correct}/${attempted}
        </strong>

        <span>
          Correct
        </span>

      </div>


      <div class="dna-stat">

        <strong>
          ${completion}%
        </strong>

        <span>
          Completed
        </span>

      </div>


      <div class="dna-stat">

        <strong>
          ${skipped}
        </strong>

        <span>
          Skipped
        </span>

      </div>

    </div>


    <div class="dna-section">

      <h4>
        Learning Level
      </h4>

      <p>
        ${escapeHTML(
          learningLevel
        )}
      </p>

    </div>


    <div class="dna-section">

      <h4>
        Your Learning Pattern
      </h4>

      <p>
        ${escapeHTML(
          learningStyle
        )}
      </p>

    </div>


    <div class="dna-section">

      <h4>
        Strong Areas
      </h4>

      ${strongHTML}

    </div>


    <div class="dna-section">

      <h4>
        Areas That Need More Practice
      </h4>

      ${weakHTML}

    </div>


    <div class="dna-section">

      <h4>
        Recommended Next Step
      </h4>

      <p>
        ${escapeHTML(
          recommendation
        )}
      </p>

    </div>

  `;

}


/* =========================================================
   WEAK TOPIC DETECTOR
========================================================= */

weakTopicsBtn?.addEventListener(
  "click",
  findWeakTopics
);


async function findWeakTopics() {

  if (
    !state.quiz.length
  ) {

    weakTopicsContent.innerHTML = `

      <p class="empty-state">
        Generate a study pack and complete
        the quiz first.
      </p>

    `;

    return;
  }


  weakTopicsBtn.disabled =
    true;


  weakTopicsBtn.textContent =
    "Analyzing...";


  try {

    const data =
      await callKnowviaAI({

        task: "weak_topics",

        topic:
          state.title,

        quizResults:
          buildQuizResults()

      });


    const result =
      extractJSON(data);


    renderWeakTopics(
      result
    );

  } catch (error) {

    weakTopicsContent.innerHTML = `

      <p>
        ${escapeHTML(
          error.message
        )}
      </p>

    `;

  } finally {

    weakTopicsBtn.disabled =
      false;


    weakTopicsBtn.textContent =
      "Find Weak Topics";
  }
}


/* =========================================================
   RENDER WEAK TOPICS
========================================================= */

function renderWeakTopics(
  result
) {

  const weak =
    Array.isArray(
      result?.weakTopics
    )
      ? result.weakTopics
      : [];


  if (!weak.length) {

    weakTopicsContent.innerHTML = `

      <p>
        🎉 No major weak topics detected.
        Keep practicing!
      </p>

    `;

    return;
  }


  weakTopicsContent.innerHTML = `

    <h4>
      Topics to revisit
    </h4>


    <div class="weak-topic-list">

      ${weak.map(
        (item) => {

          if (
            typeof item === "string"
          ) {

            return `
              <div class="weak-topic-item">
                ${escapeHTML(item)}
              </div>
            `;
          }


          return `

            <div class="weak-topic-item">

              <strong>
                ${escapeHTML(
                  item.topic ||
                  "Topic"
                )}
              </strong>


              <p>
                ${escapeHTML(
                  item.reason ||
                  "Needs more practice."
                )}
              </p>

            </div>

          `;

        }
      ).join("")}

    </div>

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
        First answer at least one quiz
        question incorrectly.
      </p>

    `;

    return;
  }


  explainMistakeBtn.disabled =
    true;


  explainMistakeBtn.textContent =
    "Explaining...";


  try {

    const data =
      await callKnowviaAI({

        task:
          "explain_mistake",

        topic:
          state.lastMistake.topic ||
          state.title,

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
      extractJSON(data);


    renderMistake(
      result
    );

  } catch (error) {

    mistakeContent.innerHTML = `

      <p>
        ${escapeHTML(
          error.message
        )}
      </p>

    `;

  } finally {

    explainMistakeBtn.disabled =
      false;


    explainMistakeBtn.textContent =
      "Explain My Mistake";
  }
}


/* =========================================================
   RENDER MISTAKE
========================================================= */

function renderMistake(
  result
) {

  if (
    !result ||
    typeof result !== "object"
  ) {

    mistakeContent.innerHTML = `

      <p>
        Could not analyze the mistake.
      </p>

    `;

    return;
  }


  mistakeContent.innerHTML = `

    <div class="mistake-analysis">

      ${
        result.whatWentWrong
          ? `
            <div class="mistake-part">

              <h4>
                ❌ What Went Wrong
              </h4>

              <p>
                ${formatText(
                  result.whatWentWrong
                )}
              </p>

            </div>
          `
          : ""
      }


      ${
        result.correctReasoning
          ? `
            <div class="mistake-part">

              <h4>
                ✅ Correct Reasoning
              </h4>

              <p>
                ${formatText(
                  result.correctReasoning
                )}
              </p>

            </div>
          `
          : ""
      }


      ${
        result.memoryTip
          ? `
            <div class="mistake-part">

              <h4>
                🧠 Memory Tip
              </h4>

              <p>
                ${formatText(
                  result.memoryTip
                )}
              </p>

            </div>
          `
          : ""
      }


      ${
        result.similarQuestion
          ? `
            <div class="mistake-part">

              <h4>
                📝 Try This Similar Question
              </h4>

              <p>
                ${formatText(
                  result.similarQuestion
                )}
              </p>

            </div>
          `
          : ""
      }

    </div>

  `;
}


/* =========================================================
   KNOWLEDGE MAP
========================================================= */

knowledgeMapBtn?.addEventListener(
  "click",
  generateKnowledgeMap
);


async function generateKnowledgeMap() {

  if (
    !state.quiz.length
  ) {

    knowledgeMapContent.innerHTML = `

      <p class="empty-state">
        Generate a study pack and complete
        the quiz first.
      </p>

    `;

    return;
  }


  knowledgeMapBtn.disabled =
    true;


  knowledgeMapBtn.textContent =
    "Building...";


  try {

    const data =
      await callKnowviaAI({

        task:
          "knowledge_map",

        topic:
          state.title,

        quizResults:
          buildQuizResults()

      });


    const map =
      extractJSON(data);


    renderKnowledgeMap(
      map
    );

  } catch (error) {

    knowledgeMapContent.innerHTML = `

      <p>
        ${escapeHTML(
          error.message
        )}
      </p>

    `;

  } finally {

    knowledgeMapBtn.disabled =
      false;


    knowledgeMapBtn.textContent =
      "Build Knowledge Map";
  }
}


/* =========================================================
   RENDER KNOWLEDGE MAP
========================================================= */

function renderKnowledgeMap(
  map
) {

  const nodes =
    Array.isArray(
      map?.nodes
    )
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

    <div class="knowledge-map-header">

      <h4>
        ${escapeHTML(
          map.title ||
          state.title
        )}
      </h4>

      <p>
        Concept understanding based
        on your quiz performance.
      </p>

    </div>


    <div class="knowledge-map-nodes">

      ${nodes.map(
        (node) => {

          if (
            typeof node === "string"
          ) {

            return `

              <div class="knowledge-node">

                <strong>
                  ${escapeHTML(node)}
                </strong>

              </div>

            `;
          }


          const status =
            node.status ||
            "developing";


          return `

            <div
              class="knowledge-node knowledge-${escapeHTML(status)}"
            >

              <div class="knowledge-node-title">

                <strong>
                  ${escapeHTML(
                    node.name ||
                    "Concept"
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    capitalize(status)
                  )}
                </span>

              </div>


              ${
                node.description
                  ? `
                    <p>
                      ${formatText(
                        node.description
                      )}
                    </p>
                  `
                  : ""
              }


              ${
                Array.isArray(
                  node.connections
                ) &&
                node.connections.length
                  ? `
                    <small>

                      Connected to:
                      ${escapeHTML(
                        node.connections.join(
                          ", "
                        )
                      )}

                    </small>
                  `
                  : ""
              }

            </div>

          `;

        }
      ).join("")}

    </div>


    ${
      Array.isArray(
        map.connections
      ) &&
      map.connections.length
        ? `

          <div class="knowledge-connections">

            <h4>
              Concept Connections
            </h4>

            ${map.connections.map(
              connection => `

                <div class="knowledge-connection">

                  <strong>
                    ${escapeHTML(
                      connection.from ||
                      ""
                    )}
                  </strong>

                  <span>
                    →
                  </span>

                  <strong>
                    ${escapeHTML(
                      connection.to ||
                      ""
                    )}
                  </strong>

                  ${
                    connection.relationship
                      ? `
                        <small>
                          ${escapeHTML(
                            connection.relationship
                          )}
                        </small>
                      `
                      : ""
                  }

                </div>

              `
            ).join("")}

          </div>

        `
        : ""
    }

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
        Number(
          question.correctAnswer
        );


      return {

        question:
          question.question ||
          "",

        topic:
          question.topic ||
          state.title,

        selectedAnswer:
          selected !== null &&
          selected !== undefined &&
          question.options
            ? question.options[
                selected
              ]
            : "No answer",

        correctAnswer:
          question.options
            ? question.options[
                correct
              ]
            : "",

        isCorrect:
          selected !== null &&
          selected !== undefined &&
          Number(selected) ===
          correct

      };

    }
  );
}


/* =========================================================
   UTILITY:
   CAPITALIZE
========================================================= */

function capitalize(
  value
) {

  if (!value) {
    return "";
  }


  return String(value)
    .charAt(0)
    .toUpperCase() +
    String(value)
      .slice(1);
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )
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


/* =========================================================
   FORMAT TEXT
========================================================= */

function formatText(
  text
) {

  if (
    text === null ||
    text === undefined
  ) {

    return "";
  }


  return escapeHTML(
    String(text)
  )
    .replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    )
    .replace(
      /\n\n+/g,
      "</p><p>"
    )
    .replace(
      /\n/g,
      "<br>"
    );
}


/* =========================================================
   INITIAL STATE
========================================================= */

resetInsights();

renderFlashcard();
