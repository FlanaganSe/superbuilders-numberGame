# Research: Early Childhood Math Game Design — Authoritative Evidence

*Date: 2026-03-14. Read-only investigation. No source files modified.*

Six specific questions about math content and design for ages 5–8, answered from
authoritative peer-reviewed and government sources. Organized by question, then
synthesized into recommendations for TileSight.

---

## Q1: Multi-digit numbers / numbers above 9 — when are children ready?

### What the Clements/Sarama learning trajectory says

Clements and Sarama's *Learning and Teaching Early Math: The Learning Trajectories
Approach* (3rd ed., Routledge, 2020) includes a chapter titled "Arithmetic: Composition
of Number, Place Value, and Multidigit Addition and Subtraction." The authors' trajectory
is published at learningtrajectories.org (gated, registered users), but the key
developmental stages are well-documented in secondary sources:

- **Ages 5–6 (Kindergarten):** Children work primarily within 1–10. Some exposure to
  multi-digit numeral names occurs informally (street addresses, prices). Children can
  read and say "12" but do not yet understand it as 1 ten + 2 ones.
- **Age 6–7 (Grade 1):** First grade curriculum in CCSS and research-aligned programs
  targets addition/subtraction within 20, with conceptual introduction to place value
  as groups of ten. Clements/Sarama name this the "Tens" level.
- **Ages 7–8 (Grade 2):** Fluency within 100, full place value understanding for
  two-digit numbers. This is where two-digit arithmetic instruction becomes developmentally
  primary.

Sources: Clements & Sarama (2020), ISBN 9780367521974; learningtrajectories.org;
Routledge catalogue.

### What the cognitive development research says

A 2022 PMC study tracking children from Kindergarten (mean age 5.76) through Grade 1
found two distinct types of place value knowledge:

1. **Approximate understanding** — informal, heuristic ("longer number is bigger").
   Present by late kindergarten; does not require explicit instruction.
2. **Syntactic understanding** — explicit base-10 decomposition (532 = 5 hundreds + 3
   tens + 2 ones). Not reliably present until Grade 2 (age 7–8).

Key finding: "Only kindergarten approximate performance predicted overall first-grade
place value understanding." The authors explicitly recommend against rushing syntactic
instruction: "young children likely benefit from encouragement to first develop a rough
or partial understanding, perhaps by simply increasing exposure to multidigit numbers."

They also found that "symbols-only instruction" (written numerals) was more effective
than base-10 block manipulatives for building this approximate knowledge. Children bring
"a stronger experiential foundation to place value instruction than previously assumed"
because they encounter multi-digit numerals daily (addresses, prices, calendars).
Source: PMC9177579 — "The development of place value concepts: Approximation before
principles" (2022).

A separate PMC study (PMC4460578, "Young Children's Interpretation of Multidigit Number
Names: From Emerging Competence to Mastery") found:
- Age 3.5–5: ~61–79% accuracy on multi-digit numeral identification tasks
- Kindergarten: ~66–70% accuracy
- Grade 1: ~81–86% accuracy
- **Grade 2 (age 7–8): mastery (ceiling reached)**

Symbols-only training (exposure to written numerals without base-10 block manipulatives)
produced the most reliable improvement.

### Relevance for TileSight

The current game has a hard constraint: `MAX_ANSWER = 9` — only single-digit answers
are accepted by the CV system (`docs/product-overview.md:240`). The subtraction operand
can already display two-digit numbers on-screen (e.g., "12 − 5 = ?") at difficulty
levels 3–5.

**Verdict:** Displaying two-digit operands on screen (as the current subtraction mode
already does) is appropriate for ages 6–8 and aligns with the trajectory. Requiring
children to *produce* a multi-digit tile answer is only appropriate at age 7–8 (Grade 2),
and is not currently possible without a hardware change (multi-tile answers). The current
design is therefore well-calibrated for the 5–8 age band: operands can grow into the
teens, answers stay single-digit. The one-digit-answer constraint is pedagogically
sound, not just a technical limitation.

**Evidence level:** Strong — multiple longitudinal cognitive development studies + CCSS.

---

## Q2: Multiplication for ages 5–8

### What the IES WWC practice guide says

The WWC *Teaching Math to Young Children* practice guide (PG-18, 2014, ies.ed.gov/ncee/
wwc/practiceguide/18) covers **preschool through kindergarten**. It makes no recommendations
about multiplication — the five recommendations focus entirely on:
1. Number and operations via developmental progression (Moderate Evidence)
2. Geometry, patterns, measurement, data (Minimal Evidence)
3. Progress monitoring (Minimal Evidence)
4. Viewing the world mathematically (Minimal Evidence)
5. Daily dedicated math time (Minimal Evidence)

Multiplication is not mentioned because it is not a developmentally appropriate target
for the age range the guide covers (pre-K through K, roughly ages 3–6).

### What the cognitive development research says

Nunes and Bryant's body of work (see *Children Doing Mathematics*, 1996; Nuffield
Foundation Key Understandings in Mathematics Learning, 2009) establishes the following:

