/* =========================================================
   KNOWVIA - AI STUDY COMPANION
   Frontend Demo Version
   No database
   No localStorage
========================================================= */

const $ = (id) => document.getElementById(id);

const state = {
  source: "topic",
  material: "",
  title: "",
  difficulty: "beginner",

  flashcards: [],
  cardIndex: 0,

  quiz: [],
  quizIndex: 0,
  score: 0,
  answered: false,

  confidenceData: [],
  wrongAnswers: [],
  weakConcepts: [],

  extracted: false
};

/* =========================================================
   TOPIC DATA
========================================================= */

const topicPacks = {

  "machine learning": {

    beginner: {
      title: "Machine Learning",
      summary:
        "Machine Learning is a branch of Artificial Intelligence that allows computers to learn patterns from data and make predictions or decisions without being explicitly programmed for every task.",
      concepts: [
        "Artificial Intelligence",
        "Machine Learning",
        "Data",
        "Features",
        "Labels",
        "Training",
        "Testing"
      ],
      stages: [
        "Collect data",
        "Prepare the data",
        "Choose a model",
        "Train the model",
        "Test the model",
        "Evaluate the results"
      ],
      flashcards: [
        {
          q: "What is Machine Learning?",
          a: "Machine Learning is a method where computers learn patterns from data and use them to make predictions or decisions."
        },
        {
          q: "What is training data?",
          a: "Training data is the data used to teach a machine learning model."
        },
        {
          q: "What is a feature?",
          a: "A feature is an input property or characteristic used by a machine learning model."
        },
        {
          q: "What is a label?",
          a: "A label is the expected output or answer associated with training data."
        },
        {
          q: "What is testing?",
          a: "Testing checks how well a trained model performs on data it has not seen during training."
        }
      ]
    },

    intermediate: {
      title: "Machine Learning",
      summary:
        "Machine Learning uses algorithms to learn relationships within datasets. A typical workflow includes preprocessing, feature selection, model training, validation and evaluation. Common learning types include supervised, unsupervised and reinforcement learning.",
      concepts: [
        "Supervised Learning",
        "Unsupervised Learning",
        "Reinforcement Learning",
        "Feature Engineering",
        "Model Training",
        "Validation",
        "Overfitting",
        "Evaluation"
      ],
      stages: [
        "Problem definition",
        "Data collection",
        "Data preprocessing",
        "Feature engineering",
        "Model selection",
        "Training",
        "Validation",
        "Testing",
        "Evaluation"
      ],
      flashcards: [
        {
          q: "What is supervised learning?",
          a: "Supervised learning learns from labelled examples where both input data and expected outputs are available."
        },
        {
          q: "What is unsupervised learning?",
          a: "Unsupervised learning discovers patterns or structures in data without labelled outputs."
        },
        {
          q: "What is overfitting?",
          a: "Overfitting occurs when a model learns the training data too closely and performs poorly on unseen data."
        },
        {
          q: "What is feature engineering?",
          a: "Feature engineering is the process of creating, selecting or transforming input features to improve model performance."
        },
        {
          q: "Why is validation important?",
          a: "Validation helps select and tune a model while reducing the risk of overfitting to the training dataset."
        }
      ]
    },

    advanced: {
      title: "Machine Learning",
      summary:
        "Advanced Machine Learning involves designing models that generalize effectively from finite datasets. Important concerns include bias-variance trade-off, regularization, cross-validation, feature representation, optimization and reliable evaluation.",
      concepts: [
        "Bias-Variance Trade-off",
        "Regularization",
        "Cross Validation",
        "Hyperparameters",
        "Gradient Descent",
        "Generalization",
        "Model Selection",
        "Evaluation Metrics"
      ],
      stages: [
        "Problem formulation",
        "Dataset construction",
        "Data preprocessing",
        "Representation learning",
        "Model selection",
        "Hyperparameter tuning",
        "Cross-validation",
        "Final training",
        "Generalization evaluation"
      ],
      flashcards: [
        {
          q: "What is the bias-variance trade-off?",
          a: "It describes the balance between errors caused by overly simple assumptions and errors caused by excessive sensitivity to training data."
        },
        {
          q: "What is regularization?",
          a: "Regularization adds constraints or penalties to a model to reduce overfitting and improve generalization."
        },
        {
          q: "What is cross-validation?",
          a: "Cross-validation repeatedly divides data into training and validation portions to estimate how well a model generalizes."
        },
        {
          q: "What are hyperparameters?",
          a: "Hyperparameters are settings chosen before or during training, such as learning rate, tree depth or regularization strength."
        },
        {
          q: "What is generalization?",
          a: "Generalization is the ability of a trained model to perform well on previously unseen data."
        }
      ]
    }

  },

  "computer vision": {

    beginner: {
      title: "Computer Vision",
      summary:
        "Computer Vision is a field of Artificial Intelligence that enables computers to understand and process images and videos.",
      concepts: [
        "Image",
        "Pixel",
        "Image Processing",
        "Object",
        "Edge",
        "Feature",
        "Classification"
      ],
      stages: [
        "Capture image",
        "Preprocess image",
        "Extract useful information",
        "Analyze the image",
        "Produce the result"
      ],
      flashcards: [
        {
          q: "What is Computer Vision?",
          a: "Computer Vision enables computers to analyze and understand images and videos."
        },
        {
          q: "What is a pixel?",
          a: "A pixel is the smallest addressable element of a digital image."
        },
        {
          q: "What is image processing?",
          a: "Image processing involves applying operations to images to improve or analyze them."
        },
        {
          q: "What is edge detection?",
          a: "Edge detection identifies strong changes in image intensity that often correspond to object boundaries."
        },
        {
          q: "What is image classification?",
          a: "Image classification assigns an image to one or more predefined categories."
        }
      ]
    },

    intermediate: {
      title: "Computer Vision",
      summary:
        "Computer Vision combines image processing and machine learning techniques to extract meaningful information from visual data. Common operations include filtering, segmentation, feature extraction, object detection and classification.",
      concepts: [
        "Filtering",
        "Convolution",
        "Edge Detection",
        "Segmentation",
        "Feature Extraction",
        "Object Detection",
        "Classification"
      ],
      stages: [
        "Image acquisition",
        "Preprocessing",
        "Filtering",
        "Feature extraction",
        "Segmentation",
        "Object detection",
        "Classification"
      ],
      flashcards: [
        {
          q: "What is convolution in image processing?",
          a: "Convolution applies a kernel or filter over image pixels to produce a transformed image."
        },
        {
          q: "What is image segmentation?",
          a: "Image segmentation divides an image into meaningful regions or objects."
        },
        {
          q: "What is feature extraction?",
          a: "Feature extraction identifies useful visual characteristics that can help a system recognize or classify objects."
        },
        {
          q: "What is object detection?",
          a: "Object detection identifies objects and usually determines their locations using bounding boxes or similar representations."
        },
        {
          q: "Why is preprocessing used?",
          a: "Preprocessing reduces noise or improves image quality before further analysis."
        }
      ]
    },

    advanced: {
      title: "Computer Vision",
      summary:
        "Advanced Computer Vision deals with extracting robust representations from visual data and solving tasks such as detection, segmentation, recognition and scene understanding using classical and deep learning methods.",
      concepts: [
        "Feature Representation",
        "Convolutional Neural Networks",
        "Object Detection",
        "Semantic Segmentation",
        "Instance Segmentation",
        "Image Embeddings",
        "Transfer Learning",
        "Vision Transformers"
      ],
      stages: [
        "Image acquisition",
        "Normalization",
        "Representation learning",
        "Feature extraction",
        "Model inference",
        "Post-processing",
        "Evaluation"
      ],
      flashcards: [
        {
          q: "What is a CNN?",
          a: "A Convolutional Neural Network is a neural network architecture designed to learn spatial patterns from data such as images."
        },
        {
          q: "What is transfer learning?",
          a: "Transfer learning reuses knowledge learned by a model on one task or dataset to help solve another related task."
        },
        {
          q: "What is semantic segmentation?",
          a: "Semantic segmentation assigns a class label to each pixel in an image."
        },
        {
          q: "What is instance segmentation?",
          a: "Instance segmentation identifies individual object instances and assigns pixel-level regions to each instance."
        },
        {
          q: "What are image embeddings?",
          a: "Image embeddings are numerical representations that capture useful visual information in a lower-dimensional feature space."
        }
      ]
    }

  },

  "python": {

    beginner: {
      title: "Python",
      summary:
        "Python is a high-level, interpreted programming language known for its simple syntax and wide range of applications.",
      concepts: [
        "Variables",
        "Data Types",
        "Operators",
        "Conditions",
        "Loops",
        "Functions",
        "Lists"
      ],
      stages: [
        "Write code",
        "Run the program",
        "Check the output",
        "Find errors",
        "Improve the program"
      ],
      flashcards: [
        {
          q: "What is Python?",
          a: "Python is a high-level, interpreted programming language known for readable syntax."
        },
        {
          q: "What is a variable?",
          a: "A variable is a name used to store or refer to a value."
        },
        {
          q: "What is a list?",
          a: "A list is an ordered, mutable collection of values in Python."
        },
        {
          q: "What is a function?",
          a: "A function is a reusable block of code designed to perform a specific task."
        },
        {
          q: "What is a loop?",
          a: "A loop repeatedly executes a block of code while a condition or sequence requires it."
        }
      ]
    },

    intermediate: {
      title: "Python",
      summary:
        "Intermediate Python programming involves functions, modules, data structures, exception handling, file handling and object-oriented programming.",
      concepts: [
        "Functions",
        "Modules",
        "Dictionaries",
        "Exception Handling",
        "File Handling",
        "Classes",
        "Objects",
        "List Comprehension"
      ],
      stages: [
        "Design the logic",
        "Create functions",
        "Organize modules",
        "Handle errors",
        "Process data",
        "Test the program"
      ],
      flashcards: [
        {
          q: "What is exception handling?",
          a: "Exception handling allows a program to respond to runtime errors using mechanisms such as try and except."
        },
        {
          q: "What is a dictionary?",
          a: "A dictionary stores data as key-value pairs."
        },
        {
          q: "What is a class?",
          a: "A class is a blueprint used to create objects with attributes and methods."
        },
        {
          q: "What is a module?",
          a: "A module is a Python file containing reusable code such as functions, classes or variables."
        },
        {
          q: "What is list comprehension?",
          a: "List comprehension provides a concise way to create lists using an expression and iteration."
        }
      ]
    },

    advanced: {
      title: "Python",
      summary:
        "Advanced Python includes object-oriented design, decorators, generators, iterators, context managers, concurrency and efficient data processing.",
      concepts: [
        "Decorators",
        "Generators",
        "Iterators",
        "Context Managers",
        "Inheritance",
        "Polymorphism",
        "Concurrency",
        "Memory Management"
      ],
      stages: [
        "Design architecture",
        "Build reusable components",
        "Optimize execution",
        "Handle resources",
        "Test and profile",
        "Deploy"
      ],
      flashcards: [
        {
          q: "What is a decorator?",
          a: "A decorator is a callable that modifies or extends the behavior of another function or class."
        },
        {
          q: "What is a generator?",
          a: "A generator produces values lazily, typically using yield, instead of creating the entire sequence at once."
        },
        {
          q: "What is polymorphism?",
          a: "Polymorphism allows different object types to provide a common interface or behavior."
        },
        {
          q: "What is a context manager?",
          a: "A context manager controls setup and cleanup around a block of code, commonly used with the with statement."
        },
        {
          q: "Why are generators useful?",
          a: "Generators can reduce memory usage by producing values one at a time instead of storing a complete sequence."
        }
      ]
    }

  }

};


