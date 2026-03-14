# Plan: Research-Backed Math Learning Improvements

## Summary

Transform Superbuilders' math mode from a camera-verified worksheet into a research-backed early math learning environment. This plan covers the highest-evidence changes from `docs/brain-lift-research.md` that have zero external dependencies — no model retraining, no audio assets, no image assets needed. The work is organized in three phases: (1) mode routing infrastructure that unblocks new modes, (2) feedback foundations that make the app genuinely instructional, and (3) math content expansion with missing-addend problems.

**Spelling improvements (progressive encoding, audio, images, missing-letter) are explicitly deferred** to a separate plan. They are blocked on a 36-class YOLO model (the current `digit-tiles.onnx` has 10 classes — `postprocessing.ts:153` will throw `classRange [10, 35] is invalid for numClasses=10` if spelling mode runs against it). The spelling code infrastructure is complete but the model is not. When the 36-class model ships, a spelling-specific plan should be created.

---

## Decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Mode selection design | **Separate buttons** — Addition, Subtraction, Missing Part. Each its own button. |
| 2 | Missing-addend integration | **Separate mode** with own button. Independently testable. Future trajectory redesign integrates into unified progression. |
| 3 | Spelling improvements | **Deferred** to a separate plan gated on 36-class model + audio/image assets. |
| 4 | Runtime baseline fixes | **Not included.** Camera race condition is mitigated by 5-second countdown buffer. Worker error handling is functional (fatal errors → retry UI). Frame capture outside scanning is wasteful but not harmful. These are optimization tasks, not blockers. |
| 5 | Spelling Problem sentinel | **Keep for now.** `answer: -1` is safely contained — never computed in reducer, never read in spelling detection, sentinel check in FeedbackOverlay is explicit and localized. Refactor to discriminated union is a future plan concern when building the full trajectory. |

---

## Research Backing

| Change | Primary Source | Evidence Level |
|---|---|---|
| Explanatory feedback | Outhwaite et al. 2023 — necessary condition for learning gains | Systematic analysis |
| Camera uncertainty language | Math anxiety at kindergarten (Frontiers 2024) | Cross-sectional study |
| Missing-addend problems | Marx et al. 2025: 0/18 apps; Baroody 2016: "significantly more efficacious" | Systematic review + controlled experiment |
| Enable subtraction | Carpenter & Moser 1984: take-away is correct first model | Foundational longitudinal study |
| Mathematical language | Purpura (Frontiers 2020): math vocabulary predicts development | Correlational + growing causal evidence |

---

## Known Issues (Not Blocking, Document for Later)

| Issue | Severity | Why Not Blocking |
|---|---|---|
| **Stale docs:** `product-overview.md:202` says spelling disabled, button says "Let's Play!" — actual button says "Math Game" and spelling is enabled | LOW | Docs don't affect runtime. Update in a docs cleanup pass. |
| **E2E test broken:** `game-loop.spec.ts:70` looks for "Let's Play!" but button text is "Math Game" | LOW | Test would fail but doesn't block math improvements. Fix alongside docs. |
| **Frame capture outside scanning:** Bitmaps created continuously, discarded outside scanning phase (GPU churn) | LOW | Functional — frames are closed immediately. Optimization task. |
| **Spelling model-blocked:** Current model is 10-class. Spelling mode's `classRange: {min:10, max:35}` will throw at `postprocessing.ts:153` | HIGH for spelling | Not blocking for this plan (math-only). Documented as spelling plan prerequisite. |

---

## Files to Change

### Engine / Types

| File | Changes | Why |
|---|---|---|
| **`src/types/game.ts`** | Add optional `unknownPosition?: "answer" \| "left" \| "right"` and `target?: number` to `Problem`. Extend `FeedbackState` with `"wrong-tile"` variant carrying `{ wrongValue: number; expectedValue: number }`. | Missing-addend display needs to know which operand is hidden. Wrong-tile feedback needs both values. All new fields are optional — zero breaking changes to existing consumers. |
| **`src/engine/problem-generator.ts`** | Add `MissingAddendMode` GameMode with `generateMissingAddend()`. Make `operator` field optional on `GameMode` interface (future-proofs for comparison problems). | Missing-addend is highest-leverage new problem type (Marx 2025: 0/18 apps). Generator creates a valid addition then hides one operand. |
| **`src/engine/game-reducer.ts`** | No changes. | Reducer is mode-agnostic: it receives `Problem` from countdown and dispatches phase transitions. Mode routing lives in the store. |
| **`src/engine/difficulty.ts`** | No changes. | Streak-based difficulty works within a single problem type. |
| **`src/engine/session.ts`** | No changes. | Session recording stays the same. |

### Store

