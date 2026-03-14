# Research Synthesis: Making Superbuilders Genuinely Educational

A combined analysis of authoritative research, current codebase architecture, and critical reflection on what specific changes will measurably improve early childhood math and literacy learning outcomes in Superbuilders.

This document serves two purposes: (1) determining **why** each change should be made (the research), and (2) providing the architectural context for **how** each change maps to this codebase, so that implementation plans can be generated directly from each section.

---

## The Central Problem

Superbuilders currently operates as a **camera-verified worksheet** in math mode and a **visual pattern-matching exercise** in spelling mode.

**Math mode loop:**

```
Show arithmetic prompt → detect tile → celebrate or reveal answer → next round
```

The game engine (`game-reducer.ts`) cycles through six phases: idle → countdown → scanning → success/timeout → session-end. Difficulty (`difficulty.ts`) adjusts operand ranges via a 3-correct-up / 2-wrong-down streak counter (`PROMOTE_THRESHOLD = 3`, `DEMOTE_THRESHOLD = 2`). Problems (`problem-generator.ts`) are randomly generated within those ranges. Feedback (`FeedbackOverlay.tsx`) is purely motivational ("Great job!" / "Keep trying!") with star rewards (3/2/1 by attempt count). The child's only cognitive task is: read the equation, produce the answer, place a tile.

**Spelling mode loop:**

```
Show word as text ("DOG") → child finds letter tiles D, O, G → camera recognizes match → celebrate
```

The spelling game (`SpellingScreen.tsx`) displays the full word as bordered letter boxes. The child copies the visible word with physical letter tiles. There are no images, no audio, no phonemic scaffolding, no progressive reveal. The word pool is 28 words (8 two-letter, 20 three-letter CVC). There is no difficulty progression — words are selected randomly within the pool. The cognitive task is visual pattern matching: see "D-O-G", find tiles labeled D, O, G. No phonological analysis is required or prompted.

**The research is unambiguous that both modes are insufficient.**

For math: Outhwaite et al. (2023) found that **explanatory feedback + motivational feedback + programmatic levelling** was a *necessary condition* for apps that produced significant learning gains. Superbuilders has motivational feedback only, weak levelling, and zero explanatory feedback.

For spelling: The IES/WWC Foundational Reading Skills guide (K-3) gives **Strong Evidence** ratings to teaching phonemic awareness with sound-letter links (Rec 2) and to teaching decoding AND encoding (Rec 3). Ehri (2014) established that orthographic mapping — the mechanism by which words become permanent sight words — requires the child to **produce the spelling from phonological analysis, not copy it from a visible model**. The current spelling game shows the word in full, eliminating the phonological retrieval step that causes learning.

The question is not whether to change. It is what to change, in what order, and how to avoid doing harm.

---

## Part 1: The Research Base

### 1.1 Math sources

Not all citations carry equal weight. These are ranked by methodological strength and relevance:

