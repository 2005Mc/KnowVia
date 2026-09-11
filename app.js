/* =====================================================
   KNOWVIA - LEARNING DATA + APPLICATION LOGIC
===================================================== */


/* =====================================================
   STUDY DATA
===================================================== */

const studyData = {

    /* =================================================
       MACHINE LEARNING
    ================================================= */

    "machine learning": {

        beginner: {

            summary: `
                <h3>Machine Learning</h3>

                <p>
                    Machine Learning (ML) is a branch of Artificial Intelligence
                    that allows computers to learn from data and make predictions
                    or decisions without being explicitly programmed for every
                    situation. Instead of giving a computer instructions for
                    every possible case, we provide examples and allow the
                    machine to discover useful patterns.
                </p>

                <p>
                    For example, a machine learning system can learn from
                    previous emails and identify whether a new email is likely
                    to be spam. Similarly, recommendation systems can study
                    what users previously watched or purchased and suggest
                    something they may like.
                </p>

                <h4>🔑 Key Concepts</h4>

                <ul>
                    <li><strong>Data:</strong> Information used by a machine learning system.</li>
                    <li><strong>Model:</strong> A mathematical representation that learns patterns from data.</li>
                    <li><strong>Training:</strong> The process of teaching a model using data.</li>
                    <li><strong>Prediction:</strong> The output produced by a trained model.</li>
                </ul>

                <h4>📌 Main Types</h4>

                <ul>
                    <li><strong>Supervised Learning:</strong> Learning from labeled data.</li>
                    <li><strong>Unsupervised Learning:</strong> Finding patterns in data without labels.</li>
                    <li><strong>Reinforcement Learning:</strong> Learning through rewards and penalties.</li>
                </ul>

                <h4>💡 Important Point</h4>

                <p>
                    The main idea of Machine Learning is that computers can
                    improve their performance by learning from examples and
                    experience rather than relying only on manually written
                    rules.
                </p>
            `,

            flashcards: [

                {
                    question: "What is Machine Learning?",
                    answer: "Machine Learning is a branch of AI that allows computers to learn patterns from data and make predictions or decisions."
                },

                {
                    question: "What is a dataset?",
                    answer: "A dataset is a collection of information used to train, test or analyze a machine learning system."
                },

                {
                    question: "What is a model?",
                    answer: "A model is a mathematical representation that learns useful patterns from data."
                },

                {
                    question: "What is training?",
                    answer: "Training is the process of teaching a machine learning model using data."
                },

                {
                    question: "What is supervised learning?",
                    answer: "Supervised learning uses labeled data to train a machine learning model."
                },

                {
                    question: "What is unsupervised learning?",
                    answer: "Unsupervised learning discovers patterns or groups in data without labeled outputs."
                },

                {
                    question: "What is reinforcement learning?",
                    answer: "Reinforcement learning allows an agent to learn through rewards and penalties."
                },

                {
                    question: "Give one application of Machine Learning.",
                    answer: "Spam email detection is an example of a Machine Learning application."
                }

            ]

        },


        intermediate: {

            summary: `
                <h3>Machine Learning — Intermediate</h3>

                <p>
                    Machine Learning is a computational approach in which
                    algorithms learn relationships and patterns from data to
                    perform tasks such as classification, regression,
                    clustering and prediction. Instead of explicitly
                    programming the rules for every situation, a model learns
                    those relationships from examples.
                </p>

                <p>
                    A typical machine learning workflow begins with collecting
                    data, cleaning it, selecting useful features, splitting
                    the dataset into training and testing portions, training
                    a model and evaluating its performance using appropriate
                    metrics.
                </p>

                <h4>🔑 Key Concepts</h4>

                <ul>
                    <li><strong>Features:</strong> Input variables used by the model.</li>
                    <li><strong>Labels:</strong> Target outputs in supervised learning.</li>
                    <li><strong>Training Data:</strong> Data used to learn model parameters.</li>
                    <li><strong>Testing Data:</strong> Unseen data used to evaluate the model.</li>
                    <li><strong>Classification:</strong> Predicting categories or classes.</li>
                    <li><strong>Regression:</strong> Predicting continuous numerical values.</li>
                    <li><strong>Clustering:</strong> Grouping similar data points.</li>
                </ul>

                <h4>⚙️ Main Stages of a Machine Learning System</h4>

                <ol>
                    <li>Collect relevant data.</li>
                    <li>Clean and preprocess the data.</li>
                    <li>Select or engineer useful features.</li>
                    <li>Split the data into training and testing sets.</li>
                    <li>Train a suitable algorithm.</li>
                    <li>Evaluate the model.</li>
                    <li>Use the trained model for predictions.</li>
                </ol>

                <h4>💡 Example</h4>

                <p>
                    Suppose we want to predict whether a student will pass an
                    examination. Attendance, internal marks and study hours
                    can be used as features. The model learns from previous
                    student records and predicts the result for a new student.
                </p>

                <h4>📌 Important Point</h4>

                <p>
                    A good machine learning model should perform well not only
                    on training data but also on previously unseen data.
                </p>
            `,

            flashcards: [

                {
                    question: "What is a feature?",
                    answer: "A feature is an input variable or measurable property used by a machine learning model."
                },

                {
                    question: "What is a label?",
                    answer: "A label is the target output that a supervised learning model tries to predict."
                },

                {
                    question: "What is classification?",
                    answer: "Classification is a machine learning task in which the model predicts a category or class."
                },

                {
                    question: "What is regression?",
                    answer: "Regression predicts continuous numerical values, such as price, temperature or salary."
                },

                {
                    question: "What is clustering?",
                    answer: "Clustering groups similar data points together without requiring labeled outputs."
                },

                {
                    question: "Why is data preprocessing important?",
                    answer: "Preprocessing improves data quality and prepares it for effective model training."
                },

                {
                    question: "Why is test data used?",
                    answer: "Test data evaluates how well a trained model performs on unseen data."
                },

                {
                    question: "What is a machine learning workflow?",
                    answer: "It generally includes data collection, preprocessing, feature preparation, training, evaluation and prediction."
                }

            ]

        },


        advanced: {

            summary: `
                <h3>Machine Learning — Advanced</h3>

                <p>
                    At an advanced level, Machine Learning can be viewed as
                    the process of estimating a function or probability
                    distribution from observed data so that the learned model
                    can generalize to previously unseen examples. The goal is
                    not simply to memorize training data but to learn patterns
                    that remain useful on new data.
                </p>

                <p>
                    During training, a model attempts to minimize an objective
                    or loss function. Optimization algorithms such as Gradient
                    Descent adjust model parameters to reduce this loss.
                    Hyperparameters, such as learning rate, model complexity
                    and regularization strength, are selected separately from
                    the learned parameters.
                </p>

                <h4>🔑 Key Concepts</h4>

                <ul>
                    <li><strong>Loss Function:</strong> Measures the difference between predicted and actual values.</li>
                    <li><strong>Optimization:</strong> Process of finding model parameters that minimize the objective.</li>
                    <li><strong>Overfitting:</strong> When a model learns training data too closely and performs poorly on new data.</li>
                    <li><strong>Underfitting:</strong> When a model is too simple to capture important patterns.</li>
                    <li><strong>Regularization:</strong> Technique used to control model complexity.</li>
                    <li><strong>Generalization:</strong> Ability of a model to perform well on unseen data.</li>
                    <li><strong>Hyperparameters:</strong> Configuration values chosen before or during training.</li>
                </ul>

                <h4>⚙️ Advanced Stages</h4>

                <ol>
                    <li>Problem formulation and objective definition.</li>
                    <li>Data collection and exploratory analysis.</li>
                    <li>Data preprocessing and feature engineering.</li>
                    <li>Model selection.</li>
                    <li>Training and optimization.</li>
                    <li>Hyperparameter tuning.</li>
                    <li>Cross-validation and evaluation.</li>
                    <li>Error analysis and model improvement.</li>
                    <li>Deployment and monitoring.</li>
                </ol>

                <h4>📊 Model Evaluation</h4>

                <p>
                    Different tasks require different evaluation metrics.
                    Classification can use accuracy, precision, recall and
                    F1-score, while regression can use metrics such as Mean
                    Absolute Error and Mean Squared Error.
                </p>

                <h4>⚠️ Overfitting</h4>

                <p>
                    Overfitting occurs when a model performs extremely well on
                    training data but poorly on unseen data. It can be reduced
                    through techniques such as regularization, cross-validation,
                    data augmentation and appropriate model selection.
                </p>
            `,

            flashcards: [

                {
                    question: "What is a loss function?",
                    answer: "A loss function measures the difference between a model's prediction and the expected output."
                },

                {
                    question: "What is Gradient Descent?",
                    answer: "Gradient Descent is an optimization method that iteratively updates model parameters to reduce the loss function."
                },

                {
                    question: "What is overfitting?",
                    answer: "Overfitting occurs when a model learns training data too closely and performs poorly on unseen data."
                },

                {
                    question: "What is underfitting?",
                    answer: "Underfitting occurs when a model is too simple to capture important patterns in the data."
                },

                {
                    question: "What is regularization?",
                    answer: "Regularization controls model complexity to reduce overfitting."
                },

                {
                    question: "What is generalization?",
                    answer: "Generalization is the ability of a model to perform effectively on previously unseen data."
                },

                {
                    question: "What are hyperparameters?",
                    answer: "Hyperparameters are configuration values selected outside the normal parameter-learning process, such as learning rate or regularization strength."
                },

                {
                    question: "Why is cross-validation used?",
                    answer: "Cross-validation helps estimate how well a model is likely to perform on unseen data and assists in model selection."
                }

            ]

        }

    },


    /* =================================================
       COMPUTER VISION
    ================================================= */

    "computer vision": {

        beginner: {

            summary: `
                <h3>Computer Vision</h3>

                <p>
                    Computer Vision is a field of Artificial Intelligence that
                    helps computers understand and interpret images and videos.
                    Just as humans use their eyes and brain to understand the
                    world, computer vision systems use cameras, images and
                    algorithms to extract useful information.
                </p>

                <p>
                    Computer vision can be used to identify objects, recognize
                    faces, detect edges, classify images and understand scenes.
                </p>

                <h4>🔑 Key Concepts</h4>

                <ul>
                    <li>Images are represented as digital data.</li>
                    <li>Image processing improves or transforms images.</li>
                    <li>Object detection finds objects in an image.</li>
                    <li>Image classification assigns categories to images.</li>
                </ul>

                <h4>⚙️ Basic Stages</h4>

                <ol>
                    <li>Capture or collect an image.</li>
                    <li>Preprocess the image.</li>
                    <li>Extract useful information.</li>
                    <li>Analyze or classify the image.</li>
                    <li>Produce the required result.</li>
                </ol>

                <h4>💡 Applications</h4>

                <p>
                    Computer Vision is used in face recognition, medical
                    imaging, security systems, autonomous vehicles and
                    quality inspection.
                </p>
            `,

            flashcards: [

                {
                    question: "What is Computer Vision?",
                    answer: "Computer Vision is a field of AI that enables computers to understand and analyze images and videos."
                },

                {
                    question: "What is an image?",
                    answer: "A digital image is a representation of visual information stored as numerical pixel data."
                },

                {
                    question: "What is image classification?",
                    answer: "Image classification assigns an image to a particular category."
                },

                {
                    question: "What is object detection?",
                    answer: "Object detection identifies and locates objects within an image."
                },

                {
                    question: "What is image preprocessing?",
                    answer: "Image preprocessing prepares an image for further analysis by operations such as resizing or noise reduction."
                },

                {
                    question: "Give one Computer Vision application.",
                    answer: "Face recognition is one common Computer Vision application."
                }

            ]

        },


        intermediate: {

            summary: `
                <h3>Computer Vision — Intermediate</h3>

                <p>
                    Computer Vision combines image processing, pattern
                    recognition and machine learning techniques to extract
                    meaningful information from visual data. A computer vision
                    pipeline usually converts raw images into representations
                    that algorithms can analyze.
                </p>

                <h4>🔑 Key Concepts</h4>

                <ul>
                    <li><strong>Pixels:</strong> Basic elements representing an image.</li>
                    <li><strong>Color Space:</strong> A method of representing colors such as RGB or HSV.</li>
                    <li><strong>Filtering:</strong> Used to smooth images or highlight important structures.</li>
                    <li><strong>Edges:</strong> Boundaries where image intensity changes significantly.</li>
                    <li><strong>Features:</strong> Useful characteristics extracted from images.</li>
                </ul>

                <h4>⚙️ Computer Vision Pipeline</h4>

                <ol>
                    <li>Image acquisition.</li>
                    <li>Image preprocessing.</li>
                    <li>Noise reduction and enhancement.</li>
                    <li>Feature extraction.</li>
                    <li>Object or pattern recognition.</li>
                    <li>Classification or decision making.</li>
                </ol>

                <h4>💡 Example</h4>

                <p>
                    In a face recognition system, an image may first be
                    converted into a suitable format, noise may be reduced,
                    facial features may be extracted and a recognition model
                    can then compare the extracted representation with known
                    faces.
                </p>
            `,

            flashcards: [

                {
                    question: "What is a pixel?",
                    answer: "A pixel is the smallest addressable element of a digital image."
                },

                {
                    question: "What is image filtering?",
                    answer: "Filtering applies mathematical operations to image pixels to reduce noise, smooth an image or highlight features."
                },

                {
                    question: "What is an edge?",
                    answer: "An edge is a region where image intensity changes significantly and often represents a boundary."
                },

                {
                    question: "Why is feature extraction used?",
                    answer: "Feature extraction identifies useful characteristics that can help a computer vision algorithm analyze an image."
                },

                {
                    question: "What is image acquisition?",
                    answer: "Image acquisition is the process of obtaining an image from a camera, scanner or other source."
                },

                {
                    question: "What is a Computer Vision pipeline?",
                    answer: "It is a sequence of operations such as acquisition, preprocessing, feature extraction and recognition."
                }

            ]

        },


        advanced: {

            summary: `
                <h3>Computer Vision — Advanced</h3>

                <p>
                    Advanced Computer Vision focuses on extracting high-level
                    semantic information from visual data using mathematical
                    image processing, machine learning and deep learning.
                    Modern systems frequently use convolutional neural networks
                    and transformer-based architectures to learn hierarchical
                    representations directly from images.
                </p>

                <h4>🔑 Key Concepts</h4>

                <ul>
                    <li><strong>Convolution:</strong> Operation used to extract spatial patterns from images.</li>
                    <li><strong>Feature Maps:</strong> Representations produced by convolutional layers.</li>
                    <li><strong>Segmentation:</strong> Assigning labels to pixels or regions.</li>
                    <li><strong>Object Detection:</strong> Locating and classifying objects.</li>
                    <li><strong>Representation Learning:</strong> Automatically learning useful image features.</li>
                </ul>

                <h4>⚙️ Advanced Processing Stages</h4>

                <ol>
                    <li>Image acquisition and normalization.</li>
                    <li>Preprocessing and augmentation.</li>
                    <li>Feature or representation extraction.</li>
                    <li>Model inference.</li>
                    <li>Detection, classification or segmentation.</li>
                    <li>Post-processing.</li>
                    <li>Evaluation using appropriate metrics.</li>
                </ol>

                <h4>📊 Applications</h4>

                <p>
                    Advanced Computer Vision is used in autonomous driving,
                    medical diagnosis, surveillance, industrial inspection,
                    augmented reality and robotics.
                </p>
            `,

            flashcards: [

                {
                    question: "What is convolution in Computer Vision?",
                    answer: "Convolution is a mathematical operation that applies filters to image data to extract spatial patterns."
                },

                {
                    question: "What is a feature map?",
                    answer: "A feature map is a representation produced by a neural network layer showing where learned visual patterns occur."
                },

                {
                    question: "What is image segmentation?",
                    answer: "Image segmentation assigns labels to pixels or regions so that different objects or areas can be separated."
                },

                {
                    question: "How is object detection different from classification?",
                    answer: "Classification identifies what an image contains, while object detection also identifies where objects are located."
                },

                {
                    question: "What is representation learning?",
                    answer: "Representation learning automatically discovers useful features or representations from raw data."
                },

                {
                    question: "Why is image augmentation used?",
                    answer: "Image augmentation creates varied training examples to improve model robustness and reduce overfitting."
                }

            ]

        }

    },


    /* =================================================
       PYTHON
    ================================================= */

    "python": {

        beginner: {

            summary: `
                <h3>Python Programming</h3>

                <p>
                    Python is a high-level, general-purpose programming
                    language known for its simple syntax and readability.
                    It is widely used by beginners as well as professional
                    developers.
                </p>

                <p>
                    Python can be used to create applications, automate tasks,
                    analyze data and develop Artificial Intelligence systems.
                </p>

                <h4>🔑 Key Concepts</h4>

                <ul>
                    <li>Variables store values.</li>
                    <li>Conditions allow programs to make decisions.</li>
                    <li>Loops repeat instructions.</li>
                    <li>Functions organize reusable code.</li>
                    <li>Lists store collections of values.</li>
                </ul>

                <h4>⚙️ Basic Learning Stages</h4>

                <ol>
                    <li>Learn variables and data types.</li>
                    <li>Understand operators.</li>
                    <li>Learn conditional statements.</li>
                    <li>Practice loops.</li>
                    <li>Create functions.</li>
                    <li>Work with lists and dictionaries.</li>
                </ol>
            `,

            flashcards: [

                {
                    question: "What is Python?",
                    answer: "Python is a high-level, general-purpose programming language known for its simple and readable syntax."
                },

                {
                    question: "What is a variable?",
                    answer: "A variable is a name used to store or refer to a value."
                },

                {
                    question: "What is a loop?",
                    answer: "A loop repeatedly executes a block of code."
                },

                {
                    question: "What is a function?",
                    answer: "A function is a reusable block of code designed to perform a particular task."
                },

                {
                    question: "What is a list?",
                    answer: "A list is an ordered collection that can store multiple values."
                },

                {
                    question: "Give one use of Python.",
                    answer: "Python is widely used for Data Science and Artificial Intelligence."
                }

            ]

        },


        intermediate: {

            summary: `
                <h3>Python — Intermediate</h3>

                <p>
                    Python provides a large collection of built-in data types,
                    functions and modules that allow developers to build
                    applications efficiently. Its object-oriented programming
                    features also allow programs to be organized using classes
                    and objects.
                </p>

                <h4>🔑 Key Concepts</h4>

                <ul>
                    <li><strong>Lists:</strong> Mutable ordered collections.</li>
                    <li><strong>Tuples:</strong> Ordered collections that are immutable.</li>
                    <li><strong>Dictionaries:</strong> Key-value data structures.</li>
                    <li><strong>Functions:</strong> Reusable blocks of logic.</li>
                    <li><strong>Classes:</strong> Blueprints used for creating objects.</li>
                    <li><strong>Modules:</strong> Files containing reusable Python code.</li>
                </ul>

                <h4>⚙️ Important Programming Stages</h4>

                <ol>
                    <li>Design the problem solution.</li>
                    <li>Select appropriate data structures.</li>
                    <li>Write functions and reusable components.</li>
                    <li>Handle exceptions.</li>
                    <li>Use modules and libraries.</li>
                    <li>Test and debug the program.</li>
                </ol>

                <h4>💡 Example</h4>

                <p>
                    A student management application could use dictionaries
                    to represent student information, functions to process
                    marks and classes to organize student-related operations.
                </p>
            `,

            flashcards: [

                {
                    question: "What is a tuple?",
                    answer: "A tuple is an ordered collection that cannot normally be modified after creation."
                },

                {
                    question: "What is a dictionary?",
                    answer: "A dictionary stores data using key-value pairs."
                },

                {
                    question: "What is a class?",
                    answer: "A class is a blueprint used to create objects in object-oriented programming."
                },

                {
                    question: "What is exception handling?",
                    answer: "Exception handling allows a program to respond appropriately to runtime errors."
                },

                {
                    question: "What is a module?",
                    answer: "A module is a Python file containing reusable code such as functions, classes or variables."
                },

                {
                    question: "Why are functions useful?",
                    answer: "Functions improve code reuse, organization and maintainability."
                }

            ]

        },


        advanced: {

            summary: `
                <h3>Python — Advanced</h3>

                <p>
                    Advanced Python programming involves understanding the
                    language's object model, iterators, generators, decorators,
                    context managers, asynchronous programming and efficient
                    software design. Python programs can also interact with
                    external libraries and system resources through well-defined
                    interfaces.
                </p>

                <h4>🔑 Key Concepts</h4>

                <ul>
                    <li><strong>Generators:</strong> Produce values lazily using iteration.</li>
                    <li><strong>Decorators:</strong> Modify or extend function behavior.</li>
                    <li><strong>Iterators:</strong> Objects that provide sequential access to elements.</li>
                    <li><strong>Context Managers:</strong> Manage resources safely using constructs such as <code>with</code>.</li>
                    <li><strong>Async Programming:</strong> Supports efficient handling of concurrent I/O operations.</li>
                </ul>

                <h4>⚙️ Advanced Development Stages</h4>

                <ol>
                    <li>Analyze requirements and architecture.</li>
                    <li>Design reusable modules.</li>
                    <li>Choose efficient data structures and algorithms.</li>
                    <li>Implement error handling and resource management.</li>
                    <li>Write automated tests.</li>
                    <li>Profile and optimize performance.</li>
                    <li>Deploy and maintain the application.</li>
                </ol>

                <h4>📌 Important Point</h4>

                <p>
                    Advanced Python development is not only about knowing more
                    syntax. It involves writing code that is reusable,
                    maintainable, testable, efficient and appropriate for
                    the problem being solved.
                </p>
            `,

            flashcards: [

                {
                    question: "What is a generator?",
                    answer: "A generator is an iterator-producing construct that yields values lazily instead of storing all results at once."
                },

                {
                    question: "What is a decorator?",
                    answer: "A decorator is a mechanism used to modify or extend the behavior of a function or class."
                },

                {
                    question: "What is an iterator?",
                    answer: "An iterator is an object that provides a way to access elements sequentially."
                },

                {
                    question: "What is a context manager?",
                    answer: "A context manager manages resources and ensures appropriate setup and cleanup, commonly used with the with statement."
                },

                {
                    question: "What is asynchronous programming?",
                    answer: "Asynchronous programming allows tasks, particularly I/O operations, to progress without unnecessarily blocking the program."
                },

                {
                    question: "Why is testing important in advanced Python development?",
                    answer: "Testing helps verify correctness, detect regressions and make software easier to maintain."
                }

            ]

        }

    }

};


