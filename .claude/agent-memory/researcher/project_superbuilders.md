---
name: project_superbuilders
description: Superbuilders project context — OSMO-style math game with computer vision on iPad Safari.
type: project
---

# Superbuilders Project Context

OSMO-style math game: iPad camera recognizes physical number tiles for arithmetic game, ages 5-8.

## Confirmed stack
React 19, Vite 7, TypeScript, ONNX Runtime Web (WASM), Zustand, Motion, Howler.js, canvas-confetti, Tailwind CSS 4, Biome, Vitest + Playwright (WebKit), Cloudflare Pages.

## Critical constraint: ORT WebGPU on Safari
GitHub issue #26827 — WebKit 26.2 OMG JIT regression causes CPU/memory explosion when ORT runs in JSEP mode. Non-JSEP WASM path (`onnxruntime-web/wasm`) is safe. MVP imports WASM subpath only; no JSEP/WebGPU until WebKit regression is fixed.

## Canonical documentation
- `docs/product-overview.md` — architecture, domain model, patterns, gotchas
- `docs/research.md` — verified platform facts, corrections, sources
- `docs/model-training-guide.md` — YOLO training end-to-end
- `docs/decisions.md` — append-only ADR log
- `.claude/rules/stack.md` — exact versions and tooling

## UI/UX Polish research (2026-03-12)
`/.claude/plans/research.md` — section "UI/UX Polish Research" appended. Contains:
- Current state assessment of all 12 components with specific gaps
- 20 prioritized improvement items (P1–P20), tiered by impact and risk
- Sound asset acquisition guide (Mixkit, Uppbeat, SONNISS, ffmpeg conversion)
- Background treatment options (animated gradient, floating decoratives, SVG pattern)
- canvas-confetti emoji shapes upgrade (shapeFromText with ⭐ ✨)
- Manual steps the user must do (sound files, PNG icons, color review, iPad test)
- Key finding: flat cream background and lack of mascot are the two biggest "unknown unknowns" vs. polished competitors (OSMO, Khan Academy Kids)

