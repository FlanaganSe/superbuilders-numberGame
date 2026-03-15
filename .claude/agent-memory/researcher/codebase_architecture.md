---
name: codebase_architecture
description: Complete map of TileSight game engine, state machine, feedback system, audio, and visual scaffolds — exact file:line citations for all major seams
type: project
---

# TileSight Codebase Architecture (March 2026 snapshot)

## State Machine
Six phases (`src/types/game.ts:42-60`): idle → countdown → scanning → success/timeout → countdown/session-end. Reducer at `src/engine/game-reducer.ts`. Problem generation happens inside `CountdownTimer` component at countdown expiry (`src/components/CountdownTimer.tsx:44-68`).

## Key Constants
- 15 problems/session, 3 spelling words/session
- 30s math timeout, 45s spelling timeout
- 3 consecutive correct → promote; 2 consecutive wrong → demote (difficulty.ts)
- Slow correct >25s resets streak without demoting

## Feedback Priority (GameScreen.tsx:248-263)
correct > timeout > tile-seen > wrong-tile > null

All rendered by FeedbackOverlay. SpellingScreen lacks wrongTileSeen and cameraUncertain — gap vs. math mode.

## Visual Scaffolds (all gated difficulty ≤ 3)
- NumberBond SVG: Missing Part / Make 10, shown during scanning (ProblemDisplay.tsx:61-71)
- TenFrame SVG: answers 1-10, shown post-correct (FeedbackOverlay.tsx:261-271)
- CountSequenceAnimation: staggered count-on/back, post-correct and post-repeat-timeout
- MathVocabulary prompts: 4 synonym pools, rotated by round index (math-vocabulary.ts)
- GhostTileGuide: first-scan only, localStorage-gated (GhostTileGuide.tsx)
- Answer zone hint: escalates at 10s/15s idle (GameScreen.tsx:336-352)

## Audio (18 sounds, sound-manager.ts)
correctChime, encouragement, tileDetectedPop, sessionEndFanfare, countdownTick, number0-9, promptAltogether, promptLeft, promptMissing, promptMakeTen.
- Correct math: numberN → 500ms → correctChime
- Correct spelling: correctChime only (no number word)
- Math prompt plays 400ms after new problem, ref-guarded against replay on retry

## Spelling vs. Math Structural Difference
Spelling uses a stub Problem (answer=-1 sentinel) in the reducer; real spelling state in spellingProblem field of game-store. The -1 sentinel is checked in explanation-generator.ts:99 and GameScreen.tsx:174 — must not change. SpellingScreen is missing: GhostTileGuide, idle escalation, wrong-tile feedback, and cameraUncertain display (all present in GameScreen).

## Make10 Design Gap
generateMake10 (problem-generator.ts:131-147) ignores the difficulty parameter — same 9-problem space at all levels. Difficulty engine still tracks streaks but never changes operand ranges.

## Known Dead Code / Inconsistencies
- CalibrationGuide.onComplete is called but App.tsx passes () => {} — dead prop (App.tsx:249)
- localStorage key inconsistency: "superbuilders_calibrated" (underscore) vs "superbuilders-cumulative" (hyphen)
- @/* TypeScript alias has no Vite resolve.alias — type-checks but would 404 at runtime (vite.config.ts)

## ADRs Implemented as of March 2026
ADR-001 through ADR-010 are all implemented. Key ones to remember:
- ADR-005: Phase exit ≤200ms (CountdownTimer setInterval timing constraint)
- ADR-006: classRange inside argmax not post-filter (NMS cross-class suppression)
- ADR-007: Parallel type paths for spelling (Problem + SpellingProblem, NOT a union — ~17 test files would be affected by refactor)
- ADR-009: Instructional feedback as pure engine functions; expertise reversal at difficulty ≥4
- ADR-010: Wrong-answer tracking separate from temporal buffer, module-level vars in game-store.ts:68-69

## Main Seam Locations
- New GameAction types: src/types/game.ts:64-76
- New FeedbackState types: FeedbackOverlay.tsx:81-101
- New sounds: sound-manager.ts:20-39 (SoundName) + :46-66 (SOUND_FILES)
- New visual scaffolds: FeedbackOverlay.tsx:261-271 (post-correct) or ProblemDisplay.tsx:61-71 (during scanning)
- Difficulty constants: difficulty.ts (all named, isolated)

**Why:** Deep codebase read and full application review conducted 2026-03-15.

**How to apply:** Use file:line citations from this memory when researching enhancement options or identifying where new features slot in. Always verify against live files before recommending exact edits.