| Source | Type | Why it matters |
|---|---|---|
| **IES/WWC, Teaching Math to Young Children** | Federal practice guide (evidence-rated) | Five recommendations directly applicable. The closest thing to a government-issued checklist for early math apps. [Link](https://ies.ed.gov/ncee/wwc/PracticeGuide/18) |
| **Outhwaite et al. 2023** | Content analysis + qualitative comparative analysis | The only systematic analysis answering "what design features make children's math apps produce real learning?" Found explanatory + motivational feedback + levelling as necessary. Only 2/25 apps supported adult-child interaction. [Link](https://discovery.ucl.ac.uk/id/eprint/10170561/) |
| **Clements & Sarama / Learning Trajectories** | Research-based curriculum framework | The most authoritative work on what to teach and in what order for ages 3-8. Building Blocks is the curriculum most aligned to what Superbuilders could become. [Link](https://www.learningtrajectories.org/) |
| **Ramani & Siegler (2008)** | Controlled experiment | Four 15-minute sessions of a linear number board game eliminated SES gaps in numerical estimation. Spatial layout of number representations matters, not just the numbers themselves. [Link](https://pubmed.ncbi.nlm.nih.gov/18439085/) |
| **Carbonneau, Marley & Selig (2013)** | Meta-analysis | Manipulatives help on average, but effects are moderated by instructional design. Physicality is conditional, not automatic. The tile is not the moat; what the tile represents is the moat. [Link](https://eric.ed.gov/?id=EJ1007941) |
| **Schiffman et al. (2018)** | Controlled experiment | Linear-spatial materials promoted count-on strategies over count-all. Directly actionable: how tiles are laid out changes what strategies children use. [Link](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0208832) |
| **My Math Academy (Bang et al.)** | Two ESSA Tier 1 RCTs | Mastery-based, adaptive, embedded-assessment system. After ~5 hours: treatment students significantly outperformed controls on TEMA-3. Gains strongest where there was more room to grow. [Link](https://link.springer.com/article/10.1007/s10643-022-01332-3) |
| **Marx et al. (2025)** | Systematic review of 18 math apps | 0 of 18 apps implemented systematic part-whole learning. An identified market gap and pedagogical gap. [Link](https://dx.doi.org/10.29333/iejme/15677) |
| **Baroody et al. (2016)** | Controlled experiment on digital software | Software targeting the rationale of subtraction-as-addition was "significantly more efficacious in promoting fluency with unpracticed subtraction items" than drill. [Link](https://link.springer.com/article/10.1007/BF03172907) |
| **Berkowitz et al. (2015)** | RCT | Math-at-home app increased math achievement. Parent-child math interaction mediated by an app produces real gains. [Link](https://pubmed.ncbi.nlm.nih.gov/26702458/) |
| **Skene et al. (2022)** | Meta-analysis | Guided play outperformed direct instruction on early math and shape knowledge. [Link](https://www.jaacap.org/article/S0890-8567(22)00020-2/fulltext) |
| **Kindergarten math anxiety (2024)** | Cross-sectional study | Math anxiety is measurable at age 5. Person-focused negative attributions predict avoidance. [Link](https://doi.org/10.3389/fpsyg.2024.1335952) |
| **Hirsh-Pasek et al. (2015) / Griffith et al. (2021)** | Framework + systematic review | Four Pillars: active, engaged, meaningful, socially interactive. 73-87% of "educational" apps score low on all four. Seductive details actively harm learning. [Link](https://pmc.ncbi.nlm.nih.gov/articles/PMC8099083/) |
| **Frontiers (2023) ECE math review** | Systematic review | ECE math interventions produce mean effect size g = 0.76. Individualized instruction on single content areas produces strongest results. [Link](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.1229849/full) |

### 1.2 Literacy sources

| Source | Type | Why it matters |
|---|---|---|
| **IES/WWC Foundational Reading Skills (K-3)** | Federal practice guide (evidence-rated) | Rec 2 (Strong Evidence): phonemic awareness + sound-letter links. Rec 3 (Strong Evidence): decoding AND encoding. Encoding is not supplementary — it is half the mandate. [Link](https://ies.ed.gov/ncee/wwc/practiceguide/21) |
| **Ehri (2014)** | Foundational theory paper | Orthographic mapping requires: (1) phonemic segmentation/blending ability, (2) grapheme-phoneme knowledge, (3) the child must retrieve spelling from memory, not copy a visible model. The memory retrieval step is what creates the permanent word bond. [Link](https://www.tandfonline.com/doi/abs/10.1080/10888438.2013.819356) |
| **Weiser & Mathes (2011)** | Review of Educational Research | Synthesized 11 studies: encoding instruction produced significant positive effects on phonemic awareness, spelling, decoding, fluency, comprehension, and writing. Encoding and decoding are "reciprocally (or even synergistically)" related. [Link](https://journals.sagepub.com/doi/10.3102/0034654310396719) |
| **Johnston & Watson (2004) / Clackmannanshire study** | Longitudinal controlled experiment | Synthetic phonics (grapheme-phoneme) vs. analytic phonics (word families) in 5-year-olds over 16 weeks. Synthetic group ended spelling 7 months ahead of chronological age; analytic groups 2-3 months behind. Effect sizes increased over 7 years of follow-up. [Link](https://www.thereadingleague.org/wp-content/uploads/2020/10/Brady-Expanded-Version-of-Alphabetics-TRLJ.pdf) |
| **NASET: Elkonin Boxes** | Systematic review | Evidence supports word boxes for "helping preschool to elementary students acquire phonemic awareness, letter-sound correspondences, and spelling." [Link](https://www.naset.com/publications/ld-report/evidence-based-practice-research-elkonin-boxes/) |
| **LSHSS (2023)** | Longitudinal study | Nonword spelling is "a unique predictor of later reading and played a facilitative role in the emergence of decoding" — above and beyond phonemic awareness and letter-sound knowledge alone. [Link](https://pubs.asha.org/doi/10.1044/2023_LSHSS-22-00161) |
| **Clark & Paivio (1991) / Dual Coding Theory** | Foundational theory | Verbal label + visual image creates two independent memory codes. One of the most replicated findings in educational psychology. [Link](https://nschwartz.yourweb.csuchico.edu/Clark%20&%20Paivio.pdf) |
| **Picture-text compounds review (2023)** | Review of 37 experiments | 64.9% of studies showed detrimental effects of pictures on word-reading performance. Children who cannot decode use images as a word-bypass strategy. Pictures help vocabulary/meaning but can harm phonological development if misused. [Link](https://link.springer.com/article/10.1007/s42822-023-00139-0) |
| **TUI systematic review (Springer 2021)** | 155 studies (2001-2019) | Physical manipulatives outperform classical methods. PhonoBlocks (3D letter tiles) produced "significant learning gains" for letter-sound correspondences. [Link](https://link.springer.com/article/10.1007/s00779-021-01556-x) |
| **Ouellette & Sénéchal** | Controlled experiment | Invented-spelling training produced greater phonemic awareness gains than controls and "learned to read more words in a learn-to-read task." Effect on PA is "comparable to that achieved through explicit phonemic awareness curriculum." [Link](https://www.sciencedirect.com/science/article/abs/pii/S0959475205000939) |

### 1.3 Audio/multimodal sources

| Source | Type | Key finding |
|---|---|---|
| **TTS meta-analysis (PMC5494021)** | Meta-analysis | No significant comprehension difference between TTS and human voice — but studied grade 3 through college, not ages 5-6. Does not address isolated phoneme production. [Link](https://pmc.ncbi.nlm.nih.gov/articles/PMC5494021/) |
| **Mayer's Cognitive Theory of Multimedia Learning** | Foundational theory | Temporal contiguity principle: audio + visual must be synchronized within ~500ms. Spatial contiguity: text and related image must be adjacent. [Link](https://learning-theories.com/cognitive-theory-of-multimedia-learning-mayer.html) |
| **Multimodal Literacy (Springer 2020)** | Literature review | Combining visual + tactile + auditory channels improves acquisition over single-channel instruction, especially for initial grapheme-phoneme learning. [Link](https://link.springer.com/article/10.1007/s10643-019-00974-0) |

---

## Part 2: Converging Principles

Across these sources, seven principles emerge:

**Principle 1: Content must follow a developmental trajectory, not be a bag of random problems.**
The WWC math guide's first recommendation: "Teach number and operations using a developmental progression." Clements and Sarama's entire program is built on learning trajectories — sequenced progressions where each level builds on the last. The current app generates random arithmetic within operand ranges (`problem-generator.ts:45-83`). A child at difficulty 1 and difficulty 5 performs the same cognitive task (produce a sum) with different numbers. The leverage is in sequencing the *type of mathematical thinking* — comparison, composition, decomposition, missing part — not scaling number size.

**Principle 2: Feedback must explain, not just celebrate.**
Outhwaite 2023: explanatory + motivational feedback + levelling was necessary in effective apps. The current `FeedbackOverlay.tsx` has motivational text only. On timeout, "The answer is [X]" — a bare fact with no explanation of *why*. The Timeback/Superbuilders philosophy calls for "faultless communication" and worked examples. The app doesn't practice what its philosophy preaches.

**Principle 3: Physical materials help only when they reveal mathematical structure.**
Carbonneau's meta-analysis: manipulatives outperform abstract instruction on average, but effects depend on design. The current tiles are input devices — the child places a tile in a generic "Put your answer here" zone. The tile doesn't reveal magnitude, composition, or part-whole structure. It's a slower version of tapping a number on screen.

**Principle 4: Mastery tracking should be granular, not a blunt streak counter.**
My Math Academy (ESSA Tier 1) uses embedded assessment, mastery gating, and adaptive placement. The current `difficulty.ts` has a 3-right-up / 2-wrong-down counter with no memory across sessions. It cannot distinguish fluency from luck and treats all problem types identically.

**Principle 5: Encoding (spelling from sound) is how children learn to read — not copying visible words.**
Ehri (2014): the memory retrieval step creates the orthographic bond. Weiser & Mathes (2011): encoding and decoding are reciprocally related. The IES reading guide rates encoding as Strong Evidence. The current spelling game shows the full word — the child copies a visual pattern. No phonological analysis occurs. The mechanism that causes literacy learning is bypassed entirely.

**Principle 6: Audio is not optional for ages 5-6.**
For pre-readers, spoken language is the primary encoding channel. Mayer's temporal contiguity: audio + visual must synchronize within ~500ms. Dual coding theory: physical tile (tactile) + spoken phoneme (auditory) + printed letter (visual) creates triple encoding. A spelling game with no audio is playable only by children who can already read — defeating its purpose.

**Principle 7: Engagement is not a proxy for learning.**
A 2024 study found preschoolers were *less* likely to prefer apps with higher expert-rated educational value. Confetti and stars are fine as motivational feedback, but they cannot be the primary signal the product is working. The right metrics are strategy improvement, reduced support needed, and performance on novel items.

---

## Part 3: Math Mode — What Must Change

### 3.1 Explanatory feedback and graduated hints

**Research basis:** Outhwaite 2023 (necessary condition). WWC Recommendation 3. Sweller's expertise reversal effect: explanations help novices but become extraneous load for experts.

**Research confidence:** HIGH — the single strongest finding from the app-evaluation literature.

**What the app does now:** `FeedbackOverlay.tsx` has three states:
- **Correct:** Random celebration text (`CELEBRATION_TEXTS` at L9-16) + star count + confetti. No explanation.
- **Timeout:** Random encouragement (`ENCOURAGEMENT_TEXTS` at L18-24) + "The answer is [X]" (L167-171). A bare fact, not an explanation.
- **Tile-seen:** "I see [digit]!" (L194). Good — instant acknowledgment.

**What must change:** Add a hint escalation system that responds to how the child is doing, not just whether they're right:

| Context | Feedback Level | Example |
|---|---|---|
| Correct, first attempt, lower difficulty | Full explanation | "3 + 4 = 7. Three, then four more: four, five, six, seven!" |
| Correct, first attempt, higher difficulty | Brief confirmation | "Seven! Fast!" |
| Correct after retry | Process praise | "You figured it out! Seven!" |
| Wrong tile detected (stable wrong answer) | Notice prompt | "You made 8. We need 7. Try again!" |
| Timeout, first occurrence | Strategy hint | "Try counting on from 3." |
| Timeout, repeated | Worked support | "Let's do it together: 3, then 4 more: 4, 5, 6, 7. The answer is 7." |

The fade schedule matters: full explanations at early difficulty, progressively briefer as mastery grows. This matches both Outhwaite's finding and Sweller's expertise reversal effect.

**Architecture requirement:** The "wrong tile detected" row requires a non-trivial change. Currently, `processMathDetections` in `game-store.ts` (L124-175) checks `values.includes(problem.answer)` — it knows when the answer matches but doesn't surface *what* the child placed when it doesn't match. The temporal buffer (`temporal-buffer.ts`) already stabilizes any detected value and is generic over `T`. The main change: `processDetections` must track "stable wrong answer" as a distinct state. The temporal buffer's `TILE_SEEN` event already fires on any stable detection — the game store just needs to stop discarding non-matching values and instead surface them as `wrongTileSeen`.

**Code touchpoints:**
- `FeedbackOverlay.tsx` — new feedback content, new component variants
- New `src/engine/explanation-generator.ts` — content generation by problem type + difficulty + attempt
- `game-store.ts` L124-175 — surface wrong-answer detections alongside correct matches
- `temporal-buffer.ts` — no change needed (already generic; `TILE_SEEN` fires on any stable value)
- `types/game.ts` — extend `FeedbackState` to carry wrong-answer context

---

### 3.2 Camera uncertainty language

**Research basis:** Math anxiety measurable at kindergarten age (DOI:10.3389/fpsyg.2024.1335952). Person-focused negative attributions predict avoidance. The immutable rule — "all game feedback must be child-friendly" — logically extends to the absence of feedback during recognition struggles.

**Research confidence:** HIGH (converging evidence from math anxiety onset, attribution theory, competence fragility).

**What the app does now:** The temporal buffer (`temporal-buffer.ts` L36-42) tracks `missStreak` internally and hard-resets after `MAX_CONSECUTIVE_MISSES = 2`. When the camera can't see a tile, the system goes silent. From a 5-year-old's perspective, silence = "I got it wrong."

**What must change:** When `missStreak > 0` during scanning, show system-attribution language:
- "Hold your tile flat so I can see it"
- "Move your tile into the box"
- "Let me look again..."

This language blames the **system** ("let me look"), not the **child**.

**Architecture requirement:** Minimal. The temporal buffer already has the data — `missStreak` exists but is not exposed publicly. Add a one-line accessor: `missStreak(): number`. The game store surfaces this to React. `GameScreen.tsx` renders uncertainty prompts when `missStreak > 0` during scanning phase.

**Code touchpoints:**
- `temporal-buffer.ts` — expose `missStreak()` accessor (1 line)
- `game-store.ts` — surface miss data to React
- `GameScreen.tsx` — render uncertainty prompts in scanning phase

---

### 3.3 Missing-addend problems (part-whole reasoning)

**Research basis:** Marx et al. (2025): 0/18 reviewed math apps implemented systematic part-whole learning. Clements & Sarama: composition and decomposition are foundational operations preceding arithmetic fluency. WWC recommends teaching composition and decomposition. Baroody (2016): software targeting subtraction-as-addition rationale was "significantly more efficacious in promoting fluency with unpracticed subtraction items" than drill.

**Research confidence:** HIGH — systematic review gap (0/18 apps) + controlled experiment on the exact mechanism.

**What the app does now:** Only "produce the sum/difference" tasks. No missing-addend, no composition, no decomposition.

**What must change:** Add a missing-addend problem type: "3 + ? = 7"

This is the single highest-leverage new problem type because:
- It uses existing single-tile detection (child places one tile — `MAX_ANSWER = 9` constraint preserved)
- The CV pipeline needs zero changes
- It requires part-whole reasoning: "7 is made of 3 and what?"
- It's a fundamentally different cognitive operation from "3 + 4 = ?" even though the answer is the same

**Special case — Make-10:** "7 + ? = 10" is a special case of missing-addend and a Grade 1 CCSS standard (1.OA.C.6). Research confirms it as foundational for Grade 2 mental arithmetic strategies.

**Architecture requirement:**

The `Problem` type (`types/game.ts` L13-19) needs expansion. Currently: `{ left, right, operator, answer, displayAnswer }`. A missing-addend problem needs to indicate which position is unknown. The simplest extension:

```typescript
interface Problem {
  // existing fields preserved
  readonly unknownPosition?: "answer" | "left" | "right";
}
```

When `unknownPosition === "right"`, `ProblemDisplay.tsx` renders "3 + ? = 7" and validation checks `detected.includes(problem.right)` instead of `detected.includes(problem.answer)`. Generation: create a normal addition problem, then designate one operand as unknown.

**Critical reflection:** This looks small — "just" a different presentation. But the cognitive operation is categorically different. "3 + 4 = ?" requires forward computation. "3 + ? = 7" requires inverse reasoning — understanding that 7 decomposes into 3 and something. This is the foundation of algebraic thinking.

**Code touchpoints:**
- `types/game.ts` — add `unknownPosition` to `Problem`
- `problem-generator.ts` — new `generateMissingAddend()` function (~20 lines) + `MissingAddendMode` GameMode
- `ProblemDisplay.tsx` — conditional rendering when `unknownPosition` is set
- `game-store.ts` — validate against the unknown operand when `unknownPosition !== "answer"`
- `FeedbackOverlay.tsx` — explanatory content specific to part-whole reasoning
- `TapToStart.tsx` — UI button or trajectory auto-selection

---

### 3.4 Enable subtraction (already implemented)

**Research basis:** Carpenter & Moser (1984): take-away subtraction (result-unknown) is the correct first subtraction model for ages 5-6. The developmental sequence is: join-result → separate-result → join-change-unknown (missing addend) → compare → separate-start-unknown.

**Research confidence:** HIGH — Carpenter/Moser is foundational longitudinal work.

**What the app does now:** `SubtractionMode` is fully implemented in `problem-generator.ts` L65-98 with difficulty-scaled operand ranges (left operand up to 18, answer always 0-9). It is **not exposed in the UI** — `TapToStart.tsx` hardcodes `AdditionMode`.

**What must change:** Add a subtraction button to the start screen. This is the lowest-effort math improvement available — the code exists, it just needs a UI surface.

**Code touchpoints:**
- `TapToStart.tsx` — add button, add `handleSubtractionStart()` that dispatches `START_SESSION` with `modeName: "Subtraction"`

---

### 3.5 Do NOT add multiplication or numbers above 9 as answers

**Research basis:**

**Multiplication:** The WWC math practice guide (IES PG-18) covers pre-K through kindergarten and does not mention multiplication. Nunes & Bryant (1996) and the Nuffield Foundation synthesis: formal multiplicative thinking as a distinct operation is not reliable until ages 7-9. Rushing it produces "serious blunders."

**Multi-digit answers:** Two cognitive development studies (PMC9177579, PMC4460578) found syntactic place value understanding ("52" = 5 tens + 2 ones) doesn't reliably emerge until Grade 2, age 7-8. Kindergarteners are at ~66-70% accuracy on multi-digit numeral interpretation.

**Conclusion:** The existing `MAX_ANSWER = 9` constraint in `problem-generator.ts:7` is pedagogically sound, not just a technical limitation. The current design already shows two-digit numbers on screen for subtraction operands (e.g., "12 - 5 = ?") — display is fine, requiring production of multi-digit answers is premature. The research says: change the *type of mathematical thinking* (part-whole, missing addend, comparison), not the number range.

---

### 3.6 Learning trajectory redesign

**Research basis:** Clements & Sarama developmental progressions. WWC Recommendation 1. DREME systematic review confirms trajectories as the field's best-supported sequencing framework.

**Research confidence:** HIGH — the most-replicated structural finding in early math education.

**What must change:** Redesign math mode around task families, not just arithmetic with different numbers:

| Stage | Task Family | Concept | Example | Single-Tile? |
|---|---|---|---|---|
| 1 | Show a number | Numeral recognition | "Show me 4" | Yes |
| 2 | Compare | Magnitude comparison | "Which is more: 3 or 7?" | Yes |
| 3 | Make a total | Composition (sums ≤ 5) | "2 + 3 = ?" | Yes |
| 4 | Make 5 / Make 10 | Benchmark composition | "4 + ? = 5" | Yes |
| 5 | Missing part | Part-whole reasoning | "3 + ? = 8" | Yes |
| 6 | Take away | Subtraction as removal | "7 - 3 = ?" | Yes |
| 7 | Mixed fluency | All types, randomized | Varies | Yes |

Every stage uses a single-tile answer. What changes is the cognitive operation.

**Architecture requirements — what's genuinely hard:**

1. **The `Problem` type needs to expand.** A comparison problem ("which is bigger?") doesn't have a natural `operator`. A "show me 4" task doesn't have `left` and `right`. The cleanest approach is a discriminated union of task types, but that refactors every place that reads `problem.left`, `problem.right`, `problem.operator` — game reducer, FeedbackOverlay, ProblemDisplay, CountdownTimer, GameScreen all access these fields. This is moderate-effort.

2. **The `GameMode` interface needs rethinking.** Currently (`problem-generator.ts` L87-99): `{ name, operator, generate, validate }`. The `operator` field assumes arithmetic. For the trajectory, each stage needs its own generate/validate pair. The interface is flexible enough — `generate` and `validate` can do anything — but `operator` should become optional.

3. **Progression logic lives nowhere today.** Advancing between stages (comparison → addition → missing part) requires a trajectory tracker — a new concept that knows which stage the child is in and when to advance. This is the learner model (3.7).

4. **Content volume increases.** Each task family needs: generator, validation, display rendering, feedback text, explanatory content. Build iteratively — start with stages 3-5 (building on existing addition), expand outward.

**Code touchpoints:**
- `types/game.ts` — Problem type refactor (discriminated union or extended interface)
- `problem-generator.ts` — new generators per task family
- `ProblemDisplay.tsx` — new renderers per task type
- `FeedbackOverlay.tsx` — stage-appropriate feedback
- `difficulty.ts` — refactored or replaced by trajectory module
- `CountdownTimer.tsx` — problem generation routing
- `game-store.ts` — mode routing

---

### 3.7 Local mastery model and spaced review

**Research basis:** My Math Academy ESSA Tier 1 RCTs. Frontiers (2023): individualized instruction produces strongest effects (g = 0.76 mean). The current streak counter cannot distinguish fluency from luck.

**Research confidence:** HIGH for principle. MODERATE for specific thresholds (need testing with real children).

**What must change:** Build a skill-level mastery tracker persisted in localStorage:

```
Skills: numeral-recognition, comparison, make-5, make-10,
        count-on-addition, missing-part, simple-subtraction, mixed-fluency

Per skill:
  attempts, successes, consecutiveCorrect,
  lastPracticed (timestamp),
  masteryLevel: "new" | "learning" | "practiced" | "mastered"
```

Session problem selection: ~70% current frontier skill, ~20% review of mastered skills (least recently practiced), ~10% preview of next stage.

**Architecture notes:** localStorage is fine (< 10KB). The mastery model replaces the role of `difficulty.ts` — progression between stages is driven by mastery data, not streaks. Must be built *after* the trajectory (3.6).

**Code touchpoints:**
- New `src/engine/learner-model.ts` — mastery tracking + persistence
- New `src/engine/problem-selector.ts` — session problem selection with review scheduling
- `difficulty.ts` — refactored or replaced
- `session.ts` — record skill-level outcomes
- `game-reducer.ts` — integrate learner model updates

---

### 3.8 Strategy trace capture

**Research basis:** Schiffman: strategy changes (count-all → count-on → decomposition → retrieval) matter more than correctness. Clements & Sarama: trajectories defined by observable strategy states. My Math Academy: embedded assessment feeds adaptive teaching.

**Research confidence:** HIGH for principle. MODERATE for implementation.

**What must change:** Extend per-round data from `{ problem, stars, durationMs }` to include:

```typescript
interface RoundTrace {
  problem: Problem;
  stars: 1 | 2 | 3;
  durationMs: number;
  firstDetectedValue: number | null;     // What tile was first seen
  selfCorrected: boolean;               // Did child change their tile?
  hintLevelReached: 0 | 1 | 2 | 3;     // How much help needed
  msToFirstDetection: number | null;    // Hesitation before first placement
  wrongAttemptsBeforeCorrect: number;
}
```

These traces feed the mastery model: a child who self-corrects is learning. A child who needs hints every time hasn't mastered. A child whose response time drops is building fluency.

**Architecture notes:** This is infrastructure, not user-facing. The app already has most of the data — `tileSeen` tracks first detection, `attemptNumber` counts retries, `durationMs` is captured. The main additions: recording wrong values (temporal buffer's `TILE_SEEN` already fires), tracking self-correction, recording hint level.

**Code touchpoints:**
- `types/game.ts` — extend `RoundResult`
- `game-store.ts` — capture trace data during detection
- `game-reducer.ts` — store traces in round results
- `src/engine/learner-model.ts` — consume traces

---

### 3.9 Mathematical language

**Research basis:** Math language (more, fewer, altogether, part, whole) predicts math development (DOI:10.3389/fpsyg.2020.01925). Purpura: this is part of the learning mechanism, not decoration. WWC recommends using mathematical language throughout instruction.

**Research confidence:** MODERATE-HIGH (correlational evidence strong, causal evidence growing).

**What must change:** Add natural-language prompts alongside symbolic display:

| Task | Symbol | Language |
|---|---|---|
| Addition | 3 + 4 = ? | "How many altogether?" |
| Subtraction | 7 - 3 = ? | "How many are left?" |
| Missing part | 3 + ? = 7 | "What's the missing part?" |
| Comparison | 3 ○ 7 | "Which is more?" |
| Make 5 | 4 + ? = 5 | "How many more to make five?" |

In feedback, use vocabulary: "Three and four make seven altogether!" — not just "Great job!". Language prompts should be visually secondary (smaller font, muted color) and fade at higher mastery to avoid cognitive overload.

**Code touchpoints:**
- `ProblemDisplay.tsx` — add language text per problem type
- `FeedbackOverlay.tsx` — vocabulary in explanations

---

### 3.10 Instructional tile layouts (visual scaffolds)

**Research basis:** Ramani & Siegler: linear representations produce gains. Schiffman: linear-spatial materials promote better strategies. Carbonneau: manipulatives help when they reveal structure.

**Research confidence:** HIGH for principle. MODERATE for visual-scaffold-only implementation.

**What must change:** Replace the generic "Put your answer here" zone with task-appropriate visual structures:

| Task | Layout | What it reveals |
|---|---|---|
| Show a number | Simple centered zone | Neutral — just numeral recognition |
| Compare | Two side-by-side zones | Spatial ordering = magnitude |
| Make a total | Horizontal bar, split, one filled | Part-whole structure visible |
| Make 5/10 | Five-frame or ten-frame, partially filled | Benchmark numbers as patterns |
| Missing part | Part-whole bar, one part showing, one empty | The gap IS the problem |
| Take away | Full bar with portion crossed out | Subtraction as removal |

**Critical design decision:** Use layouts as visual scaffolds only — don't require zone-based tile placement. The layout shows structure; the child places their tile in the general detection area. This captures most of the value without requiring the CV pipeline to map bounding box positions to specific zones. Zone-based detection can be added later.

Ramani & Siegler's linear number games didn't require precise placement — they used a board as a *visual and spatial context* for number interaction. The visual scaffold approach follows the same principle.

**Code touchpoints:**
- `GameScreen.tsx` — render task-appropriate layouts
- New `src/components/TaskLayout.tsx` — layout components per task family
- `ProblemDisplay.tsx` — integrate with layout context

---

### 3.11 Adult co-play prompts

**Research basis:** Berkowitz et al. (2015): math-at-home app increased achievement. Outhwaite 2023: only 2/25 apps supported adult interaction. Process-oriented prompts work; directive commands don't.

**Research confidence:** MODERATE (principle strong, specific in-app mechanism less validated).

**What must change:** Add optional prompts at session summary:
- "Ask your child: 'How did you figure that out?'"
- "Try: 'Can you show me another way to make 7?'"

Constraints: maximum one prompt per session, visually distinct from child content, process-oriented only, dismissible.

**Code touchpoints:**
- Session summary component — add prompt section
- New `src/engine/adult-prompts.ts` — prompt pool + selection

---

## Part 4: Spelling Mode — What Must Change

### 4.1 Redesign as progressive encoding (the core change)

**Research basis:** Ehri (2014): orthographic mapping requires retrieving spelling from phonological analysis, not copying. IES/WWC Rec 2 (Strong Evidence): phonemic awareness + sound-letter links. IES/WWC Rec 3 (Strong Evidence): teach encoding. The Four Pillars framework: passive placement (copying) fails Active Learning (Pillar 1).

**Research confidence:** HIGH — IES Strong Evidence rating + Ehri's foundational theory.

**What the app does now:** `SpellingScreen.tsx` displays the full word as letter boxes (L115-130). The child copies it. No phonological analysis is required or prompted. This is taxonomically a copying task, not an encoding task.

**What must change — the progressive scaffold:**

| Attempt | Child sees/hears | What's hidden | Stars | Cognitive task |
|---|---|---|---|---|
| 1st | Image of object + spoken word + phoneme segmentation | Word NOT shown as text | 3 | Full phonological encoding (Ehri's orthographic mapping cycle) |
| 2nd | Image + first letter revealed ("D _ _") | Rest hidden | 2 | Partial encoding with phonological anchor |
| 3rd | Full word shown + audio | Nothing hidden | 1 | Supported copying (still places tiles physically) |

This maps onto the existing 3/2/1 star system. The scaffold fades support as attempts increase — matching Sweller's expertise reversal and the existing retry mechanic. Physical tile placement at every level still exercises the motor-phonological binding that TUI research validates.

**Critical age consideration:** Only 29% of 5-year-olds can blend individual phonemes. Only 7% can segment them (NSPT4Kids normative data). The progressive scaffold isn't optional — it's what makes the game playable for the youngest users. Without it, attempt 1 (no visible word) is too hard for most 5-year-olds. With it, the scaffold catches them at attempt 2 or 3.

**Architecture requirements:**

The `SpellingProblem` type (`types/game.ts` L23-26) needs expansion:

```typescript
interface SpellingProblem {
  readonly word: string;
  readonly letters: readonly string[];
  readonly imageAsset?: string;         // Path to illustration
  readonly pronunciationId?: string;    // Sound ID for Howler
}
```

`SpellingScreen.tsx` needs substantial redesign:
- Replace static letter-box display with conditional rendering based on `attemptNumber`
- Attempt 1: show image + play audio, no text
- Attempt 2: show image + first letter + blanks
- Attempt 3: show image + full word

The `attemptNumber` is already tracked in the scanning phase (`GamePhase` L43-45: `{ phase: "scanning"; problem: Problem; attemptNumber: number }`). Currently, spelling mode skips to a new word on timeout. The redesign changes this: spelling timeouts should retry the same word with more scaffolding (matching math mode's retry behavior).

**Code touchpoints:**
- `types/game.ts` — extend `SpellingProblem`
- `SpellingScreen.tsx` — major redesign (~150 lines changed)
- `game-reducer.ts` L155-163 — change spelling timeout to retry same word (like math), not skip to new word
- `spelling-words.ts` — extend word pool with image/audio metadata
- New image assets — ~28 illustrations in `public/images/`

---

### 4.2 Add audio (pre-recorded, not TTS)

**Research basis:** Mayer's temporal contiguity principle. Dual coding theory (Clark & Paivio 1991). Multimodal literacy review (Springer 2020). For pre-readers ages 5-6, the spoken word is the primary encoding channel — without audio, the game is only playable by children who can already read.

**Research confidence:** HIGH — Mayer and Paivio are among the most replicated findings in educational psychology.

**Why NOT TTS:** No TTS system can produce clean isolated consonant phonemes. Stop consonants become /buh/, /duh/, /kuh/ — adding a trailing schwa. A child who hears /buh/-/u/-/s/ cannot blend it to "bus." This is a phonics-breaking failure, not a quality preference. Every major phonics app (Teach Your Monster to Read, Homer, Phonics Hero) uses pre-recorded human voice.

**Why NOT Web Speech API on iPad Safari:** Multiple production-grade bugs:
- iOS mute switch silences SpeechSynthesis but not Web Audio (Howler) — unpredictable silence
- SpeechSynthesis stops working when Safari is backgrounded mid-speech
- `SpeechSynthesisUtterance` objects garbage-collected before completion
- No phoneme-level control, no SSML `<phoneme>` support

**The right approach: Howler.js audio sprites.**

The app already uses Howler.js (`sound-manager.ts`). The existing code comment at L27-30 notes the migration path to sprites. The implementation:

Recording scope for the current 28-word pool:
- ~20 isolated letter phonemes (only letters appearing in the words)
- ~28 whole-word pronunciations
- ~10 instruction phrases ("Your word is...", "You spelled it!", "Listen again...")
- Total: ~60 clips, ~250KB as a single MP3 sprite
- Recording time: 1-2 hours with a voice actor

**Alternative to voice actor:** Neural cloud TTS (ElevenLabs, Google Cloud TTS) run at **build time**, output committed as static MP3/M4A files. Acceptable for whole words and instruction phrases. For isolated phonemes, a human recording or phonics-specific audio library is still preferable because of the schwa problem.

**Playback sequence per round:**
1. Round start: "Your word is BUS" (whole word) + image appears
2. Tile detected: "/b/!" (individual phoneme, within ~500ms per Mayer's temporal contiguity)
3. Completion: "/b/-/u/-/s/... BUS! You spelled it!" (blending + celebration)

**Technical notes:**
- Lazy-load the phonics Howl only in spelling mode to avoid overhead in math mode
- The existing `unlockAudio()` in TapToStart handles iOS AudioContext unlocking
- `setupVisibilityResume()` in `sound-manager.ts` L111-131 handles iOS backgrounding
- The known Safari sprite bug (Howler issue #316) only occurs in HTML5 Audio fallback; since the existing code correctly unlocks AudioContext, Web Audio mode is active and the bug does not apply

**Code touchpoints:**
- `sound-manager.ts` — add phonics sprite Howl, add `playPhoneme(letter)` and `playWord(word)` functions
- New audio assets in `public/sounds/phonics.{mp3,m4a}` (sprite) + sprite definition JSON
- `SpellingScreen.tsx` — trigger audio on round start and tile detection
- `game-store.ts` — trigger phoneme audio on `TILE_SEEN` events in spelling mode

---

### 4.3 Add images for spelling words

**Research basis:** Dual coding theory (Clark & Paivio 1991): verbal + visual = two independent memory codes, better retrieval. Spatial contiguity (Mayer): text and image must be adjacent.

**Critical caveat — picture dependency risk:** A review of 37 picture-text experiments found 64.9% showed **detrimental effects** on word-reading performance when pictures were present. The mechanism: children who cannot decode use the image as a word-bypass strategy — they guess from the picture instead of analyzing letters. The strategy appears to work in pictured contexts but no orthographic mapping occurs.

**Resolution:** Use pictures to scaffold word **meaning** (semantic function), not as a cue for which letters to select (phonological function). Present image + spoken word **before** the encoding attempt at round start. During tile placement (attempt 1, where no text is shown), the image provides semantic context but cannot reveal the spelling. On attempt 3 (when the full word is shown), the image reinforces the meaning-spelling connection.

**Image requirements:**
- ~28 simple, unambiguous illustrations (one per word in current pool)
- SVG or optimized PNG, no animation
- Clear single-object depiction (a dog, not "dogs playing"; a bus, not a parking lot)
- Must avoid label ambiguity: the image of a bus should not be interpretable as "school bus" or "vehicle" — the spoken word at round start disambiguates

**Code touchpoints:**
- New assets in `public/images/words/` — 28 illustrations
- `spelling-words.ts` — extend word pool entries with `imageAsset` paths
- `SpellingScreen.tsx` — render image in prompt area

---

### 4.4 Missing-letter mode (phonemic segmentation)

**Research basis:** IES/WWC Rec 2 (Strong Evidence): phonemic awareness, specifically segmentation. Elkonin sound boxes (NASET systematic review): "evidence to support the use of word boxes for helping preschool to elementary students acquire phonemic awareness, letter-sound correspondences, and spelling." Colorado DPI and CEEDAR publish Say-It-Move-It as a formal K-2 instructional routine, noting blending and segmenting are "the phonemic awareness skills with the most impact on later reading ability."

**Research confidence:** HIGH — WWC Strong Evidence + multiple systematic reviews.

**What it is:** Show "B _ S" with a bus image + audio "bus... what's the middle sound?" Child places the U tile. Single-tile answer — same detection pipeline as math mode.

**Developmental progression (based on phonemic awareness sequence):**

1. **Final sound isolation:** "CA_" → child places T. Easiest — final sounds are most acoustically salient.
2. **Initial sound isolation:** "_ AT" → child places C. Second — initial sounds are next most salient.
3. **Medial sound isolation:** "C _ T" → child places A. Hardest — medial vowels are last to develop phonemically.

This progression follows the documented developmental sequence: children reliably identify initial/final sounds (age 5-5.5) before medial sounds (age 5.5-6.5).

**Architecture requirement:** This is the "missing-addend of spelling." Architecturally identical to missing-addend math problems. The CV pipeline detects a single letter tile (classId 10-35, already supported). Validation checks if the detected letter matches the missing position.

**CVC word ordering (from research):**
- **Vowel introduction order:** a → i → o → e → u (Fairleigh Dickinson Center for Dyslexia Studies). Rationale: minimize acoustic confusion between similar vowels; /i/ and /e/ are most confused, placed non-adjacent.
- **Organize by vowel sound, not by word family.** Johnston & Watson (2004/Clackmannanshire): synthetic phonics (grapheme-phoneme focus) outperformed analytic phonics (word family focus). Spelling 7 months ahead of chronological age vs. 2-3 months behind. Mechanism: word-family-only instruction allows children to shortcut medial vowel analysis.
- **Practical implication:** Mix words from different word families within the same vowel session. A session targeting short /a/ might include: CAT, BAT, FAN, VAN — different rimes, same vowel.

**Code touchpoints:**
- `types/game.ts` — extend `SpellingProblem` with `missingPosition?: number`
- `spelling-words.ts` — new `generateMissingLetterProblem()` function
- `SpellingScreen.tsx` — render word with blank at `missingPosition`
- `game-store.ts` — validate single-letter detection against the missing letter
- `TapToStart.tsx` — UI surface (or integrated as a progression stage within spelling)

---

### 4.5 Do NOT add a word-to-image matching mode

**Research basis:** The IES/WWC K-3 reading guide gives Strong Evidence to sound-letter links and decoding/encoding, while vocabulary/language work is important but rated as weaker evidence. A generic word-to-picture game targets receptive vocabulary, not the stronger phonics/encoding pathway.

**Additional reasons:**
- **Different CV problem:** Recognizing "a picture of a firetruck" from a physical card is categorically harder than recognizing printed digits/letters. Different training data, different model architecture, much lower accuracy ceiling.
- **Different physical product:** Requires image cards (firetruck, bus, dog), not letter/number tiles. Different manufacturing, inventory, packaging.
- **Unclear learning value for ages 5-8:** Word-to-image matching (receptive vocabulary) is more of a 3-5 year old activity. By 5-6, most children know what a bus looks like.

**Recommendation:** If vocabulary/comprehension is desired later, implement it as a secondary mode after the core math and phonics improvements are complete. Use controlled labels + audio, because images are ambiguous (bus vs. school bus, dog vs. puppy).

---

## Part 5: Changes That Apply to Both Modes

### 5.1 Tile placement as representation, not just input

**Research basis:** Carbonneau meta-analysis: physicality is conditional on instructional design. Schiffman: linear-spatial materials change strategies. TUI systematic review (2021): physical manipulatives + feedback outperform classical methods.

**Current state:** Tiles are input devices in both modes. The child places a tile to "type" their answer. The tile's position carries no mathematical or linguistic meaning.

**Target state:**
- **Math:** Instructional layouts (3.10) make placement visually meaningful. A five-frame layout makes "make 5" structurally visible.
- **Spelling:** Letter boxes that accept tiles in sequence make positional encoding meaningful. When detecting letter B in the leftmost position of "B-U-S," the spatial position reinforces the sequential nature of spelling.

This distinction — input device vs. representation — determines whether the physical-digital hybrid has genuine educational value or is just a novelty layer.

---

### 5.2 The existing detection constraints and how they shape design

**What the YOLO model actually supports:**
- Input: 640×640 pixels (letterbox-resized)
- Output: `[1, 14, 8400]` — 14 = 4 box coords + 10 class channels, 8400 anchor points
- Confidence threshold: 0.5 (`postprocessing.ts:18`)
- NMS IoU threshold: 0.45 (`postprocessing.ts:21`)
- Class ranges: digits 0-9 (math mode) or letters A-Z classId 10-35 (spelling mode), switched via `setClassRange()` in `App.tsx` L107-111
- Temporal stability: 3 consecutive matching frames required (`REQUIRED_CONSECUTIVE_FRAMES = 3`)
- Miss tolerance: 2 consecutive null frames before hard reset (`MAX_CONSECUTIVE_MISSES = 2`)

**Practical detection limit:** 2-5 tiles survive confidence filtering + NMS per frame. This is not a hard model limit — it's a function of physical tile density, overlap, and camera resolution.

**Design constraint for all changes:** Every new problem type must work with **single-tile answers** (one tile placed, one value detected). Multi-tile answers introduce ordering ambiguity the interpretation layer isn't designed for. All proposed changes in this document respect this constraint.

**The interpretation layer** (`interpretation.ts`) currently groups adjacent detections into multi-digit candidates and filters by expected digit count. For spelling's missing-letter mode, the pipeline switches to letter detection (classId 10-35) and expects a single letter — same detection pipeline, different class range.

---

## Part 6: What NOT to Do

The research is as clear about what to avoid as about what to pursue:

1. **Don't add more spectacle to compensate for weak pedagogy.** The 2024 children's-preference study found children prefer apps with *lower* expert-rated educational value. The Four Pillars framework (Griffith et al. 2021): seductive details actively harm learning. If the response to "kids aren't learning enough" is "make it more magical," that's wrong.

2. **Don't add content volume without trajectory and mastery model.** 500 random arithmetic problems is not better than 50 well-sequenced ones. Volume without structure is drill. Marx et al. (2025): every app they reviewed had this same flaw.

3. **Don't push harder arithmetic before part-whole reasoning is solid.** Multi-digit addition before composition/decomposition produces procedural mimicry, not understanding. Go wide (more concept types) before deep (harder numbers).

4. **Don't add multiplication.** Not developmentally appropriate for ages 5-7 per WWC and Nunes/Bryant.

5. **Don't use TTS for phoneme audio.** The schwa problem (/buh/ instead of /b/) breaks phonics instruction. Pre-recorded audio or build-time neural TTS only.

6. **Don't use Web Speech API on iPad Safari.** Production-grade bugs: mute switch behavior, backgrounding crashes, garbage collection of utterances, no SSML phoneme support.

7. **Don't show images as letter-selection cues.** 64.9% of picture-text studies found detrimental effects on word reading (Springer 2023 review). Images for meaning scaffolding only — never as a bypass for phonological analysis.

8. **Don't apply anti-gaming logic designed for older students to 5-year-olds.** Exploration is not gaming. A child who tries 3, then 5, then 4 for "3 + ? = 7" may be exploring the number space. Penalizing exploration trains compliance, not competence.

9. **Don't optimize for session length, repeat play, or star counts as proof of learning.** These are engagement metrics. The right metrics: first-attempt success rate by concept, strategy improvement over sessions, reduced support needed, performance on novel items.

10. **Don't treat the spelling game as the primary pedagogy story.** The math improvements have far stronger research backing and a larger opportunity space. Spelling should be improved, but it is secondary.

---

## Part 7: Critical Tensions and Honest Tradeoffs

### Tension 1: Direct Instruction precision vs. guided play agency

The Timeback philosophy leans toward DI-style precision: faultless communication, mastery gating, worked examples. Skene (2022) meta-analysis: guided play outperformed direct instruction on early math.

**Resolution:** Guided precision inside playful action. The task architecture is precise (trajectory, mastery gating, explanatory feedback). The child's experience feels playful (physical tiles, warm language, no rigid pacing). The child has agency within a structured path. This is what guided play actually means.

### Tension 2: Tiles as input device vs. tiles as representation

If tiles are just a slower way to enter numbers, the physicality adds only novelty. Carbonneau: manipulatives help *when they reveal target structure*.

**Resolution:** Instructional layouts transform tiles from input devices into representations. Placing 4 into the empty part of a "3 + ? = 7" bar is building a part-whole relationship, not entering a number. Without layouts, the tiles are an input device. With them, the tiles are a representation.

### Tension 3: Pictures help vocabulary but harm phonological development

Dual coding says images improve retention. The 37-study review says 64.9% of picture conditions hurt word reading.

**Resolution:** Use images for semantic scaffolding (meaning), not phonological cueing (letter selection). Show image + spoken word at round start. During encoding (tile placement), the image provides context but cannot reveal the spelling. The spoken word is the phonological cue, not the picture.

### Tension 4: Building before validating

Several changes are substantial (trajectory, mastery model, progressive encoding). The risk is building sophistication that doesn't improve learning — the same trap the engagement research warns about.

**Resolution:** Build incrementally, test each layer:
1. Explanatory feedback + camera uncertainty: test whether verbal reasoning improves, not just accuracy.
2. Missing addend: test whether children solve novel part-whole problems they haven't seen.
3. Progressive encoding in spelling: test whether children can spell words without seeing them after practice.
4. Trajectory + mastery: test whether sequence produces faster mastery and better retention.

"Test" here means: observe 5-10 children using it. Qualitative observation catches gross misalignment before larger investment.

### Tension 5: The spelling game age range

The current CVC words (CAT, DOG, SUN) are appropriate for ages 5-6 as encoding practice with phonics scaffolding. By ages 7-8, these words are well below grade level. The game doesn't currently serve 7-8 year olds on the literacy side.

**Resolution:** Don't raise the age range to justify the current game. Redesign the game to earn the age range. For ages 6-8, the mode should progress toward: CVC → CVCC/CCVC (simple clusters) → digraphs → CVCe (silent-e). The IES guide explicitly includes daily connected text as part of the larger reading picture. A CVC-only spelling game is appropriate as a starting level, not as the entire literacy experience.

---

## Part 8: Implementation Order

These changes have dependencies. The right order is:

### Phase 1: Feedback foundations (prerequisites for everything else)

| # | Change | Section | Effort | Depends on |
|---|---|---|---|---|
| 1 | Explanatory feedback + graduated hints | 3.1 | Medium | Nothing |
| 2 | Camera uncertainty language | 3.2 | Low | Nothing |
| 3 | Mathematical language in prompts | 3.9 | Low | 3.1 (same files) |
| 4 | Enable subtraction (UI button) | 3.4 | Very low | Nothing |

**Phase 1 rationale:** Explanatory feedback is the single most impactful change and prerequisite for the hint system. Camera uncertainty is lowest-effort, highest-safety-margin. Both can ship together. Subtraction is already built.

### Phase 2: Spelling redesign

| # | Change | Section | Effort | Depends on |
|---|---|---|---|---|
| 5 | Add audio to spelling (Howler.js sprites) | 4.2 | Medium | Nothing |
| 6 | Add images for spelling words | 4.3 | Medium | Asset creation |
| 7 | Redesign spelling as progressive encoding | 4.1 | High | 4.2, 4.3 |
| 8 | Missing-letter mode | 4.4 | Medium | 4.2 (needs phoneme audio) |

**Phase 2 rationale:** Audio and images are prerequisites for progressive encoding. Missing-letter is the "missing-addend of spelling" — highest-leverage single addition. The progressive encoding redesign is the structural change that transforms spelling from copying to learning.

### Phase 3: Math content trajectory

| # | Change | Section | Effort | Depends on |
|---|---|---|---|---|
| 9 | Missing-addend problems | 3.3 | Low-Medium | Nothing |
| 10 | Learning trajectory redesign | 3.6 | High | 3.3 (proof point for type system) |
| 11 | Instructional layouts (visual scaffolds) | 3.10 | Medium | 3.6 (needs task families) |

**Phase 3 rationale:** Missing-addend validates the Problem type expansion needed for the full trajectory. The trajectory is the structural change that transforms math mode from random drill to developmental progression. Layouts give the tiles mathematical meaning.

### Phase 4: Adaptive intelligence

| # | Change | Section | Effort | Depends on |
|---|---|---|---|---|
| 12 | Strategy traces | 3.8 | Medium | 3.1 (hint tracking) |
| 13 | Local mastery model | 3.7 | High | 3.6 (needs skill stages) |

**Phase 4 rationale:** Strategy traces require the hint system to exist (so hint level can be recorded). The mastery model requires the trajectory stages to exist (so there are skills to track mastery of).

### Phase 5: Social layer

| # | Change | Section | Effort | Depends on |
|---|---|---|---|---|
| 14 | Adult co-play prompts | 3.11 | Low | 3.6, 3.7 (prompts reference skills) |

---

## Part 9: Unknown Unknowns

These are things the research cannot fully answer and that will need to be discovered through implementation and observation:

1. **Optimal hint timing for camera-based interaction.** The graduated hint research was conducted in screen-tap apps where wrong answers are unambiguous. In Superbuilders, there's a gray zone between "child placed wrong tile," "camera can't see the tile," and "child hasn't placed any tile yet." The hint trigger thresholds may need tuning differently from screen-tap contexts.

2. **Whether progressive encoding works without verbal instruction.** Ehri's orthographic mapping cycle includes a teacher saying the word and guiding phoneme analysis. The app replaces the teacher with audio. Whether pre-recorded audio is sufficient to guide phonological analysis in a 5-year-old without an adult present is not established by the research we have.

3. **Physical tile availability.** The current word pool assumes children own letter tiles A-Z. If children share tile sets or have incomplete sets, missing-letter mode (which requires one specific tile) is more robust than full-word spelling (which requires 3 specific tiles). But we don't know what tile sets families actually have.

4. **Image illustration ambiguity.** A picture of a "mug" could be interpreted as "cup." A picture of a "pen" could be confused with "pencil." The spoken word disambiguates, but if a child's audio is off, the image alone may mislead. The word pool may need curation for visual distinctiveness.

5. **Mastery thresholds.** The specific numbers (70% for "practiced," 90% for "mastered," 3 consecutive correct) are reasonable starting points borrowed from adaptive learning literature, but the right thresholds for this specific product with this age range need empirical tuning.

6. **Detection reliability with letter tiles vs. number tiles.** The YOLO model was primarily trained on number tiles. Letter recognition may have different accuracy characteristics — certain letters may be confused (E/F, M/W, p/q) at rates different from digit confusion. This affects which spelling activities are reliable enough to deploy.

7. **Howler.js sprite performance with ~60 clips.** The existing setup uses individual Howl instances per sound (5 sounds). A sprite with 60 clips is architecturally different. While Howler.js documentation supports this pattern well, latency characteristics on iPad Safari with a larger sprite file should be validated.

8. **Whether math language prompts cause cognitive overload in 5-year-olds.** Purpura's research shows math language predicts development, but the research is on teacher-delivered language, not on-screen text. Whether written math vocabulary competes for attention with the mathematical task in a 5-year-old is not established. Audio delivery would be preferable but requires the same phonics audio infrastructure.

---

## Part 10: Anchoring Sources (Complete Table)

### Math

| Source | URL | Used for |
|---|---|---|
| IES/WWC Teaching Math to Young Children | [ies.ed.gov/ncee/wwc/PracticeGuide/18](https://ies.ed.gov/ncee/wwc/PracticeGuide/18) | Five evidence-rated recommendations; product design checklist |
| Outhwaite et al. 2023 | [UCL Discovery](https://discovery.ucl.ac.uk/id/eprint/10170561/) | Explanatory + motivational + levelling = necessary |
| Clements & Sarama / Learning Trajectories | [learningtrajectories.org](https://www.learningtrajectories.org/) | Developmental progressions for content sequencing |
| Ramani & Siegler 2008 | [PubMed 18439085](https://pubmed.ncbi.nlm.nih.gov/18439085/) | Linear number games eliminate SES gaps |
| Schiffman et al. 2018 | [PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0208832) | Linear-spatial materials → better strategies |
| Carbonneau et al. 2013 | [ERIC EJ1007941](https://eric.ed.gov/?id=EJ1007941) | Manipulatives help conditionally |
| My Math Academy (Bang et al.) | [Springer](https://link.springer.com/article/10.1007/s10643-022-01332-3) | ESSA Tier 1 adaptive system |
| My Math Academy RCT (JREE) | [ERIC EJ1328299](https://eric.ed.gov/?id=EJ1328299) | Cluster RCT evidence |
| My Math Academy ESSA evidence | [evidenceforessa.org](https://www.evidenceforessa.org/program/my-math-academy/) | ESSA Tier 1 classification |
| Marx et al. 2025 | [IEJME](https://dx.doi.org/10.29333/iejme/15677) | 0/18 apps had part-whole; systematic review |
| Baroody et al. 2016 | [Springer EJPE](https://link.springer.com/article/10.1007/BF03172907) | Missing-addend software efficacy |
| Berkowitz et al. 2015 | [PubMed 26702458](https://pubmed.ncbi.nlm.nih.gov/26702458/) | Math-at-home app increased achievement |
| Skene et al. 2022 | [JAACAP](https://www.jaacap.org/article/S0890-8567(22)00020-2/fulltext) | Guided play > direct instruction |
| Kindergarten math anxiety 2024 | [Frontiers](https://doi.org/10.3389/fpsyg.2024.1335952) | Anxiety measurable at age 5 |
| Hirsh-Pasek / Griffith Four Pillars | [PMC 8099083](https://pmc.ncbi.nlm.nih.gov/articles/PMC8099083/) | Active, engaged, meaningful, social |
| Frontiers 2023 ECE math review | [Frontiers](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.1229849/full) | g = 0.76 mean; individualized strongest |
| Math language 2020 | [Frontiers](https://doi.org/10.3389/fpsyg.2020.01925) | Vocabulary predicts development |
| Children's app preferences 2024 | [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0747563224002292) | Children prefer lower-educational-value apps |
| PMC9177579 — Place value | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9177579/) | Multi-digit understanding not until Grade 2 |
| PMC4460578 — Numeral interpretation | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4460578/) | K at ~66-70% on multi-digit |
| Carpenter & Moser 1984 | Foundational longitudinal study | Subtraction developmental sequence |
| Nunes & Bryant 1996 | Nuffield Foundation synthesis | Multiplicative thinking age 7-9 |
| James-Brabham et al. 2025 | [Child Development](https://srcd.onlinelibrary.wiley.com/doi/full/10.1111/cdev.14162) | Home math activities meta-analysis |
| Nuffield Foundation ongoing | [nuffieldfoundation.org](https://www.nuffieldfoundation.org/project/can-maths-apps-add-value-to-learning) | Framework for evaluating app quality |

### Literacy

| Source | URL | Used for |
|---|---|---|
| IES/WWC Foundational Reading Skills K-3 | [ies.ed.gov/ncee/wwc/practiceguide/21](https://ies.ed.gov/ncee/wwc/practiceguide/21) | Rec 2 + Rec 3 Strong Evidence |
| Ehri 2014 | [Taylor & Francis](https://www.tandfonline.com/doi/abs/10.1080/10888438.2013.819356) | Orthographic mapping prerequisites |
| Ehri instructional guidelines | [Blog](https://understandingreading.home.blog/2021/04/18/dr-linnea-ehris-list-of-instructional-guidelines-for-enhancing-orthographic-mapping-and-word-learning/) | Three-step encoding cycle |
| Weiser & Mathes 2011 | [SAGE](https://journals.sagepub.com/doi/10.3102/0034654310396719) | Encoding-reading reciprocal relationship |
| Johnston & Watson 2004 (Clackmannanshire) | [TRL](https://www.thereadingleague.org/wp-content/uploads/2020/10/Brady-Expanded-Version-of-Alphabetics-TRLJ.pdf) | Synthetic > analytic phonics |
| NASET Elkonin Boxes | [naset.com](https://www.naset.com/publications/ld-report/evidence-based-practice-research-elkonin-boxes/) | Word boxes evidence |
| LSHSS 2023 | [ASHA](https://pubs.asha.org/doi/10.1044/2023_LSHSS-22-00161) | Spelling predicts later reading |
| Ouellette & Sénéchal | [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0959475205000939) | Invented spelling → PA gains |
| Clark & Paivio 1991 | [PDF](https://nschwartz.yourweb.csuchico.edu/Clark%20&%20Paivio.pdf) | Dual coding theory |
| Picture-text compounds 2023 | [Springer](https://link.springer.com/article/10.1007/s42822-023-00139-0) | 64.9% detrimental effects |
| TUI systematic review 2021 | [Springer](https://link.springer.com/article/10.1007/s00779-021-01556-x) | PhonoBlocks, physical literacy tools |
| Phonemic awareness by age | [NSPT4Kids](https://www.nspt4kids.com/parenting/phonemic-awareness-skills-by-age) | Developmental sequence + normative floors |

### Audio/Multimodal

| Source | URL | Used for |
|---|---|---|
| TTS meta-analysis | [PMC5494021](https://pmc.ncbi.nlm.nih.gov/articles/PMC5494021/) | TTS vs. human voice (grade 3+, not phonemes) |
| Mayer multimedia learning | [Link](https://learning-theories.com/cognitive-theory-of-multimedia-learning-mayer.html) | Temporal + spatial contiguity |
| Multimodal literacy 2020 | [Springer](https://link.springer.com/article/10.1007/s10643-019-00974-0) | Multi-channel > single-channel |
| Web Speech API | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) | Safari limitations |
| Safari Speech Synthesis bugs | [weboutloud.io](https://weboutloud.io/bulletin/speech_synthesis_in_safari/) | Production-grade failures |
| Howler.js | [GitHub](https://github.com/goldfire/howler.js/blob/master/README.md) | Audio sprite implementation |
| Howler sprite Safari bug #316 | [GitHub](https://github.com/goldfire/howler.js/issues/316) | Only in HTML5 fallback mode |

---

## The Bottom Line

Superbuilders has the architecture to be a genuinely educational product. The CV pipeline is solid. The game engine is clean and extensible. The immutable rules (child-friendly language, non-blocking CV, HTTPS) are the right constraints.

**For math mode**, three changes transform the product from a camera-verified worksheet into something the research says actually works:
1. **Explanatory feedback** — the single strongest finding from app-evaluation literature (Outhwaite 2023)
2. **Missing-addend problems** — minimal engineering for maximal pedagogical impact, closing a gap that 0/18 reviewed apps address (Marx et al. 2025)
3. **Learning trajectory** — the most-replicated structural principle in early math education (Clements/Sarama, WWC)

**For spelling mode**, two changes transform the product from visual pattern-matching into genuine literacy instruction:
1. **Progressive encoding with audio** — matches Ehri's orthographic mapping cycle, the mechanism by which words become permanent sight words
2. **Missing-letter problems** — targets phonemic segmentation, the bottleneck skill, with the same single-tile detection pipeline

**Across both modes**, the physical tiles become educationally meaningful only when they represent mathematical or phonological structure — not when they merely serve as input devices. The instructional layouts (math) and progressive scaffold (spelling) are what elevate the tangible interaction from novelty to genuine learning value.

Every change in this document stays within `MAX_ANSWER = 9`, uses single-tile detection, respects the existing architecture, and is backed by at least one source with Strong Evidence rating or systematic review. The research is unambiguous about direction. The remaining unknowns are in calibration — thresholds, timing, and age-specific tuning that require observation with real children.
