# Detection Quality & Spelling Game Plan

## Summary

Three focused milestones that fix the verified detection pipeline bugs, then build a spelling game on the stabilized pipeline. The active model is verified 36-class `[1, 40, 8400]` (digits 0-9 + letters A-Z) via runtime inference. The critical insight: class filtering must happen **inside the argmax loop** in postprocessing — not as a post-filter — because class-agnostic NMS runs between argmax and any post-filter, meaning a high-confidence letter detection can suppress a valid digit detection before filtering ever sees it. Every change has been verified against the codebase and confirmed via model introspection. Bias: no change unless the root cause is proven and the fix is safe.

### Verified model facts (runtime introspection, not docs)

| Model | Hash | Output dims | Classes |
|---|---|---|---|
| `digit-tiles.onnx` (active) | `914a13e7...` | `[1, 40, 8400]` | 36 (0-9 digits, 10-35 = A-Z letters) |
| `digit-tiles.onnx.bak` (backup) | `e4cd0565...` | `[1, 14, 8400]` | 10 (0-9 digits only) |

---

## Files to Change

### M1: Detection Pipeline Fixes

| File | What changes | Why |
|---|---|---|
| `src/cv/postprocessing.ts` | **(1) Add `classRange?: { min: number; max: number }` parameter to `PostProcessParams`.** In the argmax loop (lines 149-155), only iterate classes within this range: `for (let c = min; c <= max; c++)`. Default: `{ min: 0, max: numClasses - 1 }` (backward-compatible). **(2) Lower `DEFAULT_CONF_THRESHOLD` from `0.65` to `0.50`** (line 18). | **Root cause #1 (NMS-safe fix)**: The argmax at line 149-155 considers all 36 class channels. A letter class (classId 10-35) scoring higher than a digit class wins the argmax for that anchor. Then class-agnostic NMS (line 183-184) suppresses any nearby lower-confidence anchor — even if that anchor's best class was a valid digit. Post-filtering the letter detection removes it, but the digit it suppressed is **already gone**. By constraining the argmax to only valid classes, letter channels are never considered, digit detections win on their own merit, and NMS only competes valid detections against each other. **Root cause #3**: Threshold 0.65 is 2.6x YOLO's default. Tiles scoring 0.50-0.64 produce null → temporal buffer resets → "bouncing 0/1" symptom. Safe to lower once class-range filtering prevents letter false positives. |
| `src/cv/inference.worker.ts` | Pass `classRange: { min: 0, max: 9 }` into `postProcess()` call at line 158. (For M2, this will become mode-dependent.) | Worker owns the mode-specific filtering policy. postprocessing stays a pure function parameterized by class range. |
| `src/store/game-store.ts` | In `processDetections()` (line 58): **(a)** Replace `groupDetections(detections)` (line 65) with `createInterpretationLayer().interpret(detections, expectedDigitCount)` where `expectedDigitCount = problem.answer.toString().length`, then adapt the match logic to work with the returned `number[]`. **(b)** Call `temporalBuffer.reset()` when entering scanning for a new problem (detect via problem reference change, or call `resetCvState()` at scan entry). | **Root cause #2**: `groupDetections()` greedily pairs adjacent tiles, consuming single-digit candidates. The existing `createInterpretationLayer` at `interpretation.ts:117-129` already has the `expectedDigitCount` filter — it just needs wiring. **Amplifier #1**: stale temporal buffer carries `count`/`missStreak` across phase transitions — `resetCvState()` exists (line 101) but is never called on scan entry. |
| `src/cv/interpretation.ts` | Fix gap-sign bug at line 74-76: change `if (left.digit === right.digit && gap < 0) continue` to `if (gap < 0) continue`. | Two different-class detections with overlapping bboxes (gap < 0, but IoU < 0.45 so both survive NMS) bypass the same-digit guard and get grouped into a spurious multi-digit candidate. Any overlapping pair that survived NMS represents duplicate anchors for one physical tile — the same-digit check is overly specific. |
| `src/camera/frame-capture.ts` | Wrap `onVideoFrame` async body (lines 80-122) in try/catch, with `scheduleNext(video)` in the catch block to keep the rVFC loop alive. | If `createImageBitmap` throws (GPU error, stop() race, memory pressure on older iPads), `scheduleNext` at line 122 is never reached and the frame capture loop dies permanently. The catch ensures the loop continues regardless. |
| `vite.config.ts` | Change model caching strategy from `CacheFirst` to `StaleWhileRevalidate` (line 38), OR version the model URL (e.g., `/models/digit-tiles-v2.onnx`). Recommend `StaleWhileRevalidate` — it serves the cached model immediately (no latency penalty) but fetches the new version in the background for next load. | **Critical deployment issue**: `CacheFirst` with 1-year expiry (lines 37-45) means devices that cached the old 10-class `.bak` model will **never** fetch the current 36-class model. This makes M1 validation nondeterministic across devices. `StaleWhileRevalidate` preserves fast-load behavior while ensuring model updates propagate within one session. |
| `src/cv/onnx-recognition.ts` | In `init()`, update URL to versioned model path if using URL versioning approach. (Skip if using `StaleWhileRevalidate`.) | Corresponds to vite.config.ts cache strategy change. |
| Tests | Update `src/cv/postprocessing.test.ts`: (a) threshold assertion at line 343, (b) add tests for `classRange` parameter — verify letter classes excluded when range is `{min:0, max:9}`, verify digit detections survive when letter class would have higher score on same anchor. Add interpretation gap-sign fix test. Update `src/store/game-store.test.ts` for `expectedDigitCount` wiring and temporal reset. | All 219 existing tests must stay green. New tests cover the new behavior. |

