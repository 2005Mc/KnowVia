/* =========================================
   KNOWVIA - SAMPLE STUDY DATA
========================================= */

const studyData = {

    "machine learning": {

        summary: `
            <h3>Machine Learning</h3>

            <p>
                Machine Learning (ML) is a branch of Artificial Intelligence
                that enables computers to learn from data and make predictions
                or decisions without being explicitly programmed for every task.
            </p>

            <br>

            <h4>Key Points</h4>

            <ul>
                <li>Machine Learning uses data to identify patterns.</li>
                <li>It improves its performance through experience and data.</li>
                <li>Major types include supervised, unsupervised and reinforcement learning.</li>
                <li>It is used in recommendation systems, image recognition and predictions.</li>
            </ul>
        `,

        flashcards: [

            {
                question: "What is Machine Learning?",
                answer: "Machine Learning is a branch of AI that enables computers to learn patterns from data."
            },

            {
                question: "What is Supervised Learning?",
                answer: "Supervised Learning is a type of ML where a model learns from labeled training data."
            },

            {
                question: "What is Unsupervised Learning?",
                answer: "Unsupervised Learning finds patterns or groups in data without using labeled outputs."
            },

            {
                question: "What is a dataset?",
                answer: "A dataset is a collection of data used for training, testing or analyzing a machine learning model."
            },

            {
                question: "Give one application of Machine Learning.",
                answer: "One application is recommendation systems, such as suggesting movies, videos or products."
            }

        ]

    },


    "computer vision": {

        summary: `
            <h3>Computer Vision</h3>

            <p>
                Computer Vision is a field of Artificial Intelligence that
                enables computers to understand, analyze and extract useful
                information from images and videos.
            </p>

            <br>

            <h4>Key Points</h4>

            <ul>
                <li>Computer Vision processes digital images and videos.</li>
                <li>It can detect objects, faces, edges and patterns.</li>
                <li>Image processing is an important part of Computer Vision.</li>
                <li>Applications include face recognition, medical imaging and self-driving vehicles.</li>
            </ul>
        `,

        flashcards: [

            {
                question: "What is Computer Vision?",
                answer: "Computer Vision is a field that enables computers to understand and analyze images and videos."
            },

            {
                question: "What is image processing?",
                answer: "Image processing involves performing operations on an image to improve or analyze it."
            },

            {
                question: "What is object detection?",
                answer: "Object detection identifies and locates objects within an image or video."
            },

            {
                question: "Give one application of Computer Vision.",
                answer: "Face recognition is one application of Computer Vision."
            },

            {
                question: "What type of data does Computer Vision commonly analyze?",
                answer: "Computer Vision commonly analyzes images and videos."
            }

        ]

    },


    "python": {

        summary: `
            <h3>Python</h3>

            <p>
                Python is a high-level, interpreted programming language known
                for its simple syntax and readability. It is widely used in
                web development, data science, artificial intelligence and automation.
            </p>

            <br>

            <h4>Key Points</h4>

            <ul>
                <li>Python has simple and readable syntax.</li>
                <li>It supports multiple programming paradigms.</li>
                <li>Python is widely used in AI and Data Science.</li>
                <li>It has a large collection of libraries and frameworks.</li>
            </ul>
        `,

        flashcards: [

            {
                question: "What is Python?",
                answer: "Python is a high-level, interpreted programming language known for its simple and readable syntax."
            },

            {
                question: "Is Python an interpreted language?",
                answer: "Yes. Python is generally classified as an interpreted programming language."
            },

            {
                question: "Name one field where Python is used.",
                answer: "Python is used in fields such as Artificial Intelligence, Data Science, web development and automation."
            },

            {
                question: "Why is Python popular among beginners?",
                answer: "Python is popular among beginners because its syntax is simple and readable."
            },

            {
                question: "What are Python libraries?",
                answer: "Python libraries are collections of reusable modules and tools that help developers perform specific tasks."
            }

        ]

    }

};


/* =========================================
   GET HTML ELEMENTS
========================================= */

const generateBtn =
    document.getElementById("generateBtn");

const topicInput =
    document.getElementById("topic");

const difficultyInput =
    document.getElementById("difficulty");