| File | Changes | Why |
|---|---|---|
| **`src/store/game-store.ts`** | **Add `setMode(mode: GameMode)`.** The store currently hardcodes `mode: AdditionMode` (L71) with no setter. Add a `setMode` action that updates `mode` — called by TapToStart before dispatching `START_SESSION`. **Add wrong-answer tracker** (separate from temporal buffer): when `values.length > 0 && !matched`, track `values[0]` with a simple consecutive-frame counter. After 2+ stable frames of the same wrong value (and > 3s into the round), set `wrongTileSeen`. **Surface `missStreak`** from temporal buffer for camera uncertainty. | Mode routing is a prerequisite for subtraction and missing-addend. Wrong-answer tracking enables "You made 8. We need 7" feedback. Camera uncertainty needs miss count. |

### CV Pipeline

| File | Changes | Why |
|---|---|---|
| **`src/cv/temporal-buffer.ts`** | Add public `getMissStreak(): number` accessor (1 line). | Camera uncertainty prompt needs the miss count. The field already exists internally (L31) but isn't exposed. The temporal buffer's core logic is NOT modified. |
| **`src/cv/interpretation.ts`** | No changes. | Returns `readonly number[]` — confidence is discarded but not needed. Wrong-answer tracking uses `values[0]` when `values.length > 0 && !matched`. The digit-count gate ensures values only contains real single-digit detections, which is sufficient for wrong-answer identification. |
| **`src/cv/postprocessing.ts`** | No changes. | |

### Components

| File | Changes | Why |
|---|---|---|
| **`src/components/FeedbackOverlay.tsx`** | Add `WrongTileFeedback`: "You made {X}. We need {Y}. Try again!" Add `ExplanatoryCorrectFeedback`: worked explanation for lower difficulties. Add `StrategyHintFeedback`: "Try counting on from {left}" for timeouts. Extend feedback priority chain: correct > wrong-tile > timeout > tile-seen. | Outhwaite 2023: explanatory + motivational + levelling = necessary condition. Current feedback is motivational only. |
| **`src/components/GameScreen.tsx`** | Render `CameraUncertaintyPrompt` when camera uncertainty signal fires (see M2 specification). Add `wrongTileSeen` to feedback derivation. | Math anxiety prevention. |
| **`src/components/ProblemDisplay.tsx`** | Conditional rendering for `unknownPosition`: show "?" at hidden operand, show `target` after "=". Math language prompt text below equation (smaller, muted). | Missing-addend needs "3 + ? = 7". Math language (Purpura 2020) adds "What's the missing part?" |
| **`src/components/TapToStart.tsx`** | Add "Subtraction" button calling `setMode(SubtractionMode)` then dispatching `START_SESSION`. Add "Missing Part" button calling `setMode(MissingAddendMode)`. Group math buttons visually. | Separate buttons per decision. Mode setter must be called before session starts. |
| **`src/components/CountdownTimer.tsx`** | Already reads `mode` from store via `useGameStore((s) => s.mode)` (L31). Once `setMode` exists, this component needs **no changes** — it calls `mode.generate(difficulty)` (L69) and will automatically use whichever mode was set. | Countdown generation already uses the store's mode. Mode routing fix propagates automatically. |
| **`src/components/App.tsx`** | No changes. | Class range stays `{min: 0, max: 9}` for all math modes. |

---

## Files to Create

| File | Purpose | Lines (est.) |
|---|---|---|
| **`src/engine/explanation-generator.ts`** | Pure function: given `Problem`, `difficulty`, `attemptNumber`, and context (first-attempt / retry / timeout / repeated-timeout), returns explanation text. Handles addition, subtraction, and missing-addend. Uses mathematical vocabulary. Co-located test file. | ~80 |
| **`src/engine/camera-uncertainty.ts`** | Pure function: given detection state (had prior tile seen, current detection count, miss streak), returns uncertainty prompt or null. Pool of ~5 system-attribution prompts. Co-located test file. | ~40 |
| **`src/components/CameraUncertaintyPrompt.tsx`** | Renders uncertainty text with gentle fade-in during scanning. Positioned below the answer zone. Disappears when tile is re-detected. | ~40 |

---

## Milestone Outline

### Phase 1: Mode Routing

The store's `mode` is hardcoded to `AdditionMode` with no setter. This must be fixed before any new mode can work.

- [x] M1: Mode routing infrastructure
  - [x] Step 1 — Add `setMode(mode: GameMode)` action to `GameStore` interface and implementation in `game-store.ts`. Add `selectMode` selector.
  - [x] Step 2 — Update `TapToStart.tsx`: import `SubtractionMode`, call `setMode(AdditionMode)` in `handleStart`, add `handleSubtractionStart` with `setMode(SubtractionMode)`, add "Subtraction" button with orange-500 styling grouped with "Math Game".
  - [x] Step 3 — Full verification suite passed: typecheck, 246 tests, lint all clean.
  Commit: ed2fcc9 "feat: add mode routing infrastructure for subtraction support"

