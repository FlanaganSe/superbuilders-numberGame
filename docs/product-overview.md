# Product Overview

## What this is

Superbuilders is an OSMO-style educational game that uses real-time computer vision to recognize physical tiles placed in front of an iPad camera. Children ages 5-8 solve math and spelling problems by placing physical tiles on a play surface. The app detects answers through the camera feed and provides instant, research-backed celebratory feedback. Five game modes are live: Addition, Subtraction, Missing Part, Make 10, and Spelling. The entire CV pipeline runs on-device in the browser via WebAssembly — no cloud, no backend, fully offline after first load.

## Why it exists

Built as a rapid challenge to replicate the core experience of OSMO's physical-tile recognition using only browser technologies. The key constraint: everything must run client-side on an iPad in Safari, with no server. Computer vision inference happens in-browser via WebAssembly, audio works within iOS's restrictive autoplay policies, and the camera is accessed through WebRTC — all inside a PWA that can be installed to the home screen and used offline.

---

## Stack

### Core technologies and why they were chosen

| Technology | Version | Role | Why this over alternatives |
|---|---|---|---|
| **React** | 19.2 | UI framework | JSX transform, concurrent features, ecosystem. No SSR needed — pure SPA, so Next.js was rejected (ADR-001). |
| **Vite** | 7.3 | Build + dev server | Sub-second HMR, native ESM, first-class WASM support. Critical for iterating on CV pipeline behavior. |
| **TypeScript** | 5.9 | Type safety | Maximum strictness: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `isolatedModules`. The CV pipeline has complex data shapes where type safety prevents entire classes of bugs. |
| **ONNX Runtime Web** | 1.24.3 | ML inference | WASM execution provider only. Safari crashes on WebGPU (WebKit bug #26827, open as of March 2026). WASM with SIMD gives 40-80ms inference at 640x640. TensorFlow.js was considered but ONNX has better model portability from Ultralytics/YOLO (ADR-002). |
| **Zustand** | 5.x | State management | Two stores: game state (reducer-driven) and CV state (transient, updated at inference rate). Supports direct `getState()` calls from the CV pipeline without React context — critical for the frame callback that runs outside React's lifecycle (ADR-003). |
| **Motion** | 12.35 | Animation | `LazyMotion` + `domAnimation` for tree-shaking. Spring physics for child-friendly bounce. `AnimatePresence` for phase transitions. Respects `prefers-reduced-motion`. |
| **Howler.js** | 2.2.4 | Audio | Handles iOS AudioContext suspension/resumption. Dual-format (MP3 + M4A). `autoSuspend: false` is mandatory — set before any Howl instance. |
| **canvas-confetti** | 1.9.4 | Celebration effects | Lightweight particle system. Fires from both edges on correct answers and session completion. |
| **Tailwind CSS** | 4.2 | Styling | v4 uses `@theme` in CSS directly (no tailwind.config). Integrated via `@tailwindcss/vite`. Custom cream/gold/green palette for child-friendly aesthetics. |
| **Biome** | 2.x | Linter + formatter | Single tool replaces ESLint + Prettier. ~20x faster. `domains.react: "all"` (ADR-004). Tab indentation. |
| **Playwright** | 1.58 | E2E testing | WebKit engine only — matches iPad Safari target. Tests use mock recognition mode. |
| **Vitest** | 4.x | Unit testing | Co-located tests (`foo.ts` -> `foo.test.ts`). happy-dom environment. |
| **Cloudflare Pages** | - | Hosting | Static site. HTTPS guaranteed (required for camera API). Workbox SW caches WASM + model for offline use. |

### Key dependency tradeoffs

**WASM over WebGPU:** Safari crashes on WebGPU for ORT (WebKit #26827). Single-threaded WASM with SIMD is the only reliable path. `numThreads: 1` avoids `SharedArrayBuffer` and `COOP/COEP` headers that would break Google Fonts. Tradeoff: ~40-80ms inference vs potential ~10-20ms, but acceptable for the use case.

**FP32 model (not FP16/INT8):** FP16 is 2-7x slower in browser WASM without native SIMD for half-precision. INT8 has no compute speedup on Safari because Relaxed SIMD is unavailable. FP32 gives best WASM performance via standard `f32x4` SIMD. Tradeoff: larger model (~10.6 MB), but cached by service worker.

**No SSR, no backend:** Entirely static SPA. No database — localStorage stores cumulative stars, mute preference, calibration status. The game must work offline after initial load.

---

## Architecture

### High-level data flow

```
Physical tiles on play surface
        |
        v
iPad camera (720p, rear-facing, 30fps native)
        |
        v
getUserMedia -> <video> element (playsinline autoPlay muted)
        |
        v
requestVideoFrameCallback (4-10fps effective capture rate)
        |
        v
drawImage(video) -> OffscreenCanvas -> createImageBitmap(canvas)
        |
        v [ImageBitmap transferred via postMessage — zero-copy]
Web Worker (inference.worker.ts)
  |-- Letterbox resize to 640x640 (aspect-preserving, gray 114/255 padding)
  |-- RGBA -> Planar RGB normalization [0, 1]
  |-- ONNX Runtime session.run() -> [1, 40, 8400]
  |-- Postprocess: conf filter (0.50) -> classRange argmax -> NMS (IoU 0.45) -> unletterbox -> L->R sort
  +-- Return DetectedDigit[] + latencyMs
        |
        v
Main thread
  |-- Update cv-store (raw detections, latency, debug info)
  |-- Interpretation: group adjacent tiles -> multi-digit candidates (math) or string (spelling)
  |-- Match answer: does any candidate equal the expected answer?
  |-- Temporal buffer: same answer 3 consecutive frames?
  |     |-- Frame 1: TILE_SEEN -> instant visual feedback ("I see 7!")
  |     +-- Frame 3: ANSWER_COMMITTED -> game logic fires
  +-- Game store: dispatch ANSWER_CORRECT, play sound, award stars
        |
        v
React UI: celebration animation, confetti, explanation, next problem
```

### Why the architecture is split this way

**Web Worker isolation:** ONNX inference takes 40-80ms per frame. Running on the main thread would cause visible UI jank. The worker receives `ImageBitmap` via `postMessage` transferable (zero-copy), runs inference, and posts results back. The worker uses pre-allocated `Float32Array` and `OffscreenCanvas` buffers — no garbage collection pressure per frame.

**Busy-flag frame dropping:** The worker sets `isInferring = true` during inference. New frames arriving while busy are silently dropped (bitmap closed immediately). This prevents frame queue buildup — the system always processes the newest available frame, never a stale queue.

**Two Zustand stores:** `game-store` holds game logic (phase, problems, scores, difficulty). `cv-store` holds transient CV data (raw detections, latency, worker status). They're separate because CV data updates at 4-10fps — if it lived in the game store, every component subscribing to game state would re-render at inference rate. The cv-store is only consumed by DebugHUD and camera overlay.

**Temporal buffer:** Raw CV detections are noisy. A single frame might see a "7" that's actually a hand passing over. The buffer requires 3 consecutive frames with the same matched answer before committing. At ~5fps, this is ~600ms — long enough to filter noise, short enough to feel responsive. The buffer emits `TILE_SEEN` on frame 1 (instant visual feedback) and `ANSWER_COMMITTED` on frame 3 (game logic fires).

**Class-range filtering (ADR-006):** The 36-class model outputs digits (0-9) and letters (A-Z). The `classRange` parameter constrains the argmax loop per game mode — math uses `{min:0, max:9}`, spelling uses `{min:10, max:35}`. This happens inside the argmax, not as a post-filter, because class-agnostic NMS runs after argmax: a high-confidence letter could suppress a valid digit via NMS if not filtered first.

---

## Directory structure

```
src/
|-- main.tsx                    # React entry point (StrictMode + global CSS)
|-- index.css                   # Tailwind @theme: colors, fonts, animations
|
|-- components/                 # React UI layer (15 components)
|   |-- App.tsx                 # Root: CV pipeline wiring, phase routing, class-range switching
|   |-- TapToStart.tsx          # Mode menu: Spelling (top) + 4 math modes (2x2 grid)
|   |-- CountdownTimer.tsx      # 3s countdown with tick sounds and color urgency
|   |-- GameScreen.tsx          # Math game: problem, feedback, progress, 30s timeout
|   |-- SpellingScreen.tsx      # Spelling game: letter boxes, 45s timeout
|   |-- ProblemDisplay.tsx      # "3 + 4 = ?" renderer with math language sub-prompts
|   |-- FeedbackOverlay.tsx     # Correct/timeout/tile-seen/wrong-tile states
|   |-- CameraUncertaintyPrompt.tsx  # System-attribution camera feedback (ADR-010)
|   |-- SessionSummary.tsx      # End celebration: confetti, stars, cumulative stats
|   |-- ProgressiveLoader.tsx   # Model loading with child-friendly messages + fallback
|   |-- CalibrationGuide.tsx    # First-run camera setup (localStorage gate)
|   |-- ProgressPips.tsx        # Round progress dots
|   |-- MuteButton.tsx          # Fixed-position audio toggle
|   |-- MockNumpad.tsx          # Dev-only digit input (?recognition=mock)
|   +-- DebugHUD.tsx            # Dev-only stats overlay (?debug=true)
|
|-- cv/                         # Computer vision pipeline
|   |-- inference.worker.ts     # Web Worker: ONNX init, preprocess, infer, postprocess
|   |-- onnx-recognition.ts     # Worker lifecycle wrapper (busy flag, class range)
|   |-- recognition-service.ts  # Factory: createRecognitionBackend(mock|onnx)
|   |-- preprocessing.ts        # Letterbox resize, RGBA->planar RGB, normalization
|   |-- postprocessing.ts       # Confidence filter, classRange argmax, NMS, unletterbox, L->R sort
|   |-- interpretation.ts       # Group digits -> candidates, match answer
|   |-- temporal-buffer.ts      # 3-frame stability: TILE_SEEN -> ANSWER_COMMITTED
|   |-- mock-recognition.ts     # Testing backend: emitDigit() without camera
|   |-- fixture-frame-source.ts # Image replay for regression testing
|   +-- fixtures/
|       +-- synthetic-tensor.ts # Fake YOLO output tensors for unit tests
|
|-- camera/                     # Camera access and frame capture
|   |-- use-camera.ts           # getUserMedia hook, error handling, iOS recovery
|   |-- frame-capture.ts        # rVFC -> canvas -> ImageBitmap pipeline
|   +-- camera-overlay.tsx      # Video element + optional debug bounding boxes
|
|-- engine/                     # Game logic (pure functions, no React dependency)
|   |-- game-reducer.ts         # State machine: idle->countdown->scanning->success/timeout->end
|   |-- problem-generator.ts    # 4 math modes: Addition, Subtraction, MissingAddend, Make10
|   |-- difficulty.ts           # Adaptive difficulty: promote after 3, demote after 2
|   |-- explanation-generator.ts  # Research-backed instructional feedback (ADR-009)
|   |-- camera-uncertainty.ts   # System-attribution prompts (ADR-010)
|   |-- spelling-words.ts       # CVC/sight word lists, spelling problem generation
|   +-- session.ts              # Star calculation, cumulative stats, localStorage
|
|-- store/                      # Zustand state management
|   |-- game-store.ts           # Game state, CV integration, mute, wrong-tile tracking
|   +-- cv-store.ts             # Transient CV data (detections, latency, worker status)
|
|-- hooks/
|   +-- use-wake-lock.ts        # Screen Wake Lock API — prevents iPad sleep
|
|-- audio/
|   |-- sound-manager.ts        # Howler.js config, AudioContext unlock, visibility resume
|   +-- use-audio.ts            # Mute-aware playback hook
|
|-- types/
|   |-- game.ts                 # Problem, SpellingProblem, GamePhase, GameAction, GameMode
|   |-- cv.ts                   # DetectedDigit, RecognitionService, VocabularyRegistry
|   +-- worker-protocol.ts      # MainToWorker / WorkerToMain message types
|
+-- utils/
    +-- feature-flags.ts        # URL param parsing: ?recognition=mock, ?debug=true, ?overlay=boxes

public/
|-- manifest.json               # PWA: standalone, landscape, cream background
|-- _headers                    # Cloudflare Pages: CSP, camera permission, security headers
|-- _redirects                  # SPA fallback: /* -> /index.html 200
|-- icons/                      # SVG icons (192, 512)
|-- models/
|   +-- digit-tiles.onnx        # Custom YOLO11n (~10.6 MB, FP32, 36 classes)
+-- sounds/                     # Dual-format audio (MP3 + M4A, 19 sounds, 38 files)

e2e/
+-- game-loop.spec.ts           # Playwright WebKit: full game loop with mock recognition

docs/
|-- product-overview.md         # This file
|-- decisions.md                # Append-only ADR log (10 decisions)
|-- requirements.md             # Original PRD
|-- research.md                 # Verified platform facts and constraints
|-- learning-science-research.md  # Consolidated learning science research
+-- research/                   # Deep evidence base
    |-- literacy-science.md
    |-- math-game-design.md
    |-- phonics-deep-dive.md
    +-- digit-training-pipeline.md
```

---

## Core concepts

### Game phases (discriminated union)

The game is a finite state machine with six phases, defined as a discriminated union on `phase.phase`:

1. **idle** — Mode selection menu. Spelling button at top, four math modes in a 2x2 grid below (Addition, Subtraction, Make 10, Missing Part). Tapping any button atomically: (a) unlocks AudioContext, (b) requests camera permission, (c) acquires screen wake lock, (d) starts the session. All four must happen in a single user gesture (iOS requirement).

2. **countdown** — 3-second countdown with tick sounds, per-digit spring animation, and color urgency (3=blue, 2=orange, 1=red). Generates the next problem on completion.

3. **scanning** — Active detection. Camera feeds frames to the CV pipeline. The problem displays with `?` as the answer placeholder. A dashed "Put your answer here" zone pulses until a tile is detected. Progress pips show the current round. Math: 30-second timeout. Spelling: 45-second timeout.

4. **success** — Correct answer detected. Stars awarded (3 on first attempt, 2 on second, 1 on third+). Celebration animation + confetti + chime with randomized pitch. Research-backed explanation text shown at difficulty 1-3 (fades at 4+ per Sweller's expertise reversal principle, ADR-009). Auto-advances after 3.5s.

5. **timeout** — Timer expired without correct answer. Shows encouragement (never punitive language) plus instructional feedback: strategy hint on first timeout, worked example on repeat (ADR-009). Spelling timeout goes to countdown (new word); math timeout retries the same problem with incremented attempt number. Auto-retries after 2s.

6. **session-end** — 15 problems completed (math) or 3 words (spelling). Double-cannon confetti. Staggered star animation. Cumulative stats from localStorage. "Play Again!" returns to idle.

### Game modes

Five `GameMode` implementations are available from the idle screen:

| Mode | Operator | Problem shape | Answer constraint | Notes |
|---|---|---|---|---|
| **Addition** | + | `left + right = ?` | 0-9 | Difficulty scales operand ranges |
| **Subtraction** | - | `left - right = ?` | 0-9 | Left operand can exceed 9 (displayed) |
| **Missing Part** | + | `left + ? = target` | 0-9 | Part-whole reasoning; `right` is the answer |
| **Make 10** | + | `left + ? = 10` | 1-9 | Fixed target; ignores difficulty parameter |
| **Spelling** | n/a | Place letter tiles to spell a word | 2-3 letter words | 3 words per session, 45s timeout |

All math answers are constrained to 0-9 (`MAX_ANSWER = 9`) because the child places a single physical digit tile in front of the camera.

### Problem generation and difficulty

Four math modes generate problems with difficulty-scaled operand ranges:

| Difficulty | Addition | Subtraction |
|---|---|---|
| Level 1 | 0-4 + 0-4 | 1-5 minus 0-3 |
| Level 2 | 0-5 + 0-5 | 3-9 minus 1-5 |
| Level 3 | 1-6 + 1-6 | 5-12 minus 2-7 |
| Level 4 | 2-7 + 2-7 | 7-15 minus 3-9 |
| Level 5 | 3-7 + 3-6 | 10-18 minus 5-9 |

Missing Part uses addition ranges (the answer is the unknown addend). Make 10 has a fixed problem space (9 problems, always `left + ? = 10`).

Difficulty adapts per-round: 3 consecutive correct promotes (max 5), 2 consecutive wrong demotes (min 1). Streaks cross-reset — a correct answer clears the wrong streak and vice versa. Level Up is shown visually on promotion; demotion is silent (math anxiety research).

Spelling uses a pool of 28 words (8 two-letter sight words + 20 three-letter CVC words). 3 words per session, no repeats within a session.

### Research-backed feedback (ADR-009)

All instructional feedback text is generated by pure functions in `src/engine/`:

- **`explanation-generator.ts`** — Six feedback paths: correct (first-try), correct (after-retry), wrong-tile, timeout-first (strategy hint), timeout-repeated (worked example), and high-difficulty (brief or none). Detailed explanations appear at difficulty 1-3 and fade at 4+ (Sweller's expertise reversal principle).
- **`camera-uncertainty.ts`** — System-attribution prompts ("Hold your tile flat so I can see it") that blame the camera, never the child. Based on math anxiety research. Deterministic per missStreak (no flickering).

### Detection pipeline stages

1. **Frame capture** — `requestVideoFrameCallback` fires on new video frames. Frame drawn to `OffscreenCanvas`, converted to `ImageBitmap` via `createImageBitmap(canvas)` (not `createImageBitmap(video)` — WebKit #234920). Bitmap transferred to worker via `postMessage` with transferable list (zero-copy).

2. **Preprocessing** — In the worker. Letterbox resize maintains aspect ratio with gray padding (114/255). RGBA converted to planar RGB `[R...R, G...G, B...B]` normalized to [0,1]. Pre-allocated `Float32Array` buffer avoids per-frame allocation.

3. **Inference** — ONNX `session.run()` with input `[1, 3, 640, 640]`. Output: `[1, 40, 8400]` (channel-major: 4 box coords + 36 class scores x 8400 anchors).

4. **Postprocessing** — For each of 8400 anchors: argmax over `classRange` channels (0-9 for math, 10-35 for spelling), filter by confidence (0.50). Decode center-form box to corner-form. Reverse letterbox to original coordinates. Class-agnostic NMS (IoU 0.45). Sort left-to-right.

5. **Interpretation** — Math: group adjacent detections into multi-digit candidates by vertical alignment and horizontal proximity. Adjacent "1" and "5" become value 15. Spelling: classId 10-35 mapped to letters A-Z, concatenated left-to-right.

6. **Temporal stabilization** — Generic `TemporalBuffer<T>` works for both `number` (math) and `string` (spelling). 3 consecutive matching frames required. Frame 1 emits `TILE_SEEN`. Frame 3 emits `ANSWER_COMMITTED`. Tolerates up to 2 consecutive misses before hard reset.

### The model

Custom **YOLO11n** (Ultralytics nano variant) trained on physical digit and letter tiles.

| Property | Value |
|---|---|
| File | `public/models/digit-tiles.onnx` |
| Size | ~10.6 MB (FP32) |
| Input | `[1, 3, 640, 640]` (RGB, normalized [0,1]) |
| Output | `[1, 40, 8400]` (channel-major: 4 box + 36 class x 8400 anchors) |
| Classes | 36: digits 0-9 (classId 0-9), letters A-Z (classId 10-35) |
| Training | Physical tiles -> iPhone video -> ffmpeg 2fps -> Gemini annotation -> Roboflow -> Kaggle P100 (150 epochs) |
| Metrics | mAP50: 0.995, mAP50-95: 0.973, Precision: 0.993, Recall: 0.998 |
| Export | `yolo export format=onnx imgsz=640 opset=17 half=False batch=1` |

Training is documented in the standalone `digit-training` project at `~/proj/digit-training`.

### Audio system

19 named sounds via Howler.js with individual files (MP3 + M4A per sound = 38 files):
- 5 game sounds: correct chime, encouragement, tile-detected pop, session-end fanfare, countdown tick
- 10 number words: zero through nine (played before chime on correct answer)
- 4 math prompts: prompt-altogether, prompt-left, prompt-missing, prompt-make-ten

Correct chime plays at randomized rate (`0.9 + Math.random() * 0.2`) so consecutive correct answers sound distinct. Lazy Howl instantiation: each sound created on first access and cached in a `Map`. `preloadSounds()` triggers all during the start gesture.

---

## Key patterns and conventions

### Code organization
- **Co-located tests:** `foo.ts` -> `foo.test.ts` in the same directory
- **Named exports only:** No default exports anywhere
- **Explicit return types** on all public functions
- **Functional/immutable patterns:** Game reducer returns new state. Difficulty returns new state. Temporal buffer is a closure with internal state but immutable external API.

### State management patterns
- **Selectors for React:** `useGameStore((s) => s.field)` — fine-grained subscriptions. Never subscribe to the whole store.
- **Direct access for non-React:** `useGameStore.getState()` — used in CV callbacks outside React's lifecycle.
- **Module-level mutable state:** Wrong-tile tracking (`wrongCandidate`, `wrongConsecutive`) and `lastProblemRef` live outside Zustand in `game-store.ts`. This is intentional (ADR-010) — wrong-answer detection has different timing requirements than the temporal buffer.

### Worker protocol
All `postMessage` calls use `satisfies MainToWorker` / `satisfies WorkerToMain` for compile-time type safety. Discriminated union on `type`:
- `MainToWorker`: `"init"` | `"infer"` (with classRange) | `"terminate"`
- `WorkerToMain`: `"ready"` | `"detections"` (with numClasses) | `"error"` (with `fatal` flag)

### Phase narrowing
Game logic switches on `phase.phase` discriminant before accessing phase-specific fields:
```typescript
if (state.phase.phase !== "scanning") return state;
const { problem, attemptNumber } = state.phase; // TypeScript narrows
```

### Frame ownership
`ImageBitmap` holds GPU memory that won't be garbage collected. Single consumer owns and calls `.close()`. Multiple consumers: clone per listener, original closed. Zero consumers: closed immediately. Worker always closes in `finally` block.

### Animation patterns
- **Spring configs are intentional:** Buttons: `stiffness: 400, damping: 17` (snappy). Celebrations: `stiffness: 300, damping: 15` (bouncier). Tile pop: `stiffness: 400, damping: 10` (very bouncy).
- **Phase fade transitions:** `AnimatePresence mode="wait"` + 150ms opacity-only fades (ADR-005). Duration must not exceed 200ms.
- **Reduced motion:** `MotionConfig reducedMotion="user"`. Confetti: `disableForReducedMotion: true`. FeedbackOverlay falls back to fade-only.

### Error handling
- Camera errors mapped to child-friendly messages (no technical jargon)
- localStorage wrapped in try/catch with sensible defaults
- ONNX worker errors: fatal (model load failure -> error UI) vs non-fatal (inference failure -> empty result)
- ProgressiveLoader offers "Try Again" (reload) and "Play Without Camera" (mock mode fallback)
- Wake lock acquisition is best-effort — failure is silent

### Feature flags (URL parameters, cached at module level)
- `?recognition=mock` — On-screen numpad instead of camera CV
- `?debug=true` — Stats overlay: FPS, latency, detections, temporal state
- `?overlay=boxes` — Bounding box visualization on camera feed

---

## Data layer

No database. All persistence is localStorage with graceful degradation:

| Key | Shape | Purpose |
|---|---|---|
| `superbuilders-cumulative` | `{ totalStars: number, sessionsPlayed: number }` | Lifetime stats across sessions |
| `superbuilders-mute` | `"true" \| "false"` | Audio preference |
| `superbuilders_calibrated` | `"true"` | First-run camera setup completed |

Note the inconsistent separator (hyphens vs underscore). All reads/writes wrapped in try/catch. If localStorage is unavailable (private browsing, quota exceeded), the app continues with defaults.

SessionSummary guards against React StrictMode double-invoke using a module-level `Set` of session timestamps to prevent `recordSession()` from double-firing.

---

## Environment and config

### Running locally
```bash
pnpm install          # Install dependencies
pnpm dev              # HTTPS dev server (mkcert auto-generates certs)
```
HTTPS is required for `getUserMedia`. The `vite-plugin-mkcert` plugin handles certificates automatically. Set `NO_HTTPS=true` to disable (only useful for E2E tests in mock mode).

### Tunnel for iPad testing
```bash
cloudflared tunnel --url https://localhost:5173
```
Opens a public HTTPS URL. No account needed. Append `?debug=true` on the device for stats overlay.

### Deployment
- **Host:** Cloudflare Pages (static site, project name: `superbuilders-numbergame`)
- **CI/CD:** GitHub Actions — three serial jobs: quality gate (typecheck + lint + test + build) -> E2E (Playwright WebKit) -> deploy (main-branch push only)
- **Secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- **Build artifact:** Built once in `quality` job, downloaded by both `e2e` and `deploy` (no redundant builds)
- **Deploy action:** `cloudflare/wrangler-action` pinned by SHA

### Security headers (Cloudflare `_headers`)
- CSP includes `'wasm-unsafe-eval'` (required for ONNX WASM)
- `Permissions-Policy: camera=(self)` explicitly grants camera access
- `X-Frame-Options: DENY`, `nosniff`, strict referrer

### Build configuration highlights
- `optimizeDeps.exclude: ["onnxruntime-web"]` — ONNX uses WASM directly, skip esbuild
- `assetsInclude: ["**/*.onnx"]` — model files as static assets
- `vite-plugin-static-copy` — copies ONNX WASM runtime `.wasm` and `.mjs` to dist root
- `worker.format: "es"` — Web Worker as ES module
- PWA Workbox `globPatterns: ["**/*.{js,css,html,wasm,mp3,m4a}"]` — all assets precached
- ONNX model: `StaleWhileRevalidate` runtime caching (ADR-008) — served from cache, background-refreshed

### TypeScript strictness
Every strict flag enabled: `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`, `forceConsistentCasingInFileNames`. Target: ES2022.

---

## Testing

### Unit tests (Vitest, ~21 test files)

**Game engine (heavy coverage):**
- `game-reducer.test.ts` — All phase transitions, invalid action handling, session completion
- `difficulty.test.ts` — Promotion/demotion thresholds, boundary levels, streak resets
- `problem-generator.test.ts` — Validity across all difficulty levels, answer <= 9
- `session.test.ts` — Star calculation, localStorage round-trip, corrupt data recovery
- `explanation-generator.test.ts` — All six feedback paths, expertise reversal gating
- `camera-uncertainty.test.ts` — Deterministic prompts, modulo cycling
- `spelling-words.test.ts` — Word pool validity, no-repeat generation

**CV pipeline (heavy coverage):**
- `postprocessing.test.ts` — IoU, NMS, confidence filtering, letterbox math, classRange, L->R sort
- `preprocessing.test.ts` — Letterbox aspect ratios, RGBA->planar RGB
- `interpretation.test.ts` — Digit grouping, spatial constraints, answer matching
- `temporal-buffer.test.ts` — 3-frame counting, miss tolerance, reset on mismatch
- `pipeline-regression.test.ts` — Full synthetic pipeline: tensor -> postProcess -> group -> match -> temporal buffer. Covers all 10 digits, two-tile answers, 6/9 distinction, NMS dedup.
- `mock-recognition.test.ts` — Mock service lifecycle
- `fixture-frame-source.test.ts` — Image replay

**State and utilities:**
- `game-store.test.ts` — `tileSeen` lifecycle, `processDetections`, wrong answer handling
- `cv-store.test.ts` — Pipeline stats, detection counters, reset
- `frame-capture.test.ts`, `use-camera.test.ts`, `use-wake-lock.test.ts`, `feature-flags.test.ts`

**Not tested (by design):**
- Audio playback (Howler internals — manual testing)
- Motion/confetti animations (visual, not logic)
- Real ONNX inference (requires model + WASM — manual on-device testing)
- Real camera streams (OS-level, covered by E2E)

### E2E test (Playwright WebKit, 1 file)

`e2e/game-loop.spec.ts` — Full game loop: navigate -> start -> countdown -> scanning -> mock digit press 3x (temporal buffer) -> celebration -> second round. WebKit engine only.

### Running tests
```bash
pnpm test             # Unit tests (Vitest)
pnpm test:watch       # Unit tests in watch mode
pnpm test:e2e         # E2E (Playwright WebKit, requires pnpm build first)
```

---

## Important decisions and tradeoffs

Decisions are logged in `docs/decisions.md` (ADR-001 through ADR-010). Key ones:

**WASM-only inference, no WebGPU fallback (ADR-002):** Rather than building a fallback chain (try WebGPU -> WASM), the codebase hardcodes `executionProviders: ["wasm"]`. Simpler, avoids 2-5 second crash-and-retry penalty. The `RecognitionService` interface preserves the seam.

**Canvas-based frame capture, not ImageCapture API:** Safari doesn't support `ImageCapture.grabFrame()`. The codebase uses `drawImage(video)` -> `createImageBitmap(canvas)`. Direct `createImageBitmap(video)` is slow in WebKit (#234920).

**requestVideoFrameCallback over setInterval:** Fires only on new video frames. Prevents processing the same frame twice. Adapts to actual frame rate.

**Temporal buffer (3 frames, not confidence threshold):** A single high-confidence detection could be a false positive. Temporal stability is more robust. `TILE_SEEN` on frame 1 gives instant feedback during the 3-frame wait.

**Phase fade transitions <= 200ms (ADR-005):** `AnimatePresence mode="wait"` keeps exiting components mounted. CountdownTimer's `setInterval` reads phase from the store — exceeding ~200ms causes stale ticks. Hard constraint.

**classRange inside argmax, not post-filter (ADR-006):** Letter detections can suppress digit detections via NMS if allowed to compete. Constraining the argmax loop prevents cross-class NMS conflicts.

**Parallel type path for spelling (ADR-007):** `SpellingProblem` is separate from `Problem` rather than a discriminated union refactor. Zero regression risk for math. Acceptable for v1; refactor if more game modes are added.

**StaleWhileRevalidate for ONNX model (ADR-008):** Cached model served immediately; background fetch ensures updates propagate within one session. Previous `CacheFirst` caused stale models on deployed devices.

**Wrong-answer detection separate from temporal buffer (ADR-010):** Wrong-tile tracking has different timing (>3s guard, 2-frame threshold) and serves feedback, not state transitions. Lives in module-level variables in `game-store.ts`.

---

## Gotchas

### iOS Safari specifics
- **The start gesture is a 4-in-1 atomic action.** Each mode button simultaneously unlocks AudioContext, requests camera, acquires wake lock, and starts session. All four must happen in a single user gesture — splitting them would require separate taps and iOS would block the deferred ones.
- **AudioContext goes to `"interrupted"` state** (not `"suspended"`) when the app backgrounds. The visibility handler checks for both states and resumes with a 200ms delay.
- **Camera streams die on background.** iOS kills `getUserMedia` streams on focus loss. The hook detects `track.readyState === "ended"` and sets status to `"interrupted"`. Recovery requires a new user gesture.
- **Wake lock also dies on background.** Re-acquired on `visibilitychange`. Must be initially acquired in a user gesture.
- **`Howler.autoSuspend = false` must be set before any Howl instance.** Module-level side effect in `sound-manager.ts:16`. Setting it after causes audio dropouts.

### ONNX Runtime Web specifics
- **WASM paths must be absolute** (`ort.env.wasm.wasmPaths = "/"`). Relative paths break inside Web Workers because the worker's base URL differs from the page.
- **`optimizeDeps.exclude: ["onnxruntime-web"]`** required in Vite config. Without it, esbuild tries to bundle the WASM loader and fails.
- **First inference is slow** (2-5 seconds) due to WASM compilation. Subsequent: 40-80ms. ProgressiveLoader hides this.
- **Output tensor is channel-major**, not anchor-major. Class score for anchor `i`: `output[(4 + classId) * numAnchors + i]`, not `output[i * numChannels + 4 + classId]`.

### Frame capture specifics
- **Always call `bitmap.close()`** — even on error, even when skipping. `ImageBitmap` holds GPU memory that won't be GC'd.
- **Never `createImageBitmap(video)` directly** — use the canvas intermediate (WebKit #234920).
- **Capture canvas is resized, never recreated.** Recreating causes memory leaks in some WebKit versions.

### Game state specifics
- **The reducer ignores invalid transitions.** Dispatching `ANSWER_CORRECT` during `"idle"` is a no-op, not an error. Intentional — the CV pipeline might fire after a phase transition already occurred.
- **Phase exit animations must stay <= 200ms (ADR-005).** Any change to exit duration or type must re-evaluate CountdownTimer timing.
- **SessionSummary StrictMode guard.** Module-level `Set` prevents `recordSession()` double-fire.
- **Spelling timeout goes to countdown (new word), not retry.** Math timeout retries the same problem. This is intentional — children shouldn't be stuck on one word.
- **`resetCvState()` must be called before every `NEXT_ROUND` dispatch.** Clears temporal buffers but preserves `spellingWordsUsed`.

### Build and deployment
- **ONNX WASM files must be statically copied** — cannot be imported as ES modules. `vite-plugin-static-copy` handles this.
- **PWA manifest is custom** (`public/manifest.json`), not auto-generated. `manifest: false` in VitePWA config prevents conflicts.
- **E2E tests use `NO_HTTPS=true`** — Playwright WebKit doesn't trust self-signed certs. Mock mode doesn't need camera, so HTTP is fine.
- **`@/*` TS path alias exists but has no Vite `resolve.alias` counterpart** — any `@/` import would type-check but 404 at runtime. Currently unused.
