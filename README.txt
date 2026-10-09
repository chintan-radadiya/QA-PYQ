Arithmetic 1 — CAT QA Practice
=================================

Files:
- index.html: application structure
- css/styles.css: all styling
- js/questions.js: the 123 questions and embedded answer key extracted from the supplied handout
- js/app.js: practice UI behaviour, bookmarks, response state, local saving, and time tracking

How to run:
1. Extract the ZIP while keeping the folder structure intact.
2. Open index.html in a modern browser (Chrome, Edge, Firefox).
3. Practice at your own pace. There is no sectional countdown.

Notes:
- Progress is stored locally in the browser's localStorage.
- Do not move the CSS/JS files out of their folders unless you update the references in index.html.

Practice controls:
- Select an MCQ option to save and grade it immediately. For answer-entry questions, type the full answer and click Submit answer.
- Answer submission freezes the question timer. Retry question archives the previous attempt and starts a new attempt.
- Pause/resume controls active time. Time in a hidden tab or with the answer key revealed is excluded. Time offline is never counted.
- Use the sidebar navigator to jump between questions. Colors distinguish correct, wrong and ungraded answers; bookmarks have a gold underline.
- Choose a topic/part/search filter, question pool and count, then Start fresh set. Random sets sample without replacement; uncheck Random selection for handout order.
- Revise wrong answers starts a fresh set of matching wrong answers. Previous answers and attempt times are kept in each question's history.
- Analysis shows current filtered/set accuracy and average submitted-attempt time by topic. Active time and overall progress cover the whole question bank.
- Answer grading uses the existing embedded handout key; numeric entries accept equivalent decimals and fractions. No worked solutions have been added.
- Sets, attempts, bookmarks and pause state persist in this browser. Export progress JSON includes history and grading.

Verification:
Run node tests/practice.test.cjs for the timer and practice-state regression checks.

Application pages:
Open index.html for the dashboard. Navigation uses distinct hash URLs (works without a server):
#dashboard - overall progress, accuracy and topic overview
#bank - searchable question library and filters
#topics - focused topic set setup
#random - randomly sampled practice set setup
#revision - incorrect and bookmarked questions
#test - focused question view with independent navigation sidebar
#results - current set results and question breakdown
Browser Back/Forward is supported. Timers run only on the test screen.
js/pages.js owns page navigation and page-specific UI. Existing browser progress remains compatible.