### Phase 2: Feedback Foundations

The single highest-evidence improvements (Outhwaite 2023). These make math mode genuinely instructional.

- [x] M2: Camera uncertainty language — Expose `getMissStreak()` from temporal buffer (1-line accessor). Create `camera-uncertainty.ts` with logic: trigger prompt ONLY when `tileSeen !== null` (we previously detected a tile this round) AND `detectionCount === 0` (raw detections dropped to zero) AND `missStreak >= 1`. This distinguishes genuine camera uncertainty ("I could see your tile, but I lost it") from "child hasn't placed anything yet" (which are otherwise indistinguishable to the buffer). Create `CameraUncertaintyPrompt.tsx` rendering system-attribution text ("Hold your tile flat so I can see it"). **Verification:** On real device — place tile, get "I see X!", then partially cover tile → uncertainty prompt appears. Remove tile entirely → prompt should NOT appear if no prior detection. Run temporal buffer tests to confirm no regressions.
  - [x] Step 1 — Add `getMissStreak(): number` to `TemporalBuffer<T>` interface and implementation in `temporal-buffer.ts`. Add test for `getMissStreak()` in `temporal-buffer.test.ts`. → verify: `pnpm typecheck && pnpm test`
  - [x] Step 2 — Create `src/engine/camera-uncertainty.ts` with `getUncertaintyPrompt(missStreak)` pure function and co-located test `camera-uncertainty.test.ts`. → verify: `pnpm typecheck && pnpm test`
  - [x] Step 3 — Add `cameraUncertain`, `hadTileThisRound` state + selectors to `game-store.ts`. Add uncertainty tracking logic after temporal buffer switch in `processMathDetections()`. Reset both in `resetCvState()`. Add store tests. → verify: `pnpm typecheck && pnpm test`
  - [x] Step 4 — Create `src/components/CameraUncertaintyPrompt.tsx`. Wire into `GameScreen.tsx` replacing answer-zone hint when uncertain. → verify: `pnpm typecheck && pnpm test && pnpm lint`
  Commit: "feat: add camera uncertainty language for system-attribution feedback"

- [ ] M3: Wrong-answer detection — Add wrong-answer tracker to `game-store.ts` as a **separate mechanism from the temporal buffer**. Logic: when `values.length > 0 && !values.includes(problem.answer)`, track `values[0]` as wrong candidate. After 2+ consecutive frames of the same wrong value AND > 3 seconds into the scanning phase, set `wrongTileSeen: number` in store. Add `"wrong-tile"` variant to `FeedbackState`. Wire into GameScreen feedback derivation (priority: correct > wrong-tile > timeout > tile-seen). **Verification:** In mock mode (numpad), press wrong number → after brief stabilization, "You made 8. We need 7" appears. Press correct number → correct feedback takes priority. Run existing detection tests to confirm temporal buffer unchanged.

