# Research: Early Childhood Literacy Science for TileSight Spelling Mode

*Date: 2026-03-14. Read-only investigation. No source files modified.*

This research synthesizes four authoritative sources to establish the evidence base for
what makes a camera-based tangible spelling game educationally effective for ages 5–8.

---

## 1. Current State — What Exists

The spelling game mode is architecturally planned but pedagogically undefined. What
exists:

- `TapToStart.tsx` has a disabled "Spelling" button ready to wire up
- `src/types/game.ts` defines a `GameMode` interface but `Problem.answer: number` cannot
  hold a word (docs/product-overview.md:286–292)
- `docs/learning-science-research.md` contains a full math-learning synthesis noting the app is
  "a camera-verified worksheet" — the same critique applies to an unreflective spelling mode
- No word list, no pedagogical sequencing, no instructional model exists anywhere in the
  codebase for spelling

The architecture is ready (36-class ONNX model path, `letter-interpretation.ts` seam).
The pedagogy is a blank slate. This research fills that blank.

---

## 2. The Four Sources — Findings and Evidence Ratings

### Source A: IES/WWC Foundational Reading Skills Practice Guide (2016)

**Citation:** Foorman et al. (2016). *Foundational Skills to Support Reading for
Understanding in Kindergarten Through 3rd Grade*. IES Practice Guide.
URL: https://ies.ed.gov/ncee/wwc/practiceguide/21

**Target age range:** Kindergarten through Grade 3 (approximately ages 5–9). Directly
overlaps TileSight's 5–8 target.

**The four recommendations with evidence ratings:**

| Rec | Focus | Evidence Rating |
|-----|-------|----------------|
| 1 | Academic language and vocabulary | Minimal Evidence |
| 2 | Phonemic awareness + sound-letter links | **Strong Evidence** |
| 3 | Decoding, encoding, writing, recognizing words | **Strong Evidence** |
| 4 | Connected text reading daily | Moderate Evidence |

Recommendations 2 and 3 — the two with Strong Evidence — are directly applicable to a
spelling game.

**Recommendation 2 — Phonemic Awareness specifics:**

The guide specifies that students must develop the ability to:
1. Identify individual sounds (phonemes) in spoken words
2. Print letters of the alphabet
3. Know the corresponding sound for each letter

Key activities called out: Elkonin sound boxes (pushing a token per phoneme while
saying a word), onset-rime awareness tasks, word building using sound boxes. The
companion Phonological Awareness and Phonics Instruction Rubric provides full sequencing.

**Recommendation 3 — Decoding and Encoding specifics:**

The six instructional components are:
1. Blend letter sounds and sound-spelling patterns left-to-right to produce a pronunciation
2. Teach common sound-spelling patterns (phonics)
3. Teach students to recognize common word parts
4. Have students read decodable words in isolation and in text
5. Teach regular and irregular high-frequency words for efficient recognition
6. Introduce non-decodable words essential to meaning as whole-word units

"Write and recognize words" is explicit — encoding (spelling) is not supplementary;
it is a core instructional method at the same evidence level as decoding.

**Key implication for game design:** A game that only asks children to *read* a word
and place tiles misses half the Rec 3 mandate. The stronger design asks children to
*produce* the spelling from a spoken/shown word (encoding direction), not just
*verify* a pre-shown spelling (decoding direction).

---

### Source B: Ehri (2014) — Orthographic Mapping

**Citation:** Ehri, L.C. (2014). Orthographic mapping in the acquisition of sight word
reading, spelling memory, and vocabulary learning. *Scientific Studies of Reading, 18*(1).
DOI: 10.1080/10888438.2013.819356
Also summarized at: https://readinguniverse.org/article/explore-teaching-topics/big-picture/what-is-orthographic-mapping

**What orthographic mapping is:**

Orthographic mapping (OM) is the mental process by which a reader permanently bonds a
word's spelling, pronunciation, and meaning in long-term memory. Once mapped, the word
is recognized instantly as a sight word without decoding. Skilled readers carry 30,000–
60,000 such mapped words.

The mechanism: the reader consciously connects each grapheme in a word's spelling to its
corresponding phoneme in the word's pronunciation. Doing this even a few times creates a
permanent "superglue" bond in long-term memory.

**Prerequisites — what must be in place before OM can occur:**

Ehri identifies three required abilities (confirmed by Reading Universe):
1. **Phonemic awareness** — specifically segmentation and blending
2. **Grapheme-phoneme knowledge** — knowing the letter-sound correspondences
3. **Decoding ability** — being able to apply those correspondences to unfamiliar words