/* =========================================================
   GENERIC TOPIC GENERATOR
========================================================= */

function makeGenericPack(topic, level) {

  const title = topic.trim() || "Your Topic";

  const concepts = [
    `${title} — basic idea`,
    `${title} — important terms`,
    `${title} — main components`,
    `${title} — applications`,
    `${title} — advantages`,
    `${title} — limitations`
  ];

  const summary =
    `${title} is an important topic that can be understood by identifying its basic definition, major concepts, components, applications, advantages and limitations. ` +
    `At the ${level} level, focus on understanding the relationships between the important ideas and how they are applied.`;

  const stages = [
    `Understand the definition of ${title}`,
    `Identify the important concepts`,
    `Study the main components`,
    `Understand practical applications`,
    `Review advantages and limitations`,
    `Test your understanding`
  ];

  const flashcards = [
    {
      q: `What is ${title}?`,
      a: `${title} can be studied by understanding its definition, important concepts, components and practical applications.`
    },
    {
      q: `What are the important concepts in ${title}?`,
      a: `The important concepts include its basic idea, terminology, components, applications, advantages and limitations.`
    },
    {
      q: `What are the applications of ${title}?`,
      a: `${title} can be applied in different real-world or academic situations depending on its specific domain.`
    },
    {
      q: `What are the advantages of ${title}?`,
      a: `The advantages depend on the specific application, but generally include improved understanding, efficiency or problem solving.`
    },
    {
      q: `What are the limitations of ${title}?`,
      a: `The limitations depend on the context and may include complexity, resources, assumptions or practical constraints.`
    }
  ];

  return {
    title,
    summary,
    concepts,
    stages,
    flashcards
  };
}