- [ ] M4: Explanatory feedback + graduated hints — Create `explanation-generator.ts`: pure functions generating context-aware feedback. Extend `FeedbackOverlay.tsx`:
  - **Correct, low difficulty:** Full explanation — "3 + 4 = 7. Three, then four more: 4, 5, 6, 7!"
  - **Correct, high difficulty:** Brief — "Seven! Fast!"
  - **Correct after retry:** Process praise — "You figured it out!"
  - **Wrong tile:** Notice prompt (from M3) — "You made 8. We need 7. Try again!"
  - **Timeout, first:** Strategy hint — "Try counting on from 3."
  - **Timeout, repeated:** Worked support — "3, then 4 more: 4, 5, 6, 7. The answer is 7."
  Explanation fades at difficulty 4+ (Sweller's expertise reversal). **Verification:** Play full sessions at difficulty 1 and 5, verify all 6 feedback paths render correctly. Verify explanation text is contextually correct for subtraction ("7 take away 3 leaves 4").

- [ ] M5: Enable subtraction + mathematical language — Add "Subtraction" button to `TapToStart.tsx` calling `setMode(SubtractionMode)`. Add math language text to `ProblemDisplay.tsx`: "How many altogether?" (addition), "How many are left?" (subtraction) — rendered as secondary text below equation (smaller font, muted color). Verify explanatory feedback works for subtraction context. **Verification:** Full subtraction session — correct, wrong-tile, timeout, and worked-support feedback all contextually appropriate for subtraction. Math language displays correctly.

### Phase 3: Math Content Expansion

The highest-leverage new problem type (0/18 apps — Marx et al. 2025).

- [ ] M6: Missing-addend problems — Add `unknownPosition` and `target` to `Problem` type (optional fields, zero breaking changes). Create `generateMissingAddend()` and `MissingAddendMode` in `problem-generator.ts`: generates a valid addition, then hides the right operand. `target` stores the sum (displayed after "="). Update `ProblemDisplay.tsx`: when `unknownPosition === "right"`, render "3 + ? = 7". Update `game-store.ts` validation: when `unknownPosition === "right"`, check `detected.includes(problem.right)` instead of `detected.includes(problem.answer)`. Add "Missing Part" button to TapToStart. **Verification:** Full missing-addend session. Place correct tile → accepted. Place wrong tile → "You made 8. We need 4" (checks against right operand, not answer). Timeout → strategy hint appropriate for part-whole.

- [ ] M7: Missing-addend polish + Make-10 — Add math language for missing-addend: "What's the missing part?", "How many more to make [target]?". Create Make-10 variant: constrain `target = 10`, dedicated prompt "How many more to make ten?". Add part-whole explanatory feedback: "3 and 4 make 7!" Verify all 6 feedback paths work for missing-addend and Make-10 contexts. **Verification:** End-to-end session exercising wrong tile, timeout, strategy hint, worked support — all contextually correct for part-whole reasoning.

---

## Manual Setup Tasks

None. This plan has zero external dependencies. All assets (code, text content) are created during implementation.

---

## Risks

### Technical

| Risk | Severity | Mitigation |
|---|---|---|
| **Wrong-answer detection noise** — Transient mis-detections (camera artifacts, partial tile views) may trigger false "You made 8" feedback | HIGH | Three guards: (a) value stable for ≥ 2 consecutive frames, (b) > 3 seconds into scanning phase, (c) tracker is separate from the proven temporal buffer. Guard (b) prevents false triggers during initial tile placement when camera is adjusting. |
| **Mode routing regression** — Adding `setMode` could break existing flow if mode is mutated at wrong time | MEDIUM | `setMode` is only callable from TapToStart (idle/session-end phase). CountdownTimer reads mode reactively via Zustand selector. The mode is immutable during a session — set once before START_SESSION, never changed until RESET. |
| **Explanatory text overwhelms screen** — Too much text competes for a 5-year-old's attention | MEDIUM | One-line maximum per feedback. Key number in large font, explanation in smaller secondary text. Fade at difficulty 4+ (Sweller's expertise reversal). |
| **Missing-addend validation change** — Checking `problem.right` instead of `problem.answer` when `unknownPosition` is set could introduce bugs if the guard is missed | MEDIUM | Validation change is in a single function in game-store.ts, gated by `problem.unknownPosition`. Existing problems have `unknownPosition === undefined`, so the guard defaults to existing behavior. Unit test covers both paths. |

### Architectural

| Risk | Severity | Mitigation |
|---|---|---|
| **Temporal buffer untouched** — Plan explicitly does NOT modify temporal buffer for wrong-answer tracking | NONE | This is an intentional decision, not a gap. Wrong-answer tracker is a separate, simpler mechanism. The proven buffer stays stable. |
| **Problem type backward compatibility** — Adding `unknownPosition` and `target` to Problem | LOW | Both fields are optional (`?`). Every existing consumer works unchanged. `ProblemDisplay.tsx` only renders differently when `unknownPosition` is explicitly set. TypeScript enforces this. |
| **Camera uncertainty false positives** — Prompt might show when child intentionally removes tile | LOW | The prompt says "Hold your tile flat so I can see it" — still appropriate even if the child removed the tile. It's a gentle nudge, not an error message. The immutable rule ("all feedback must be child-friendly") is satisfied either way. |

---

## Future Plans (Explicitly Deferred)

These are documented here so the roadmap is clear, but they are NOT part of this plan:

| Future Plan | Blocked On | Research Section |
|---|---|---|
| **Spelling: Progressive encoding + audio + images + missing-letter** | 36-class YOLO model + audio assets + image assets | brain-lift-research.md §4.1-4.4 |
| **Learning trajectory redesign** | This plan's M6-M7 (validates Problem type expansion) | brain-lift-research.md §3.6 |
| **Local mastery model + spaced review** | Learning trajectory (needs skill stages to track) | brain-lift-research.md §3.7 |
| **Strategy trace capture** | This plan's M4 (needs hint system to record hint levels) | brain-lift-research.md §3.8 |
| **Instructional tile layouts** | Learning trajectory (needs task families for layout design) | brain-lift-research.md §3.10 |
| **Adult co-play prompts** | Trajectory + mastery model (prompts reference specific skills) | brain-lift-research.md §3.11 |
| **Stale docs + E2E test cleanup** | Nothing (maintenance task) | — |