Without all three, OM cannot proceed. This means phonemic awareness is not optional
enrichment — it is the gateway to reading words fluently.

**Ehri's phases of word learning** (overlapping developmental stages):

1. Pre-alphabetic — visual/logographic (no letter-sound use)
2. Partial alphabetic — uses first/last consonants only
3. Full alphabetic — uses all grapheme-phoneme correspondences (OM can begin here)
4. Consolidated alphabetic — uses multi-letter chunks (rimes, morphemes)

Ages 5–8 span Phases 2–4. A 5-year-old pre-reader is likely partial alphabetic; a
fluent 7-year-old reader is consolidated alphabetic.

**How encoding (spelling) supports reading — the bidirectional mechanism:**

Ehri's research establishes that the grapheme-phoneme bond works in BOTH directions:
- Grapheme-to-phoneme (decoding/reading)
- Phoneme-to-grapheme (encoding/spelling)

Kilpatrick (phoneme-graphememapping.com) confirms: "an effective word study program is
essential to help students make connections between what they hear and what they see or
write so they can be orthographically mapped in the brain." Spelling activities
strengthen the same neural pathways activated during reading.

**Ehri's instructional guidelines for facilitating OM** (from understandingreading.home.blog):

1. **Grapheme-phoneme teaching:** Systematic scope and sequence; letter-embedded picture
   mnemonics where letters resemble objects (S = snake for /s/)
2. **Phoneme segmentation:** Breaking spoken words into individual sounds; students
   progress from initial sounds → initial+final → internal sounds; mouth monitoring
3. **Decoding sequence:** Short-vowel VC words → CVC words; start with continuant
   consonants (s, m, n, f, l, r) before stop consonants
4. **Spelling practice:** (a) pronounce word and count phonemes, (b) view spelling and
   match graphemes to sounds, (c) recall the analysis to write the word from memory.
   Special pronunciations ("choc-o-late") can enhance mapping.
5. **Read aloud:** Beginning readers must read unfamiliar words aloud to activate
   grapheme-phoneme connections; silent reading does not strengthen the bond
6. **Contextual text reading:** Sufficient practice in level-appropriate text to activate
   meanings and secure sight words

**Critical finding for game design:** Guideline 4 describes a three-step encoding
cycle that TileSight can directly implement: show the word → child analyzes
grapheme-phoneme pairs → child places tiles from memory. The "from memory" step
is the OM-strengthening act. Showing the answer continuously while the child places
tiles eliminates the memory retrieval that creates the bond.

---

### Source C: Phonemic Awareness Activities + Developmental Sequence

**Citation:** Reading Rockets; NC DPI; NAEYC (2024); 95 Percent Group; multiple sources
via web search.

**Developmental progression (ages 4–8, roughly):**

Children move through phonological awareness levels in this order (coarser to finer):

1. Word-level awareness (sentences → words)
2. Syllable-level awareness (clapping syllables)
3. Onset-rime awareness (c-at, fl-at)
4. Phoneme-level awareness (individual sounds within words) — most demanding

Phoneme-level awareness is rarely established before age 5. Benchmark data:
- Age 5, pre-kindergarten: 61% can produce a rhyming word; only 29% can blend
  individual phonemes; only 7% can segment phonemes
- Kindergarten: focus on rhyming, alliteration, segmenting sentences into words,
  syllables, and introducing phoneme manipulation
- Grade 1 (age 6–7): full phoneme blending and segmenting expected

**Specific activities with evidence support:**

*Blending (receptive — hearing phonemes, producing a word):*
- "Snail talk" / Robot talk: teacher says /f/ /l/ /a/ /g/ slowly, child blends to "flag"
- Baseball blending: pitcher says phonemes (/p/ /e/ /t/), child blends to "pet" and
  advances a base — gamification with physical movement
- Toy car driving: child says each phoneme while moving a car along a track; faster
  blending = faster driving; physical + phonemic

*Segmenting (productive — hearing a word, producing phonemes):*
- Elkonin boxes (sound boxes): draw boxes, push token/tile per phoneme — directly
  analogous to placing physical tiles in TileSight
- Tap counting: tap each phoneme on fingers
- Bead threading: push bead left per sound, push all right to blend
- Playdough smash: make ball per phoneme, smash while saying sound
- LEGO/pennies: physical object per sound