/* =========================================================
   SOURCE TABS
========================================================= */

document.querySelectorAll(".source-tab").forEach(tab => {

  tab.addEventListener("click", () => {

    document.querySelectorAll(".source-tab")
      .forEach(t => t.classList.remove("active"));

    tab.classList.add("active");

    state.source = tab.dataset.source;

    document.querySelectorAll(".source-panel")
      .forEach(panel => panel.classList.remove("active"));

    const panel = $(`${state.source}Panel`);

    if (panel) {
      panel.classList.add("active");
    }

  });

});


/* =========================================================
   THEME TOGGLE
========================================================= */

if ($("themeBtn")) {

  $("themeBtn").addEventListener("click", () => {

    document.body.classList.toggle("dark");

    $("themeBtn").textContent =
      document.body.classList.contains("dark")
        ? "☀"
        : "☾";

  });

}


/* =========================================================
   PDF UPLOAD
========================================================= */

if ($("pdfInput")) {

  $("pdfInput").addEventListener("change", async (event) => {

    const file = event.target.files[0];

    if (!file) return;

    $("pdfInfo").textContent =
      `Reading ${file.name}...`;

    try {

      const arrayBuffer = await file.arrayBuffer();

      const pdf = await pdfjsLib
        .getDocument({ data: arrayBuffer })
        .promise;

      let text = "";

      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {

        const page = await pdf.getPage(pageNo);

        const content = await page.getTextContent();

        const pageText = content.items
          .map(item => item.str)
          .join(" ");

        text += pageText + "\n";

      }

      state.material = text.trim();

      state.title =
        file.name.replace(/\.[^/.]+$/, "");

      state.extracted = true;

      $("pdfInfo").textContent =
        `✓ ${pdf.numPages} page(s) extracted successfully`;

    } catch (error) {

      console.error(error);

      $("pdfInfo").textContent =
        "Unable to read this PDF.";

    }

  });

}


/* =========================================================
   HANDWRITTEN IMAGE OCR
========================================================= */