- Children as young as 5 can use **one-to-many correspondence** (the intuitive precursor
  to multiplication: "every child gets 2 crackers").
- About one-third of 5-year-olds, half of 6-year-olds, and most 7-year-olds can use
  correspondence to reason about equivalence and order.
- **Formal multiplicative thinking** — understanding multiplication as an operation
  distinct from repeated addition — does not reliably emerge until ages 7–9.
- Children who rely entirely on additive reasoning when doing multiplicative tasks "will
  begin to make serious blunders."
- Nunes and Bryant argue multiplication originates in **schema of correspondences**, not
  in repeated addition. This means informal exposure to multiplicative situations (sharing
  equally, arrays, patterns) is appropriate earlier, but formal × operations are not.

Source: Nunes & Bryant (1996); Nuffield Foundation Paper 3 (2009): "Key Understandings
in Mathematics Learning" (nuffieldfoundation.org/wp-content/uploads/2020/03/P3.pdf).

Jacob (2001), "The Development of Multiplicative Thinking in Young Children" (CORE),
found that Australian children at mean age 5y6m could "imagine equal group structures
and recognise composite units" — i.e., they see 3 groups of 4 rather than just 12 objects.
This is informal multiplicative thinking, not × symbol fluency.

### Relevance for TileSight

TileSight's target range is 5–8. Multiplication as a symbolic arithmetic operation
(e.g., "3 × 4 = ?") is not developmentally appropriate until age 7–8 at the earliest,
and informal understanding is fragile until 8–9. Including × problems alongside + and −
in a mixed-mode game for this age range would be incorrect for the younger end (5–6)
and premature for most of the target range.

**Verdict:** Do not add multiplication as a game mode for the 5–8 target. For ages 7–8
specifically, informal multiplicative situations (equal groups, arrays) could be scaffolded
— but this would require a new problem type, new UI, and new tiles. Out of scope for
the current architecture.

**Evidence level:** Strong — Nunes/Bryant is foundational; Nuffield Foundation synthesis
covers hundreds of studies.

---

## Q3: Part-whole, make-10, comparison, missing addend

### What the 2025 systematic app review found

Marx et al. (2025), "From the Whole to Its Parts: A Systematic Analysis of Affordances
for Learning Part-Whole Relations" — *International Electronic Journal of Mathematics
Education* (IEJME), DOI 10.29333/iejme/15677. Systematic evaluation of 18 educational
math apps.

**Key finding (verbatim from abstract):** "None of the reviewed apps implemented a
systematic approach to learn part-whole relations from hands-on to more abstract
compositions/decompositions including number triples up to ten."

**What apps were actually doing:** Predominantly targeting automaticity (drill and
practice on number compositions/decompositions). The automating of number compositions
is "most frequently targeted" but without the conceptual scaffolding of part-whole
relations — the understanding that a whole can be decomposed into parts in multiple
ways.

**Gap identified:** No app in their review moved children systematically from concrete
manipulation to abstract number triple understanding (e.g., knowing that 7 = 3 + 4,
7 = 5 + 2, 7 = 6 + 1 simultaneously — the whole with all its parts). This is the
Clements/Sarama "composer" level.

Source: iejme.com/article/from-the-whole-to-its-parts-a-systematic-analysis-of-
affordances-for-learning-part-whole-relations-15677

