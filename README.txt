CAT Quant Studio - version 3
============================

RUN
Open index.html directly in a current browser. No account, installation, CDN,
API key or network connection is needed for practice.
Alternatively, run npm start (or node scripts/serve.cjs) and open
http://127.0.0.1:4173. Use the same URL and browser to retain local progress.
Browser storage for a file URL and a localhost URL is separate; transfer it
using Settings > Export full backup and Import / merge backup.

CONTENT
123 handout-labelled CAT PYQs across the five Arithmetic 1 topics.
All keys match the supplied PDF. Q79's unrelated section introduction has
been removed. No additional original or foundation questions are included.
Five concept guides, worked solutions, hints and editorial difficulty/time
estimates support the supplied PYQs.
Diagnostics sample one PYQ per topic. Timed module tests sample 22 PYQs;
they are not intact official sections or full-syllabus mocks.
Older backups automatically retain PYQ progress and remove retired authored
question entries. Mixed sessions/reports retain their PYQs and are labelled
"PYQs retained"; report scores are recomputed for the retained questions.

MODES
Learn: select an answer, then Submit answer. Immediate feedback; pause;
progressive hints; optional scratchpad; solution coach; personal reflections.
Active time excludes hidden tabs, explicit pauses and time after submission
or while the solution is visible. Leaving and reloading preserves drafts.

Timed practice: configurable countdown, mixed questions and deferred feedback.
Save & next records an answer. Direct question jumps discard unsaved changes.
The countdown keeps running across tab changes, navigation and reloads.

CAT sectionals: 22 questions with 14 MCQs and 8 TITA, using a CAT 2025
historical preset of 40 minutes. Extra-time practice preset: 53:20. Correct +3,
incorrect MCQ -1, incorrect TITA 0, unanswered 0. Saved answers marked for
review are scored. Questions are editable until completion. No hints,
solutions, topic labels, notes or pausing during the sectional. A calculator,
question overview and numeric keypad are provided. At expiry, saved answers
are submitted automatically, including if the app is reloaded after expiry.
Confirm target-year official rules and accommodations at https://iimcat.ac.in/.
This is a practice approximation, not a certified replica of the CAT client.

LEARNING RECORD
Each set is a separate session. Browsing and starting another learning set
preserves previous sessions. Only one sectional may run at once.
Personal reflections autosave as you type. Exact year and slot filters help
you choose handout questions. Small filtered pools adjust the set-size limit.
Completed reports preserve their recorded answers, score, timing and order.
Sectionals finished before expiry are explicitly labelled as early exits.
Retries never rewrite those reports or erase earlier mistakes.

Assistance stays attached to the attempt, even after hiding a solution.
Reading a solution after submission does not change that completed attempt,
but future attempts are labelled as previously seen. Old imported attempts
have unknown exposure history and are excluded from first-exposure accuracy.

Wrong, assisted, uncertain, guessed or slow answers need review. Exam answers
have unknown confidence, so they also enter review. Unanswered questions
flagged for review remain on the attention list. An independent, confident,
timely success on or after the due date can resolve a weakness. Immediate
retries do not prove retention. Review intervals default to 1, 3, 7, 14 days
and are configurable. No CAT percentile is inferred from these scores.

BACKUP, RESTORE AND PRIVACY
Progress stays in localStorage. Export full backups regularly. Import checks
the schema and offers merge or restore, with a pre-import recovery copy in
localStorage under cat_quant_before_import. The legacy v1 key is retained,
and its progress and active draft are migrated automatically on the same URL.
Legacy exported progress JSON is also supported.
If browser storage fails, a visible warning offers export. When another tab
writes progress, this tab stops saving to avoid overwriting it; export if
needed, then reload. Corrupted stored data is preserved for recovery.

Manual device transfer uses export/import. Save to backup file uses the file
picker where supported, with a download fallback. Automatic cloud sync is
not provided: it requires an account/backend service. No credentials or
student work are sent anywhere. The approach coach is an authored guide,
not a connected AI model. Content issue reports stay local until exported.
External reference links are available on the Sources page.

PERFORMANCE AND ACCESSIBILITY
No runtime dependencies, external fonts or requests. Question lookup uses a
Map. Bank pages contain at most 20 rows. Search and saving are debounced.
Clocks update text nodes instead of rendering the question again. Timed
state uses an absolute deadline; active-time saves are batched every 5 seconds
and flushed on visibility changes/page exit. Solutions render on request.
Desktop navigation, a compact mobile question drawer, adjustable question
text, keyboard controls, focus indicators, native accessible dialogs and
status announcements are included. Calculator keys also accept typing.

DEVELOPMENT
js/questions.js: supplied handout data
js/learning.js: handout explanations and concept guides
js/content.js: handout-only question bank
js/core.js: DOM-free attempt/session engine, validation and migration
js/pages.js: page renderers
js/app.js: routing, delegated UI events, persistence and clock coordination
css/styles.css: responsive app and practice workspace

VERIFICATION
npm test
  Engine/state tests and independent content checks using only Node.js.

npm install
npm run test:browser
  Browser tests require playwright-core and a locally installed Chrome.
  Set CHROME_PATH if Chrome is installed elsewhere. Tests launch a temporary
  localhost server and isolated browser contexts; screenshots go to artifacts/.
  No student browser profile is used. The tests cover desktop/mobile routes,
  submitting, hints, retries, saved sessions, reloads, CAT control behaviour,
  expiry, imports and content issues.

The original pre-upgrade source is backed up alongside the project as
arithmetic1-before-cat-upgrade.zip.