**Direct mapping to TileSight:** Elkonin boxes are already the closest physical
analogue to the game's tile-placement mechanic. The child is, in effect, doing a
physical Elkonin box exercise each time they place letter tiles. This is not a
coincidence — it is a feature worth explicitly designing around.

---

### Source D: Four Pillars Framework for Educational Apps

**Primary citation:** Hirsh-Pasek, K., Zosh, J.M., Golinkoff, R.M., Gray, J.H., Robb,
M.B., & Kaufman, J. (2015). Putting education in "educational" apps: Lessons from the
science of learning. *Psychological Science in the Public Interest, 16*(1), 3–34.
DOI: 10.1177/1529100615569721

**Applied study:** Griffith, S., Hagan, M., Heymann, P., Heflin, B., Bhatt, D., Donnelly,
S., Tworek, C., Sears, C., Hirsh-Pasek, K. (2021). How educational are "educational"
apps for young children? App store content analysis using the Four Pillars of Learning
framework. *Journal of Children and Media, 15*(4).
PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC8916741/

**The Four Pillars:**

| Pillar | What it requires | Opposite |
|--------|-----------------|----------|
| 1. Active Learning | "Minds-on" thinking and intellectual effort; generating responses | Cause-and-effect tapping; bubble popping |
| 2. Engagement in Learning | Features engage the user *in* the learning goal; no distractors | Advertising, excessive rewards, off-task animations |
| 3. Meaningful Learning | Content connects to children's everyday experience; skill transfers to real contexts | Disconnected drill with no real-world relevance |
| 4. Social Interaction | Co-play with others or meaningful parasocial relationships with characters | Single-player with no social layer |

**How poorly existing apps score:**

Of 124 "educational" apps analyzed:
- Pillar 1 (Active): 73% scored low (0–1 out of 3)
- Pillar 2 (Engagement): 76% scored low
- Pillar 3 (Meaningful): 64% scored low
- Pillar 4 (Social): 87% scored low
- 58% of all apps met the definition of "lower quality" (total score ≤4)
- Only 6% of apps scored above 8 (out of 10)

Paid apps outperformed free apps on Pillar 2 (fewer distracting ads/rewards); 50% of
paid apps still scored poorly.

**Specific design findings:**

*Active Learning (Pillar 1):*
- Lego DUPLO Town scored high because children must problem-solve when pieces misalign —
  the app does not auto-correct; the child must think through why
- Passive apps: tapping to cycle through alphabet letters; one-tap bubble popping

*Distracting vs Engaging (Pillar 2):*
- "Seductive details" — extraneous animations, sound effects, tangential mini-games
  unrelated to the learning goal — cause children to drift off task
- Excessive reward systems where "tokens and stars cover the screen after every action"
  undermine intrinsic motivation
- Multiple interruptive video advertisements are the worst offenders for free apps
- Toca Lab scored high: character reactions to user actions enhance open-ended play
  without distraction

*Meaningful Learning (Pillar 3):*
- Little Panda Travel Safety scored high by teaching safety strategies with real-world
  narration connected to children's lives
- Baby Phone scored low: disconnected button-tapping with no learning objective

*Feedback quality:*
- Effective apps provide "corrective or formative responses contingent to the child's
  actions" — feedback explains *why* an answer was wrong
- Ineffective apps use nonspecific feedback — excessive visual/sound effects — that "may
  undermine users' intrinsic motivation"

**Critical finding for game design:** TileSight's current motivational-only feedback
("Great job!") fails Pillar 2's engagement standard and provides none of the corrective/
formative feedback that research marks as distinguishing effective from ineffective apps.
This maps directly to the finding in `docs/learning-science-research.md` that "explanatory
feedback" is a necessary condition for learning gains (Outhwaite et al., 2023).

---

## 3. Tangible Interfaces — Additional Evidence

**Citation:** Multiple CHI/ScienceDirect papers (2017–2023) via web search.

Tangible User Interfaces (TUIs) — physical objects that interact with digital systems —
have a growing evidence base for early childhood literacy specifically:

- **Tiggly** (4–8 year olds): physical vowel letter tiles placed on iPad → phonics word-
  building activity. Direct precedent for TileSight's letter tile mechanic.
- **PhonoBlocks / VocaBlocks**: AR system for spelling acquisition; extended TUI reading
  systems for children with dyslexia
- TUI enables learning that is "cognitive, emotional, physical, and social simultaneously"
- Particularly beneficial for children with dyslexia where multisensory engagement is
  diagnostic