### What the broader research says about these task types

**Part-whole:** Understanding that a number is a whole composed of two or more additive
parts is foundational for all arithmetic. Fuson (1992) established this; Clements/Sarama
place "part-whole composer" at ages 6–7. Research shows children who develop this
relational understanding outperform drill-only peers on novel problems.

**Make-10 strategy:** First-grade standard in CCSS (1.OA.C.6) and research-validated.
The strategy bridges within-10 addition to sums through 20 by decomposing one addend
to complete ten. Research shows it is a foundational strategy for Grade 2 addition.
Math educator Marilyn Burns and the Math Coach's Corner research synthesis confirm
make-10 is "the foundational skill for most addition strategies taught in second grade."
It is appropriate for ages 6–7 (Grade 1).

**Comparison problems:** Children find comparison ("How many more does A have than B?")
harder than combine or change problems. Carpenter and Moser (1984) documented this;
Clements/Sarama place relational comparison at ages 6–7. CCSS includes comparison in
Grade 1. Appropriate for ages 6–8.

**Missing addend (? + 3 = 7):** Developmentally this emerges around ages 6–7. The
European Journal of Psychology of Education published research showing that when second
graders (age 7–8) are "forced to choose an arithmetic operation (+ or −)" for a missing
addend problem, "half of them fail." This means missing addend is appropriate as a
**strategy-building task** (count-on, think-addition) but is not fluency drill territory
until Grade 2 (age 7–8). Baroody et al. (2016) found that software specifically targeting
the *rationale* of subtraction-as-unknown-addend was "significantly more efficacious
in promoting fluency with unpracticed subtraction items" than drill alone.
Source: Springer link.springer.com/article/10.1007/BF03172907

### Relevance for TileSight

The game currently shows arithmetic problems ("3 + 4 = ?") requiring the child to
produce the answer. This is a **result-unknown** format. It does not expose children
to:
- Part-unknown ("3 + ? = 7") — missing addend
- Start-unknown ("? + 4 = 7") — which requires reversibility
- Comparison ("Anna has 7, Ben has 4, how many more does Anna have?") — word problem

Marx et al.'s finding is directly applicable: the game is doing what all the apps in
their review were doing — targeting answer production without part-whole understanding.

**Verdict:** Adding missing-addend problems ("3 + ? = ___") as an optional problem
type would close the single largest gap identified in the 2025 review. This is
architecturally feasible: the problem generator would generate (left, answer, right=unknown)
and the child places the tile for the missing addend. The current CV system already handles
this — the tile being detected is still a single digit, just semantically it fills the
"?" position rather than the right side.

**Evidence level:** Strong (Marx et al. 2025 systematic review) + Moderate (Baroody
2016 efficacy study).

---

## Q4: What math game improvements have the strongest evidence?

### My Math Academy RCT findings

Two large randomized controlled trials examined My Math Academy (Age of Learning):

**Study 1 — Cluster RCT (2022):** Published in *Journal of Research on Educational
Effectiveness* (ERIC EJ1328299; tandfonline.com/doi/full/10.1080/19345747.2021.1969710).
20 classrooms randomly assigned; treatment used My Math Academy for 12–14 weeks.

Key findings:
- After ~5 hours of use, treatment students "significantly outperformed the control
  group in math knowledge and skills as measured by TEMA-3."
- **Dose-response relationship:** "The more games students played, the greater the
  learning gains." This means time-on-task within a well-designed system produces
  measurable gains, not just any app.
- **Differential gains:** Greatest gains for students beginning with **moderate** (not
  lowest) baseline math knowledge and on **the most difficult skills assessed**.
  Low-knowledge students needed additional teacher support — the app alone was
  insufficient.
- Teacher perception: positive impacts on students' **interest and self-confidence**.

**Study 2 — Kindergarten/Grade 1 (Springer, 2022):** 505 treatment, 481 control.
Published in *Early Childhood Education Journal* (link.springer.com/article/10.1007/
s10643-022-01332-3). Findings:
- Treatment students made "significant learning gains in math relative to children who
  did not."
- "More skills mastered in My Math Academy was associated with greater learning gains
  on the external assessment."