if ($("imageInput")) {

  $("imageInput").addEventListener("change", async (event) => {

    const file = event.target.files[0];

    if (!file) return;

    if ($("imagePreview")) {

      $("imagePreview").src =
        URL.createObjectURL(file);

      $("imagePreview").style.display =
        "block";

    }

    $("statusMessage").textContent =
      "Reading handwritten notes...";

    try {

      const result = await Tesseract.recognize(
        file,
        "eng",
        {
          logger: info => {

            if (info.status === "recognizing text") {

              const progress =
                Math.round(info.progress * 100);

              $("statusMessage").textContent =
                `Reading handwriting... ${progress}%`;

            }

          }
        }
      );

      state.material =
        result.data.text.trim();

      state.title =
        file.name.replace(/\.[^/.]+$/, "");

      state.extracted = true;

      $("statusMessage").textContent =
        "✓ Handwritten notes extracted successfully.";

    } catch (error) {

      console.error(error);

      $("statusMessage").textContent =
        "Unable to read the handwritten image.";

    }

  });

}


/* =========================================================
   MATERIAL EXTRACTION
========================================================= */

function extractConcepts(text) {

  if (!text) return [];

  const stopWords = new Set([

    "the",
    "and",
    "for",
    "that",
    "this",
    "with",
    "from",
    "are",
    "was",
    "were",
    "have",
    "has",
    "into",
    "about",
    "which",
    "their",
    "there",
    "these",
    "those",
    "using",
    "used",
    "also",
    "can",
    "will",
    "such",
    "than",
    "then",
    "they",
    "them",
    "its",
    "our",
    "your",
    "you",
    "not",
    "but",
    "between",
    "each",
    "more",
    "other",
    "some",
    "very",
    "when",
    "where",
    "how",
    "what",
    "why",
    "who"
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(word =>
      word.length > 3 &&
      !stopWords.has(word)
    );

  const frequency = {};

  words.forEach(word => {

    frequency[word] =
      (frequency[word] || 0) + 1;

  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(item => item[0]);
}


/* =========================================================
   BUILD STUDY PACK FROM MATERIAL
========================================================= */

function buildFromMaterial(text) {

  const cleanText =
    text
      .replace(/\s+/g, " ")
      .trim();

  if (!cleanText) {

    return makeGenericPack(
      "Your Notes",
      state.difficulty
    );

  }

  const sentences =
    cleanText
      .split(/(?<=[.!?])\s+/)
      .filter(sentence =>
        sentence.trim().length > 30
      );

  const concepts =
    extractConcepts(cleanText);

  const selectedSentences =
    sentences.slice(0, 6);

  const title =
    state.title ||
    concepts
      .slice(0, 3)
      .join(" ") ||
    "Uploaded Material";

  const flashcards = [];

  concepts.slice(0, 5).forEach(concept => {

    const related =
      sentences.find(sentence =>
        sentence.toLowerCase()
          .includes(concept.toLowerCase())
      );

    flashcards.push({

      q: `What is ${concept}?`,

      a:
        related ||
        `${concept} is one of the important concepts identified in the uploaded material.`

    });

  });

  while (flashcards.length < 5) {

    const sentence =
      selectedSentences[flashcards.length];

    if (!sentence) break;

    flashcards.push({

      q: "What is an important point from the material?",

      a: sentence

    });

  }

  return {

    title,

    summary:
      selectedSentences.length
        ? selectedSentences.slice(0, 4).join(" ")
        : cleanText.slice(0, 900),

    concepts:
      concepts.length
        ? concepts
        : ["Main idea", "Important point", "Application"],

    stages: [
      "Read the material",
      "Identify the important concepts",
      "Understand the main points",
      "Review the examples",
      "Test your understanding"
    ],

    flashcards

  };

}


/* =========================================================
   GET CURRENT STUDY PACK
========================================================= */

function getStudyPack() {

  state.difficulty =
    $("difficulty")
      ? $("difficulty").value
      : "beginner";

  if (state.source === "notes") {

    const notes =
      $("notesInput")
        ? $("notesInput").value.trim()
        : "";

    if (!notes) {

      throw new Error(
        "Please enter some notes first."
      );

    }

    state.material = notes;

    state.title = "My Notes";

    return buildFromMaterial(notes);

  }


  if (
    state.source === "image" ||
    state.source === "pdf"
  ) {

    if (!state.material) {

      throw new Error(
        "Please upload and extract your material first."
      );

    }

    return buildFromMaterial(
      state.material
    );

  }


  const topic =
    $("topic")
      ? $("topic").value.trim()
      : "";

  if (!topic) {

    throw new Error(
      "Please enter a topic first."
    );

  }

  const key =
    topic.toLowerCase();

  if (
    topicPacks[key] &&
    topicPacks[key][state.difficulty]
  ) {

    return topicPacks[key][state.difficulty];

  }

  return makeGenericPack(
    topic,
    state.difficulty
  );

}


/* =========================================================
   GENERATE BUTTON
========================================================= */

if ($("generateBtn")) {

  $("generateBtn").addEventListener(
    "click",
    () => {

      try {

        $("statusMessage").textContent =
          "Generating your study material...";

        const pack =
          getStudyPack();

        state.title =
          pack.title;

        state.flashcards =
          pack.flashcards || [];

        state.cardIndex = 0;

        state.quiz = [];

        state.quizIndex = 0;

        state.score = 0;

        state.answered = false;

        state.wrongAnswers = [];

        state.weakConcepts = [];

        renderSummary(pack);

        renderFlashcard();

        buildQuiz(pack);

        updateKnowledgeMap(pack);

        updateStudyDNA();

        $("statusMessage").textContent =
          "✓ Study material generated successfully.";

        document
          .getElementById("summary")
          ?.scrollIntoView({
            behavior: "smooth"
          });

      } catch (error) {

        $("statusMessage").textContent =
          error.message;

      }

    }
  );

}


/* =========================================================
   SUMMARY
========================================================= */

function renderSummary(pack) {

  if ($("summaryTitle")) {

    $("summaryTitle").textContent =
      pack.title;

  }

  if ($("summaryContent")) {

    $("summaryContent").innerHTML = `

      <p>${escapeHTML(pack.summary)}</p>

      <h4>Important Concepts</h4>

      <ul>

        ${pack.concepts
          .map(concept =>
            `<li>${escapeHTML(concept)}</li>`
          )
          .join("")}

      </ul>

      <h4>Learning Stages</h4>

      <ol>

        ${pack.stages
          .map(stage =>
            `<li>${escapeHTML(stage)}</li>`
          )
          .join("")}

      </ol>

    `;

  }

  if ($("sourcePill")) {

    $("sourcePill").textContent =
      state.source === "topic"
        ? "Topic"
        : state.source === "notes"
          ? "Typed Notes"
          : state.source === "image"
            ? "Handwritten Notes"
            : "PDF";

  }

}


/* =========================================================
   FLASHCARDS
========================================================= */

function renderFlashcard() {

  if (!state.flashcards.length) return;

  const card =
    state.flashcards[state.cardIndex];

  $("cardQuestion").textContent =
    card.q;

  $("cardAnswer").textContent =
    card.a;

  $("cardProgress").textContent =
    `${state.cardIndex + 1} / ${state.flashcards.length}`;

  const flashcard =
    $("flashcard");

  if (flashcard) {

    flashcard.classList.remove("flipped");

  }

}


if ($("nextCard")) {

  $("nextCard").addEventListener(
    "click",
    () => {

      if (!state.flashcards.length)
        return;

      state.cardIndex =
        (state.cardIndex + 1) %
        state.flashcards.length;

      renderFlashcard();

    }
  );

}


if ($("prevCard")) {

  $("prevCard").addEventListener(
    "click",
    () => {

      if (!state.flashcards.length)
        return;

      state.cardIndex =
        (state.cardIndex - 1 +
          state.flashcards.length) %
        state.flashcards.length;

      renderFlashcard();

    }
  );

}


if ($("flipCard")) {

  $("flipCard").addEventListener(
    "click",
    () => {

      $("flashcard")
        ?.classList.toggle("flipped");

    }
  );

}


/* =========================================================
   CONFIDENCE TRACKING
========================================================= */

document
  .querySelectorAll("[data-confidence]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const value =
          Number(button.dataset.confidence);

        state.confidenceData.push(value);

        updateStudyDNA();

      }
    );

  });


/* =========================================================
   QUIZ CREATION
========================================================= */

function buildQuiz(pack) {

  const style =
    $("quizStyle")
      ? $("quizStyle").value
      : "mixed";

  state.quiz =
    state.flashcards
      .slice(0, 5)
      .map((card, index) => {

        let type = "mcq";

        if (style === "short")
          type = "short";

        if (style === "exam")
          type = "mcq";

        if (style === "mixed") {

          type =
            index % 2 === 0
              ? "mcq"
              : "short";

        }

        return {
          question: card.q,
          answer: card.a,
          concept:
            pack.concepts[index] ||
            `Concept ${index + 1}`,
          type
        };

      });

  state.quizIndex = 0;
  state.score = 0;
  state.answered = false;

  renderQuiz();

}


/* =========================================================
   QUIZ RENDER
========================================================= */

function renderQuiz() {

  const container =
    $("quizContainer");

  if (!container) return;

  if (!state.quiz.length) {

    container.innerHTML =
      "<p>Generate study material to start the quiz.</p>";

    return;

  }

  if (state.quizIndex >= state.quiz.length) {

    finishQuiz();

    return;

  }

  const item =
    state.quiz[state.quizIndex];

  state.answered = false;

  if (item.type === "short") {

    container.innerHTML = `

      <div class="quiz-question">

        <span class="quiz-number">
          Question ${state.quizIndex + 1}
          of ${state.quiz.length}
        </span>

        <h3>
          ${escapeHTML(item.question)}
        </h3>

        <textarea
          id="shortAnswer"
          placeholder="Type your answer..."
        ></textarea>

        <button
          class="primary-btn"
          id="submitShort"
        >
          Submit Answer
        </button>

      </div>

    `;

    $("submitShort")
      .addEventListener(
        "click",
        () => {

          const answer =
            $("shortAnswer")
              .value
              .trim();

          if (!answer) return;

          checkShortAnswer(
            answer,
            item.answer,
            item.concept
          );

        }
      );

    return;

  }


  const choices =
    createChoices(
      item.answer,
      state.flashcards
    );

  container.innerHTML = `

    <div class="quiz-question">

      <span class="quiz-number">
        Question ${state.quizIndex + 1}
        of ${state.quiz.length}
      </span>

      <h3>
        ${escapeHTML(item.question)}
      </h3>

      <div class="quiz-options">

        ${choices.map((choice, index) => `

          <button
            class="quiz-option"
            data-index="${index}"
          >
            ${escapeHTML(choice)}
          </button>

        `).join("")}

      </div>

    </div>

  `;

  container
    .querySelectorAll(".quiz-option")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          if (state.answered)
            return;

          state.answered = true;

          const selected =
            choices[
              Number(button.dataset.index)
            ];

          checkAnswer(
            selected,
            item.answer,
            item.concept
          );

        }
      );

    });

}


