# Learning Science Research

The single reference for all education and learning-science research behind TileSight: a camera-based tangible arithmetic and literacy game for ages 5-8.

---

## 1. Purpose / Central Problem

TileSight currently operates as a **camera-verified worksheet** in math mode and a **visual pattern-matching exercise** in spelling mode. The core loops are:

- **Math:** Show arithmetic prompt, detect tile, celebrate or reveal answer, next round. The child's only cognitive task is: read the equation, produce the answer, place a tile.
- **Spelling:** Show word as text ("DOG"), child finds letter tiles D, O, G, camera recognizes match, celebrate. No phonological analysis is required or prompted.

The research is unambiguous that both modes are insufficient. For math, Outhwaite et al. (2023) found that **explanatory feedback + motivational feedback + programmatic levelling** was a necessary condition for apps that produced significant learning gains. For spelling, Ehri (2014) established that orthographic mapping requires the child to produce the spelling from phonological analysis, not copy it from a visible model.

This document synthesizes the research base to guide product decisions that move TileSight from engagement theater toward measurable learning outcomes.

---

## 2. Key Research Findings

### 2.1 Why Early Math Matters

**School-entry math is the strongest predictor of later achievement** among the readiness skills studied across six longitudinal datasets (Duncan et al., 2007). This is the clearest justification for caring whether TileSight changes actual math understanding, not just engagement. [PubMed](https://pubmed.ncbi.nlm.nih.gov/18020822/)

The National Research Council's *Mathematics Learning in Early Childhood* (2009) is the most authoritative field-level synthesis on early-childhood mathematics, equity, and instruction. [PDF](https://math4all.onmason.com/wp-content/blogs.dir/1543/files/2014/09/Math-learning-in-Early-Childhood.pdf)

A 2023 Frontiers systematic review of ECE math interventions found a mean effect size of g = 0.76, with individualized instruction on single content areas producing the strongest results. [Frontiers](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.1229849/full)

### 2.2 Learning Trajectories and Developmental Sequencing

**Clements and Sarama's Learning Trajectories / Building Blocks** work treats early math as a sequence of developmental progressions and intentionally sequenced activities. This is probably the single most relevant research program for TileSight's content design. A product for ages 5-8 should start from magnitude, counting principles, comparison, and composition/decomposition, then move into more fluent addition/subtraction strategies. [Learning Trajectories](https://www.learningtrajectories.org/math/learning-trajectories) | [IES/WWC](https://ies.ed.gov/ncee/WWC/Intervention/2151)

The **IES/WWC Practice Guide, *Teaching Math to Young Children*** gives five evidence-rated recommendations for preschool through kindergarten math instruction. Its first recommendation: "Teach number and operations using a developmental progression." This is the closest thing to a government-issued checklist for early math apps. [IES](https://ies.ed.gov/ncee/wwc/PracticeGuide/18)

The NAEYC + NCTM joint position statement describes what high-quality mathematics education for ages 3-6 should look like and lays out 10 research-based recommendations for defining "developmentally appropriate."

### 2.3 Manipulatives and Physical Representation

**Carbonneau, Marley, and Selig (2013) meta-analysis:** Manipulatives outperform abstract-symbol-only instruction on average, but the effects are moderated by instructional design. The takeaway is not "physical is always better"; it is "physical can help when the representation is doing the right cognitive work." The tile is not the moat; what the tile represents is the moat. [ERIC](https://eric.ed.gov/?id=EJ1007941)

**Cheung et al. (2023) on perceptually rich manipulatives:** Perceptually rich materials can distract and may produce smaller retention effects or even worse problem solving than blander manipulatives. Tile design and play-surface design matter more than most teams assume. [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S088520062300090X)

**Ramani and Siegler on linear numerical board games:** Four 15-minute sessions of a simple linear number board game eliminated low- vs. middle-income differences in numerical estimation. Linear magnitude representations tie to broader math outcomes. Extremely relevant to how tiles and problems are laid out. [PDF](https://siegler.tc.columbia.edu/wp-content/uploads/2019/02/sieg-ram08.pdf) | [Academia](https://www.academia.edu/20235335/Playing_linear_numerical_board_games_promotes_low_income_childrens_numerical_development)

**Schiffman et al. (2018) on linear-spatial materials for addition strategies:** Linear-spatial materials were more likely than irregular arrays to support better addition strategies like count-on, not just count-all. Directly actionable: how tiles are laid out changes what strategies children use. [PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0208832)

**TUI systematic review (Springer 2021, 155 studies):** Physical manipulatives outperform classical methods. PhonoBlocks (3D letter tiles) produced significant learning gains for letter-sound correspondences. [Springer](https://link.springer.com/article/10.1007/s00779-021-01556-x)

**Tangible-user-interface research** argues TUIs may support early math because they combine physical objects with multimedia and can support home math interaction. But the evidence base is still emerging -- validate empirically rather than assuming "physical + digital" is automatically superior. [ACM](https://dl.acm.org/doi/fullHtml/10.1145/3546155.3546672)

### 2.4 Guided Play

**Skene et al. (2022) meta-analysis:** Guided play showed a greater positive effect than direct instruction on early math skills, shape knowledge, and task switching, and outperformed free play on spatial vocabulary. The strongest version of TileSight is one where the child has agency, but the environment strongly channels attention toward the mathematical idea. [JAACAP](https://www.jaacap.org/article/S0890-8567(22)00020-2/fulltext) | [PubMed](https://pubmed.ncbi.nlm.nih.gov/35018635/)

The right product stance is **guided play, not drill and not free play.** The task architecture should be precise (trajectory, mastery gating, explanatory feedback), but the child's experience should feel playful (physical tiles, warm language, no rigid pacing). This is what guided play actually means: child agency within a structured path.

### 2.5 Feedback and Levelling

**Outhwaite et al. (2023) content analysis + qualitative comparative analysis of evaluated math apps:** The combination of explanatory + motivational feedback with programmatic levelling (static or dynamic) was a necessary condition for highly effective math apps. Most evaluated apps were practice-based, mostly targeted basic number skills, and only 2 of 25 included support for adult-child interactions. This is the single strongest finding from the app-evaluation literature. [UCL Discovery](https://discovery.ucl.ac.uk/id/eprint/10170561/1/Outhwaite%20et%20al.%202023.pdf)

**Outhwaite et al. (2019) RCT of interactive math apps:** After a 12-week intervention, structured, content-rich interactive apps produced greater learning gains than standard math practice and generalized to higher-level reasoning/problem solving. Strong evidence that well-designed apps can help, not just entertain. [ERIC](https://eric.ed.gov/?id=EJ1205220)

**My Math Academy / Bang et al.:** This personalized, mastery-based, adaptive system improved early math while keeping children engaged. Gains were strongest where there was more room to grow and on harder skills. Two ESSA Tier 1 RCTs; after ~5 hours, treatment students significantly outperformed controls on TEMA-3. Highly relevant for the adaptivity model. [Springer](https://link.springer.com/article/10.1007/s10643-022-01332-3) | [ERIC](https://eric.ed.gov/?id=EJ1328299) | [ESSA](https://www.evidenceforessa.org/program/my-math-academy/)

**Baroody et al. (2016):** Software targeting the rationale of subtraction-as-addition was "significantly more efficacious in promoting fluency with unpracticed subtraction items" than drill. [Springer](https://link.springer.com/article/10.1007/BF03172907)

**Expertise reversal (Sweller):** Explanatory feedback helps novices but becomes extraneous load for experts. The fade schedule matters: full explanations at early difficulty, progressively briefer as mastery grows.

### 2.6 Mathematical Language

Math language -- terms like many, most, fewest, before, after, near, far -- predicts children's math development (Purpura et al.). There is also evidence that children's language proficiency matters in app-based math learning in bilingual settings. The best version of TileSight teaches vocabulary and relationships, not just symbol manipulation. Mathematical language is part of the learning mechanism, not decoration. [Frontiers](https://doi.org/10.3389/fpsyg.2020.01925) | [BJET](https://bera-journals.onlinelibrary.wiley.com/doi/10.1111/bjet.12912)

### 2.7 Part-Whole Reasoning

**Marx et al. (2025) systematic review:** 0 of 18 reviewed math apps implemented a systematic approach to part-whole learning from hands-on to more abstract compositions/decompositions. This is both a pedagogical gap and a market gap. Missing-addend problems ("3 + ? = 7") require inverse reasoning -- understanding that 7 decomposes into 3 and something. This is the foundation of algebraic thinking and the single highest-leverage new problem type for TileSight. [IEJME](https://dx.doi.org/10.29333/iejme/15677)

### 2.8 Strategy Traces

Children's early addition strategies develop from count-all toward count-on, decomposition, and retrieval. Linear-spatial materials increase the use of more advanced strategies (Schiffman et al.). A camera-based tangible system has an unusual opportunity: it can log order of tile placement, hesitation, self-correction, rearrangement, and alternate solutions. Strategy changes matter more than correctness for tracking genuine learning.

### 2.9 Math Anxiety and Attribution

Math anxiety is measurable at age 5. Person-focused negative attributions ("You're not good at this") predict avoidance and poorer achievement. Process-focused responses support learning. This has direct implications for error feedback and camera-uncertainty language: false negatives from recognition should be surfaced as system uncertainty ("Hold your tile flat so I can see it"), not child failure. [Frontiers](https://doi.org/10.3389/fpsyg.2024.1335952)

### 2.10 Home and Adult Interaction

**Berkowitz et al. (2015) RCT:** A math-at-home app increased math achievement. Parent-child math interaction mediated by an app produces real gains. [PubMed](https://pubmed.ncbi.nlm.nih.gov/26702458/)

Parent number talk can causally improve children's number knowledge, but newer work shows that simple informational priming can increase math talk while also increasing parental control and reducing autonomy support. Adult scaffolds need careful wording: light-touch, process-oriented ("How did you figure that out?"), not controlling ("Do the math"). [OUP](https://academic.oup.com/chidev/article/91/6/e1162/8258217)

**James-Brabham et al. (2025):** Home math activities meta-analysis. [Child Development](https://srcd.onlinelibrary.wiley.com/doi/full/10.1111/cdev.14162)

### 2.11 Spatial and Embodied Cognition

Early spatial training transfers to math. Spatial assembly relates to emerging math as early as age 3. Semi-structured block play shows promising links to numeracy, math language, and executive function. Tile shape, spacing, and left-to-right layout may matter more than most teams assume. [Frontiers](https://doi.org/10.3389/fpsyg.2020.01938)

Gesture research shows that asking children to gesture during math explanation can reveal implicit knowledge and support learning. Finger-training research suggests hands can bridge verbal, symbolic, and non-symbolic number representations. The product already uses hands; the question is whether it uses them pedagogically or only mechanically. [PubMed](https://pubmed.ncbi.nlm.nih.gov/17999569/)

### 2.12 App Design Evidence and Engagement

**Hirsh-Pasek et al. (2015) / Griffith et al. (2021) Four Pillars:** Active, engaged, meaningful, socially interactive. 73-87% of "educational" apps score low on all four. Seductive details actively harm learning. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8099083/)

**Children's app preferences (2024):** Preschoolers were less likely to prefer and repeatedly use apps that experts rated as having higher educational value. Engagement cannot be treated as equivalent to educational quality. The most "sticky" version of an app may not be the most educational version. Learning experiments need outcomes beyond retention/usage. [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0747563224002292)

**NAEYC technology guidance:** Technology is effective when used intentionally; security and parental control matter. A no-cloud architecture is a trust advantage only if paired with thoughtful design. [Oklahoma](https://ou.edu/content/dam/Education/documents/ECEI/ECLI/NAEYC%20FRC%20Key%20Messages.pdf)

### 2.13 Cognitive Load and Motivation

**Sweller / Cognitive Load Theory:** Patrick Skinner (Superbuilders) explicitly centers cognitive load as the central design constraint. Design should clarify, not decorate. Distracting animations, colors, and characters consume working-memory bandwidth. [UNSW](https://www.unsw.edu.au/staff/john-sweller)

**Hinten meta-analysis on fantastical content:** Fast pace was not consistently harmful, but fantastical content had a negative immediate effect on young children's cognitive performance for ages 4-8. This supports "cognitive coherence" -- realistic, concept-serving visuals rather than over-fantastical designs. [Wiley](https://onlinelibrary.wiley.com/doi/10.1111/desc.70069)

**Bardach and Murayama on rewards:** Rewards are not simply good or bad; they can be useful as an entry point, but should transform into competence-driven motivation. For ages 4-8, the strongest intrinsic motivator is the feeling of competence ("I did it!"), not digital stickers. The durable arc: competence, then confidence, then identity, then intrinsic motivation. [Tubingen](https://uni-tuebingen.de/en/faculties/faculty-of-economics-and-social-sciences/subjects/department-of-social-sciences/education-sciences-and-psychology/institute/staff/murayama-kou-prof-dr/)

**Spontaneous focusing on numerosity (SFON):** Relates to early numerical skills and later arithmetic indirectly through magnitude estimation and calculation. A strong product might change what children notice in everyday scenes, not just how they answer prompted items. [Brain Sciences](https://doi.org/10.3390/brainsci12030313)

### 2.14 Retrieval, Spacing, and Mastery

**Roediger and Karpicke / Retrieval practice:** Retrieval practice is a powerful learning mechanism, and the Timeback platform puts it in Tier 0. However, retrieval practice after worked-example study does not automatically improve mathematical word-problem solving relative to restudy, especially for novices. "Retrieval-first" may need to become "retrieval when the representation and difficulty make it productive." [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9987560/)

Mastery gating, spaced review, interleaving, and worked examples are core mechanisms in Timeback's platform. The instruction sequence should probably be: worked example, then supported attempt, then retrieval, then spaced mixed review. [Timeback Docs](https://docs.timeback.com/beta/about-timeback/concepts/learning-science)

### 2.15 Literacy / Phonics

**IES/WWC Foundational Reading Skills (K-3):** Rec 2 (Strong Evidence): phonemic awareness + sound-letter links. Rec 3 (Strong Evidence): teach decoding AND encoding. Encoding is not supplementary -- it is half the mandate. [IES](https://ies.ed.gov/ncee/wwc/practiceguide/21)

**Ehri (2014):** Orthographic mapping requires: (1) phonemic segmentation/blending ability, (2) grapheme-phoneme knowledge, (3) the child must retrieve spelling from memory, not copy a visible model. The memory retrieval step is what creates the permanent word bond. [Taylor & Francis](https://www.tandfonline.com/doi/abs/10.1080/10888438.2013.819356)

**Weiser and Mathes (2011):** Encoding instruction produced significant positive effects on phonemic awareness, spelling, decoding, fluency, comprehension, and writing. Encoding and decoding are "reciprocally (or even synergistically)" related. [SAGE](https://journals.sagepub.com/doi/10.3102/0034654310396719)

**Johnston and Watson (2004) / Clackmannanshire study:** Synthetic phonics vs. analytic phonics in 5-year-olds over 16 weeks. Synthetic group ended spelling 7 months ahead of chronological age; analytic groups 2-3 months behind. Effect sizes increased over 7 years of follow-up. [TRL](https://www.thereadingleague.org/wp-content/uploads/2020/10/Brady-Expanded-Version-of-Alphabetics-TRLJ.pdf)

**Ouellette and Senechal:** Invented-spelling training produced greater phonemic awareness gains than controls and "learned to read more words in a learn-to-read task." [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0959475205000939)

**NASET Elkonin Boxes:** Evidence supports word boxes for "helping preschool to elementary students acquire phonemic awareness, letter-sound correspondences, and spelling." [NASET](https://www.naset.com/publications/ld-report/evidence-based-practice-research-elkonin-boxes/)

**LSHSS (2023):** Nonword spelling is "a unique predictor of later reading and played a facilitative role in the emergence of decoding." [ASHA](https://pubs.asha.org/doi/10.1044/2023_LSHSS-22-00161)

**Picture-text compounds (2023 review of 37 experiments):** 64.9% showed detrimental effects of pictures on word-reading performance. Children who cannot decode use images as a word-bypass strategy. Use pictures for semantic scaffolding (meaning), not as phonological cues (letter selection). [Springer](https://link.springer.com/article/10.1007/s42822-023-00139-0)

**Clark and Paivio (1991) / Dual Coding Theory:** Verbal label + visual image creates two independent memory codes. One of the most replicated findings in educational psychology. [PDF](https://nschwartz.yourweb.csuchico.edu/Clark%20&%20Paivio.pdf)

### 2.16 Audio and Multimodal Learning

**Mayer's Cognitive Theory of Multimedia Learning:** Temporal contiguity: audio + visual must be synchronized within ~500ms. Spatial contiguity: text and related image must be adjacent. [Link](https://learning-theories.com/cognitive-theory-of-multimedia-learning-mayer.html)

**Multimodal literacy (Springer 2020):** Combining visual + tactile + auditory channels improves acquisition over single-channel instruction, especially for initial grapheme-phoneme learning. [Springer](https://link.springer.com/article/10.1007/s10643-019-00974-0)

**TTS meta-analysis:** No significant comprehension difference between TTS and human voice, but studied grade 3 through college, not ages 5-6. Does not address isolated phoneme production. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5494021/)

**Why NOT TTS for phonemes:** No TTS system can produce clean isolated consonant phonemes. Stop consonants become /buh/, /duh/, /kuh/. A child who hears /buh/-/u/-/s/ cannot blend to "bus." Every major phonics app uses pre-recorded human voice.

### 2.17 Inclusive Settings and Trust

There is tangible-game work on math + sign language in inclusive settings. App-evaluation research explicitly includes security and parental control as dimensions. A no-cloud architecture is a trust advantage if treated as part of the pedagogy, not just the stack. [DOI](https://doi.org/10.34190/ecgbl.17.1.1411)

---

## 3. Product Implications for TileSight

### Physical tiles should reveal structure, not just confirm answers

The strongest design direction is to make placement itself meaningful: linear arrangements, visible composition/decomposition, comparing two quantities, and "make the same total in two ways" tasks. Children learn more when the representation reveals the math, not when it merely decorates it. A tile placed into the empty part of a "3 + ? = 7" bar is building a part-whole relationship, not entering a number.

### Build around a learning trajectory, not a bag of arithmetic prompts

Content should follow a developmental progression, not be random problems with different numbers. The trajectory should sequence the type of mathematical thinking:

| Stage | Task Family | Concept | Example |
|---|---|---|---|
| 1 | Show a number | Numeral recognition | "Show me 4" |
| 2 | Compare | Magnitude comparison | "Which is more: 3 or 7?" |
| 3 | Make a total | Composition (sums ≤ 5) | "2 + 3 = ?" |
| 4 | Make 5 / Make 10 | Benchmark composition | "4 + ? = 5" |
| 5 | Missing part | Part-whole reasoning | "3 + ? = 8" |
| 6 | Take away | Subtraction as removal | "7 - 3 = ?" |
| 7 | Mixed fluency | All types, randomized | Varies |

### Feedback must be explanatory and motivational, not merely celebratory

Early on, children need to know why a response is correct or incorrect; later, the system can fade explanation and lean on speed, confidence, and spaced review. Bare celebration ("Great job!") or bare fact revelation ("The answer is 7") is insufficient.

### Capture strategies, not just correctness

Log order of tile placement, hesitation, self-correction, hint level reached, and wrong attempts before correct. A child who self-corrects is learning. A child whose response time drops is building fluency. Strategy traces are a stronger educational instrument and a more defensible product differentiator than fast on-device inference.

### Surface camera uncertainty as system attribution

When recognition confidence is low, show language that blames the system ("Hold your tile flat so I can see it"), not the child. Early math anxiety matters at kindergarten age. A false negative experienced as "I'm bad at math" is a motivational event, not a technical bug.

### Redesign spelling as progressive encoding

Replace visual copying with a scaffold that fades from full phonological encoding (no word shown, image + audio only) through partial encoding (first letter revealed) to supported copying. Match attempt level to star rewards (3/2/1). Physical tile placement at every level still exercises motor-phonological binding.

### Add audio -- pre-recorded, not TTS

For pre-readers ages 5-6, spoken language is the primary encoding channel. A spelling game without audio is playable only by children who can already read. Use Howler.js audio sprites with pre-recorded human voice for phonemes.

### Add a light adult-scaffolding layer

Only 2/25 evaluated apps supported adult-child interaction. Process-oriented prompts ("Ask your child: How did you figure that out?") are a genuine product opportunity, but must be light-touch and autonomy-supportive, not controlling.

### Visuals should be cognitively coherent, not over-fantastical

Fantastical content has a negative immediate effect on young children's cognitive performance. The winning product is not the most dazzling; it is the one that spends every bit of attention budget on understanding. This does not mean "no imagination ever"; it means "don't spend cognitive budget on fantasy that is pedagogically idle."

### Competence should be the emotional center

For ages 4-8, the strongest intrinsic motivator is the feeling of competence. The child should leave feeling "I'm getting good at this," not "I'm good at farming stars." Extrinsic rewards can scaffold early engagement but should fade into competence-driven motivation.

### Do NOT add multiplication or multi-digit answers

Formal multiplicative thinking is not reliable until ages 7-9 (Nunes and Bryant). Syntactic place value understanding does not reliably emerge until Grade 2. The existing MAX_ANSWER = 9 constraint is pedagogically sound. Change the type of mathematical thinking (part-whole, missing addend, comparison), not the number range.

---

## 4. SPOVs (Spiky Points of View)

**SPOV 1: The moat is not computer vision; the moat is representational fidelity.** A better detector does not automatically produce better learning. The benefit of physical materials depends on whether they make mathematical structure visible. TileSight wins when tile placement reveals number relationships, not when the CV stack merely reads answers faster.

**SPOV 2: The right product stance is guided play, not drill and not free play.** The strongest design pattern is child agency inside an intentionally scaffolded path. Guided play outperforms more didactic formats on some early-math outcomes, and the strongest app results come from systems that blend playfulness with explanatory feedback and progression.

**SPOV 3: The highest-leverage data are not right/wrong answers; they are strategy traces.** Most products stop at correctness. A camera-based tangible system can observe strategy changes, hesitation, self-correction, alternative decompositions, and adult-child interaction patterns. That is a more defensible educational instrument than "we do on-device inference in Safari."

**SPOV 4: The moat is learning-science constraints encoded into software.** The important innovation is not "browser CV on an iPad" but a system that turns research on mastery, retrieval, worked examples, and signal integrity into default product behavior. Shallow success is worse than visible failure.

**SPOV 5: For ages 4-8, cognitive coherence beats spectacle.** The most educationally powerful early-learning products will often look less magical and more reality-aligned than mainstream children's media.

**SPOV 6: A tangible math product is valuable only when it changes the child's strategy, not merely the input device.** Care less about whether a child places a physical tile and more about whether the tile system causes better mathematical inferences -- linear magnitude, part-whole reasoning, count-on, decomposition, transfer. Physicality is not the benefit; representational leverage is.

---

## 5. Unknown Unknowns

1. **Is the physicality doing cognitive work, or is it just novelty?** Manipulatives help on average, but not automatically; richness can distract, and aligned spatial structure matters.

2. **Are you teaching part-whole reasoning, or only answer production?** A systematic gap in the current market (0/18 apps per Marx et al.).

3. **Can the product actually move children off count-all strategies?** Count-on, decomposition, and retrieval matter for later success. Tile sequencing and surface design should be tested against that goal.

4. **Which levelling regime helps which child?** Dynamic and static programmatic levelling both appear in effective apps. Lower-ability children may benefit more from structured static pathways; higher-ability children from dynamic skipping/acceleration.

5. **How much explanation is enough before it becomes drag?** Explanatory feedback helps novices, but detailed feedback becomes less necessary once mastered. The fade schedule is a product hypothesis that needs testing.

6. **Will parent prompts help, or quietly harm autonomy?** Parent number talk can help, but informational priming can increase controlling behavior and reduce autonomy support.

7. **Are you building mathematical language as well as calculation?** Math language predicts math development, and app-based math learning varies with language proficiency in bilingual settings.

8. **Will children naturally choose the educationally strongest version of the game?** Probably not. You need A/B tests that include learning outcomes, not just time-on-task.

9. **How will you separate "camera uncertainty" from "math error" in the child's mind?** Recognition confidence should shape UX. Early math affect matters.

10. **What is your transfer story?** Measure near transfer, far transfer, and delayed retention. The best app studies report generalized gains, but many apps are still basic-skill/practice-heavy.

11. **Can the product support inclusion and trust?** The no-cloud architecture could be a trust advantage if treated as part of the pedagogy.

12. **Does the game increase what children spontaneously notice about number (SFON)?** A really strong product might change what children notice in everyday scenes.

13. **Retrieval is not a universal hammer in mathematics.** Retrieval practice does not automatically improve mathematical word-problem solving for novices relative to restudy. "Retrieval-first" may need to become "retrieval when productive."

14. **DI-like instincts and early-childhood guided-play evidence are in genuine tension.** The right answer is probably guided precision: strong instructional architecture inside playful action.

15. **Anti-gaming systems built for older students can misread young children.** In ages 5-8, some "inefficient" behavior is actually exploration, strategy search, or sensorimotor rehearsal. Do not classify developmentally normal experimentation as gaming.

16. **Parent math anxiety and home numeracy will shape product effectiveness.** The adult layer should support competence instead of transmitting anxiety or overcontrol.

17. **"Cognitive coherence" should not harden into a blanket anti-imagination stance.** The useful principle is not "no fantasy ever"; it is "don't spend cognitive budget on fantasy that is pedagogically idle."

18. **Optimal hint timing for camera-based interaction.** The graduated hint research was conducted in screen-tap apps. TileSight has a gray zone between "child placed wrong tile," "camera can't see the tile," and "child hasn't placed any tile yet."

19. **Whether progressive encoding works without verbal instruction.** The app replaces the teacher with audio. Whether pre-recorded audio is sufficient to guide phonological analysis in a 5-year-old without an adult present is not established.

20. **Mastery thresholds.** The specific numbers (70% for "practiced," 90% for "mastered") are reasonable starting points, but need empirical tuning with real children.

21. **Detection reliability with letter tiles vs. number tiles.** Certain letters may be confused (E/F, M/W, p/q) at rates different from digit confusion.

---

## 6. Expert Profiles

### Early Mathematics

**Douglas H. Clements** -- Distinguished University Professor, Kennedy Endowed Chair in Early Childhood Learning, Executive Director of the Marsico Institute at the University of Denver. Foundational figure in early-childhood mathematics, learning trajectories, and educational technology. The deepest work on sequencing content and designing research-based math experiences. [Denver](https://morgridge.du.edu/about/faculty-directory/doug-h-clements)

**Julie Sarama** -- Kennedy Endowed Chair in Innovative Learning Technologies, Professor at University of Denver. Bridges curriculum design and tech design. Centers on young children's mathematical development, software environments, implementation, and scale-up. [Denver](https://morgridge.du.edu/about/faculty-directory/julie-sarama)

**Nancy C. Jordan** -- Dean Family Endowed Chair, Professor at University of Delaware. Major work on number sense, mathematical cognition, and learning difficulties. Especially relevant for supporting children at risk. X: @dr_nancyjordan. [NAEd](https://naeducation.org/member/nancy-jordan/)

**Nicole McNeil** -- Valuable for how children think and solve problems in mathematics. Relevant for concrete-to-abstract progression.

### Play, Home Interaction, and Math Language

**Geetha Ramani** -- University of Maryland. Focused on how children learn math and problem solving through play, games, blocks, and the home environment. One of the most directly relevant researchers for a playful tangible math product. X: @gbramani. [UMD](https://education.umd.edu/directory/geetha-ramani)

**Susan C. Levine** -- Rebecca Anne Boylan Professor, University of Chicago. Numerical and spatial aspects of early math, how home/school input and "math talk" affect learning. Essential for the language/spatial/home layer. [DREME](https://dreme.stanford.edu/people/susan-levine/)

**David Purpura** -- Professor, Director of the Center for Early Learning at Purdue. School readiness, assessment, intervention, home environment, math language, and dual-language learners. Relevant for building beyond a narrow demographic. [Purdue](https://hhs.purdue.edu/directory/david-purpura/)

### Playful Learning and App Design

**Kathryn Hirsh-Pasek** -- Professor at Temple, Senior Fellow at Brookings. Science of play and playful learning. Central if you want a defensible theory of why play should be in the product. X (shared): @KathyandRo1. [Temple](https://liberalarts.temple.edu/directory/kathryn-hirsh-pasek)

**Roberta Michnick Golinkoff** -- Unidel H. Rodney Sharp Chair, University of Delaware. Playful learning, language, and applying developmental science to design. X (shared): @KathyandRo1. [UDel](https://www.cehd.udel.edu/faculty-bio/roberta-michnick-golinkoff/)

**Laura Outhwaite** -- Principal Research Fellow (Associate Professor) at UCL CEPEO. One of the strongest current researchers on children's educational math apps. Follow most closely for app-evaluation frameworks and evidence on feedback/levelling. Bluesky: @laouthwaite.bsky.social. [UCL](https://profiles.ucl.ac.uk/67395-laura-outhwaite)

**Marina Umaschi Bers** -- Augustus Long Professor, Boston College. Developmentally appropriate technology and designing digital experiences for positive development. X: @marinabers. [Site](https://www.marinabers.com/bio)

**Mitchel Resnick** -- Professor of Learning Research, MIT Media Lab. Founder of Scratch. Playful, constructionist learning. X: @mres. [GBH](https://www.wgbh.org/people/mitchel-resnick)

### Cognitive Science and Instructional Design

**John Sweller** -- Cognitive Load Theory. The obvious anchor for the Superbuilders team given their explicit centering of cognitive load. [UNSW](https://www.unsw.edu.au/staff/john-sweller)

**Paul Kirschner** -- Worked examples and minimally guided instruction. Natural second anchor alongside Sweller.

**Kou Murayama** -- Motivation and rewards research. Best fit for the model of rewards as temporary scaffolds that fade into competence-based motivation. [Tubingen](https://uni-tuebingen.de/en/faculties/faculty-of-economics-and-social-sciences/subjects/department-of-social-sciences/education-sciences-and-psychology/institute/staff/murayama-kou-prof-dr/)

**Siegfried Engelmann / NIFDI** -- Direct Instruction tradition. Relevant because Timeback's platform philosophy explicitly uses DI-like mechanisms (faultless communication, contrastive examples, near-misses). [NIFDI](https://www.nifdi.org/100-staff-bios/936-dr-siegfried-zig-engelmann.html)

### Institutions

NAEYC, IES/WWC, DREME, Learning Trajectories, UCL CEPEO, Purdue Center for Early Learning, Nuffield Foundation.

---

## 7. Sources

### Math

| Source | URL | Used for |
|---|---|---|
| Duncan et al. (2007) | [PubMed](https://pubmed.ncbi.nlm.nih.gov/18020822/) | School-entry math predicts later achievement |
| National Academies (2009) | [PDF](https://math4all.onmason.com/wp-content/blogs.dir/1543/files/2014/09/Math-learning-in-Early-Childhood.pdf) | Field-level synthesis on early childhood math |
| IES/WWC Teaching Math to Young Children | [IES](https://ies.ed.gov/ncee/wwc/PracticeGuide/18) | Five evidence-rated recommendations |
| Clements & Sarama / Learning Trajectories | [Site](https://www.learningtrajectories.org/math/learning-trajectories) | Developmental progressions |
| Clements & Sarama / Building Blocks (WWC) | [IES](https://ies.ed.gov/ncee/WWC/Intervention/2151) | Curriculum evidence |
| Outhwaite et al. (2023) | [UCL](https://discovery.ucl.ac.uk/id/eprint/10170561/1/Outhwaite%20et%20al.%202023.pdf) | Feedback + levelling = necessary for effective apps |
| Outhwaite et al. (2019) | [ERIC](https://eric.ed.gov/?id=EJ1205220) | RCT: interactive apps improve outcomes |
| Ramani & Siegler (2008) | [PDF](https://siegler.tc.columbia.edu/wp-content/uploads/2019/02/sieg-ram08.pdf) | Linear number games eliminate SES gaps |
| Schiffman et al. (2018) | [PLOS](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0208832) | Linear-spatial materials promote better strategies |
| Carbonneau, Marley & Selig (2013) | [ERIC](https://eric.ed.gov/?id=EJ1007941) | Manipulatives meta-analysis |
| Cheung et al. (2023) | [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S088520062300090X) | Perceptually rich manipulatives can distract |
| My Math Academy / Bang et al. | [Springer](https://link.springer.com/article/10.1007/s10643-022-01332-3) | ESSA Tier 1 adaptive system |
| My Math Academy RCT (JREE) | [ERIC](https://eric.ed.gov/?id=EJ1328299) | Cluster RCT evidence |
| My Math Academy ESSA evidence | [ESSA](https://www.evidenceforessa.org/program/my-math-academy/) | Tier 1 classification |
| Marx et al. (2025) | [IEJME](https://dx.doi.org/10.29333/iejme/15677) | 0/18 apps had part-whole learning |
| Baroody et al. (2016) | [Springer](https://link.springer.com/article/10.1007/BF03172907) | Missing-addend software efficacy |
| Berkowitz et al. (2015) | [PubMed](https://pubmed.ncbi.nlm.nih.gov/26702458/) | Math-at-home app increased achievement |
| Skene et al. (2022) | [JAACAP](https://www.jaacap.org/article/S0890-8567(22)00020-2/fulltext) | Guided play meta-analysis |
| Math anxiety (2024) | [Frontiers](https://doi.org/10.3389/fpsyg.2024.1335952) | Anxiety measurable at age 5 |
| Hirsh-Pasek / Griffith Four Pillars | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8099083/) | Active, engaged, meaningful, social |
| Frontiers 2023 ECE math review | [Frontiers](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.1229849/full) | g = 0.76 mean; individualized strongest |
| Math language (2020) | [Frontiers](https://doi.org/10.3389/fpsyg.2020.01925) | Vocabulary predicts development |
| Children's app preferences (2024) | [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0747563224002292) | Children prefer lower-educational-value apps |
| Spatial cognition (2020) | [Frontiers](https://doi.org/10.3389/fpsyg.2020.01938) | Spatial assembly relates to emerging math |
| SFON (2022) | [Brain Sciences](https://doi.org/10.3390/brainsci12030313) | Spontaneous focusing on numerosity |
| TUI systematic review | [ACM](https://dl.acm.org/doi/fullHtml/10.1145/3546155.3546672) | Tangible user interfaces for math |
| Bilingual app learning | [BJET](https://bera-journals.onlinelibrary.wiley.com/doi/10.1111/bjet.12912) | Language proficiency in app-based math |
| Inclusive tangible games | [DOI](https://doi.org/10.34190/ecgbl.17.1.1411) | Math + sign language |
| Place value (PMC) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9177579/) | Multi-digit understanding not until Grade 2 |
| Numeral interpretation (PMC) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4460578/) | K at ~66-70% on multi-digit |
| James-Brabham et al. (2025) | [Child Dev](https://srcd.onlinelibrary.wiley.com/doi/full/10.1111/cdev.14162) | Home math activities meta-analysis |
| Nuffield Foundation | [Site](https://www.nuffieldfoundation.org/project/can-maths-apps-add-value-to-learning) | Framework for evaluating app quality |
| Gesture and implicit knowledge | [PubMed](https://pubmed.ncbi.nlm.nih.gov/17999569/) | Gesture reveals/supports learning |
| NAEYC tech guidance | [Oklahoma](https://ou.edu/content/dam/Education/documents/ECEI/ECLI/NAEYC%20FRC%20Key%20Messages.pdf) | Technology when used intentionally |
| Retrieval vs. restudy (PMC) | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9987560/) | Retrieval not universal for novice math |
| Hinten meta-analysis | [Wiley](https://onlinelibrary.wiley.com/doi/10.1111/desc.70069) | Fantastical content effects |

### Literacy

| Source | URL | Used for |
|---|---|---|
| IES/WWC Foundational Reading Skills K-3 | [IES](https://ies.ed.gov/ncee/wwc/practiceguide/21) | Rec 2 + Rec 3 Strong Evidence |
| Ehri (2014) | [T&F](https://www.tandfonline.com/doi/abs/10.1080/10888438.2013.819356) | Orthographic mapping prerequisites |
| Weiser & Mathes (2011) | [SAGE](https://journals.sagepub.com/doi/10.3102/0034654310396719) | Encoding-reading reciprocal relationship |
| Johnston & Watson (2004) | [TRL](https://www.thereadingleague.org/wp-content/uploads/2020/10/Brady-Expanded-Version-of-Alphabetics-TRLJ.pdf) | Synthetic > analytic phonics |
| NASET Elkonin Boxes | [NASET](https://www.naset.com/publications/ld-report/evidence-based-practice-research-elkonin-boxes/) | Word boxes evidence |
| LSHSS (2023) | [ASHA](https://pubs.asha.org/doi/10.1044/2023_LSHSS-22-00161) | Spelling predicts later reading |
| Ouellette & Senechal | [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0959475205000939) | Invented spelling produces PA gains |
| Clark & Paivio (1991) | [PDF](https://nschwartz.yourweb.csuchico.edu/Clark%20&%20Paivio.pdf) | Dual coding theory |
| Picture-text compounds (2023) | [Springer](https://link.springer.com/article/10.1007/s42822-023-00139-0) | 64.9% detrimental effects |
| TUI systematic review (2021) | [Springer](https://link.springer.com/article/10.1007/s00779-021-01556-x) | PhonoBlocks, physical literacy tools |
| Phonemic awareness norms | [NSPT4Kids](https://www.nspt4kids.com/parenting/phonemic-awareness-skills-by-age) | Developmental sequence |

### Audio / Multimodal

| Source | URL | Used for |
|---|---|---|
| TTS meta-analysis | [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5494021/) | TTS vs. human voice (grade 3+) |
| Mayer multimedia learning | [Link](https://learning-theories.com/cognitive-theory-of-multimedia-learning-mayer.html) | Temporal + spatial contiguity |
| Multimodal literacy (2020) | [Springer](https://link.springer.com/article/10.1007/s10643-019-00974-0) | Multi-channel > single-channel |

### Superbuilders / Timeback Ecosystem

| Source | URL | Used for |
|---|---|---|
| Superbuilders | [Site](https://www.superbuilders.school/) | Company context |
| Timeback Docs | [Docs](https://docs.timeback.com/?utm_source=chatgpt.com) | Platform learning science |
| Timeback Principles | [Docs](https://docs.timeback.com/beta/about-timeback/principles) | DI-like design, faultless communication |
| Timeback Learning Science | [Docs](https://docs.timeback.com/beta/about-timeback/concepts/learning-science) | Retrieval, spacing, mastery |
| Timeback XP System | [Docs](https://docs.timeback.com/beta/about-timeback/concepts/xp-system) | Anti-gaming, signal integrity |
| Patrick Skinner blog | [Substack](https://patskinner.substack.com/p/the-ultimate-balance-cognitive-load) | Cognitive load essay |
| Montessorium | [Site](https://montessorium.school/about) | Concrete-to-abstract progression |
| Alpha School | [Site](https://alpha.school/the-program/) | Joy + mastery framing |
| Patrick Skinner portfolio | [Site](https://patrickskinner.tech/) | Public philosophy |
| Patrick Skinner LinkedIn | [LinkedIn](https://www.linkedin.com/posts/patrickaskinner_for-those-who-are-interested-in-working-in-activity-7398895548797308928-DpXS) | Learning science as product constraint |