## CV Pipeline Feasibility research (2026-03-12)
`.claude/plans/research.md` — section "CV Pipeline Feasibility Research" appended. Contains:
- ONNX Runtime WASM single-thread performance: 40–80ms/frame FP32 on iPad A15+. Sufficient for 4–10fps game loop.
- WebGPU still blocked (ORT #26827 open as of 2026-03-04; WebKit OMG JIT root cause identified, no fix)
- Custom digit-tiles model training is the #1 priority action (COCO model cannot classify digits)
- 6/9 confusion is highest model risk; underlined tile design + diverse training data required
- Training data: 50–100 images/class viable for demo sprint; 200–500 for production quality
- Expandability: letters = class count increase (easy); handwriting = different model architecture (hard); image objects = more training data per class (medium)
- All alternatives confirmed rejected: Apple Vision (not accessible from PWA), WebNN (Safari unimplemented), TF.js (Safari Worker breakage), MediaPipe (Safari breakage), Tesseract (5s/frame), cloud API (latency + COPPA)
- WebGPU upgrade path preserved: single change to executionProviders when #26827 resolves

## CV Inference Pipeline complete deep-read (2026-03-13)
`.claude/plans/research.md` — prepended "CV Inference Pipeline: Complete Technical Research" section. Contains full stage-by-stage breakdown of all 9 pipeline stages with exact code citations, input tensor spec, and 5 identified issues:
- Issue A: preprocessing duplicated between inference.worker.ts and preprocessing.ts (maintenance hazard)
- Issue B: no classId bounds check (postprocessing.ts:198)
- Issue C: browser bilinear vs OpenCV resize (likely negligible)
- Issue D: Float32Array reuse in tensor (safe per ORT contract but latent hazard)
- Issue E: 0.65 confidence threshold vs YOLO default 0.25 (tuning consideration)
- Confirmed correct: letterbox gray=114, planar RGB, /255 normalization (no ImageNet stats), no softmax, channel-major indexing, miss-streak tolerance=2

## Post-prediction pipeline deep-trace (2026-03-13)
`.claude/plans/research.md` — appended "Post-Prediction Pipeline — Why Rounds Don't Complete" section. Critical findings:

**Already fixed (DO NOT re-fix in plans):**
- C1 (hard reset on single null): `temporal-buffer.ts:16,34` — `MAX_CONSECUTIVE_MISSES=2` with `missStreak > MAX_CONSECUTIVE_MISSES` reset. 2-frame tolerance IS in place.
- C4 (scene-wide avgWidth in grouping): `interpretation.ts:77-78` uses pair-local width already.
- C3 (motion gate dead code): `motion-gate.ts` does not exist in current codebase.

**Root cause of "bouncing 0→1→0" and "high confidence no complete":**
Model intermittently fails to detect above 0.65 for 3+ consecutive frames → temporal count hard-resets. Confidence threshold amplifies this: scores 0.55-0.64 are invisible to temporal buffer.

**Highest-leverage remaining fix:** Lower `DEFAULT_CONF_THRESHOLD` from 0.65 to 0.55 (`postprocessing.ts:18`). One-line change.

**Remaining UX issue:** Stale `tileSeen` for ~400ms during miss-tolerance window (`game-store.ts:83-89`). Minor, not a blocker.

**All race conditions confirmed safe.** No synchronization bugs in current pipeline.

## CV Pipeline deep-dive (2026-03-12)
`.claude/plans/cv-pipeline-deep-dive.md` — full analysis of all 18 CV files + camera + stores. Key findings:
- Pipeline architecture is sound and correctly implemented end-to-end
- Custom digit-tiles model trained and deployed at `public/models/digit-tiles.onnx` (mAP50: 0.887, precision: 0.923, 417 train images).
- B2 from research.md is INCORRECT — both fatal and non-fatal error paths in onnx-recognition.ts DO resolve pendingInfer (lines 68 and 73). No deadlock.
- S5 confirmed: mock-recognition.ts:62 does not close received ImageBitmap. GPU leak in mock/dev mode.
- S1 confirmed: inference.worker.ts duplicates preprocessing.ts logic inline. Maintenance hazard.
- Motion gate is functionally inert at default confThreshold (0.65 > gate threshold 0.40). Only meaningful if confThreshold is lowered below 0.40.
- classId bounds check missing in postprocessing.ts:198 — COCO classIds 10–79 would silently pass as Digit.

## Architecture flexibility research (2026-03-12)
`.claude/plans/architecture-research.md` — full analysis for multi-game-type (spelling, image identity, etc.) flexibility. Key findings:
- `Problem` type is the root math-specific coupling: `left/right/operator/answer` fields baked into phase types, RoundResult, SessionData.mode, ProblemDisplay
- Four high-refactor-cost seams to protect: (1) `GameScreen` should accept `challengeDisplay: React.ReactNode` slot, (2) `hintText` should be passed from PhaseRouter not computed in FeedbackOverlay, (3) floating idle-screen decoratives should use `ThemeDecoratives` component with injected symbols, (4) ProgressPips `total` should be a prop not an import of `MAX_PROBLEMS`
- Color theming is already excellent (all CSS custom properties + semantic tokens); per-game-type theming = CSS class on `<html>` element
- Already game-agnostic: phase FSM names, GameState shape, star reward system, CountdownTimer visual, TapToStart, MuteButton, spring animation configs
- Recommended approach (Option C): targeted seams only, ship all low-risk polish immediately, protect 4 coupling points

## Library & API deep-dive (2026-03-12)
`.claude/plans/library-research.md` — comprehensive research on 9 library/API categories. Key findings:
- canvas-confetti: add `shapeFromText` emoji shapes (scalar must match between shape and call); `useWorker: true` offloads to OffscreenCanvas Worker; stay ≤80 particles on iPad
- Motion v12: stay on `domAnimation` (not `domMax`); `useMotionValue`/`useTransform` for progress indicators; `useAnimationControls` for sequences; `domMax` adds +10KB for layout animations (no current use case)
- Howler.js: consolidate 5 files to sprite for 2 HTTP requests; `.rate(0.9-1.1)` for pitch variety; pool=5 for pop sound; iOS workarounds already correct
- Lottie (both): SKIP — CDN WASM breaks offline (dotlottie) or 82KB gzip (lottie-react); neither justified without mascot character
- react-rewards: SKIP — React 19 compatibility unknown; canvas-confetti strictly better
- Screen Wake Lock API: USE — prevents iPad sleeping during tile scanning; supported Safari 16.4+; PWA bug fixed in iOS 18.4
- View Transitions API: SKIP — React 19 iOS Safari crash bug (issue #35336)
- navigator.vibrate: SKIP — not supported on iPad (no vibration motor)
- CSS `@property`: USE — animated gradients Safari 16.4+; celebration background state possible
- CSS `animation-timeline`: SKIP — not in Safari 17/18; only landed Safari 26
- backdrop-filter: MAYBE — needs `-webkit-` prefix guard; test on target iPad
- tsparticles: SKIP — 30–40KB gzip; canvas-confetti handles all burst needs
- Granim.js: MAYBE — 5KB gzip; animated mesh gradient if background is a requirement

## Deep competitive research (2026-03-12)
`.claude/plans/competitive-research.md` — exhaustive research on polish, game feel, and fun for ages 5–8. Key findings:
- Mascot/character is the single biggest differentiator between "functional" and "memorable" (all top competitors have one)
- Only `transform` + `opacity` + `filter` are GPU-composited on iPad Safari — never animate width/height/background-color
- Sound variants: minimum 3–5 per event type to prevent audio fatigue; current codebase has 1 per event
- Spring values for children should be bouncier: `bounce: 0.6` or `damping: 8` — current settings are adult-ish
- View Transitions API: SKIP (React 19 iOS Safari crash — confirmed in separate library research)
- Web Vibration API NOT supported on iOS Safari — feedback must be visual + audio only
- Screen shake contraindicated for children (vestibular sensitivity) — use 2–4px translate nudge instead
- Color flash (white overlay 150ms) on correct answer is a missing juice layer
- Option A (visual polish, no mascot) recommended for immediate sprint; Option B (mascot) for next sprint

## Camera capture & frame processing deep-dive (2026-03-13)
`.claude/plans/research-camera-pipeline.md` — complete investigation of the camera→frame→CV pipeline. Key findings:
- Constraints are `ideal` (not `exact`): browser may deliver resolution higher than 1280×720 (iPad Pro may return 4032×3024)
- No ROI cropping anywhere — model sees full frame; "Put your answer here" zone is UI-only
- rVFC self-chains → effective capture rate = 4–10fps (correct behavior, not a bug)
- All ImageBitmap paths call `.close()` correctly; no GPU leaks identified
- `object-cover` CSS on video element creates visual/coordinate mismatch in `?overlay=boxes` debug mode (Issue I2)
- Two preprocessing implementations exist: `inference.worker.ts:preprocessInPlace` vs `preprocessing.ts:preprocess` — same logic, no shared code (maintenance hazard)
- No frame drop observability: no counter for worker-busy drops or non-scanning drops; makes diagnosis hard on real hardware
- Camera layer is architecturally correct; recommended action: add drop observability (~20 lines) and fix overlay coordinate mismatch

## Spelling game mode research — full source audit (2026-03-13)
`.claude/plans/research.md` — complete deep-read of all 15 source files + test files. Key findings:

**Type system changes required:**
- `Problem.answer: number` cannot hold a word (`src/types/game.ts:14`)
- `GameMode.operator: Operator` is math-only (`src/types/game.ts:19-24`)
- `SessionData.mode: "Addition" | "Subtraction"` must add "Spelling" (`src/types/game.ts:72`)
- `Digit = 0|1|...|9` and `DetectedDigit.digit: Digit` cannot express letter classIds 10–35 (`src/types/cv.ts:13,17-21`)
- `TemporalEvent.answer: number` (lines 8–9 of temporal-buffer.ts) must become `string` for spelling variant

**Blocking prerequisites (must fix before spelling works):**
- `d.classId as Digit` cast at `postprocessing.ts:198` — classId 12 (letter C) silently becomes digit 12. Fix: bounds-checked helper.
- 36-class ONNX model required — current model has only 10 classes (digits 0–9). Same YOLO11n training pipeline.

**Critical store details:**
- `processDetections` numeric chain at `game-store.ts:76-84`: `expectedDigitCount = problem.answer.toString().length`, then `interpretationLayer.interpret`, then `values.includes(problem.answer)`. All must branch for spelling.
- `tileSeen: number | null` (`game-store.ts:60`) — must become `number | string | null`
- `mode: GameMode` (`game-store.ts:49`) initialized to `AdditionMode`, never changed — add `setGameKind()` setter
- `getLastMatchedAnswer()` (`game-store.ts:131`) — used in `App.tsx` per-frame; parallel `getLastMatchedWord()` needed for spelling

**Reducer changes:**
- `MAX_PROBLEMS = 15` at `game-reducer.ts:27`, checked at line 144. Must be parameterized (add `maxProblems` to `GameState`).
- `mode: "Addition"` hardcoded at `game-reducer.ts:189`. Must be derived from active mode name.

**What stays unchanged:**
- `inference.worker.ts` — model-agnostic, reads numClasses from dims
- `preprocessing.ts` — pure math
- `temporal-buffer.ts` — internal `===` equality works for strings; only type annotations change
- `interpretation.ts` — math mode unchanged; spelling gets its own `letter-interpretation.ts`
- All `src/camera/`, `src/audio/`, `src/store/cv-store.ts`

**Recommended approach:** Option A parallel path. New files: `SpellingProblem` type, `letter-interpretation.ts`, `spelling-generator.ts`, `SpellingScreen.tsx`, `WordDisplay.tsx`. Minimal changes to 6 existing files. Zero regression risk to math's 17 test files.

**Multi-letter detection:** Child places ALL tiles simultaneously. Left-to-right sort already correct (postprocessing sorts by x1, interpretation sorts by centerX). Ordered match required — "CAT" ≠ "ACT".

**Word list:** 3-letter pool (CAT, DOG, HAT...) and 4-letter pool (BALL, FISH, FROG...). 3 words/session (2×3-letter + 1×4-letter). Ages 5–8.

**iOS constraint:** `setGameKind("spelling")` must be called synchronously BEFORE the start gesture fires. The Spelling button tap must do: `setGameKind("spelling")` then `unlockAudio()` + `acquire()` + `requestCamera()` + `dispatch("START_SESSION")` — all in one handler.

## Build/CI/Infrastructure deep-dive (2026-03-12)
`.claude/plans/research.md` — section "Build Configuration & Infrastructure Deep-Dive" appended. Key findings:
- Vite config: `optimizeDeps.exclude: ["onnxruntime-web"]` and `viteStaticCopy` of WASM files are mandatory for ONNX
- PWA: `.mp3`/`.m4a` NOT in globPatterns — first offline session has no audio (BCI-M1, medium priority)
- Single model file in `public/models/`: `digit-tiles.onnx` (custom 10-class digit detector)
- `@/*` path alias in `tsconfig.app.json:27-30` has no matching Vite `resolve.alias` — dormant inconsistency (BCI-M3)
- CI: `wrangler-action` SHA-pinned for supply-chain safety; deploy gates on quality + e2e passing on main push only
- CSP: `script-src 'wasm-unsafe-eval'` required for WASM; no COOP/COEP by design (would break Google Fonts CDN)
- All deployment paths correct: Cloudflare TLS (prod), mkcert (dev), HTTP + mock mode (E2E)