/* =========================================================
   CREATE MCQ OPTIONS
========================================================= */

function createChoices(correct, cards) {

  const choices = [correct];

  cards.forEach(card => {

    if (
      card.a !== correct &&
      choices.length < 4
    ) {

      choices.push(card.a);

    }

  });

  while (choices.length < 4) {

    choices.push(
      "This option is not supported by the material."
    );

  }

  return shuffle(choices);

}


/* =========================================================
   CHECK MCQ
========================================================= */

function checkAnswer(
  selected,
  correct,
  concept
) {

  const container =
    $("quizContainer");

  const isCorrect =
    selected === correct;

  if (isCorrect) {

    state.score++;

  } else {

    state.wrongAnswers.push({
      concept,
      selected,
      correct
    });

  }

  container
    .querySelectorAll(".quiz-option")
    .forEach(button => {

      const value =
        button.textContent.trim();

      if (value === correct) {

        button.classList.add("correct");

      }

      if (
        value === selected &&
        !isCorrect
      ) {

        button.classList.add("wrong");

      }

    });

  setTimeout(
    () => {

      state.quizIndex++;

      renderQuiz();

    },
    900
  );

}


/* =========================================================
   SHORT ANSWER CHECK
========================================================= */

function checkShortAnswer(
  userAnswer,
  correctAnswer,
  concept
) {

  const similarity =
    wordSimilarity(
      userAnswer,
      correctAnswer
    );

  const isCorrect =
    similarity >= 0.35;

  if (isCorrect) {

    state.score++;

  } else {

    state.wrongAnswers.push({
      concept,
      selected: userAnswer,
      correct: correctAnswer
    });

  }

  const container =
    $("quizContainer");

  container.innerHTML += `

    <div class="answer-feedback">

      ${
        isCorrect
          ? "✓ Good answer!"
          : "✗ Review this concept."
      }

      <p>
        Correct idea:
        ${escapeHTML(correctAnswer)}
      </p>

    </div>

  `;

  setTimeout(
    () => {

      state.quizIndex++;

      renderQuiz();

    },
    1200
  );

}