**Critical alignment:** The Elkonin box research (Source C) and the TUI research converge
on the same mechanism: physical token manipulation while performing phonological tasks
simultaneously engages motor, visual, and phonological processing channels. TileSight's
tile-placement mechanic is a TUI Elkonin box. The pedagogy should be designed to exploit
this, not ignore it.

---

## 4. Constraints — What Cannot Change

**Architectural constraints (from codebase, non-negotiable):**

1. Answer must be single-detector output: the CV pipeline produces a left-to-right
   sorted array of recognized letters. The game logic must match this array against an
   expected spelling. `interpretation.ts` already sorts by centerX.
   (docs/product-overview.md:254)

2. All tiles are placed simultaneously, not sequentially: the camera sees all tiles at
   once and must match the full word. Sequential tile-by-tile recognition (like Elkonin
   boxes in pure form) is not compatible with the current detection architecture.

3. Physical tile set is fixed: whatever letters exist on physical tiles constrains the
   word list. A 26-letter set covers all words; a smaller set restricts word selection.

4. Immutable rule: all feedback must be child-friendly — no negative/punitive language.
   (`.claude/rules/immutable.md`)

5. CV pipeline gives no "partial credit" signal: the interpretation layer produces
   either a matched word or no match. There is no "you have 2 of 3 letters right" signal
   from the current architecture without significant changes.

**Pedagogical constraints (from research, non-negotiable):**

6. Target phoneme complexity must match age. At age 5: blending is hard (only 29% can);
   segmenting is harder (7% can). Grade 1 (age 6–7) is the realistic floor for confident
   phoneme manipulation. Word selection must respect this — 3-letter CVC words (cat, dog,
   hat) are the appropriate starting point.

7. Phonemic awareness must be present before OM can proceed. For the youngest users
   (age 5), the game cannot assume children know that words consist of individual phonemes.
   Word lists must be limited to words the child likely already knows auditorily.

---

## 5. Options — Three Design Approaches

### Option A: Decoding Scaffold (Minimal Pedagogical Lift)

**How it works:** Show the word on screen ("CAT"). Child places letter tiles. App
confirms all tiles present and in correct order. Celebration.

**What it teaches:** Letter recognition, left-to-right sequencing, grapheme identification.

**What it does not teach:** Phonemic awareness, phoneme-grapheme bonding, encoding from
memory. The child is reading symbols and copying them — there is no phonological
processing required.

**Evidence rating:** This is the equivalent of the "camera-verified worksheet" critique
in learning-science-research.md. It satisfies the mechanical task but not the learning goal.
Fails Pillar 1 (Active Learning): tapping/placing without thinking = low score.
Produces no orthographic mapping because the child never retrieves the spelling from
memory.

**Trade-off:** Lowest implementation complexity. Highest risk of being educationally
inert.

---

### Option B: Encoding from Spoken Word (Full OM Alignment)

**How it works:** Child hears the word spoken aloud (or sees a picture of the object).
The word is NOT shown in text. Child must produce the spelling by placing tiles.
App confirms correctness.

**What it teaches:** This is the full orthographic mapping cycle per Ehri Guideline 4:
hear word → segment into phonemes → map phonemes to graphemes → place tiles from
phonological analysis. Every correct placement requires genuine phoneme-grapheme
processing. This is what the research says creates permanent sight word memory.