/* =====================================================
   HTML ELEMENTS
===================================================== */

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

const themeBtn =
    document.getElementById("themeBtn");


/* =====================================================
   FLASHCARD VARIABLES
===================================================== */

let currentFlashcards = [];

let currentCardIndex = 0;


/* =====================================================
   GENERATE STUDY MATERIAL
===================================================== */

generateBtn.addEventListener("click", function () {

    const topic =
        topicInput.value
            .trim()
            .toLowerCase();

    const difficulty =
        difficultyInput.value;


    /* Empty topic */

    if (topic === "") {

        alert("Please enter a topic.");

        return;

    }


    /* Topic doesn't exist */

    if (!studyData[topic]) {

        summaryContent.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">?</div>

                <h3>Topic not available yet</h3>

                <p>
                    Try one of these topics:
                </p>

                <p>
                    <strong>
                        Machine Learning,
                        Computer Vision,
                        Python
                    </strong>
                </p>

                <p>
                    Later, Knowvia will use AI to generate
                    material for any topic.
                </p>

            </div>

        `;

        currentFlashcards = [];

        currentCardIndex = 0;

        cardQuestion.textContent =
            "No flashcards available.";

        cardAnswer.textContent =
            "Please enter a supported topic.";

        cardProgress.textContent =
            "Card 0 / 0";

        return;

    }


    /* Get topic */

    const topicData =
        studyData[topic];


    /* Get difficulty */

    const levelData =
        topicData[difficulty];


    /* Display summary */

    summaryContent.innerHTML =
        levelData.summary;


    /* Load flashcards */

    currentFlashcards =
        levelData.flashcards;


    currentCardIndex = 0;


    /* Show first card */

    showFlashcard();


    /* Remove flipped state */

    flashcard.classList.remove("flipped");


    /* Scroll to summary */

    document
        .getElementById("summary")
        .scrollIntoView({

            behavior: "smooth"

        });

});


/* =====================================================
   SHOW FLASHCARD
===================================================== */

function showFlashcard() {

    if (currentFlashcards.length === 0) {

        cardQuestion.textContent =
            "No flashcards available.";

        cardAnswer.textContent =
            "Generate a topic first.";

        cardProgress.textContent =
            "Card 0 / 0";

        return;

    }


    const currentCard =
        currentFlashcards[currentCardIndex];


    cardQuestion.textContent =
        currentCard.question;


    cardAnswer.textContent =
        currentCard.answer;


    cardProgress.textContent =
        `Card ${currentCardIndex + 1} / ${currentFlashcards.length}`;


    flashcard.classList.remove("flipped");

}


/* =====================================================
   FLIP FLASHCARD
===================================================== */

flipCard.addEventListener("click", function () {

    if (currentFlashcards.length === 0) {
        return;
    }

    flashcard.classList.toggle("flipped");

});


/* Click card */

flashcard.addEventListener("click", function () {

    if (currentFlashcards.length === 0) {
        return;
    }

    flashcard.classList.toggle("flipped");

});


/* =====================================================
   NEXT CARD
===================================================== */

nextCard.addEventListener("click", function () {

    if (currentFlashcards.length === 0) {
        return;
    }


    currentCardIndex++;


    if (
        currentCardIndex >=
        currentFlashcards.length
    ) {

        currentCardIndex = 0;

    }


    showFlashcard();

});


/* =====================================================
   PREVIOUS CARD
===================================================== */

prevCard.addEventListener("click", function () {

    if (currentFlashcards.length === 0) {
        return;
    }


    currentCardIndex--;


    if (currentCardIndex < 0) {

        currentCardIndex =
            currentFlashcards.length - 1;

    }


    showFlashcard();

});


/* =====================================================
   DARK MODE
===================================================== */

themeBtn.addEventListener("click", function () {

    document.body.classList.toggle("dark-mode");


    if (
        document.body.classList.contains("dark-mode")
    ) {

        themeBtn.textContent = "☀";

    } else {

        themeBtn.textContent = "◐";

    }

});