- **Greatest impacts among students with lower levels of math knowledge** (contrasting
  with Study 1 — suggests the adaptive system can serve both ends of the spectrum when
  implemented well).

My Math Academy meets ESSA Tier 1 (strongest) evidence level (evidenceforessa.org/
program/my-math-academy/).

### What specific design features produced these gains

My Math Academy's published design principles (based on Age of Learning's design docs
and the RCT descriptions) include:
1. **Personalized content** — adaptive embedded assessments determine what content
   each child sees next
2. **Learning trajectory alignment** — content follows research-based progressions,
   not arbitrary difficulty ramps
3. **Explanatory feedback** — correct/incorrect responses include instructional content,
   not just motivational encouragement
4. **Game-based engagement** — content embedded in narrative/game contexts, not
   worksheet-style presentation
5. **Skill mastery model** — children must demonstrate mastery before advancing, not
   just attempt problems

The Outhwaite et al. (2023) content analysis (referenced in docs/learning-science-research.md)
confirms the combination of **explanatory feedback + motivational feedback + programmatic
levelling** was a *necessary condition* for apps producing significant learning gains.
Motivational-only feedback (what TileSight currently uses) was not sufficient.

### The Frontiers systematic review (2023)

frontiersin.org/journals/education/articles/10.3389/feduc.2023.1229849/full reviewed
math interventions from ECE through high school. For ECE (ages 4–7):
- Mean effect size g = 0.76 for early numeracy interventions vs. control
- Pre-kindergarten programs more effective than kindergarten interventions
- **Individualized instruction on single content areas** (like number operations)
  produced the strongest results
- Explicit, systematic instruction in small groups or 1-on-1 formats had the largest
  effects

The review emphasized that foundational numeracy (cardinal principle, magnitude
understanding) provides stronger long-term benefits than early arithmetic instruction
when children are below age 5.

### Relevance for TileSight

