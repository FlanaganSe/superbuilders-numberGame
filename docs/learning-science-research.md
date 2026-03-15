# TileSight: Learning Science Research & Enhancement Guide

> The single reference for all education research, evidence-backed enhancement recommendations, and implementation guidance for TileSight — a camera-based tangible arithmetic and literacy game for ages 5-8.

**Last updated:** 2026-03-15
**Methodology:** Deep codebase analysis → authoritative research synthesis → targeted web research on UI/UX patterns → gap analysis → feasibility-prioritized recommendations. Every recommendation maps to specific code locations and cites authoritative primary sources.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [Evidence Base](#3-evidence-base)
   - [3.1 Why Early Math Matters](#31-why-early-math-matters)
   - [3.2 Learning Trajectories and Developmental Sequencing](#32-learning-trajectories-and-developmental-sequencing)
   - [3.3 Manipulatives and Physical Representation](#33-manipulatives-and-physical-representation)
   - [3.4 Guided Play](#34-guided-play)
   - [3.5 Feedback, Worked Examples, and Levelling](#35-feedback-worked-examples-and-levelling)
   - [3.6 Mathematical Language](#36-mathematical-language)
   - [3.7 Part-Whole Reasoning](#37-part-whole-reasoning)
   - [3.8 Strategy Traces](#38-strategy-traces)
   - [3.9 Math Anxiety, Attribution, and Affect](#39-math-anxiety-attribution-and-affect)
   - [3.10 Home and Adult Interaction](#310-home-and-adult-interaction)
   - [3.11 Spatial and Embodied Cognition](#311-spatial-and-embodied-cognition)
   - [3.12 App Design Evidence and Engagement](#312-app-design-evidence-and-engagement)
   - [3.13 Cognitive Load and Motivation](#313-cognitive-load-and-motivation)
   - [3.14 Retrieval, Spacing, and Mastery](#314-retrieval-spacing-and-mastery)
   - [3.15 Literacy and Phonics](#315-literacy-and-phonics)
   - [3.16 Audio and Multimodal Learning](#316-audio-and-multimodal-learning)
   - [3.17 Inclusive Settings and Trust](#317-inclusive-settings-and-trust)
4. [Product Implications](#4-product-implications)
5. [Gap Analysis: Research vs. Implementation](#5-gap-analysis-research-vs-implementation)
6. [Enhancement Recommendations](#6-enhancement-recommendations)
   - [Tier 1: Research-Critical Feedback](#tier-1-research-critical-feedback)
   - [Tier 2: Visual Scaffolds](#tier-2-visual-scaffolds)
   - [Tier 3: Polish and Adaptivity](#tier-3-polish-and-adaptivity)
   - [Tier 4: Strategic Upgrades](#tier-4-strategic-upgrades)
7. [Priority Matrix and Implementation Grouping](#7-priority-matrix-and-implementation-grouping)
8. [What NOT to Do](#8-what-not-to-do)
9. [Spiky Points of View](#9-spiky-points-of-view)
10. [Unknown Unknowns](#10-unknown-unknowns)
11. [Evaluation Framework](#11-evaluation-framework)
12. [Expert Profiles](#12-expert-profiles)
13. [Sources](#13-sources)

---

## 1. Executive Summary

TileSight already has real strengths: a clean on-device CV architecture, child-friendly feedback language with system-attribution for camera uncertainty, explanatory and motivational feedback, adaptive difficulty, and a codebase modular enough to support meaningful learning-science improvements without a rewrite.

**The biggest gap is not "more polish."** The biggest gap is that the current product mostly uses the physical tiles to submit answers, not to reveal mathematical structure. The strongest research-backed direction is to make the representation do more cognitive work while keeping the interface calm, playful, and explicit.

The highest-confidence product direction is:

1. **Keep the playful, camera-based tangible interaction** — it is already research-aligned.
2. **Fix critical feedback gaps** — process praise, visible worked examples, vocabulary rotation.
3. **Add the missing Representational stage** — number bonds, ten-frames, counting-on animations fill the CRA (Concrete-Representational-Abstract) gap.
4. **Add stronger guided attention to mathematical structure** — visual scaffolds that reveal part-whole relationships, not just confirm answers.
5. **Shift progression toward learning trajectories** — from generic difficulty ladder to skill-based mastery.
6. **Make feedback more explanatory early, then fade as mastery improves** — expertise reversal is already partially implemented; extend it.
7. **Improve onboarding and placement affordances** — pre-readers need demonstration, not instruction.

The codebase is in a clean state (331 tests passing, typecheck clean) and can support incremental, research-backed modifications.

---

## 2. Current State Assessment

### What TileSight Already Does Well (Research-Aligned)

These choices are directionally strong and must be preserved:

| Feature | Code Location | Research Basis |
|---|---|---|
| System-attribution camera prompts | `src/engine/camera-uncertainty.ts` | Math anxiety measurable at age 5 (Frontiers 2024) |
| Expertise reversal gating (fade explanations at L4+) | `src/engine/explanation-generator.ts:70-74` | Sweller's CLT (ADR-009) |
| Silent demotion (never show level-down) | `src/components/GameScreen.tsx:75-83` | Math anxiety research |
| Number word audio on correct answer | `src/components/GameScreen.tsx:140-150` | Mayer dual coding |
| Math language sub-prompts | `src/components/ProblemDisplay.tsx:44-52` | Purpura math vocabulary |
| Encouraging-only timeout messages | `src/components/FeedbackOverlay.tsx:19-28` | Child-friendly language (immutable rule) |
| 3-frame temporal buffer | `src/cv/temporal-buffer.ts` | Noise reduction without latency |
| Adaptive difficulty (promote 3, demote 2) | `src/engine/difficulty.ts` | Programmatic levelling (Outhwaite 2023) |
| Cream background | `src/index.css @theme` | Off-white > pure white for comprehension |
| `prefers-reduced-motion` respect | `MotionConfig` in components | Accessibility |
| Worker-based CV (never blocks UI) | `src/cv/inference.worker.ts` | Immutable rule #2 |
| Offline-first, no-cloud architecture | PWA + localStorage only | Privacy and trust advantage |
| Non-punitive tone throughout | All feedback components | Child-friendly language (immutable rule) |
| Missing Part mode | `src/engine/problem-generator.ts` | Part-whole reasoning (Marx et al. 2025) |
| Explanatory feedback on timeout | `src/engine/explanation-generator.ts` | Outhwaite et al. (2023) necessary condition |

### Where the App Falls Short

Despite strong foundations, several high-impact gaps exist between the research evidence and current implementation:

| Gap | Issue | Impact |
|---|---|---|
| **Outcome praise** | `FeedbackOverlay.tsx:13-18` uses only outcome praise ("Amazing!", "You got it!") | Critical |
| **Worked examples invisible** | Timeout explanation shown for ~2s — children cannot process this | Critical |
| **Fixed math vocabulary** | Same prompt per operator every time; children never encounter synonyms | High |
| **No pictorial representations** | No ten-frame, number bond, or counting-on animation (CRA gap) | High |
| **Streak-based difficulty, not mastery-based** | `difficulty.ts` uses only consecutive correct/wrong counts | High |
| **Tiles only confirm answers** | Physical tile placement rarely externalizes mathematical structure | High |
| **No onboarding for tile mechanic** | Pre-readers must figure out tile placement by trial | Medium |
| **No idle-state prompt** | Pulsing box only; no audio/visual escalation after extended silence | Medium |
| **Difficulty ignores response time** | Slow-correct conflated with fast-correct for promotion | Medium |
| **Uniform progress pips** | All same color; no performance quality signal | Low |
| **Session end = instant replay** | No spacing nudge; "Play More!" with no rest suggestion | Low |
| **No growth framing at session end** | Stars only; no first-try count or mastery signal | Low |
| **No adult/caregiver support** | 2/25 evaluated apps supported adult-child interaction | Low |
| **"Level N" is system-centric** | Not child-meaningful for ages 5-8 | Low |

---

## 3. Evidence Base

### 3.1 Why Early Math Matters

**School-entry math is the strongest predictor of later achievement** among the readiness skills studied across six longitudinal datasets (Duncan et al., 2007). This is the clearest justification for caring whether TileSight changes actual math understanding, not just engagement.

The National Research Council's *Mathematics Learning in Early Childhood* (2009) is the most authoritative field-level synthesis on early-childhood mathematics, equity, and instruction.

A 2023 Frontiers systematic review of ECE math interventions found a mean effect size of g = 0.76, with individualized instruction on single content areas producing the strongest results.

The NAEYC + NCTM joint position statement describes what high-quality mathematics education for ages 3-6 should look like and lays out 10 research-based recommendations for defining "developmentally appropriate."

The **IES/WWC Practice Guide, *Teaching Math to Young Children*** gives five evidence-rated recommendations for preschool through kindergarten math instruction. Its first recommendation: "Teach number and operations using a developmental progression." This is the closest thing to a government-issued checklist for early math apps.

### 3.2 Learning Trajectories and Developmental Sequencing

**Clements and Sarama's Learning Trajectories / Building Blocks** work treats early math as a sequence of developmental progressions and intentionally sequenced activities. This is the single most relevant research program for TileSight's content design. A product for ages 5-8 should start from magnitude, counting principles, comparison, and composition/decomposition, then move into more fluent addition/subtraction strategies.

Recent review work (Clements et al. 2024) continues to emphasize progression, intentional sequencing, and matching instruction to children's current developmental level.

**Product implication:** The current `problem-generator.ts` plus `difficulty.ts` pattern is a useful start, but it is not a learning trajectory. A streak-based 1-5 difficulty ladder is too coarse. TileSight should move toward skill progressions such as:

| Stage | Task Family | Concept | Example |
|---|---|---|---|
| 1 | Show a number | Numeral recognition | "Show me 4" |
| 2 | Compare | Magnitude comparison | "Which is more: 3 or 7?" |
| 3 | Make a total | Composition (sums ≤ 5) | "2 + 3 = ?" |
| 4 | Make 5 / Make 10 | Benchmark composition | "4 + ? = 5" |
| 5 | Missing part | Part-whole reasoning | "3 + ? = 8" |
| 6 | Take away | Subtraction as removal | "7 - 3 = ?" |
| 7 | Mixed fluency | All types, randomized | Varies |

### 3.3 Manipulatives and Physical Representation

**Carbonneau, Marley, and Selig (2013) meta-analysis:** Manipulatives outperform abstract-symbol-only instruction on average, but the effects are moderated by instructional design. The takeaway is not "physical is always better"; it is "physical can help when the representation is doing the right cognitive work." The tile is not the moat; what the tile represents is the moat.

**Cheung et al. (2023) on perceptually rich manipulatives:** Perceptually rich materials can distract and may produce smaller retention effects or even worse problem solving than blander manipulatives. Tile design and play-surface design matter more than most teams assume.

**Ramani and Siegler (2008) on linear numerical board games:** Four 15-minute sessions of a simple linear number board game eliminated low- vs. middle-income differences in numerical estimation. Linear magnitude representations tie to broader math outcomes.

**Schiffman et al. (2018) on linear-spatial materials for addition strategies:** Linear-spatial materials were more likely than irregular arrays to support better addition strategies like count-on, not just count-all. Directly actionable: how tiles are laid out changes what strategies children use.

**TUI systematic review (Springer 2021, 155 studies):** Physical manipulatives outperform classical methods. PhonoBlocks (3D letter tiles) produced significant learning gains for letter-sound correspondences.

**Tangible-user-interface research** argues TUIs may support early math because they combine physical objects with multimedia and can support home math interaction. But the evidence base is still emerging — validate empirically rather than assuming "physical + digital" is automatically superior.

### 3.4 Guided Play

**Skene et al. (2022) meta-analysis:** Guided play showed a greater positive effect than direct instruction on early math skills, shape knowledge, and task switching, and outperformed free play on spatial vocabulary.

The right product stance is **guided play, not drill and not free play.** The task architecture should be precise (trajectory, mastery gating, explanatory feedback), but the child's experience should feel playful (physical tiles, warm language, no rigid pacing). This is what guided play actually means: child agency within a structured path.

**Product implication:** The best version of TileSight is not an open-ended toy and not a drill worksheet with confetti. The child should be able to act quickly and physically. The interface should make the important relationship obvious. Prompts should guide attention, not overtalk. The system should scaffold without taking over.

### 3.5 Feedback, Worked Examples, and Levelling

**Outhwaite et al. (2023) content analysis + QCA:** The combination of explanatory + motivational feedback with programmatic levelling was a *necessary condition* for highly effective math apps. Most evaluated apps were practice-based, mostly targeted basic number skills, and only 2 of 25 included support for adult-child interactions. This is the single strongest finding from the app-evaluation literature.

**Outhwaite et al. (2019) RCT:** After a 12-week intervention, structured, content-rich interactive apps produced greater learning gains than standard math practice and generalized to higher-level reasoning/problem solving.

**My Math Academy / Bang et al.:** This personalized, mastery-based, adaptive system improved early math while keeping children engaged. Gains were strongest where there was more room to grow and on harder skills. Two ESSA Tier 1 RCTs; after ~5 hours, treatment students significantly outperformed controls on TEMA-3.

**Dweck (2007) — 6-study replication:** Outcome/intelligence praise ("Amazing!", "You got it!") causes children to avoid challenge, enjoy tasks less, and perform worse after failure. Process praise ("You figured it out!", "You counted on!") produces the opposite effect.

**Hwang & Kang (IJCCI 2023):** Elaboration feedback outperforms encouragement feedback, which outperforms verification feedback for preschoolers.

**Barbieri et al. (2023) — 85-study meta-analysis:** Worked examples reduce cognitive load during skill acquisition.

**JLS (2020) — Feedback neglect:** Children skip text-only feedback shown for less than ~3 seconds. Audio reduces neglect.

**Expertise reversal (Sweller):** Explanatory feedback helps novices but becomes extraneous load for experts. The fade schedule matters: full explanations at early difficulty, progressively briefer as mastery grows.

**Baroody et al. (2016):** Software targeting the rationale of subtraction-as-addition was "significantly more efficacious in promoting fluency with unpracticed subtraction items" than drill.

### 3.6 Mathematical Language

Math language — terms like *many, most, fewest, before, after, altogether, total, remain, difference* — predicts children's math development (Purpura et al., 2020). NCTM research shows children need exposure to 400+ math terms across their early years.

There is also evidence that children's language proficiency matters in app-based math learning in bilingual settings. Mathematical language is part of the learning mechanism, not decoration. Spaced exposure to synonyms during normal play is the lowest-cost way to build vocabulary breadth.

### 3.7 Part-Whole Reasoning

**Marx et al. (2025) systematic review:** 0 of 18 reviewed math apps implemented a systematic approach to part-whole learning from hands-on to more abstract compositions/decompositions. This is both a pedagogical gap and a market gap.

Missing-addend problems ("3 + ? = 7") require inverse reasoning — understanding that 7 decomposes into 3 and something. This is the foundation of algebraic thinking and a key differentiator for TileSight.

**Singapore Math CPA (Concrete-Pictorial-Abstract):** The tri-node number bond diagram (whole at top, two parts branching below) is the canonical pictorial representation for part-whole reasoning. The ten-frame is the single highest-evidence visual tool for ages 5-7 for building the relationship between a number and 10.

**IRIS Center at Vanderbilt:** Students using accurate visual representations are 6x more likely to correctly solve problems.

**Multi-digit constraint:** Current MAX_ANSWER=9 is pedagogically sound. Syntactic place value (tens/ones) not reliable until Grade 2 (age 7-8). Displaying two-digit operands on screen (as subtraction already does) is fine; requiring multi-digit tile answers is not appropriate for most of the 5-8 range.

**Multiplication:** Do not add for ages 5-8. Formal × operation not developmentally appropriate until 7-9 (Nunes & Bryant 1996).

### 3.8 Strategy Traces

Children's early addition strategies develop from count-all toward count-on, decomposition, and retrieval. Linear-spatial materials increase the use of more advanced strategies (Schiffman et al.). A camera-based tangible system has an unusual opportunity: it can log order of tile placement, hesitation, self-correction, rearrangement, and alternate solutions.

Strategy changes matter more than correctness for tracking genuine learning. What to capture:

- Latency before first tile appears
- Whether the child cycles through nearby wrong values
- Repeated target-confusion in missing-part tasks
- Stability versus hesitation
- Number of re-placements before commitment
- How often camera uncertainty interrupts otherwise-correct work

These signals can personalize hints, decide when to stay on a skill, improve session summaries for adults, and separate "math error" from "recognition trouble."

### 3.9 Math Anxiety, Attribution, and Affect

Math anxiety is measurable at age 5. Person-focused negative attributions ("You're not good at this") predict avoidance and poorer achievement. Process-focused responses support learning.

**Process praise in early years** predicts later incremental motivational frameworks. Person-focused responses in math contexts predict worse later adjustment/anxiety outcomes.

This has direct implications for error feedback and camera-uncertainty language: false negatives from recognition should be surfaced as system uncertainty ("Hold your tile flat so I can see it"), not child failure. A false negative experienced as "I'm bad at math" is a motivational event, not a technical bug.

**Wait-time research:** Children need an average of 4.8-6.6 seconds to begin a productive response to a prompt. The 10-second threshold is the empirically supported minimum before re-prompting. Dark patterns research classifies "Don't just stand there!" prompts as manipulative.

### 3.10 Home and Adult Interaction

**Berkowitz et al. (2015) RCT:** A math-at-home app increased math achievement. Parent-child math interaction mediated by an app produces real gains.

**Gibson et al.:** Parent number talk has causal evidence for improving preschool number knowledge (randomized intervention evidence).

**Parent praise style matters:** Process praise in early years predicts later incremental motivational frameworks. Person-focused responses in math contexts predict worse later adjustment/anxiety outcomes.

**Important trade-off:** Simple informational priming can increase math talk while also increasing parental control and reducing autonomy support. Adult scaffolds need careful wording: light-touch, process-oriented ("How did you figure that out?"), not controlling ("Do the math").

**James-Brabham et al. (2025):** Home math activities meta-analysis confirms the relationship between home math activities and children's math development.

### 3.11 Spatial and Embodied Cognition

Early spatial training transfers to math. Spatial assembly relates to emerging math as early as age 3. Semi-structured block play shows promising links to numeracy, math language, and executive function. Tile shape, spacing, and left-to-right layout may matter more than most teams assume.

Gesture research shows that asking children to gesture during math explanation can reveal implicit knowledge and support learning. Finger-training research suggests hands can bridge verbal, symbolic, and non-symbolic number representations. TileSight already uses hands; the question is whether it uses them pedagogically or only mechanically.

### 3.12 App Design Evidence and Engagement

**Hirsh-Pasek et al. (2015) / Griffith et al. (2021) Four Pillars:** Active, engaged, meaningful, socially interactive. 73-87% of "educational" apps score low on all four. Key failure modes: passive tapping with no thinking required (Pillar 1); seductive details and excessive rewards covering the screen (Pillar 2); no corrective/formative feedback — only motivational (Pillar 2).

**Children's app preferences (2024):** Preschoolers were less likely to prefer and repeatedly use apps that experts rated as having higher educational value. Engagement cannot be treated as equivalent to educational quality. The most "sticky" version of an app may not be the most educational version.

**Children's UX research (NN/G):** Children ages 3-6 cannot use text-based navigation. The 5-8 age range includes pre-readers who need interaction demonstration, not instruction. "Show, don't tell" is the universal children's UX principle.

**NAEYC technology guidance:** Technology is effective when used intentionally; security and parental control matter. A no-cloud architecture is a trust advantage only if paired with thoughtful design.

**MDPI Education Sciences eye-tracking (2023):** Children pay minimal attention to HUD incentive systems during active play, but DO look at progress elements co-located with the problem area.

### 3.13 Cognitive Load and Motivation

**Sweller / Cognitive Load Theory:** Design should clarify, not decorate. Distracting animations, colors, and characters consume working-memory bandwidth.

**Hinten meta-analysis on fantastical content:** Fantastical content had a negative immediate effect on young children's cognitive performance for ages 4-8. This supports "cognitive coherence" — realistic, concept-serving visuals rather than over-fantastical designs.

**Bardach and Murayama on rewards:** Rewards are not simply good or bad; they can be useful as an entry point, but should transform into competence-driven motivation. For ages 4-8, the strongest intrinsic motivator is the feeling of competence ("I did it!"), not digital stickers. The durable arc: competence, then confidence, then identity, then intrinsic motivation.

**Spontaneous focusing on numerosity (SFON):** Relates to early numerical skills and later arithmetic indirectly through magnitude estimation and calculation. A really strong product might change what children notice in everyday scenes, not just how they answer prompted items.

### 3.14 Retrieval, Spacing, and Mastery

**Roediger and Karpicke / Retrieval practice:** Retrieval practice is a powerful learning mechanism. However, retrieval practice after worked-example study does not automatically improve mathematical word-problem solving relative to restudy, especially for novices. "Retrieval-first" may need to become "retrieval when the representation and difficulty make it productive."

**Spacing effect (PMC 2012):** The spacing effect (distributing practice over time) is one of the most robust findings in learning science. A study with 5-7 year-olds found spaced presentation produced significantly higher generalization than massed presentation. Session duration doesn't predict effectiveness; content quality and distribution across days does.

**Dynamic Difficulty Adjustment (DDA) research:** Adding response time as a second dimension (fast correct vs. slow correct) produces measurably higher learning gains than correctness alone. My Math Academy's adaptive system (ESSA Tier 1) uses response time as part of its mastery model.

### 3.15 Literacy and Phonics

**IES/WWC Foundational Reading Skills (K-3):** Rec 2 (Strong Evidence): phonemic awareness + sound-letter links. Rec 3 (Strong Evidence): teach decoding AND encoding. Encoding is not supplementary — it is half the mandate.

**Ehri (2014):** Orthographic mapping requires: (1) phonemic segmentation/blending ability, (2) grapheme-phoneme knowledge, (3) the child must retrieve spelling from memory, not copy a visible model. The memory retrieval step is what creates the permanent word bond. TileSight's current spelling mode shows the word and has the child copy — this does NOT activate orthographic mapping.

**Phonemic awareness developmental sequence:** Age 5: only 29% can blend phonemes; 7% can segment. CVC words are the right difficulty floor. Kindergarten: rhyming, alliteration, syllables, introducing phoneme manipulation. Grade 1 (age 6-7): full phoneme blending and segmenting expected.

**Weiser and Mathes (2011):** Encoding instruction produced significant positive effects on phonemic awareness, spelling, decoding, fluency, comprehension, and writing. Encoding and decoding are "reciprocally (or even synergistically)" related.

**Johnston and Watson (2004) / Clackmannanshire study:** Synthetic phonics vs. analytic phonics in 5-year-olds over 16 weeks. Synthetic group ended spelling 7 months ahead of chronological age.

**Ouellette and Senechal:** Invented-spelling training produced greater phonemic awareness gains than controls.

**NASET Elkonin Boxes:** Evidence supports word boxes for "helping preschool to elementary students acquire phonemic awareness, letter-sound correspondences, and spelling." The tile-placement mechanic is already a validated phonological activity (physical Elkonin box). The pedagogy should exploit this explicitly.

**Picture-text compounds (2023 review of 37 experiments):** 64.9% showed detrimental effects of pictures on word-reading performance. Use pictures for semantic scaffolding (meaning), not as phonological cues (letter selection).

**Recommended spelling redesign — Progressive encoding with scaffolded hints:**
- Attempt 1: child encodes from spoken word + picture (pure OM — no word shown)
- Attempt 2: first letter revealed as hint
- Attempt 3: full word shown (still requires physical tile placement)
- Maps to existing 3/2/1 star system

### 3.16 Audio and Multimodal Learning

**Mayer's Cognitive Theory of Multimedia Learning:** Temporal contiguity: audio + visual must be synchronized within ~500ms. Spatial contiguity: text and related image must be adjacent.

**Multimodal literacy (Springer 2020):** Combining visual + tactile + auditory channels improves acquisition over single-channel instruction, especially for initial grapheme-phoneme learning.

**Clark and Paivio (1991) / Dual Coding Theory:** Verbal label + visual image creates two independent memory codes. One of the most replicated findings in educational psychology.

**TTS meta-analysis:** No significant comprehension difference between TTS and human voice, but studied grade 3 through college, not ages 5-6. Does not address isolated phoneme production.

**Why NOT TTS for phonemes:** No TTS system can produce clean isolated consonant phonemes. Stop consonants become /buh/, /duh/, /kuh/. A child who hears /buh/-/u/-/s/ cannot blend to "bus." Every major phonics app uses pre-recorded human voice.

### 3.17 Inclusive Settings and Trust

There is tangible-game work on math + sign language in inclusive settings. App-evaluation research explicitly includes security and parental control as dimensions. A no-cloud architecture is a trust advantage if treated as part of the pedagogy, not just the stack.

---

## 4. Product Implications

### Physical tiles should reveal structure, not just confirm answers

The strongest design direction is to make placement itself meaningful: linear arrangements, visible composition/decomposition, comparing two quantities, and "make the same total in two ways" tasks. Children learn more when the representation reveals the math, not when it merely decorates it. A tile placed into the empty part of a "3 + ? = 7" bar is building a part-whole relationship, not entering a number.

### Build around a learning trajectory, not a bag of arithmetic prompts

Content should follow a developmental progression, not be random problems with different numbers. The trajectory should sequence the type of mathematical thinking (see §3.2 table).

### Feedback must be explanatory and motivational, not merely celebratory

Early on, children need to know *why* a response is correct or incorrect; later, the system can fade explanation and lean on speed, confidence, and spaced review. Bare celebration ("Great job!") or bare fact revelation ("The answer is 7") is insufficient.

### Capture strategies, not just correctness

Log order of tile placement, hesitation, self-correction, hint level reached, and wrong attempts before correct. A child who self-corrects is learning. A child whose response time drops is building fluency. Strategy traces are a stronger educational instrument and a more defensible product differentiator than fast on-device inference.

### Surface camera uncertainty as system attribution

When recognition confidence is low, show language that blames the system, never the child. Already implemented — preserve this.

### Visuals should be cognitively coherent, not over-fantastical

Fantastical content has a negative immediate effect on young children's cognitive performance. The winning product is not the most dazzling; it is the one that spends every bit of attention budget on understanding.

### Competence should be the emotional center

For ages 4-8, the strongest intrinsic motivator is the feeling of competence. The child should leave feeling "I'm getting good at this," not "I'm good at farming stars."

### Do NOT add multiplication or multi-digit answers

Formal multiplicative thinking is not reliable until ages 7-9 (Nunes and Bryant). Syntactic place value understanding does not reliably emerge until Grade 2. The existing MAX_ANSWER = 9 constraint is pedagogically sound.

### Redesign spelling as progressive encoding

Replace visual copying with a scaffold that fades from full phonological encoding through partial encoding to supported copying. The tile-placement mechanic is already a validated Elkonin box activity.

### Add a light adult-scaffolding layer

Only 2/25 evaluated apps supported adult-child interaction. Process-oriented prompts are a genuine product opportunity, but must be light-touch and autonomy-supportive, not controlling.

---

## 5. Gap Analysis: Research vs. Implementation

| Gap | Research Finding | Current State | Impact |
|---|---|---|---|
| **Outcome praise undermines motivation** | Dweck (6-study replication): outcome praise → challenge avoidance | `FeedbackOverlay.tsx:13-18` uses only outcome praise | **Critical** |
| **Worked examples invisible** | Feedback neglect research: children skip text shown < 3s | `FeedbackOverlay.tsx` shows timeout explanation for ~2s | **Critical** |
| **Fixed math vocabulary** | NCTM: children need synonym breadth (400+ terms) | `ProblemDisplay.tsx:44-52` shows identical prompt every time | **High** |
| **Count sequence is flat text** | EEF/NZ curriculum: count-on hop must be visually modeled | `explanation-generator.ts:23-27` renders as static string | **High** |
| **No pictorial representation** | CRA framework: Concrete → Representational → Abstract | No ten-frame, number bond, or bar model anywhere | **High** |
| **Difficulty is streak-based, not mastery-based** | Learning trajectories (Clements/Sarama), DDA research | `difficulty.ts` uses only consecutive correct/wrong | **High** |
| **Tiles only confirm answers, don't reveal structure** | Manipulatives research: representation must do cognitive work | Tile = answer token, not learning scaffold | **High** |
| **No onboarding for tile mechanic** | NN/G: pre-readers need demonstration, not instruction | No tutorial for how to hold tiles to camera | **Medium** |
| **No idle-state prompt** | Wait-time research: 10s threshold before re-prompting | Pulsing box only; no escalation | **Medium** |
| **Difficulty ignores response time** | DDA: time is a second mastery dimension | `difficulty.ts` uses only correctness | **Medium** |
| **No confidence-aware CV UX** | Math anxiety: false-negative → self-attribution risk | Uncertainty only on tile-seen-then-lost, not on CV confidence | **Medium** |
| **No strategy telemetry** | Strategy changes predict learning better than correctness | Only correct/wrong recorded per round | **Medium** |
| **Uniform progress pips** | Eye-tracking: children look at co-located progress, not HUD | `ProgressPips.tsx` all same color | **Low** |
| **Session end = instant replay** | Spacing effect: distributed > massed practice | "Play More!" with no rest suggestion | **Low** |
| **No growth framing at session end** | Competence-driven motivation (Bardach/Murayama) | Stars only; no first-try count or mastery signal | **Low** |
| **No adult/caregiver prompts** | Parent number talk has causal upside; 2/25 apps have it | No support for adult interaction | **Low** |
| **"Level N" is not child-meaningful** | Research favors child-meaningful skill labels | System-centric label | **Low** |

---

## 6. Enhancement Recommendations

### Tier 1: Research-Critical Feedback

These changes fix the most impactful research gaps with the least effort. All are string/timing changes in existing files — no new components, no new dependencies.

#### 6.1 Process Praise over Outcome Praise

**Research:** Dweck's six-study replication found that outcome/intelligence praise ("Amazing!", "You got it!") causes children to avoid challenge, enjoy tasks less, and perform worse after failure. Process praise ("You figured it out!", "You counted on!") produces the opposite effect. Hwang & Kang (IJCCI 2023) found elaboration feedback outperforms encouragement feedback in preschoolers.

**Current state:** `FeedbackOverlay.tsx:13-18` defines:
```typescript
const CELEBRATION_TEXTS = ["Great job!", "You got it!", "Amazing!", "Awesome!", "Way to go!", "Super!"]
```
All six are outcome praise. The explanation text below already does the right thing — but the celebration header undermines it.

**Change:**
- Replace `CELEBRATION_TEXTS` with process praise that varies by context:
  - 3 stars (first try): "First try!", "You knew it!", "Quick thinking!"
  - 2 stars (second try): "You figured it out!", "Nice problem solving!"
  - 1 star (third+ try): "You didn't give up!", "You kept trying!", "You got there!"
- Branch on `stars` parameter already available in `FeedbackOverlay.tsx:72`

**Files:** `src/components/FeedbackOverlay.tsx`
**Effort:** Trivial | **Risk:** None — pure copy change
**Sources:** Dweck (2007), Hwang & Kang (IJCCI 2023)

---

#### 6.2 Worked Example Display Time Fix

**Research:** The 2020 JLS study found significant feedback neglect rates — children skip text-only feedback. Hwang & Kang (2023) confirmed children cannot process elaboration feedback in under 3 seconds. Barbieri et al. (2023) meta-analysis of 85 studies confirmed worked examples reduce cognitive load during skill acquisition.

**Current state:** `explanation-generator.ts` generates excellent worked examples for the `timeout-repeated` path. But `FeedbackOverlay.tsx` auto-advances after ~2 seconds on timeout — making the worked example effectively invisible.

**Change:**
- Extend timeout-repeated display from 2s to 4s in the game reducer or FeedbackOverlay
- Add a staged step animation: operand 1 → operator → operand 2 → equals → answer at ~600-800ms intervals using Motion stagger
- Keep timeout-first (strategy hint) at 2s — it's shorter text

**Files:** `src/components/FeedbackOverlay.tsx`, `src/engine/game-reducer.ts`
**Effort:** Low | **Risk:** Low — only affects the retry path
**Sources:** Feedback neglect (JLS 2020), Hwang & Kang (IJCCI 2023), Barbieri et al. (2023)

---

#### 6.3 Mathematical Language Rotation

**Research:** NCTM: children need exposure to 400+ math terms. Purpura et al. (2020): math language predicts math development. Spaced exposure to synonyms is the lowest-cost way to build vocabulary breadth.

**Current state:** `ProblemDisplay.tsx:44-52` shows a fixed sub-prompt per operator. Children never encounter synonyms.

**Change:**
- Add synonym arrays per operator and randomly select one per problem:
  - Addition: "How many altogether?", "How many in all?", "What is the total?", "What do they make together?"
  - Subtraction: "How many are left?", "What's the difference?", "How many remain?"
  - Make 10: "How many more to make ten?", "What do you add to make ten?"
  - Missing Part: "What's the missing part?", "What goes in the gap?", "What number is hiding?"
- Use deterministic pick based on round number to keep renders stable
- Text-only rotation first; audio can follow later

**Files:** New `src/engine/math-vocabulary.ts`, update `src/components/ProblemDisplay.tsx`
**Effort:** Low | **Risk:** None — additive change
**Sources:** Purpura et al. (2020), NCTM vocabulary research

---

#### 6.4 Spacing Nudge at Session End

**Research:** The spacing effect is one of the most robust findings in learning science. A study with 5-7 year-olds found spaced presentation produced significantly higher generalization than massed presentation.

**Current state:** `SessionSummary.tsx` shows "Play More!" as the primary CTA. No suggestion to return later.

**Change:**
- Add warm rest message below "Play More!": "Great work today! Come back tomorrow to practice more."
- If 2+ sessions today (localStorage timestamps): "You've practiced a lot today! Coming back tomorrow helps your brain remember."

**Files:** `src/components/SessionSummary.tsx`
**Effort:** Trivial | **Risk:** None — additive copy
**Sources:** Spacing effect (PMC 2012)

---

#### 6.5 Session Summary Growth Framing

**Research:** Bardach and Murayama: strongest intrinsic motivator for ages 4-8 is the feeling of competence ("I did it!"), not digital stickers.

**Current state:** `SessionSummary.tsx` shows star count, cumulative total, problems completed, and "Play More!" button. No performance breakdown.

**Change:**
- Show `firstTryCount` prominently: "You got X out of Y on your first try!"
- Show highest difficulty reached (only if > starting level)
- Replace "Amazing work!" with "Great practice!"
- Keep stars as secondary, not primary metric

**Files:** `src/components/SessionSummary.tsx`, `src/engine/session.ts`, `src/types/game.ts`
**Effort:** Low-Medium | **Risk:** Low
**Sources:** Bardach & Murayama rewards research

---

### Tier 2: Visual Scaffolds

These fill the CRA representational gap with new SVG components. Medium effort, high pedagogical value.

#### 6.6 Number Bond Visual for Missing Part

**Research:** Singapore Math CPA identifies the tri-node number bond diagram (whole at top, two parts branching below) as the canonical pictorial representation for part-whole reasoning. Marx et al. (2025): 0 of 18 reviewed math apps implement systematic part-whole learning.

**Current state:** `ProblemDisplay.tsx` renders Missing Part as `left + ? = target` — a horizontal equation. The part-whole relationship is invisible.

**Change:**
- Add a small inline SVG number bond below the equation in Missing Part mode
- Three circles: `target` at top, `left` (known part) bottom-left, `?` bottom-right, connecting lines
- Gate on difficulty: show at L1-3, fade at L4+ (matching existing expertise-reversal logic)
- Also show during Make 10 mode (same part-whole structure with target = 10)

**Files:** New `src/components/NumberBond.tsx`, consumed by `ProblemDisplay.tsx`
**Effort:** Medium | **Risk:** Low — additive visual, no logic changes
**Sources:** Marx et al. (2025), Singapore Math CPA, Third Space Learning

---

#### 6.7 Ten-Frame Post-Answer Visual

**Research:** The ten-frame is the single highest-evidence visual tool for ages 5-7 for building the relationship between a number and 10. IRIS Center at Vanderbilt: students using accurate visual representations are 6x more likely to correctly solve problems. TileSight covers Concrete (physical tile) and Abstract (equation) but skips Representational entirely.

**Current state:** Success phase shows celebration text + stars + confetti. No visual representation of the mathematical relationship.

**Change:**
- During success phase, render a small ten-frame SVG (2 rows × 5 cells) with filled dots for the answer value
- Show alongside existing explanation text, not replacing it
- For Make 10 mode: left addend in one color, answer in another — making complement visible
- Gate on difficulty 1-3 (same expertise reversal logic)
- Cap at ten-frame since all answers are 0-9 (MAX_ANSWER = 9)

**Files:** New `src/components/TenFrame.tsx`, consumed by `FeedbackOverlay.tsx`
**Effort:** Medium | **Risk:** Low — additive visual during success phase only
**Sources:** IRIS Vanderbilt CRA, Math Learning Center, ten-frame research

---

#### 6.8 Counting-On Strategy Animation

**Research:** EEF and NZ curriculum both identify the counting-on hop as the key cognitive move children need to see modeled. Schiffman et al. (2018): linear-spatial materials promote count-on over count-all.

**Current state:** `explanation-generator.ts:23-27` generates the count-on sequence string (e.g., "4, 5, 6, 7" for 3 + 4). Rendered as flat static text in `FeedbackOverlay.tsx`.

**Change:**
- Parse `countOnFrom()` output into individual numbers
- Render as `<span>` array with staggered Motion entrance — each number pops in at 300ms delay with subtle scale animation
- Apply during success/timeout phases when explanation includes a count sequence
- Export structured count data from `explanation-generator.ts`: `getCountSequence(problem)` → `{ start: number, steps: number[] }`

**Files:** `src/components/FeedbackOverlay.tsx`, `src/engine/explanation-generator.ts`
**Effort:** Low-Medium | **Risk:** Low — rendering change only
**Sources:** Schiffman et al. (2018), EEF counting strategies guidance

---

### Tier 3: Polish and Adaptivity

Micro-interactions, adaptive difficulty, onboarding, and progress visualization.

#### 6.9 Response Time in Adaptive Difficulty

**Research:** DDA research consistently finds that adding response time as a second dimension produces measurably higher learning gains. My Math Academy uses response time as part of its mastery model.

**Current state:** `difficulty.ts` uses only consecutive correct/wrong counts. `currentRoundStartedAt` already exists in game state.

**Change:**
- Pass response time into difficulty calculation:
  - Fast correct (< 8s): counts normally toward promotion
  - Normal correct (8-25s): counts normally
  - Slow correct (> 25s): resets consecutive-correct to 0 but does NOT demote
- Prevents premature promotion of children who are correct but not fluent
- Single new parameter to `recordCorrect()`

**Files:** `src/engine/difficulty.ts`, `src/store/game-store.ts`
**Effort:** Low | **Risk:** Low — only slows promotion for slow-correct, never demotes
**Sources:** DDA research, My Math Academy adaptive model

---

#### 6.10 Color-Coded Progress Pips

**Research:** MDPI eye-tracking (2023): children pay minimal attention to HUD incentive systems during play but DO look at co-located progress elements.

**Current state:** `ProgressPips.tsx` renders uniform circles — all filled pips are the same color.

**Change:**
- Color-code completed pips by attempt count:
  - First try (3 stars): green
  - Second try (2 stars): amber/yellow
  - Third+ try (1 star): orange
  - Timed out: light gray
- Thread per-round star data from game state `results` array

**Files:** `src/components/ProgressPips.tsx`
**Effort:** Low | **Risk:** None — purely visual
**Sources:** MDPI Education Sciences (2023)

---

#### 6.11 Micro-Interactions

**Research:** Micro-interactions communicate system state and create delight without cognitive overhead.

##### 6.11a: Individual Button Stagger on Mode Select

`TapToStart.tsx:126-176` renders the 2×2 math mode grid. All four buttons appear simultaneously. **Change:** Stagger each button's entrance at 50ms intervals (0, 50ms, 100ms, 150ms). One `transition.delay` property per button. **Effort:** Trivial.

##### 6.11b: Phase Enter Scale Animation

Phase transitions use 150ms opacity-only fade (ADR-005 caps EXIT at 200ms). ENTER animations are unconstrained. **Change:** Add `scale: 0.97 → 1` with a spring on entering `animate` prop of each phase component. **Effort:** Trivial.

##### 6.11c: Tile-Held Beat Animation

600ms window between `TILE_SEEN` and `ANSWER_COMMITTED` shows "I see X!" text but the `?` placeholder is static. **Change:** Apply slow `scale: [1, 1.05, 1]` beat animation on `?` during this window. Hook point: `GameScreen.tsx:260`. **Effort:** Low.

**Files:** `src/components/TapToStart.tsx`, `src/components/GameScreen.tsx`, phase components
**Risk:** None — purely visual polish

---

#### 6.12 Ghost-Tile Onboarding Animation

**Research:** NN/G children's usability: pre-readers need demonstration, not text instruction.

**Current state:** No tutorial for how to hold a tile in front of the camera.

**Change:**
- On first-ever scanning phase (localStorage `superbuilders_first_scan`):
  - Semi-transparent SVG of tile being held toward camera
  - Gentle pulsing animation (2s cycle)
  - Dismisses on first `TILE_SEEN` event
  - Never shown again (persisted)
- Optional audio cue: "Hold a tile up to the camera!"

**Files:** New `src/components/GhostTileGuide.tsx`, integrated into `GameScreen.tsx`/`SpellingScreen.tsx`
**Effort:** Low-Medium | **Risk:** Low
**Sources:** NN/G children's UX, Gapsy Studio UX for kids

---

#### 6.13 Idle State Gentle Prompt

**Research:** Wait-time: 10-second threshold before re-prompting. Dark patterns research classifies urgent prompts as manipulative.

**Current state:** Pulsing "Put your answer here" box. No escalation on pure no-tile idle.

**Change:**
- After 10s scanning with no `TILE_SEEN`: increase pulse amplitude, subtle glow
- Play warm audio: "I wonder which tile you'll choose!" (one new audio file)
- After 20s: show brief ghost-tile hint near camera area
- All prompts reset on `TILE_SEEN`. Respect mute preference.

**Files:** `src/components/GameScreen.tsx`, one new audio asset
**Effort:** Medium | **Risk:** Low
**Sources:** PMC wait-time systematic review, dark patterns study (EurekAlert 2023)

---

#### 6.14 WCAG Contrast Audit

**Research:** WCAG 2.1 SC 1.4.3 requires 3:1 for large text (18pt+ bold or 24pt+ regular). Since all TileSight numbers are 48pt+ Fredoka One, the 3:1 threshold applies.

**Current state:** No documented WCAG compliance. Palette in `src/index.css @theme`.

**Change:**
- Audit all text/background combinations
- Document minimum ratios in `docs/decisions.md` as ADR-011
- Fix any failures

**Files:** `src/index.css`, `docs/decisions.md`
**Effort:** Low | **Risk:** None

---

### Tier 4: Strategic Upgrades

These are higher-ambition changes that push on progression architecture and gameplay structure. They require more effort and should be validated with real children.

#### 6.15 Learning Trajectory Engine

**Research:** WWC developmental progression + Clements/Sarama trajectory model. The single most impactful structural change.

**Change:**
- Add explicit skill graph and mastery state (counting, comparison, part-whole, count-on, decomposition, fluency)
- Replace child-facing "Level N" with trajectory-based skill labels ("Find the missing part", "Count on", "Make ten")
- Keep hidden internal difficulty for operand scaling

**Files:** New `src/engine/learning-trajectory.ts`, update `src/engine/problem-generator.ts`, `src/engine/difficulty.ts`, `src/store/game-store.ts`
**Effort:** High | **Risk:** Medium — restructures progression logic
**Sources:** Clements & Sarama, IES/WWC

---

#### 6.16 Strategy-Aware Feedback

**Research:** Outhwaite et al. (2023): explanatory + motivational feedback + levelling = necessary condition. Current feedback is operator-aware but not skill-specific.

**Change:**
- Make `explanation-generator.ts` skill-aware rather than only operator-aware
- Distinguish feedback for count-on opportunities, counting back, missing-part reasoning, make-ten composition
- Add optional "show me" replay after timeout or repeated wrong answers
- Gate detail by trajectory/mastery rather than only difficulty level

**Files:** `src/engine/explanation-generator.ts`, `src/components/FeedbackOverlay.tsx`
**Effort:** Medium | **Risk:** Low-Medium
**Sources:** Outhwaite (2023), Sweller expertise reversal

---

#### 6.17 Confidence-Aware CV Uncertainty Handling

**Research:** Math anxiety: false-negative → self-attribution risk. A false negative experienced as "I'm bad at math" is a motivational event.

**Change:**
- Distinguish: likely recognition uncertainty vs. stable wrong answer vs. no tile present
- Use confidence/temporal stability to defer hard "wrong" messaging when recognition is uncertain
- Only adjust child-facing message policy first (no model retraining)

**Files:** `src/store/game-store.ts`, `src/cv/postprocessing.ts`, `src/engine/camera-uncertainty.ts`
**Effort:** Medium | **Risk:** Low — maintain commit thresholds, only adjust messaging
**Sources:** Math anxiety (Frontiers 2024)

---

#### 6.18 Strategy Telemetry

**Research:** Strategy changes predict learning better than correctness. Camera-based systems can uniquely observe process, not just product.

**Change:**
- Log per-round: time to first stable tile, rearrangements, wrong-stable detections, correction latency
- Use data to personalize hints, decide when to stay on a skill, improve session summaries
- Separate "math error" from "recognition trouble" in reporting

**Files:** `src/store/game-store.ts`, `src/store/cv-store.ts`, `src/engine/session.ts`
**Effort:** Medium | **Risk:** Low
**Sources:** Strategy traces research (§3.8)

---

#### 6.19 Caregiver Coaching Layer

**Research:** Parent number talk has causal evidence for improving number knowledge. Only 2/25 evaluated apps supported adult-child interaction.

**Change:**
- Lightweight, opt-in "grown-up tip" on session summary or onboarding:
  - "Ask: How did you figure it out?"
  - "Ask: What number would make ten?"
  - "Try: Can you find another way?"
- Process-oriented and autonomy-supportive. Never interrupt active play.

**Files:** `src/components/TapToStart.tsx` or `src/components/SessionSummary.tsx`
**Effort:** Low | **Risk:** Low
**Sources:** Berkowitz et al. (2015), Gibson et al., parent praise research

---

#### 6.20 Structure-First Task Families (Higher-Risk)

**Research:** Manipulatives that reveal structure > manipulatives that merely decorate.

**Potential new task types:**
- "Build the total in two ways" (decomposition)
- "Show which is more/less" (comparison on a left-to-right strip)
- "Find missing part on a fixed ten-frame/line"

**Why risky:** May require region-aware CV interpretation rather than only answer matching. Likely touches `interpretation.ts`, `game-store.ts`, and several screens.

---

#### 6.21 Position-Sensitive Multi-Slot Tasks (Higher-Risk)

**Potential:**
- Two answer lanes for decomposition tasks
- "Make the same total in two ways"
- Compare two numbers in left/right regions

**Why promising:** Makes physical placement mathematically meaningful.
**Why risky:** Requires region-aware interpretation. Significant architecture change.

---

## 7. Priority Matrix and Implementation Grouping

### Priority Matrix

Ordered by (research impact × feasibility).

| # | Enhancement | Research Impact | Effort | Risk | Category |
|---|---|---|---|---|---|
| **1** | [6.1 Process praise](#61-process-praise-over-outcome-praise) | **Critical** | Trivial | None | Feedback |
| **2** | [6.2 Worked example display](#62-worked-example-display-time-fix) | **Critical** | Low | Low | Feedback |
| **3** | [6.3 Math language rotation](#63-mathematical-language-rotation) | **High** | Low | None | Language |
| **4** | [6.4 Spacing nudge](#64-spacing-nudge-at-session-end) | **Medium** | Trivial | None | Session |
| **5** | [6.5 Session growth framing](#65-session-summary-growth-framing) | **Medium** | Low-Med | Low | Motivation |
| **6** | [6.6 Number bond](#66-number-bond-visual-for-missing-part) | **High** | Medium | Low | Visual scaffold |
| **7** | [6.7 Ten-frame](#67-ten-frame-post-answer-visual) | **High** | Medium | Low | Visual scaffold |
| **8** | [6.8 Counting-on animation](#68-counting-on-strategy-animation) | **High** | Low-Med | Low | Visual scaffold |
| **9** | [6.11 Micro-interactions](#611-micro-interactions) | **Low** | Trivial | None | Polish |
| **10** | [6.10 Color-coded pips](#610-color-coded-progress-pips) | **Low** | Low | None | Progress |
| **11** | [6.9 Response time difficulty](#69-response-time-in-adaptive-difficulty) | **Medium** | Low | Low | Adaptivity |
| **12** | [6.12 Ghost-tile onboarding](#612-ghost-tile-onboarding-animation) | **Medium** | Low-Med | Low | Onboarding |
| **13** | [6.13 Idle prompt](#613-idle-state-gentle-prompt) | **Medium** | Medium | Low | UX |
| **14** | [6.14 WCAG audit](#614-wcag-contrast-audit) | **Low** | Low | None | Accessibility |
| **15** | [6.15 Learning trajectory](#615-learning-trajectory-engine) | **Very High** | High | Medium | Architecture |
| **16** | [6.16 Strategy feedback](#616-strategy-aware-feedback) | **High** | Medium | Low-Med | Feedback |
| **17** | [6.17 Confidence-aware CV](#617-confidence-aware-cv-uncertainty-handling) | **Medium** | Medium | Low | UX |
| **18** | [6.18 Strategy telemetry](#618-strategy-telemetry) | **Medium** | Medium | Low | Data |
| **19** | [6.19 Caregiver coaching](#619-caregiver-coaching-layer) | **Medium** | Low | Low | Social |

### Suggested Implementation Grouping

**Milestone 1 — "Research-Critical Feedback" (items 1-5):**
Process praise, worked example fix, math language rotation, spacing nudge, session growth framing. All low-effort, high-impact changes to the feedback system. No new components, no new dependencies. *Estimated scope: 1-2 sessions.*

**Milestone 2 — "Visual Scaffolds" (items 6-8):**
Number bond SVG, ten-frame SVG, counting-on animation. Three new visual components that fill the CRA representational gap. Medium effort, high pedagogical value. *Estimated scope: 2-3 sessions.*

**Milestone 3 — "Polish & Adaptivity" (items 9-14):**
Micro-interactions, colored pips, response time difficulty, ghost-tile onboarding, idle prompt, WCAG audit. Quality-of-life improvements and adaptive intelligence. *Estimated scope: 2-3 sessions.*

**Milestone 4 — "Strategic Architecture" (items 15-19):**
Learning trajectory engine, strategy-aware feedback, confidence-aware CV, strategy telemetry, caregiver coaching. Major progression overhaul. *Estimated scope: 4-6 sessions. Should be validated with real children.*

---

## 8. What NOT to Do

Research-backed reasons to avoid common "improvement" instincts:

| Temptation | Why Not | Source |
|---|---|---|
| Add a mascot character | Fantastical content has negative immediate effect on ages 4-8 cognition | Hinten meta-analysis |
| Add leaderboards or percentages | Math anxiety; numeric scoring not age-appropriate for 5-8 | Frontiers 2024 |
| Add multiplication mode | Not developmentally appropriate until 7-9 | Nunes & Bryant |
| Add multi-digit answers | Place value not reliable until Grade 2; MAX_ANSWER=9 is correct | PMC 2022 |
| Make celebrations more elaborate | Seductive details actively harm learning; perceptual richness distracts | Hirsh-Pasek 2015; Cheung 2023 |
| Add gamification badges/levels | Eye-tracking: children ignore them during play; risk reward-seeking | MDPI 2023 |
| Show difficulty demotion | Math anxiety measurable at age 5; silent demotion is correct | Already implemented |
| Prompt before 8-10 seconds | Interrupts active thinking; classified as dark pattern | Wait-time research; EurekAlert 2023 |
| Use TTS for phonemes | No TTS produces clean isolated consonant phonemes | §3.16 |
| Add timed pressure indicators | Countdown pressure increases anxiety; existing timeout is silent | Math anxiety research |
| Add more visual noise | Extra motion/particles compete with mathematical reasoning | CLT; Cheung 2023 |
| Treat engagement time as primary KPI | Children prefer lower-educational-value apps | App preferences 2024 |
| Over-fantastical designs | "Cognitive coherence" > spectacle for ages 4-8 | Hinten meta-analysis |
| Interrupt every round with adult prompts | Can increase controlling behavior | Parent priming trade-offs |
| Classify exploration as gaming | Ages 5-8: "inefficient" behavior may be strategy search | Developmental research |

---

## 9. Spiky Points of View

**SPOV 1: The moat is not computer vision; the moat is representational fidelity.** A better detector does not automatically produce better learning. The benefit of physical materials depends on whether they make mathematical structure visible. TileSight wins when tile placement reveals number relationships, not when the CV stack merely reads answers faster.

**SPOV 2: The right product stance is guided play, not drill and not free play.** The strongest design pattern is child agency inside an intentionally scaffolded path. Guided play outperforms more didactic formats on some early-math outcomes, and the strongest app results come from systems that blend playfulness with explanatory feedback and progression.

**SPOV 3: The highest-leverage data are not right/wrong answers; they are strategy traces.** Most products stop at correctness. A camera-based tangible system can observe strategy changes, hesitation, self-correction, alternative decompositions, and adult-child interaction patterns. That is a more defensible educational instrument than "we do on-device inference in Safari."

**SPOV 4: The moat is learning-science constraints encoded into software.** The important innovation is not "browser CV on an iPad" but a system that turns research on mastery, retrieval, worked examples, and signal integrity into default product behavior. Shallow success is worse than visible failure.

**SPOV 5: For ages 4-8, cognitive coherence beats spectacle.** The most educationally powerful early-learning products will often look less magical and more reality-aligned than mainstream children's media.

**SPOV 6: A tangible math product is valuable only when it changes the child's strategy, not merely the input device.** Care less about whether a child places a physical tile and more about whether the tile system causes better mathematical inferences — linear magnitude, part-whole reasoning, count-on, decomposition, transfer.

---

## 10. Unknown Unknowns

1. **Is the physicality doing cognitive work, or is it just novelty?** Manipulatives help on average, but not automatically; richness can distract, and aligned spatial structure matters.

2. **Are you teaching part-whole reasoning, or only answer production?** A systematic gap in the market (0/18 apps per Marx et al.).

3. **Can the product actually move children off count-all strategies?** Count-on, decomposition, and retrieval matter for later success. Tile sequencing and surface design should be tested against that goal.

4. **Which levelling regime helps which child?** Dynamic and static programmatic levelling both appear in effective apps. Lower-ability children may benefit more from structured static pathways; higher-ability from dynamic skipping/acceleration.

5. **How much explanation is enough before it becomes drag?** Explanatory feedback helps novices, but detailed feedback becomes less necessary once mastered. The fade schedule is a product hypothesis that needs testing.

6. **Will parent prompts help, or quietly harm autonomy?** Parent number talk can help, but informational priming can increase controlling behavior.

7. **Are you building mathematical language as well as calculation?** Math language predicts math development.

8. **Will children naturally choose the educationally strongest version?** Probably not. You need A/B tests that include learning outcomes, not just time-on-task.

9. **How will you separate "camera uncertainty" from "math error" in the child's mind?** Recognition confidence should shape UX.

10. **What is your transfer story?** Measure near transfer, far transfer, and delayed retention.

11. **Does the game increase what children spontaneously notice about number (SFON)?**

12. **Retrieval is not a universal hammer in mathematics.** Retrieval practice does not automatically improve mathematical word-problem solving for novices.

13. **DI-like instincts and early-childhood guided-play evidence are in genuine tension.** The right answer is probably guided precision: strong instructional architecture inside playful action.

14. **Anti-gaming systems built for older students can misread young children.** Ages 5-8: some "inefficient" behavior is actually exploration or strategy search.

15. **Parent math anxiety and home numeracy will shape product effectiveness.**

16. **"Cognitive coherence" should not harden into a blanket anti-imagination stance.** Don't spend cognitive budget on fantasy that is pedagogically idle — but don't ban imagination.

17. **Optimal hint timing for camera-based interaction.** The graduated hint research was conducted in screen-tap apps. TileSight has a gray zone between wrong tile, invisible tile, and no tile.

18. **Whether progressive encoding works without verbal instruction.** Whether pre-recorded audio is sufficient to guide phonological analysis in a 5-year-old without an adult present is not established.

19. **Mastery thresholds.** 70% for "practiced," 90% for "mastered" — reasonable starting points, but need empirical tuning.

20. **Whether new structure tasks improve strategy quality without hurting motivation.**

21. **Optimal fade schedule for explanations by mastery level.**

22. **Whether confidence-aware messaging reduces harmful error attribution.**

23. **Whether educationally stronger variants reduce voluntary replay unless motivation layer is redesigned.**

---

## 11. Evaluation Framework

Measure beyond engagement:

### Outcome Dimensions

| Dimension | What to Measure | Why |
|---|---|---|
| **Near-transfer** | In-app target skills | Direct skill acquisition |
| **Far-transfer** | Untaught but related arithmetic/reasoning probes | Generalization |
| **Delayed retention** | 2-6 week follow-up | Durability |
| **Strategy progression** | Count-all → count-on/decomposition proxy transitions | Genuine learning beyond answer correctness |
| **Affect/safety** | Uncertainty-message exposure, frustration exits, anxiety proxy behaviors | Emotional safety |
| **Equity/inclusion** | Differential gains by baseline skill and language profile | No child left behind |

### Experimental Design

- A/B/C at feature-cluster level:
  - **A:** Baseline (current)
  - **B:** Feedback + levelling upgrade (Milestones 1-3)
  - **C:** Feedback + levelling + trajectory tasks (Milestone 4)
- Pre-register success metrics and stopping rules before broad rollout
- Include learning outcomes, not just engagement metrics

### Key Metrics to Track per Session

- First-try percentage (competence signal)
- Response time distribution (fluency signal)
- Difficulty level reached vs. starting level (growth)
- Camera uncertainty interventions per session (CV quality)
- Strategy proxy signals (tile cycling, self-correction)
- Voluntary replay rate (engagement, but interpret carefully)
- Session count per day (spacing compliance)

---

## 12. Expert Profiles

### Early Mathematics

**Douglas H. Clements** — Distinguished University Professor, Kennedy Endowed Chair, Executive Director of the Marsico Institute at University of Denver. Foundational figure in early-childhood mathematics, learning trajectories, and educational technology.

**Julie Sarama** — Kennedy Endowed Chair in Innovative Learning Technologies, University of Denver. Bridges curriculum design and tech design. Young children's mathematical development, software environments, implementation.

**Nancy C. Jordan** — Dean Family Endowed Chair, University of Delaware. Number sense, mathematical cognition, and learning difficulties. Relevant for supporting children at risk.

**Nicole McNeil** — How children think and solve problems in mathematics. Concrete-to-abstract progression.

### Play, Home Interaction, and Math Language

**Geetha Ramani** — University of Maryland. How children learn math through play, games, blocks, and the home environment. One of the most directly relevant researchers for a playful tangible math product.

**Susan C. Levine** — Rebecca Anne Boylan Professor, University of Chicago. Numerical and spatial aspects of early math, how home/school input and "math talk" affect learning.

**David Purpura** — Professor, Director of the Center for Early Learning at Purdue. School readiness, assessment, intervention, math language, and dual-language learners.

### Playful Learning and App Design

**Kathryn Hirsh-Pasek** — Professor at Temple, Senior Fellow at Brookings. Science of play and playful learning.

**Roberta Michnick Golinkoff** — University of Delaware. Playful learning, language, and applying developmental science to design.

**Laura Outhwaite** — Principal Research Fellow at UCL CEPEO. The strongest current researcher on children's educational math apps. Follow for app-evaluation frameworks and evidence on feedback/levelling.

**Marina Umaschi Bers** — Boston College. Developmentally appropriate technology and designing digital experiences for positive development.

**Mitchel Resnick** — MIT Media Lab. Founder of Scratch. Playful, constructionist learning.

### Cognitive Science and Instructional Design

**John Sweller** — Cognitive Load Theory. The anchor for centering cognitive load as the primary design constraint.

**Paul Kirschner** — Worked examples and minimally guided instruction.

**Kou Murayama** — Motivation and rewards research. Best fit for rewards as temporary scaffolds fading into competence-based motivation.

---

## 13. Sources

### High-Authority Anchors

| Source | URL |
|---|---|
| National Academies (2009), early math | https://nap.nationalacademies.org/catalog/12519/mathematics-learning-in-early-childhood-paths-toward-excellence-and-equity |
| IES/WWC Teaching Math to Young Children | https://ies.ed.gov/ncee/wwc/practiceguide/18 |
| IES/WWC full guide PDF | https://ies.ed.gov/ncee/wwc/Docs/PracticeGuide/early_math_pg_111313.pdf |
| NAEYC/NCTM position statement | https://www.naeyc.org/sites/default/files/globally-shared/downloads/PDFs/resources/position-statements/psmath.pdf |
| Learning Trajectories (Clements/Sarama) | https://www.learningtrajectories.org/index.php/ |
| IES/WWC Foundational Reading Skills K-3 | https://ies.ed.gov/ncee/wwc/practiceguide/21 |

### Feedback and Motivation

| Source | Finding | URL |
|---|---|---|
| Dweck (2007) — 6-study replication | Outcome praise → challenge avoidance; process praise → resilience | — |
| Hwang & Kang (IJCCI 2023) | Elaboration > encouragement > verification for preschoolers | — |
| Outhwaite et al. (BJET 2023) | Explanatory + motivational feedback + levelling = necessary for gains | https://pureadmin.qub.ac.uk/ws/portalfiles/portal/463888810/bjet.13339.pdf |
| JLS (2020) — Feedback neglect | Children skip text-only feedback; audio reduces neglect | — |
| Barbieri et al. (2023) — 85-study meta | Worked examples reduce cognitive load during skill acquisition | — |
| Bardach & Murayama | Competence is strongest intrinsic motivator ages 4-8 | — |
| Parent praise and motivation | Process praise predicts incremental frameworks | https://pubmed.ncbi.nlm.nih.gov/23397904/ |
| Parent response style | Person-focused → worse adjustment/anxiety | https://pmc.ncbi.nlm.nih.gov/articles/PMC9796849/ |

### Mathematical Cognition

| Source | Finding | URL |
|---|---|---|
| Duncan et al. (2007) | School-entry math strongest predictor | https://pubmed.ncbi.nlm.nih.gov/18020822/ |
| Clements et al. (2024) | Learning trajectories review | https://doi.org/10.1080/10409289.2024.2427710 |
| Purpura et al. (Frontiers 2020) | Math language predicts development | https://doi.org/10.3389/fpsyg.2020.01925 |
| Schiffman et al. (2018) | Linear-spatial → count-on over count-all | https://pmc.ncbi.nlm.nih.gov/articles/PMC6312299/ |
| Marx et al. (IEJME 2025) | 0/18 apps implement part-whole learning | https://dx.doi.org/10.29333/iejme/15677 |
| IRIS Vanderbilt CRA | 6x more likely to solve with visual representations | — |
| Carbonneau et al. (2013) | Manipulatives meta-analysis | https://asu.elsevierpure.com/en/publications/a-meta-analysis-of-the-efficacy-of-teaching-mathematics-with-conc/ |
| Ramani & Siegler (2008) | Linear board games eliminate SES gaps | https://academic.oup.com/chidev/article-abstract/79/2/375/8274906 |
| Baroody et al. (2016) | Missing-addend software > drill for subtraction fluency | — |
| Place value (PMC) | Multi-digit understanding not until Grade 2 | https://pmc.ncbi.nlm.nih.gov/articles/PMC9177579/ |

### Educational App Design

| Source | Finding | URL |
|---|---|---|
| Outhwaite et al. (2019) RCT | Interactive apps improve outcomes | https://pmc.ncbi.nlm.nih.gov/articles/PMC6366442/ |
| Outhwaite et al. (2023) QCA | Feedback + levelling necessary condition | https://pureadmin.qub.ac.uk/ws/portalfiles/portal/463888810/bjet.13339.pdf |
| My Math Academy / Bang et al. | ESSA Tier 1 adaptive system | https://www.tandfonline.com/doi/full/10.1080/19345747.2021.1969710 |
| My Math Academy efficacy | Open access report | https://link.springer.com/article/10.1007/s10643-022-01332-3 |
| App preferences (2024) | Children prefer lower-educational-value apps | https://www.sciencedirect.com/science/article/pii/S0747563224002292 |
| Hirsh-Pasek / Griffith Four Pillars | Active, engaged, meaningful, social | https://pmc.ncbi.nlm.nih.gov/articles/PMC8099083/ |
| MDPI eye-tracking (2023) | Children ignore HUD, attend to co-located elements | — |
| Frontiers 2023 ECE review | g = 0.76 mean; individualized strongest | https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.1229849/full |

### Adaptive Design and Spacing

| Source | Finding | URL |
|---|---|---|
| DDA / My Math Academy | Response time as mastery dimension | — |
| PMC spacing effect (2012) | Spaced > massed practice for 5-7 year-olds | — |
| Retrieval practice (PMC) | Not universal for novice math | https://pmc.ncbi.nlm.nih.gov/articles/PMC9987560/ |

### Affect and Anxiety

| Source | Finding | URL |
|---|---|---|
| Math anxiety (Frontiers 2024) | Measurable at age 5 | https://pubmed.ncbi.nlm.nih.gov/38476390/ |
| Early math anxiety | Predicts later achievement | https://www.tandfonline.com/doi/full/10.1080/15248372.2020.1832098 |
| Wait-time systematic review | 4.8-6.6s before response; 10s before re-prompt | — |
| Dark patterns (EurekAlert 2023) | Urgent prompts classified as manipulative | — |

### UX and Onboarding

| Source | Finding | URL |
|---|---|---|
| NN/G children's usability | Pre-readers need demonstration, not text | — |
| WCAG 2.1 SC 1.4.3 | 3:1 large text, 4.5:1 body text | — |
| Cheung et al. (2023) | Perceptually rich manipulatives can distract | https://academic.oup.com/chidev/article/84/3/1020/8267304 |
| Hinten meta-analysis | Fantastical content negative for ages 4-8 | — |

### Home and Adult Interaction

| Source | Finding | URL |
|---|---|---|
| Berkowitz et al. (2015) | Math-at-home app increased achievement | https://pubmed.ncbi.nlm.nih.gov/26702458/ |
| Gibson et al. | Parent number talk causal evidence | https://pmc.ncbi.nlm.nih.gov/articles/PMC10683715/ |
| Priming trade-offs | Can increase controlling behavior | https://pmc.ncbi.nlm.nih.gov/articles/PMC12598456/ |
| James-Brabham et al. (2025) | Home math activities meta-analysis | — |
| Guided play meta-analysis (Skene) | Guided play > direct instruction on some outcomes | https://pmc.ncbi.nlm.nih.gov/articles/PMC9545698/ |

### Manipulatives and Spatial

| Source | Finding | URL |
|---|---|---|
| TUI systematic review (2021) | Physical manipulatives outperform classical | https://link.springer.com/article/10.1007/s00779-021-01556-x |
| TUI for math (ACM) | TUIs combine physical + multimedia | https://dl.acm.org/doi/fullHtml/10.1145/3546155.3546672 |
| Spatial cognition (2020) | Spatial assembly relates to early math | https://doi.org/10.3389/fpsyg.2020.01938 |
| SFON (2022) | Spontaneous focusing on numerosity | https://doi.org/10.3390/brainsci12030313 |
| Gesture and learning | Gesture reveals/supports implicit knowledge | https://pubmed.ncbi.nlm.nih.gov/17999569/ |
| Inclusive tangible games | Math + sign language | https://doi.org/10.34190/ecgbl.17.1.1411 |

### Literacy and Phonics

| Source | Finding | URL |
|---|---|---|
| Ehri (2014) | Orthographic mapping prerequisites | https://www.tandfonline.com/doi/abs/10.1080/10888438.2013.819356 |
| Weiser & Mathes (2011) | Encoding-reading reciprocal relationship | https://journals.sagepub.com/doi/10.3102/0034654310396719 |
| Johnston & Watson (2004) | Synthetic > analytic phonics | — |
| Ouellette & Senechal | Invented spelling produces PA gains | https://www.sciencedirect.com/science/article/abs/pii/S0959475205000939 |
| NASET Elkonin Boxes | Word boxes evidence | https://www.naset.com/publications/ld-report/evidence-based-practice-research-elkonin-boxes/ |
| LSHSS (2023) | Spelling predicts later reading | https://pubs.asha.org/doi/10.1044/2023_LSHSS-22-00161 |
| Picture-text compounds (2023) | 64.9% detrimental effects | https://link.springer.com/article/10.1007/s42822-023-00139-0 |

### Audio and Multimodal

| Source | Finding | URL |
|---|---|---|
| Clark & Paivio (1991) | Dual coding theory | — |
| Mayer multimedia learning | Temporal + spatial contiguity | — |
| Multimodal literacy (2020) | Multi-channel > single-channel | https://link.springer.com/article/10.1007/s10643-019-00974-0 |
| TTS meta-analysis | TTS vs. human voice (grade 3+) | https://pmc.ncbi.nlm.nih.gov/articles/PMC5494021/ |
| Bilingual app learning | Language proficiency in app-based math | https://bera-journals.onlinelibrary.wiley.com/doi/10.1111/bjet.12912 |

### Cognitive Science

| Source | URL |
|---|---|
| Sweller / CLT | https://www.unsw.edu.au/staff/john-sweller |
| Murayama / rewards | https://uni-tuebingen.de/en/faculties/faculty-of-economics-and-social-sciences/subjects/department-of-social-sciences/education-sciences-and-psychology/institute/staff/murayama-kou-prof-dr/ |
| NAEYC tech guidance | https://ou.edu/content/dam/Education/documents/ECEI/ECLI/NAEYC%20FRC%20Key%20Messages.pdf |