const summaryContent =
    document.getElementById("summaryContent");

const flashcard =
    document.getElementById("flashcard");

const cardQuestion =
    document.getElementById("cardQuestion");

const cardAnswer =
    document.getElementById("cardAnswer");

const prevCard =
    document.getElementById("prevCard");

const flipCard =
    document.getElementById("flipCard");

const nextCard =
    document.getElementById("nextCard");

const cardProgress =
    document.getElementById("cardProgress");


/* =========================================
   FLASHCARD VARIABLES
========================================= */

let currentFlashcards = [];

let currentCardIndex = 0;


/* =========================================
   GENERATE STUDY MATERIAL
========================================= */

generateBtn.addEventListener("click", function () {

    const topic =
        topicInput.value
            .trim()
            .toLowerCase();

    const difficulty =
        difficultyInput.value;


    /* Check if topic is empty */

    if (topic === "") {

        alert("Please enter a topic.");

        return;

    }


    /* Check whether sample topic exists */

    if (!studyData[topic]) {

        summaryContent.innerHTML = `
            <h3>Topic Not Available Yet</h3>

            <p>
                Currently, Knowvia supports these sample topics:
            </p>

            <ul>
                <li>Machine Learning</li>
                <li>Computer Vision</li>
                <li>Python</li>
            </ul>

            <br>

            <p>
                Later, we will connect AI so you can enter any topic.
            </p>
        `;

        currentFlashcards = [];

        currentCardIndex = 0;

        cardQuestion.textContent =
            "No flashcards available.";

        cardAnswer.textContent =
            "Please enter one of the available topics.";

        cardProgress.textContent =
            "Card 0 / 0";

        return;

    }


    /* Get selected topic data */

    const selectedTopic =
        studyData[topic];


    /* Display summary */

    summaryContent.innerHTML =
        selectedTopic.summary;


    /* Load flashcards */

    currentFlashcards =
        selectedTopic.flashcards;


    currentCardIndex = 0;


    /* Show first flashcard */

    showFlashcard();


    /* Remove flipped state */

    flashcard.classList.remove("flipped");


    /* Scroll to Summary */

    document
        .getElementById("summary")
        .scrollIntoView({

            behavior: "smooth"

        });


    console.log(
        "Selected difficulty:",
        difficulty
    );

});


/* =========================================
   SHOW FLASHCARD
========================================= */

function showFlashcard() {

    /* No cards */

    if (currentFlashcards.length === 0) {

        cardQuestion.textContent =
            "No flashcards available.";

        cardAnswer.textContent =
            "Generate a supported topic first.";

        cardProgress.textContent =
            "Card 0 / 0";

        return;

    }


    const currentCard =
        currentFlashcards[currentCardIndex];


    /* Display question */

    cardQuestion.textContent =
        currentCard.question;


    /* Display answer */

    cardAnswer.textContent =
        currentCard.answer;


    /* Display progress */

    cardProgress.textContent =
        `Card ${currentCardIndex + 1} / ${currentFlashcards.length}`;


    /* Always show front */

    flashcard.classList.remove("flipped");

}


/* =========================================
   FLIP FLASHCARD
========================================= */

flipCard.addEventListener("click", function () {

    if (currentFlashcards.length === 0) {

        return;

    }

    flashcard.classList.toggle("flipped");

});


/* Click card also flips it */

flashcard.addEventListener("click", function () {

    if (currentFlashcards.length === 0) {

        return;

    }

    flashcard.classList.toggle("flipped");

});


/* =========================================
   NEXT FLASHCARD
========================================= */

nextCard.addEventListener("click", function () {

    if (currentFlashcards.length === 0) {

        return;

    }


    if (
        currentCardIndex <
        currentFlashcards.length - 1
    ) {

        currentCardIndex++;

    } else {

        currentCardIndex = 0;

    }


    showFlashcard();

});


/* =========================================
   PREVIOUS FLASHCARD
========================================= */

prevCard.addEventListener("click", function () {

    if (currentFlashcards.length === 0) {

        return;

    }


    if (currentCardIndex > 0) {

        currentCardIndex--;

    } else {

        currentCardIndex =
            currentFlashcards.length - 1;

    }


    showFlashcard();

});