/* =========================================================
   WORD SIMILARITY
========================================================= */

function wordSimilarity(a, b) {

  const clean = text =>
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(word =>
          word.length > 2
        )
    );

  const A = clean(a);
  const B = clean(b);

  if (!A.size || !B.size)
    return 0;

  let common = 0;

  A.forEach(word => {

    if (B.has(word))
      common++;

  });

  return common /
    Math.max(A.size, B.size);

}


/* =========================================================
   FINISH QUIZ
========================================================= */

function finishQuiz() {

  const total =
    state.quiz.length;

  const percentage =
    total
      ? Math.round(
          (state.score / total) * 100
        )
      : 0;

  state.weakConcepts =
    state.wrongAnswers
      .map(item => item.concept);

  const uniqueWeak =
    [...new Set(
      state.weakConcepts
    )];

  const container =
    $("quizContainer");

  container.innerHTML = `

    <div class="quiz-result">

      <div class="score-circle">
        ${percentage}%
      </div>

      <h3>
        Quiz Complete
      </h3>

      <p>
        You scored
        <strong>
          ${state.score}
        </strong>
        out of
        <strong>
          ${total}
        </strong>.
      </p>

      ${
        uniqueWeak.length
          ? `
            <div class="weak-result">

              <strong>
                Topics to review:
              </strong>

              <p>
                ${uniqueWeak
                  .map(escapeHTML)
                  .join(", ")}
              </p>

            </div>
          `
          : `
            <p>
              Excellent! No major weak topics detected.
            </p>
          `
      }

      <button
        class="primary-btn"
        onclick="resetQuiz()"
      >
        Try Again
      </button>

    </div>

  `;

  updateWeakTopic();

  updateStudyDNA();

}


/* =========================================================
   RESET QUIZ
========================================================= */

function resetQuiz() {

  state.quizIndex = 0;

  state.score = 0;

  state.wrongAnswers = [];

  state.answered = false;

  renderQuiz();

}


/* =========================================================
   WEAK TOPIC DETECTOR
========================================================= */