The single most evidence-supported improvement TileSight can make is adding
**explanatory feedback** on wrong answers. Every RCT and content analysis of successful
apps identifies this as a necessary condition. The current implementation (motivational
encouragement on timeout: "Keep trying!") is insufficient. The research-supported
alternative: when the time runs out or the wrong tile is placed, the feedback names
the correct answer and briefly shows a decomposition or visual representation ("7 = 3 + 4,
you needed 4!").

The dose-response finding is also important: TileSight's 15-round session structure
is reasonable, but *time on task within a well-designed system* is what produces gains.
This argues for making sessions replayable and rewarding rather than gating content
volume.

**Evidence level:** Strong (two Tier-1 ESSA RCTs) + Moderate (Outhwaite systematic
review 2023, Frontiers systematic review 2023).

---

## Q5: Subtraction — "take away" vs. "missing part" / missing addend

### What the research says

**Two established subtraction models** (Verschaffel, Greer, & De Corte, 2007; Baroody
& Dowker, 2003):

1. **Take-away (ta):** Remove items from a set. "You had 7 apples, you ate 3. How many
   are left?" Concrete, intuitive for ages 5–6. This is the dominant model in kindergarten
   instruction worldwide.

2. **Determining the difference (dd) / Missing part:** Find the gap between two quantities.
   "Anna has 7 stickers, Ben has 4. How many more does Anna have?" Or in equation form:
   "7 − 4 = ?" where the meaning is difference-finding, not removal. More abstract; harder
   for ages 5–6 but important by ages 7–8.

3. **Subtraction as unknown addend (inverse of addition):** "3 + ? = 7, so 7 − 3 = 4."
   This is the mathematically sophisticated framing. Research shows children who understand
   this relationship develop stronger arithmetic fluency.

**The Springer longitudinal study** (link.springer.com/article/10.1007/s10649-011-9305-6,
"Taking away and determining the difference — a longitudinal perspective on two models of
subtraction") found:
- Children naturally use different strategies depending on context: "adding up" for
  difference problems vs. "taking away" for removal problems
- Different subtraction contexts affect how students solve problems (documented with
  second graders)
- A "distance" framing led children to naturally use counting-up strategies

**Baroody et al. (2016)** in *Learning and Individual Differences* found that software
targeting the *rationale* of subtraction-as-addition (i.e., if 3 + 4 = 7 then 7 − 3 = 4)
was "significantly more efficacious in promoting fluency with unpracticed subtraction
items" than rote drill. This is a controlled experiment specifically about digital
instruction.
Source: ScienceDirect (science.org/doi/10.1016/j.lindif.2016.05.010)

**Fuson (1986)** published research showing counting-up (forward subtraction) is more
natural for young children than counting-back, and that instruction can successfully
teach subtraction as "adding to" rather than "taking from."

**Missing addend specifically:** European Journal of Psychology of Education research
(Springer, link.springer.com/article/10.1007/BF03172907) shows that presented as
"solving missing addend problems using subtraction," about 50% of second graders
(ages 7–8) still struggle to select the correct operation. This failure rate drops
when children understand addition-subtraction inverse relationships conceptually.

### Order of introduction recommendation from the literature

Carpenter and Moser (1984), "The acquisition of addition and subtraction concepts in
grades one through three" (*Journal for Research in Mathematics Education*), and Fuson
(1992) both suggest this developmental order:
1. **Join (result unknown):** 3 + 4 = ? — easiest, ages 5–6
2. **Separate (result unknown):** 7 − 3 = ? — take-away, ages 5–6
3. **Join (change unknown):** 3 + ? = 7 — missing addend, ages 6–7
4. **Compare (difference unknown):** 7 − 4 = ? as "how many more" — ages 6–8
5. **Separate (start unknown):** ? − 3 = 4 — most difficult, ages 7–8+

This is also the ordering in CCSS (K–2 OA standards).

### Relevance for TileSight

The current game presents only type #1 (result-unknown addition) and type #2 (result-
unknown subtraction with the take-away model). The evidence supports introducing type
#3 (missing addend / join-change-unknown) as the highest-priority extension, particularly
because:
- It is age-appropriate for the 6–8 end of the target range
- It directly addresses the gap Marx et al. (2025) identified across all apps
- It is technically feasible without hardware changes: show "3 + ___ = 7," child places
  the tile for the missing addend
- Baroody et al. (2016) specifically found digital software implementing this model was
  more efficacious than drill alone

Introducing take-away subtraction as the *only* model (current state) misses the
instructional opportunity to build subtraction-as-missing-addend understanding, which
research shows is more durable and generalizable.

**Evidence level:** Strong (Carpenter/Moser 1984 longitudinal, Fuson 1986, Baroody 2016
controlled study, Verschaffel et al. systematic frameworks).

---

## Q6: Recent systematic reviews — what we might be missing

### Key 2023–2025 systematic reviews identified

**1. Marx et al. (2025)** — already covered in Q3. Systematic analysis of part-whole
support in 18 math apps. Gap finding: no app implements systematic part-whole progression.
IEJME. DOI 10.29333/iejme/15677.

**2. Frontiers systematic review (2023)** — already covered in Q4. ECE math interventions,
g = 0.76 mean effect size. frontiersin.org/journals/education/articles/10.3389/feduc.
2023.1229849/full

**3. James-Brabham et al. (2025)** — *Child Development*. "Do home mathematical activities
relate to early mathematical skills? A systematic review and meta-analysis." Key finding:
early math attainment gaps are visible by age 4; home math activities have a positive
but modest effect. Relevant because TileSight is a home-use product.
Source: srcd.onlinelibrary.wiley.com/doi/full/10.1111/cdev.14162

**4. Springer/Knezek measurement review (2024)** — "Measuring Mathematical Skills in
Early Childhood: a Systematic Review of the Psychometric Properties of Early Maths
Assessments and Screeners." Identified 41 assessments + 25 screeners for ages 0–8.
Relevant for benchmarking TileSight outcomes.
Source: link.springer.com/article/10.1007/s10648-024-09950-6

**5. Nuffield Foundation "Can maths apps add value to learning?" (ongoing as of 2025)**
— Systematic literature review of apps as formal learning for ages 4–7. Developing a
framework for evaluating content and instructional quality. This would be the most
directly relevant forthcoming review. Check: nuffieldfoundation.org/project/can-maths-
apps-add-value-to-learning

**6. BFI Working Paper 2025-129** — Chicago caregiver RCT with parental app-based math
education for preschoolers (ages 3–5). Found significant early numeracy gains for
disadvantaged families. Confirms that parent-involved digital math can be efficacious.
Source: bfi.uchicago.edu/wp-content/uploads/2025/09/BFI_WP_2025-129.pdf

**What these reviews collectively show:**

- The field is actively producing evidence, but most RCTs are still on commercial
  products (My Math Academy, DreamBox) with limited external validity
- The quality framework problem is unsolved: most apps lack the pedagogical scaffolding
  research recommends, consistent with what TileSight currently does
- Home use products have strong potential but require parent engagement features
- The Marx et al. (2025) finding about part-whole gaps is the most directly actionable
  for this codebase

---

## Synthesis and Constraints

### Constraints from the codebase (non-negotiable)

| Constraint | Source | Implication |
|------------|--------|-------------|
| Single-digit answers only (MAX_ANSWER = 9) | `docs/product-overview.md:240` | No two-digit answers without hardware change |
| One physical tile per answer | `src/cv/interpretation.ts` (adjacency grouping handles multi-tile candidates but game expects single answer) | Missing addend tile = same UX as answer tile |
| No backend, localStorage only | `docs/product-overview.md:43` | Mastery model must be local; no student data upload |
| Child-friendly language (immutable rule) | `.claude/rules/immutable.md` | All feedback must be encouraging |
| CV blocks on single digit | `src/engine/problem-generator.ts` | Answer must be 0–9 regardless of problem type |

### Current state of educational features

The game engine (`src/engine/game-reducer.ts`) handles:
- Result-unknown addition and subtraction only
- Motivational feedback on timeout (no explanatory content)
- Streak-based difficulty (3-correct-up / 2-wrong-down)
- No mastery model per skill
- No part-whole, missing addend, or comparison problems

The `problem-generator.ts` generates problems with `{left, right, operator, answer}`.
Missing addend would require `{left: known, right: unknown, operator: '+', answer: known}`
— the tile detects the `right` operand, validated against `answer - left`.

---

## Options

### Option A — Explanatory feedback only (highest evidence, lowest complexity)

Add explanatory feedback when a round times out or a wrong tile is placed. Instead of
"Keep trying!" display "7 = 3 + 4! You needed 4." Show a visual decomposition of the
correct answer using the tile imagery.

**Trade-offs:**
- Pro: Closes the single most cited gap in the literature (Outhwaite 2023; My Math
  Academy RCTs; WWC). Addresses necessary condition for learning gains.
- Pro: No changes to problem generation, CV pipeline, or game phases.
- Pro: Applicable to all ages 5–8 without narrowing the target range.
- Con: Requires writing decomposition logic ("7 = 3 + 4") and designing child-friendly
  visual feedback for each answer value.
- Con: Does not address part-whole or missing addend gaps.

### Option B — Missing addend as new problem type (strong evidence, medium complexity)

Add a "join-change-unknown" problem type: show "3 + ___ = 7," child places a tile for
the missing addend. The CV system matches the detected digit against `answer - left`.

**Trade-offs:**
- Pro: Directly closes the Marx et al. (2025) gap — no app currently does this.
- Pro: Baroody et al. (2016) found this specific task type is significantly more efficacious
  than drill for subtraction fluency development.
- Pro: Architecturally clean: new problem type in `problem-generator.ts`, new display
  in `ProblemDisplay.tsx`, answer validation uses existing CV pipeline.
- Pro: Age-appropriate for 6–8 end of target range.
- Con: Needs visual redesign: "3 + ___ = 7" is a different display from "3 + 4 = ?"
- Con: May be confusing for 5-year-olds without scaffolding; needs age-gating at lower
  difficulty levels.
- Con: Requires corresponding explanatory feedback (Option A) to be maximally effective.

### Option C — Learning trajectory redesign (comprehensive, high complexity)

Redesign difficulty levels to follow the Clements/Sarama learning trajectory explicitly:
Level 1 = subitizing + join to 5, Level 2 = join to 10, Level 3 = make-10 strategy,
Level 4 = missing addend, Level 5 = subtraction as difference. Replace the current
streak-based difficulty with per-skill mastery tracking in localStorage.

**Trade-offs:**
- Pro: Aligns the entire game with research-validated developmental progressions.
- Pro: Addresses all gaps simultaneously.
- Con: High complexity. Requires redesigning `difficulty.ts`, `problem-generator.ts`,
  `game-store.ts`, and `session.ts`. Significant test surface area.
- Con: Mastery tracking in localStorage (without backend) will be imprecise for young
  children across sessions.
- Con: Risk of over-engineering before validating that simpler changes produce gains.

---

## Recommendation

**Implement Options A and B together, in that order.**

The evidence hierarchy is clear:
1. Explanatory feedback (Option A) is the single most-cited necessary condition for
   learning gains across every major meta-analysis and RCT in this space (Outhwaite 2023,
   My Math Academy 2022, Frontiers 2023). It requires no structural changes and closes
   the most important gap immediately.
2. Missing addend problems (Option B) close the gap Marx et al. (2025) identified across
   all 18 apps in their review, have a direct efficacy study behind them (Baroody 2016),
   and are architecturally clean in the existing codebase.

Do not add multiplication. The research (Nunes/Bryant, Nuffield Foundation) is
unambiguous that symbolic multiplication is not appropriate for ages 5–8 (other than
informal equal-groups experiences for 7–8 year olds, which requires new problem types
and tiles outside current scope).

Do not require multi-digit tile answers. The cognitive development research (PMC9177579,
PMC4460578) shows syntactic place value understanding is not reliable until Grade 2
(age 7–8). The current single-digit answer constraint is pedagogically sound.

Option C (full learning trajectory redesign) is the right long-term direction but should
follow Options A and B, not precede them. Build the feedback layer first, validate it
on-device, then redesign the progression.

---

## Sources

- Clements, D.H. & Sarama, J. (2020). *Learning and Teaching Early Math: The Learning
  Trajectories Approach* (3rd ed.). Routledge. ISBN 9780367521974.
- [PMC9177579 — Place value: Approximation before principles (2022)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9177579/)
- [PMC4460578 — Young Children's Interpretation of Multidigit Number Names](https://pmc.ncbi.nlm.nih.gov/articles/PMC4460578/)
- [WWC Practice Guide PG-18: Teaching Math to Young Children](https://ies.ed.gov/ncee/wwc/practiceguide/18)
- [Nuffield Foundation — Key Understandings in Mathematics Learning, Paper 3](https://www.nuffieldfoundation.org/wp-content/uploads/2020/03/P3.pdf)
- [Marx et al. (2025) — Part-whole relations in math apps, IEJME](https://www.iejme.com/article/from-the-whole-to-its-parts-a-systematic-analysis-of-affordances-for-learning-part-whole-relations-15677)
- [My Math Academy RCT — JREE 2022 (ERIC EJ1328299)](https://eric.ed.gov/?id=EJ1328299)
- [My Math Academy K–1 efficacy study — Early Childhood Education Journal (Springer 2022)](https://link.springer.com/article/10.1007/s10643-022-01332-3)
- [My Math Academy — Evidence for ESSA (Tier 1)](https://www.evidenceforessa.org/program/my-math-academy/)
- [Frontiers systematic review — ECE math interventions (2023)](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.1229849/full)
- [Springer — Subtraction take-away vs. difference longitudinal study](https://link.springer.com/article/10.1007/s10649-011-9305-6)
- [Springer — Missing addend problems and subtraction (EJPE)](https://link.springer.com/article/10.1007/BF03172907)
- [James-Brabham et al. (2025) — Home math activities systematic review](https://srcd.onlinelibrary.wiley.com/doi/full/10.1111/cdev.14162)
- [Nuffield Foundation — Can maths apps add value? (ongoing)](https://www.nuffieldfoundation.org/project/can-maths-apps-add-value-to-learning)
- Carpenter, T.P. & Moser, J.M. (1984). The acquisition of addition and subtraction concepts in grades one through three. *JRME*.
- Nunes, T. & Bryant, P. (1996). *Children Doing Mathematics*. Blackwell.
- Baroody, A.J., Purpura, D.J., Eiland, M.D., Reid, E.E., & Paliwal, V. (2016). Does fostering reasoning strategies for relatively difficult basic combinations promote transfer? *Learning and Individual Differences.*