**Evidence rating:** Directly implements the Strong Evidence recommendation (Rec 3,
WWC) and Ehri's Guideline 4. Maximizes Pillar 1 (Active Learning — child must think).
Supports Pillar 3 (Meaningful Learning — recognizable words from child's world).

**Trade-off:** Harder for youngest users (age 5–6) who cannot yet segment phonemes.
Requires audio capability (word pronunciation) — already available via Howler.js.
Risk: frustration if word list is not calibrated to developmental level.
Mitigation: strong scaffolding (letter hint mode, syllable breakdown on retry).

---

### Option C: Progressive Encoding with Scaffolded Hints (Hybrid)

**How it works:** Start with Option B (encoding from spoken word + picture). On first
incorrect attempt: reveal partial hint (first letter highlighted). On second incorrect
attempt: reveal all letter tiles needed for the word (child still must arrange them).
On third attempt: show the word in full (Option A fallback — child completes from visual).

**What it teaches:** On attempt 1, full OM encoding cycle. On attempt 2, partial
phonological scaffolding. On attempt 3, letter recognition and sequencing (still not
inert — child still physically places tiles and builds motor-letter-sound associations).

**Evidence rating:** Aligns with WWC Rec 3 Guideline 6 ("corrective or formative
feedback contingent to child's actions") and the Four Pillars Pillar 2 standard for
effective feedback. Avoids the frustration risk of Option B for the youngest users.
Mirrors the star-reward hierarchy already in the math game (3/2/1 stars by attempt).

**Trade-off:** More UI states to design and implement. Word display logic branches on
attempt number. Requires audio assets (word pronunciation recordings). Slightly higher
implementation complexity than Option A or B alone.

---

## 6. Recommendation

**Option C — Progressive Encoding with Scaffolded Hints.**

**Why:**

1. **Strongest alignment with all four evidence sources.** Option B is the purest
   implementation of Ehri's OM cycle, but Option C adds the corrective feedback layer
   that the Four Pillars research and Outhwaite et al. (2023) identify as a *necessary
   condition* for learning gains. Option A is educationally inert. Option C preserves
   Option B's first-attempt pedagogical value while adding the feedback architecture
   research requires.

2. **Matches the existing game's star mechanic.** The math game already awards 3/2/1
   stars by attempt number. The scaffolding progression is the spelling-mode equivalent:
   3 stars = full encoding from memory, 2 stars = letter-hint used, 1 star = full word
   revealed. No new reward architecture needed.

3. **Handles the age 5 developmental floor gracefully.** A 5-year-old who cannot yet
   segment phonemes will fail attempt 1, receive a hint on attempt 2, and eventually
   succeed. They still place physical tiles — still exercise the motor-phonological
   binding — just with more support. The research does not say that scaffolded success
   is worthless; it says unscaffolded drill with no feedback is.

4. **The word list IS the primary pedagogy.** Regardless of which option is chosen,
   the word list determines educational value. The research is unanimous:
   - Start with 3-letter CVC words the child already knows auditorily (cat, dog, hat,
     pig, sun, cup, bed, top)
   - These activate orthographic mapping because the phonological representation is
     already in memory — the child is bonding a known word's sound to its spelling
   - Add 4-letter words (ball, fish, frog, jump) for difficulty 2
   - Avoid irregular words at early levels (the, was, said) — they require whole-word
     memorization, not phoneme-grapheme mapping
   - Maximum 3–4 words per session (matches working memory limits for ages 5–8)

5. **Physical tile placement is already a validated activity.** The TUI research and
   Elkonin box research converge: moving a physical object while performing a phonological
   task simultaneously engages motor, visual, and phonological channels. The game's core
   mechanic is not an arbitrary choice — it is a multisensory literacy activity with an
   evidence base. The design should make this explicit: the "Put your answer here" zone
   is an Elkonin box.

**Implementation prerequisites (not in scope here, for plan step):**
- Audio recordings of target words (pronunciation playback for Option B/C attempt 1)
- Word list curated to CVC/4-letter decodable words, difficulty-tiered
- UI for picture-or-spoken-word prompt (replaces `ProblemDisplay`'s equation UI)
- Partial hint state in `GamePhase.scanning` (which letters to reveal per attempt)
- 36-class ONNX model (prerequisite from spelling game research — letter classIds 10–35)

---

## Sources

- [IES/WWC Foundational Reading Skills Practice Guide](https://ies.ed.gov/ncee/wwc/practiceguide/21)
- [Ehri (2014) via ERIC](https://eric.ed.gov/?id=EJ1027413)
- [Ehri orthographic mapping instructional guidelines](https://understandingreading.home.blog/2021/04/18/dr-linnea-ehris-list-of-instructional-guidelines-for-enhancing-orthographic-mapping-and-word-learning/)
- [Reading Universe — What Is Orthographic Mapping](https://readinguniverse.org/article/explore-teaching-topics/big-picture/what-is-orthographic-mapping)
- [Phoneme-GraphemeMapping.com — Role of Orthographic Mapping](https://phoneme-graphememapping.com/the-role-of-orthographic-mapping-in-learning-to-read-and-spell/)
- [Hirsh-Pasek et al. (2015) — Putting Education in Educational Apps](https://pubmed.ncbi.nlm.nih.gov/25985468/)
- [Griffith et al. (2021) — Four Pillars App Analysis — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8916741/)
- [Reading Rockets — Blending and Segmenting Games](https://www.readingrockets.org/classroom/classroom-strategies/blending-and-segmenting-games)
- [NAEYC — Word Play Throughout the Day (2024)](https://www.naeyc.org/resources/pubs/tyc/winter2024/word-play-throughout-the-day)