function updateWeakTopic() {

  if (!$("weakTopic"))
    return;

  if (!state.weakConcepts.length) {

    $("weakTopic").innerHTML =
      "<strong>No weak topic detected.</strong> Keep going!";

    return;

  }

  const counts = {};

  state.weakConcepts.forEach(
    concept => {

      counts[concept] =
        (counts[concept] || 0) + 1;

    }
  );

  const sorted =
    Object.entries(counts)
      .sort((a, b) =>
        b[1] - a[1]
      );

  const strongestWeak =
    sorted[0]?.[0] ||
    "Review the material";

  $("weakTopic").innerHTML = `

    <strong>
      Weakest area:
    </strong>

    <span>
      ${escapeHTML(strongestWeak)}
    </span>

    <p>
      Review this concept using the flashcards
      before attempting the quiz again.
    </p>

  `;

}


/* =========================================================
   RETRY WEAK TOPIC
========================================================= */

if ($("retryWeakBtn")) {

  $("retryWeakBtn").addEventListener(
    "click",
    () => {

      if (!state.weakConcepts.length) {

        alert(
          "No weak topics detected yet."
        );

        return;

      }

      const weakCards =
        state.flashcards.filter(card => {

          return state.weakConcepts.some(
            concept =>
              card.q
                .toLowerCase()
                .includes(
                  concept
                    .toLowerCase()
                )
          );

        });

      if (weakCards.length) {

        state.flashcards =
          weakCards;

        state.cardIndex = 0;

        renderFlashcard();

        document
          .getElementById("flashcards")
          ?.scrollIntoView({
            behavior: "smooth"
          });

      } else {

        alert(
          "Review the highlighted weak concepts in your notes."
        );

      }

    }
  );

}


/* =========================================================
   STUDY DNA
========================================================= */

function updateStudyDNA() {

  if (!$("dnaText"))
    return;

  const confidence =
    state.confidenceData.length
      ? average(state.confidenceData)
      : 2;

  const quizAccuracy =
    state.quiz.length
      ? state.score /
        state.quiz.length
      : 0;

  const understanding =
    Math.round(
      quizAccuracy * 100
    );

  const recall =
    Math.round(
      (confidence / 3) * 100
    );

  const application =
    state.wrongAnswers.length
      ? Math.max(
          20,
          100 -
          state.wrongAnswers.length * 15
        )
      : 85;

  setBar(
    "understandingBar",
    understanding
  );

  setBar(
    "recallBar",
    recall
  );

  setBar(
    "applicationBar",
    application
  );

  let profile =
    "Balanced Learner";

  if (understanding >= 80)
    profile = "Strong Performer";

  if (
    understanding < 60 &&
    recall < 60
  )
    profile = "Foundation Builder";

  if (
    recall >= 80 &&
    understanding < 60
  )
    profile = "Confidence-First Learner";

  if (
    understanding >= 80 &&
    recall < 60
  )
    profile = "Practice-Driven Learner";

  $("dnaText").innerHTML = `

    <strong>
      ${profile}
    </strong>

    <p>
      Your current learning pattern is based on
      quiz accuracy, flashcard confidence and
      performance feedback.
    </p>

  `;

}


/* =========================================================
   KNOWLEDGE MAP
========================================================= */

function updateKnowledgeMap(pack) {

  if (!$("knowledgeMap"))
    return;

  $("knowledgeMap").innerHTML = `

    <div class="knowledge-center">

      ${escapeHTML(pack.title)}

    </div>

    <div class="knowledge-branches">

      ${pack.concepts
        .map(
          concept => `

            <div class="knowledge-node">

              ${escapeHTML(concept)}

            </div>

          `
        )
        .join("")}

    </div>

  `;

}


/* =========================================================
   TEACH ME
========================================================= */

if ($("teachBtn")) {

  $("teachBtn").addEventListener(
    "click",
    () => {

      openModal(`

        <h2>
          Teach Me: ${escapeHTML(state.title || "Your Topic")}
        </h2>

        <div class="teach-step">

          <span>1</span>

          <div>
            <strong>Understand the idea</strong>
            <p>
              Start with the basic definition and
              identify what problem the topic solves.
            </p>
          </div>

        </div>

        <div class="teach-step">

          <span>2</span>

          <div>
            <strong>Break it into concepts</strong>
            <p>
              Learn each important concept separately
              before connecting them together.
            </p>
          </div>

        </div>

        <div class="teach-step">

          <span>3</span>

          <div>
            <strong>Apply the knowledge</strong>
            <p>
              Try examples, practical situations or
              exam-style questions.
            </p>
          </div>

        </div>

        <div class="teach-step">

          <span>4</span>

          <div>
            <strong>Explain it yourself</strong>
            <p>
              Close your notes and explain the topic
              in your own words.
            </p>
          </div>

        </div>

      `);

    }
  );

}


/* =========================================================
   STUDY SESSION
========================================================= */

if ($("sessionBtn")) {

  $("sessionBtn").addEventListener(
    "click",
    () => {

      openModal(`

        <h2>
          25-Minute Knowvia Study Session
        </h2>

        <div class="session-plan">

          <div>
            <strong>10 min</strong>
            <span>Learn the summary</span>
          </div>

          <div>
            <strong>5 min</strong>
            <span>Review flashcards</span>
          </div>

          <div>
            <strong>5 min</strong>
            <span>Take the quiz</span>
          </div>

          <div>
            <strong>3 min</strong>
            <span>Review weak areas</span>
          </div>

          <div>
            <strong>2 min</strong>
            <span>Explain aloud</span>
          </div>

        </div>

        <p>
          The goal is active learning rather than
          simply reading the material repeatedly.
        </p>

      `);

    }
  );

}


