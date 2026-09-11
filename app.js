/* =========================
   GET HTML ELEMENTS
========================= */

const generateBtn =
    document.getElementById("generateBtn");


const topicInput =
    document.getElementById("topic");


const difficultyInput =
    document.getElementById("difficulty");


const summaryContent =
    document.getElementById("summaryContent");



/* =========================
   GENERATE BUTTON
========================= */

generateBtn.addEventListener(
    "click",
    function () {


        const topic =
            topicInput.value.trim();


        const difficulty =
            difficultyInput.value;



        /* Check empty topic */

        if (topic === "") {

            alert(
                "Please enter a topic."
            );

            return;

        }



        /* Display temporary result */

        summaryContent.innerHTML = `

            <h3>${topic}</h3>

            <p>

                You selected the

                <strong>
                    ${difficulty}
                </strong>

                difficulty level.

            </p>


            <p>

                Your study summary
                will appear here.

            </p>

        `;



        /* Scroll to summary */

        document
            .getElementById("summary")
            .scrollIntoView({

                behavior: "smooth"

            });


    }
);