### M2: Spelling Game

| File | What changes | Why |
|---|---|---|
| `src/types/cv.ts` | Add `Letter` type (`'A' \| 'B' \| ... \| 'Z'`). Add `DetectedLetter` interface (parallel to `DetectedDigit`, with `letter: Letter`, `confidence: number`, `bbox: BoundingBox`). Keep `DetectedDigit` unchanged — zero breaking changes. | Parallel types. The 36-class model outputs classId 10=A through 35=Z. Mapping classId to letter is an application-level constant. |
| `src/types/game.ts` | Add `SpellingProblem` type (`{ word: string; letters: readonly Letter[]; imageHint?: string }`). Add `GameKind = 'math' \| 'spelling'` discriminant. Extend `GamePhase` union to carry `SpellingProblem` in scanning/success/timeout phases (via `problem: Problem \| SpellingProblem` or separate phase variants). Add spelling actions to `GameAction`. | `Problem.answer` is `number` — can't hold a word. Parallel type is safer than widening. |
| `src/types/worker-protocol.ts` | Add optional `classRange?: { min: number; max: number }` to the `infer` message (replaces M1's hardcoded `{min:0, max:9}` with mode-driven range). Add `DetectedLetter[]` variant to the `detections` response (or add a new `letterDetections` message type). | Worker needs to know whether to pass digit range (0-9) or letter range (10-35) to postProcess. Main thread sends the range based on active game kind. |
| `src/cv/inference.worker.ts` | Read `classRange` from infer message (fall back to `{min:0, max:9}` for backward compat). Pass through to postProcess. For letter range, map classIds to Letter type before sending back. | Mode-aware class range. |
| `src/cv/temporal-buffer.ts` | Generalize to `createTemporalBuffer<T>()`. Comparison uses `===` (works for `number` and `string`). `TemporalEvent` becomes generic: `TILE_SEEN { answer: T }`, `ANSWER_COMMITTED { answer: T }`. Instantiate as `createTemporalBuffer<number>()` for math (backward-compatible) and `createTemporalBuffer<string>()` for spelling. | Spelling answers are strings ("CAT"). The buffer logic (3 consecutive, 2 miss tolerance) is identical — only the answer type changes. |
| `src/cv/interpretation.ts` | Add `matchSpellingAnswer(letters: readonly DetectedLetter[], targetWord: string): string \| null` — joins letters L→R, exact string match. No grouping heuristics needed — all detected letters form one ordered sequence. | Spelling matching: L→R sorted letters joined into string, compared to target word. Postprocessing already sorts detections left-to-right. |
| `src/engine/game-reducer.ts` | Add `gameKind` to `GameState`. Handle spelling session lifecycle: `MAX_SPELLING_WORDS = 3`. Reuse existing phase FSM structure — the phases (countdown, scanning, success, timeout, session-end) are the same. | Spelling sessions are 3 rounds (user requirement). Phase behavior is identical to math. |
| `src/store/game-store.ts` | Add `gameKind` to store. Branch `processDetections` on kind: math path uses digit class range + existing logic; spelling path uses letter class range + `matchSpellingAnswer` + spelling temporal buffer. | Mode-aware pipeline integration. |
| `src/cv/onnx-recognition.ts` | Accept `classRange` parameter in `recognize()`, forward to worker's `infer` message. | Worker needs the range per-frame (or per-session — set once on mode change). |
| `src/components/TapToStart.tsx` | Enable the "Spelling" button (lines 74-81, currently disabled stub). Wire `onClick` to set `gameKind: 'spelling'` in store and dispatch `START_SESSION`. | Button already exists as a disabled stub with emoji and "Coming Soon" label. |
| `src/components/App.tsx` | Pass `gameKind` to recognition service calls (for class range). Route spelling phases to `SpellingScreen`. | Orchestration — spelling mode renders a different game screen. |
| `src/components/GameScreen.tsx` | No changes. | Math game screen is unchanged. Spelling gets its own component. |

### M3: Debug Diagnostics (optional)

| File | What changes | Why |
|---|---|---|
| `src/components/DebugHUD.tsx` | Add answer-match result row (e.g., "match: 7 YES" or "match: null (grouped away)"). Show dropped frame count. Show active model class count and tensor dims. | Current HUD shows raw detection confidence, which misleads debugging when high confidence ≠ correct match. |
| `src/store/cv-store.ts` | Add `droppedFrames: number`, `modelInfo: { numClasses: number } \| null`, `matchResult: string \| null` fields with corresponding update actions. | Store diagnostic data for HUD consumption. |
| `src/cv/onnx-recognition.ts` | In the busy/not-ready frame-drop path (line 103), increment `droppedFrames` in cv-store. | Quantify backpressure — know if frame dropping is the bottleneck. |
| `src/cv/inference.worker.ts` | On model init success, include `numClasses` (derived from output dims) in the `ready` message. | Know which model is actually running. Diagnoses CacheFirst stale-model issues. |
| `src/types/worker-protocol.ts` | Add optional `numClasses?: number` to `WorkerToMain` `ready` variant. | Type-safe model info reporting. |

---

## Files to Create

### M2: Spelling Game

| File | Purpose |
|---|---|
| `src/engine/spelling-words.ts` | Word list (3-letter and 4-letter pools, age 5-8 appropriate) and `generateSpellingProblem(difficulty)` function. Session: 2 three-letter + 1 four-letter word. Pool examples — 3-letter: CAT, DOG, SUN, FOX, BIG, RED, HAT, CUP, BUS, PIG, HEN, JAM, LOG, MOP, NUT, RUG, VAN, WEB, BED; 4-letter: BALL, FISH, FROG, STAR, DUCK, TREE, BOOK, CAKE, LAMP, SHIP. |
| `src/engine/spelling-words.test.ts` | Tests for word generation, pool coverage, no duplicate words in a session. |
| `src/components/SpellingScreen.tsx` | Spelling game screen — shows target word with letter slots, detected letters filling in L→R, feedback overlay. Similar structure to `GameScreen` but word-based instead of arithmetic. |
| `src/cv/interpretation.test.ts` | Additional tests for `matchSpellingAnswer`. (Extends existing file.) |

---

## Milestone Outline

### Phase 1: Fix & Stabilize

- [x] **M1: Detection Pipeline Fixes** — Fix the 3 verified root causes and 2 amplifiers so the math game works reliably with the 36-class model. Critical fix: restrict postprocessing argmax to digit classes (0-9) so letter classes can't suppress digit detections via NMS. Also: lower confidence threshold, wire `expectedDigitCount` filter, reset temporal buffer on phase transitions, try/catch frame capture, fix model cache strategy. ~7 files changed, all with tests.
  - [ ] Step 1 — Add `classRange` to `PostProcessParams`, constrain argmax loop, lower threshold to 0.50. Pass `classRange: {min:0, max:9}` in worker. → verify: `pnpm typecheck`
  - [ ] Step 2 — Fix interpretation gap-sign bug (`gap < 0` → skip regardless of digit equality). Wire `createInterpretationLayer` in game-store with `expectedDigitCount`. Add temporal buffer reset on problem change. → verify: `pnpm typecheck`
  - [ ] Step 3 — Wrap frame-capture `onVideoFrame` in try/catch/finally. Change model cache to `StaleWhileRevalidate`. → verify: `pnpm typecheck`
  - [ ] Step 4 — Update all tests: threshold assertion, classRange tests, gap-sign test, game-store interpretation wiring test. → verify: `pnpm test && pnpm typecheck && pnpm lint`
  Commit: "fix: improve detection pipeline reliability and model cache freshness"

### Phase 2: Expand

- [x] **M2: Spelling Game** — Add spelling game mode using the 36-class model's letter classes (A-Z). Parallel types alongside math (no breaking changes to existing code/tests). 3-word sessions with 3-4 letter age-appropriate words. Mode-aware class range passed to postprocessing. Wire existing disabled "Spelling" button.
  - [x] Step 1 — Foundation: Widen `DetectedDigit.digit` to `number`, add `Letter` type, add `SpellingProblem`/`GameKind` to game types, make temporal buffer generic `<T>`, add `classRange` to worker protocol, create spelling word list. → verify: `pnpm typecheck && pnpm test`
  - [x] Step 2 — Pipeline: Worker reads `classRange` from infer message, recognition service stores/passes classRange, remove `as Digit` cast in postProcess, parameterize game reducer with `maxProblems`/`modeName`. → verify: `pnpm typecheck && pnpm test`
  - [x] Step 3 — Store & UI: Add `gameKind`/`spellingProblem` to game store, branch `processDetections` for spelling, enable spelling button in TapToStart, create SpellingScreen, route phases in App.tsx, set classRange on mode change, widen FeedbackOverlay. → verify: `pnpm typecheck && pnpm test && pnpm lint`
  - [x] Step 4 — Tests: Add spelling-words.test.ts, spelling game-store tests, temporal buffer generic tests. → verify: `pnpm test && pnpm typecheck && pnpm lint`
  Commit: "feat: add spelling game mode with letter detection"

### Phase 3: Polish (optional)

- [ ] **M3: Spelling Polish + Debug Diagnostics** — Fix spelling timeout behavior (new word on failure instead of retry), limit words to 2-3 letters, add debug diagnostics to HUD.
  - [x] Step 1 — Remove 4-letter words, add 2-letter words. Update spelling-words.ts and tests. → verify: `pnpm typecheck && pnpm test`
  - [x] Step 2 — In `handleNextRound`, for spelling mode (`modeName === "Spelling"`), on timeout go to countdown (new word) instead of retrying. Update game-reducer tests. → verify: `pnpm typecheck && pnpm test`
  - [x] Step 3 — Add debug diagnostics: `droppedFrames`/`modelInfo` to cv-store, `numClasses` in worker detections message, updated DebugHUD with match result, dropped frames, model info. → verify: `pnpm typecheck && pnpm test && pnpm lint`
  Commit: "feat: polish spelling game + add debug diagnostics"

---

## Manual Setup Tasks

None required for M1 or M3. The active 36-class model already supports both digits and letters.

**M2 prerequisite (non-blocking)**: Verify letter detection quality before shipping spelling to users. After M1 is complete, use `?debug=true&overlay=boxes` to manually test letter tile detection. If letter accuracy is unacceptable, a model retrain with more letter training data may be needed — but the code changes in M2 are valid regardless and can proceed in parallel.

---

## Risks

1. **Letter class suppression of digit detections (the NMS interaction).** This is the highest-risk bug and the reason class filtering MUST happen inside the argmax, not as a post-filter. If implemented as a post-filter (the original plan's approach), a letter classId scoring 0.92 on anchor A can suppress a digit classId scoring 0.88 on nearby anchor B via class-agnostic NMS. Post-filtering removes anchor A, but anchor B is already gone. The argmax-range approach prevents this entirely: letter channels are never read, so digit detections win on their own merit. **Mitigated by the corrected M1 approach.**

2. **StaleWhileRevalidate vs CacheFirst tradeoff.** `CacheFirst` gives deterministic offline behavior but stale models. `StaleWhileRevalidate` ensures model freshness within one session but adds a background fetch. On metered connections (cellular iPad), this background fetch could be unwanted. Alternative: version the model URL (`digit-tiles-v2.onnx`) and keep `CacheFirst` — deterministic, but requires URL change on every model update. **Recommend versioned URL** — it's explicit and doesn't surprise users with background downloads.

3. **Letter detection quality is unknown.** The 36-class model was trained on digits AND letters, but no per-class accuracy metrics exist in the repo. Letters may have poor recall, especially for visually similar pairs (I/1, O/0, S/5, Z/2). This is an acceptance risk for M2 — the code will be correct, but the experience depends on model quality. **Mitigated by M2 prerequisite: manual testing before launch.**

4. **Spelling physical difficulty.** Placing 3-4 tiles in correct L→R order in front of a camera is harder than 1 tile. The postprocessing L→R sort means physical placement order determines detected word. Children may struggle with spatial ordering. **Mitigated by clear UI: letter slots that show expected positions, encouraging prompts.**

5. **`classRange` parameter changes `postProcess` signature.** All existing tests pass `numClasses: 10` and don't set `classRange` — the default (`{min: 0, max: numClasses-1}`) preserves current behavior exactly. Tests for the 80-class COCO test case (line 282) also pass because default range includes all classes. **No test breakage.**

---

## Open Questions

1. **Model cache strategy: versioned URL or StaleWhileRevalidate?** Versioned URL (`digit-tiles-v2.onnx`) + CacheFirst is deterministic. StaleWhileRevalidate is automatic but adds background fetch. Recommend versioned URL.

2. **Spelling timeout duration.** 30 seconds (same as math) or longer? Placing 3-4 tiles takes more time. Recommend 45 seconds for spelling.

3. **Partial word feedback.** Should the UI show per-letter slot progress (e.g., "C A _" for partial "CAT")? Recommend yes — it's encouraging and helps the child understand what's detected. But it requires per-letter tracking, not just whole-word matching.

4. **Word list size and curation.** The proposed ~30 words are common English words for ages 5-8. Is the list sufficient, or should it be larger? For 3-word sessions, even 20 words provide good variety.

---

## What NOT to Change

Verified correct (from research, confirmed by code audit):

| Aspect | Status | Evidence |
|---|---|---|
| Letterbox preprocessing math | Correct | `preprocessing.ts`, `inference.worker.ts` — identical, verified |
| Planar RGB /255 normalization | Correct | `inference.worker.ts:70-74` |
| Channel-major tensor indexing | Correct | `postprocessing.ts:150` — `output[(4+c) * numAnchors + i]` |
| No sigmoid needed (model includes it) | Correct | Model output is post-sigmoid |
| Unletterbox coordinate reversal | Correct | `postprocessing.ts:172-175` |
| NMS IoU calculation | Correct | `postprocessing.ts:46-60` |
| ImageBitmap lifecycle | Correct | All close() paths verified |
| Worker busy-flag semantics | Correct | `inference.worker.ts:182-186` finally block |
| Game reducer phase gating | Correct | Invalid transitions are no-ops |
| requestVideoFrameCallback usage | Correct | Better than setInterval for frame capture |
| ONNX Runtime WASM configuration | Correct | SIMD, single-thread, graph optimization |