/* =========================================================
   EXAM MODE
========================================================= */

if ($("examBtn")) {

  $("examBtn").addEventListener(
    "click",
    () => {

      const title =
        state.title ||
        "Your Topic";

      openModal(`

        <h2>
          Exam Mode
        </h2>

        <p>
          Practice ${escapeHTML(title)}
          using different answer lengths.
        </p>

        <div class="exam-card">

          <strong>2-Mark Question</strong>

          <p>
            Define ${escapeHTML(title)}
            and state one important point.
          </p>

        </div>

        <div class="exam-card">

          <strong>5-Mark Question</strong>

          <p>
            Explain the main concepts of
            ${escapeHTML(title)}
            with suitable examples.
          </p>

        </div>

        <div class="exam-card">

          <strong>10-Mark Question</strong>

          <p>
            Explain ${escapeHTML(title)}
            in detail, including its concepts,
            stages, applications, advantages
            and limitations.
          </p>

        </div>

      `);

    }
  );

}


/* =========================================================
   ASK MY NOTES
========================================================= */

if ($("notesAskBtn")) {

  $("notesAskBtn").addEventListener(
    "click",
    () => {

      openModal(`

        <h2>
          Ask My Notes
        </h2>

        <input
          id="notesQuestion"
          class="modal-input"
          placeholder="Ask something from your notes..."
        />

        <button
          class="primary-btn"
          id="askNotesSubmit"
        >
          Ask
        </button>

        <div
          id="notesAnswer"
          class="notes-answer"
        ></div>

      `);

      $("askNotesSubmit")
        .addEventListener(
          "click",
          askNotes
        );

    }
  );

}


/* =========================================================
   ASK NOTES FUNCTION
========================================================= */

function askNotes() {

  const question =
    $("notesQuestion")
      ?.value
      .trim();

  if (!question) return;

  const text =
    state.material ||
    $("notesInput")?.value ||
    "";

  if (!text) {

    $("notesAnswer").innerHTML =
      "<p>No notes are available yet.</p>";

    return;

  }

  const words =
    question
      .toLowerCase()
      .split(/\s+/)
      .filter(word =>
        word.length > 3
      );

  const sentences =
    text
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/);

  const matches =
    sentences
      .filter(sentence => {

        const lower =
          sentence.toLowerCase();

        return words.some(word =>
          lower.includes(word)
        );

      })
      .slice(0, 4);

  if (!matches.length) {

    $("notesAnswer").innerHTML = `

      <p>
        I couldn't find a closely matching
        sentence in the uploaded material.
      </p>

    `;

    return;

  }

  $("notesAnswer").innerHTML = `

    <strong>
      Relevant information from your notes:
    </strong>

    <ul>

      ${matches
        .map(
          sentence =>
            `<li>${escapeHTML(sentence)}</li>`
        )
        .join("")}

    </ul>

  `;

}


/* =========================================================
   MODAL
========================================================= */

function openModal(content) {

  if (!$("modal"))
    return;

  $("modalContent").innerHTML =
    content;

  $("modal").classList.add("show");

}


if ($("modalClose")) {

  $("modalClose").addEventListener(
    "click",
    () => {

      $("modal").classList.remove(
        "show"
      );

    }
  );

}


if ($("modal")) {

  $("modal").addEventListener(
    "click",
    event => {

      if (
        event.target === $("modal")
      ) {

        $("modal").classList.remove(
          "show"
        );

      }

    }
  );

}


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

  if (!$("toast"))
    return;

  $("toast").textContent =
    message;

  $("toast").classList.add("show");

  setTimeout(
    () => {

      $("toast").classList.remove(
        "show"
      );

    },
    2200
  );

}


/* =========================================================
   UTILITIES
========================================================= */

function shuffle(array) {

  const copy =
    [...array];

  for (
    let i = copy.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );

    [
      copy[i],
      copy[j]
    ] =
    [
      copy[j],
      copy[i]
    ];

  }

  return copy;

}


function average(values) {

  if (!values.length)
    return 0;

  return values.reduce(
    (sum, value) =>
      sum + value,
    0
  ) / values.length;

}


function setBar(id, percentage) {

  const element =
    $(id);

  if (!element)
    return;

  element.style.width =
    `${Math.max(
      0,
      Math.min(
        100,
        percentage
      )
    )}%`;

}


function escapeHTML(value) {

  return String(value)
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
   INITIAL STATE
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    if ($("statusMessage")) {

      $("statusMessage").textContent =
        "Choose a topic or upload your study material.";

    }

    if ($("topic")) {

      $("topic").addEventListener(
        "keydown",
        event => {

          if (
            event.key === "Enter"
          ) {

            event.preventDefault();

            $("generateBtn")
              ?.click();

          }

        }
      );

    }

  }
);


/* =========================================================
   EXPOSE FUNCTIONS
========================================================= */

window.resetQuiz =
  resetQuiz;

window.openModal =
  openModal;

window.showToast =
  showToast;
