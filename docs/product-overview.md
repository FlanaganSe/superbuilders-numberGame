# Product Overview

## What this is

Superbuilders is an OSMO-style educational game that uses real-time computer vision to recognize physical tiles placed in front of an iPad camera. Children ages 5–8 solve problems by placing physical tiles on a play surface, and the app detects the answer through the camera feed, providing instant celebratory feedback. Today the game supports arithmetic (addition, subtraction) using digit tiles (0–9). The architecture — and the training pipeline — are designed to expand to letter tiles and spelling games next. The entire CV pipeline runs on-device in the browser via WebAssembly with no cloud dependency.

## Why it exists

Built as a week-long challenge to replicate the core experience of OSMO's number tile recognition using only browser technologies. The key constraint: everything must run client-side on an iPad in Safari, with no backend. Computer vision inference happens in-browser via WebAssembly, audio works within iOS's restrictive autoplay policies, and the camera is accessed through WebRTC — all inside a PWA that can be installed and used offline.

---

## Stack

### Core technologies and why they were chosen

| Technology | Version | Role | Why this over alternatives |
|---|---|---|---|
| **React** | 19.2 | UI framework | JSX transform, concurrent features, ecosystem. No SSR needed (pure SPA), so Next.js was explicitly rejected (ADR-001). |
| **Vite** | 7.3 | Build tool + dev server | Sub-second HMR, native ESM, first-class WASM support. Critical for the dev loop when iterating on CV pipeline behavior. |
| **TypeScript** | 5.9 | Type safety | Strictest possible config: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `isolatedModules`. The CV pipeline has complex data shapes where type safety prevents entire classes of bugs. |
| **ONNX Runtime Web** | 1.24.3 | ML inference | WASM execution provider only. WebGPU was the original plan but Safari crashes on it (WebKit bug #26827, open as of March 2026). WASM with SIMD gives 40–80ms inference at 640×640. TensorFlow.js was considered but ONNX has better model portability from the Ultralytics/YOLO training ecosystem (ADR-002). |
| **Zustand** | 5.x | State management | Two stores: game state (reducer-driven) and CV state (transient, updated at inference rate). Chosen over Redux because it supports direct `getState()` calls from the CV pipeline without requiring React context — critical for the frame processing callback that runs outside React's render cycle (ADR-003). |
| **Motion** | 12.35 | Animation | `LazyMotion` + `domAnimation` for tree-shaking. Spring physics for child-friendly bounce animations. Built-in `AnimatePresence` for phase transitions. Respects `prefers-reduced-motion`. |
| **Howler.js** | 2.2.4 | Audio | Handles iOS AudioContext suspension/resumption. Dual-format support (MP3 + M4A) for cross-browser compatibility. `autoSuspend: false` is mandatory — set before any Howl instance creation. |
| **canvas-confetti** | 1.9.4 | Celebration effects | Lightweight, zero-dependency particle system. Fires from both screen edges on correct answers and session completion. |
| **Tailwind CSS** | 4.2 | Styling | v4 uses `@theme` in CSS directly (no config file). Integrated via `@tailwindcss/vite` plugin. Custom color palette (cream, gold, success green) designed for child-friendly aesthetics. |
| **Biome** | 2.x | Linter + formatter | Single tool replaces ESLint + Prettier. ~20x faster. `domains.react: "all"` enables full React rule set (ADR-004). Tab indentation. |
| **Playwright** | 1.58 | E2E testing | WebKit engine only — matches the iPad Safari target. Tests use mock recognition mode to avoid camera permission dialogs. |
| **Vitest** | 4.x | Unit testing | Co-located tests (`foo.ts` → `foo.test.ts`). happy-dom environment. 17 test files covering game logic, CV pipeline math, pipeline regression, state, and transitions. |
| **Cloudflare Pages** | — | Hosting | Static site deployment. HTTPS guaranteed (required for camera API). Workbox service worker caches WASM runtime + ONNX model for offline use. |

### Key dependency tradeoffs

**ONNX over TensorFlow.js:** ORT Web's WASM backend is more predictable on Safari. The tradeoff is explicit WASM file management (static copy of `.wasm` and `.mjs` files via vite-plugin-static-copy). The benefit is seamless model portability — train with Ultralytics YOLO, export to ONNX, drop into the browser.

**WASM over WebGPU:** WebGPU would be 2–5x faster, but Safari crashes on it (WebKit bug #26827). Single-threaded WASM with SIMD is the only reliable execution provider. `numThreads: 1` avoids `SharedArrayBuffer` and `COOP/COEP` headers. Tradeoff: ~40–80ms vs potential ~10–20ms, but acceptable.

**FP32 model (not FP16/INT8):** FP16 is 2–7x slower in browser WASM without native SIMD. INT8 has no compute speedup on Safari because Relaxed SIMD is unavailable. FP32 gives best WASM performance via standard `f32x4` SIMD. Tradeoff: larger model (~11MB), but cached by service worker.

**Zustand over Redux:** The CV pipeline dispatches from a `requestVideoFrameCallback` loop outside React's lifecycle. Zustand's `getState()` works anywhere — frame callbacks, workers, init code. The game store uses a dedicated reducer function anyway.

**No SSR, no backend:** Entirely static SPA. No database — localStorage stores cumulative stars, session count, mute preference, calibration status. The game must work offline after initial load.

---

## Architecture

### High-level data flow

```
Physical tiles on play surface
        │
        ▼
iPad camera (720p, rear-facing, 30fps native)
        │
        ▼
getUserMedia → <video> element
        │
        ▼
requestVideoFrameCallback (4–10fps capture rate)
        │
        ▼
drawImage(video) → OffscreenCanvas → createImageBitmap(canvas)
        │
        ▼ [ImageBitmap transferred via postMessage — zero-copy GPU transfer]
Web Worker (inference.worker.ts)
  ├─ Letterbox resize to 640×640 (aspect-preserving, gray padding)
  ├─ RGBA → Planar RGB normalization [0, 1]
  ├─ ONNX Runtime session.run() → [1, 4+numClasses, numAnchors]
  ├─ Postprocess: confidence filter (0.65) → NMS (IoU 0.45) → unletterbox → L→R sort
  └─ Return DetectedDigit[] + latencyMs
        │
        ▼
Main thread
  ├─ Update cv-store (raw detections, latency, debug info)
  ├─ Interpretation: group adjacent tiles → multi-digit candidates
  ├─ Match answer: does any candidate equal the expected answer?
  ├─ Temporal buffer: same answer 3 consecutive frames?
  │     ├─ Frame 1: TILE_SEEN → instant visual feedback
  │     └─ Frame 3: ANSWER_COMMITTED → game logic fires
  └─ Game store: dispatch ANSWER_CORRECT, play sound, award stars
        │
        ▼
React UI: celebration animation, confetti, next problem
```

### Why the architecture is split this way

**Web Worker isolation:** ONNX inference takes 40–80ms per frame. Running on the main thread would cause visible UI jank. The worker receives `ImageBitmap` via `postMessage` transferable (zero-copy GPU transfer), runs inference, and posts results back. The worker uses pre-allocated `Float32Array` and `OffscreenCanvas` buffers — no garbage collection pressure per frame.

**Busy-flag frame dropping:** The worker sets `isInferring = true` during inference. If a new frame arrives while busy, it's silently dropped (bitmap closed immediately). This prevents frame queue buildup — the system always processes the most recent available frame, not a stale queue.

**Two Zustand stores:** `game-store` holds game logic (phase, problems, scores, difficulty). `cv-store` holds transient CV data (raw detections, latency, worker status). They're separate because CV data updates at 4–10fps — if it lived in the game store, every component subscribing to game state would re-render at inference rate. The cv-store is only consumed by the DebugHUD and camera overlay.

**Temporal buffer:** Raw CV detections are noisy. A single frame might see a "7" that's actually a hand passing over. The buffer requires 3 consecutive frames with the same matched answer before committing. At ~5fps, this is ~600ms of stability — long enough to filter noise, short enough to feel responsive. The buffer emits `TILE_SEEN` on frame 1 (instant visual feedback) and `ANSWER_COMMITTED` on frame 3 (game logic fires).

**Class-count agnostic postprocessing:** `numClasses` is read from the ONNX output tensor dimensions (`dims[1] - 4`), not hardcoded. When a new model with 36 classes (digits + letters) replaces the current 10-class digit model, no postprocessing code changes are needed — the loop over class scores automatically adapts.

---

## Directory structure

```
src/
├── main.tsx                    # React entry point (StrictMode + global CSS)
├── index.css                   # Tailwind @theme: colors, fonts, animations
├── vite-env.d.ts               # Vite client types
│
├── components/                 # React UI layer (13 components)
│   ├── App.tsx                 # Root orchestrator: CV pipeline wiring, phase routing
│   ├── GameScreen.tsx          # Active game: problem display, tile detection, feedback, progress
│   ├── TapToStart.tsx          # Idle screen: audio + camera + wake lock unlock in one gesture
│   ├── CountdownTimer.tsx      # 5→1 countdown with tick sounds and color urgency
│   ├── ProgressiveLoader.tsx   # Model loading gate with child-friendly messages
│   ├── SessionSummary.tsx      # End celebration: confetti, stars, cumulative stats
│   ├── FeedbackOverlay.tsx     # Transient overlay: correct/timeout/tile-seen states
│   ├── ProgressPips.tsx        # Round progress indicator (filled/unfilled dots)
│   ├── CalibrationGuide.tsx    # One-time camera setup checklist
│   ├── ProblemDisplay.tsx      # "3 + 4 = ?" renderer
│   ├── MuteButton.tsx          # Fixed-position audio toggle
│   ├── MockNumpad.tsx          # Dev-only digit input for mock mode
│   └── DebugHUD.tsx            # Dev-only stats overlay (?debug=true)
│
├── cv/                         # Computer vision pipeline
│   ├── inference.worker.ts     # Web Worker: ONNX init, preprocess, infer, postprocess
│   ├── onnx-recognition.ts     # Worker lifecycle wrapper (busy flag, pending callbacks)
│   ├── recognition-service.ts  # Factory: createRecognitionBackend(mock|onnx)
│   ├── preprocessing.ts        # Letterbox resize, RGBA→planar RGB, normalization
│   ├── postprocessing.ts       # Confidence filter, NMS, unletterbox, L→R sort
│   ├── interpretation.ts       # Group digits → candidates, match answer
│   ├── temporal-buffer.ts      # 3-frame stability: TILE_SEEN → ANSWER_COMMITTED
│   ├── mock-recognition.ts     # Testing backend: emitDigit() without camera
│   ├── fixture-frame-source.ts # Image replay for regression testing
│   └── fixtures/
│       └── synthetic-tensor.ts # Fake YOLO output tensors for unit tests
│
├── camera/                     # Camera access and frame capture
│   ├── use-camera.ts           # getUserMedia hook, error handling, iOS recovery
│   ├── frame-capture.ts        # rVFC → canvas → ImageBitmap pipeline
│   └── camera-overlay.tsx      # Video element + optional debug bounding boxes
│
├── engine/                     # Game logic (pure functions, no React dependency)
│   ├── game-reducer.ts         # State machine: idle→countdown→scanning→success/timeout→end
│   ├── problem-generator.ts    # Addition/Subtraction modes, difficulty-scaled operands
│   ├── difficulty.ts           # Adaptive difficulty: promote after 3, demote after 2
│   └── session.ts              # Star calculation, cumulative stats, localStorage persistence
│
├── store/                      # Zustand state management
│   ├── game-store.ts           # Game state, CV integration, mute toggle
│   └── cv-store.ts             # Transient CV data (detections, latency, worker status)
│
├── hooks/                      # Shared React hooks
│   └── use-wake-lock.ts        # Screen Wake Lock API — prevents iPad sleep during gameplay
│
├── audio/                      # Sound system
│   ├── sound-manager.ts        # Howler.js config, AudioContext unlock, visibility resume
│   └── use-audio.ts            # Mute-aware playback hook
│
├── types/                      # TypeScript interfaces
│   ├── game.ts                 # Problem, GamePhase, GameAction, SessionData, GameMode
│   ├── cv.ts                   # DetectedDigit, BoundingBox, RecognitionService, VocabularyRegistry
│   └── worker-protocol.ts      # MainToWorker / WorkerToMain message types
│
└── utils/
    └── feature-flags.ts        # URL param parsing: ?recognition=mock, ?debug=true, ?overlay=boxes

public/
├── manifest.json               # PWA: standalone, landscape, cream background
├── _headers                    # Cloudflare Pages: CSP, camera permission, security headers
├── _redirects                  # SPA fallback: /* → /index.html 200
├── icons/                      # SVG icons (192, 512)
├── models/
│   └── digit-tiles.onnx        # Custom YOLO11n model (~11MB, FP32, 10 classes: digits 0–9)
└── sounds/                     # Dual-format audio (MP3 + M4A per sound)
    ├── correct.{mp3,m4a}
    ├── encourage.{mp3,m4a}
    ├── tile-pop.{mp3,m4a}
    ├── fanfare.{mp3,m4a}
    └── countdown-tick.{mp3,m4a}

e2e/
└── game-loop.spec.ts           # Playwright WebKit: full game loop with mock recognition

docs/
├── product-overview.md         # This file
├── decisions.md                # Append-only ADR log (5 decisions)
├── requirements.md             # Original PRD
├── research.md                 # Verified platform facts and constraints (~160 lines)
├── deep-analysis.md            # Extended CV pipeline audit (~160 lines)
└── model-training-guide.md     # Step-by-step YOLO training guide (~600 lines)
```

---

## Core concepts

### Game phases (discriminated union)

The game is a finite state machine with six phases, defined as a discriminated union on `phase.phase`:

1. **idle** — Welcome screen. "Let's Play!" button is live; "Spelling" and "Image Quiz" buttons are disabled (Coming Soon). Tapping "Let's Play!" atomically does four things: (a) unlocks AudioContext, (b) requests camera permission, (c) acquires screen wake lock, (d) starts the session. All four must happen in a single user gesture (iOS requirement).

2. **countdown** — 3-second countdown with tick sounds, spring-animated numbers, and color urgency (3=blue → 2=orange → 1=red). Generates the next problem on completion.

3. **scanning** — Active detection. Camera feeds frames to the CV pipeline. The problem displays with "?" as the answer. A dashed "Put your answer here" zone pulses until a tile is detected. Progress pips show the current round out of 15. 30-second timeout per round.

4. **success** — Correct answer detected. Stars awarded (3 on first attempt, 2 on second, 1 on third+). Celebration animation + confetti + chime with randomized pitch. Auto-advances after 3.5s.

5. **timeout** — 30 seconds expired without correct answer. Shows the correct answer for learning. Encouragement message (randomly chosen from a list — never punitive language). Auto-retries after 2s with the same problem and incremented attempt number.

6. **session-end** — 15 problems completed. Confetti from both edges. Staggered star animation. Cumulative stats from localStorage. "Play Again!" button. Session recorded to localStorage.

### Game state shape

```typescript
interface GameState {
  phase: GamePhase;                      // Discriminated union (6 variants)
  difficulty: DifficultyLevel;           // 1–5
  consecutiveCorrect: number;            // Tracked for difficulty promotion
  consecutiveWrong: number;              // Tracked for difficulty demotion
  rounds: readonly RoundResult[];        // All completed rounds in session
  currentRoundStartedAt: number | null;  // For duration calculation
  sessionStartedAt: number | null;
}
```

### Problem generation

Two `GameMode` implementations generate problems with difficulty-scaled operand ranges:

| Difficulty | Addition operand ranges | Subtraction operand ranges |
|---|---|---|
| Level 1 | 0–4 + 0–4 | 1–5 − 0–3 |
| Level 2 | 0–5 + 0–5 | 3–9 − 1–5 |
| Level 3 | 1–6 + 1–6 | 5–12 − 2–7 |
| Level 4 | 2–7 + 2–7 | 7–15 − 3–9 |
| Level 5 | 3–7 + 3–6 | 10–18 − 5–9 |

All answers are constrained to 0–9 (`MAX_ANSWER = 9`). This is a hard constraint: the child places one physical tile in front of the camera, and the CV system recognizes individual digits. Addition re-rolls if `left + right > 9`. Subtraction re-rolls if the result is negative or `> 9`. Note that the left operand in subtraction can exceed 9 (displayed on screen), but the answer must be single-digit (what the child places).

Difficulty adapts per-round: 3 consecutive correct promotes (max 5), 2 consecutive wrong demotes (min 1). Streaks cross-reset — a correct answer resets the wrong streak and vice versa.

### Detection pipeline stages

1. **Frame capture** — `requestVideoFrameCallback` fires when a new video frame is available. The frame is drawn to an `OffscreenCanvas`, then converted to `ImageBitmap` via `createImageBitmap(canvas)` (not `createImageBitmap(video)` — WebKit bug #234920 makes the direct path slow). The bitmap is transferred to the worker via `postMessage` with transferable list (zero-copy).

2. **Preprocessing** — In the worker. Letterbox resize maintains aspect ratio with gray padding (114/255, YOLO standard). RGBA pixel data from canvas is converted to planar RGB `[R₀…Rₙ, G₀…Gₙ, B₀…Bₙ]` normalized to [0, 1]. Pre-allocated `Float32Array` buffer (3 × 640² = 1,228,800 floats) avoids per-frame allocation.

3. **Inference** — ONNX `session.run()` with input tensor `[1, 3, 640, 640]`. Output: `[1, 4+numClasses, numAnchors]` in channel-major layout. For the current 10-class digit model: `[1, 14, 8400]`. A future 36-class model (digits + letters) would output `[1, 40, 8400]` — postprocessing handles this automatically.

4. **Postprocessing** — Iterates all 8400 anchors. For each: find max class score across channels 4–(4+numClasses-1), filter by confidence threshold (0.65). Decode center-form box to corner-form. Reverse letterbox padding and scale to recover original frame coordinates. Apply class-agnostic NMS (IoU 0.45). Sort left-to-right by x1.

5. **Interpretation** — Group adjacent detections into multi-digit candidates. Adjacency is determined by vertical alignment (`|centerY(a) - centerY(b)| < 0.5 × avgHeight`) and horizontal proximity (`gap < 1.0 × avgWidth`). Overlapping same-digit detections (anchor duplicates) are skipped. Each candidate gets a numeric value (e.g., adjacent "1" and "5" → value 15).

6. **Temporal stabilization** — 3-frame consecutive counter prevents false positives. Frame 1 emits `TILE_SEEN` (instant visual feedback: "I see 7!"). Frame 3 emits `ANSWER_COMMITTED` (game logic fires). Tolerates up to 2 consecutive missed frames before hard reset. At ~5fps, commitment takes ~600ms — long enough to filter noise, short enough to feel responsive.

### The model

The current model is a custom **YOLO11n** (Ultralytics nano variant) trained on 417 images of physical digit tiles.

| Property | Value |
|---|---|
| File | `public/models/digit-tiles.onnx` |
| Size | ~11MB (FP32) |
| Input | `[1, 3, 640, 640]` (RGB, normalized [0,1]) |
| Output | `[1, 14, 8400]` (channel-major: 4 box + 10 class scores × 8400 anchors) |
| Classes | 10 (digits 0–9, classId maps directly to digit value) |
| Training | Physical tiles → iPhone video → ffmpeg 2fps extraction → Roboflow annotation → Ultralytics training (50 epochs, MPS) |
| Metrics | mAP50: 0.887, mAP50-95: 0.877, Precision: 0.923, Recall: 0.876 |
| Export | `yolo export format=onnx imgsz=640 opset=17 half=False batch=1` |

Training is documented end-to-end in `docs/model-training-guide.md` (~600 lines, from printing physical tiles to deploying the model). The same pipeline applies to training a 36-class model (digits + letters) for the spelling game — add 26 letter classes to Roboflow, capture letter tile videos, retrain.

### Expanding to letters

The architecture was designed from day one to support more than digits. The expansion path:

**What's already model-agnostic:**
- `postprocessing.ts` reads `numClasses` from the output tensor — loops dynamically over however many class channels the model provides
- `inference.worker.ts` reads dims from the model output, not hardcoded
- `synthetic-tensor.ts` test factory accepts `numClasses` as a parameter and already has a test for 80-class models
- The `RecognitionService` interface is backend-agnostic
- The `VocabularyRegistry` interface (defined in `types/cv.ts`) exists as a seam for label definitions and ambiguity resolution

**What needs to change for letter recognition:**
- `types/cv.ts`: The `Digit` type is currently `0 | 1 | ... | 9` and `DetectedDigit` uses it — these need to become a more general detected-symbol type
- `interpretation.ts`: Grouping logic currently produces numeric values — needs to also produce string values for letter sequences
- `game-store.ts`: `processDetections` matches against `problem.answer` (a number) — needs to match against string answers for spelling
- `engine/problem-generator.ts`: New `GameMode` implementations for spelling (word prompts, letter-based validation)
- `types/game.ts`: `Problem` has `answer: number` — needs to support string answers
- `components/GameScreen.tsx` and `ProblemDisplay.tsx`: UI for displaying word prompts vs arithmetic
- Training: New YOLO model with 36 classes (or more, to handle uppercase/lowercase)

**What's architecturally clean about this expansion:**
- The `GameMode` interface already supports pluggable generate/validate functions
- The `TapToStart` screen already has disabled "Spelling" and "Image Quiz" buttons ready to be wired up
- The `deep-analysis.md` audit confirmed this expansion is feasible with "Medium" effort

---

## Key patterns and conventions

### Code organization
- **Co-located tests:** `foo.ts` → `foo.test.ts` in the same directory
- **Named exports only:** No default exports anywhere in the codebase
- **Explicit return types** on all public functions
- **Functional/immutable patterns:** Game reducer returns new state objects. Difficulty module returns new state. Temporal buffer is a closure with internal state but immutable external API.

### State management patterns
- **Selectors for React:** `const phase = useGameStore(selectPhase)` — fine-grained subscriptions prevent unnecessary re-renders. Never subscribe to the whole store.
- **Direct access for non-React:** `useGameStore.getState().gameState.phase` — used in CV pipeline callbacks running outside React's render cycle
- **Transient subscription:** `useCvStore.subscribe(callback)` — debug components that need raw detection data at inference rate

### Worker protocol
All `postMessage` calls use `satisfies MainToWorker` / `satisfies WorkerToMain` for compile-time type safety (no runtime guards). The protocol is a discriminated union on `type`:
- `MainToWorker`: `"init"` | `"infer"` | `"terminate"`
- `WorkerToMain`: `"ready"` | `"detections"` | `"error"` (with `fatal` flag)

### Phase narrowing
Game logic always switches on the `phase.phase` discriminant before accessing phase-specific fields:
```typescript
if (state.phase.phase !== "scanning") return state;
const { problem, attemptNumber } = state.phase; // TypeScript knows these exist
```

### Frame ownership
`ImageBitmap` holds GPU memory that won't be garbage collected. Single consumer owns the bitmap and calls `.close()`. Multiple consumers: bitmap cloned per listener, original closed. Zero consumers: closed immediately. Worker always closes in `finally` block.

### Animation patterns
- **Spring configs are intentional:** Buttons use `stiffness: 400, damping: 17` (snappy). Celebrations use `stiffness: 300, damping: 15` (bouncier). Tile detection pop uses `stiffness: 400, damping: 10` (very bouncy).
- **Phase fade transitions:** `AnimatePresence mode="wait"` + `m.div` with 150ms opacity-only fades (ADR-005). Duration must not exceed 200ms — longer exits break CountdownTimer's `setInterval` timing.
- **Reduced motion:** All animations check `prefers-reduced-motion` via `MotionConfig reducedMotion="user"`. Confetti has `disableForReducedMotion: true`. FeedbackOverlay falls back to fade-only.

### Audio patterns
- **Pitch variation:** Correct answer chime plays at randomized rate (`0.9 + Math.random() * 0.2`) so consecutive correct answers don't sound identical
- **Lazy Howl instantiation:** Each sound created on first access and cached in a `Map<SoundName, Howl>`. `preloadSounds()` triggers all during the start gesture.
- **iOS AudioContext handling:** `Howler.autoSuspend = false` must be set before any Howl instance. `setupVisibilityResume()` handles iOS backgrounding with 200ms delay on `ctx.resume()`.

### Error handling
- Camera errors mapped to child-friendly messages (no technical jargon)
- localStorage operations wrapped in try/catch with sensible defaults
- ONNX worker errors distinguished as fatal (model load failure → show error UI) vs. non-fatal (single inference failure → return empty result)
- ProgressiveLoader offers "Try Again" (page reload) and "Play Without Camera" (mock mode fallback)
- Wake lock acquisition is best-effort — failure is silent

### Feature flags (URL parameters, cached at module level)
- `?recognition=mock` — On-screen numpad instead of camera CV
- `?debug=true` — Stats overlay showing FPS, latency, detections, temporal state, pipeline conversion rates
- `?overlay=boxes` — Bounding box visualization on camera feed

---

## Data layer

No database. All persistence is localStorage with graceful degradation:

| Key | Shape | Purpose |
|---|---|---|
| `superbuilders-cumulative` | `{ totalStars: number, sessionsPlayed: number }` | Lifetime stats across sessions |
| `superbuilders-mute` | `"true" \| "false"` | Audio preference |
| `superbuilders_calibrated` | `"true"` | First-run camera setup completed |

All reads/writes are wrapped in try/catch. If localStorage is unavailable (private browsing, quota exceeded), the app continues with defaults (0 stars, unmuted, show calibration).

SessionSummary guards against React StrictMode double-invoke using a module-level `Set` of session timestamps. Without this, `recordSession()` would fire twice, doubling the cumulative stats.

---

## Environment and config

### Running locally
```bash
pnpm install          # Install dependencies
pnpm dev              # HTTPS dev server (mkcert auto-generates certs)
```
HTTPS is required for `getUserMedia` camera access. The `vite-plugin-mkcert` plugin handles certificate generation automatically. Set `NO_HTTPS=true` to disable (only useful for E2E tests in mock mode).

### Tunnel for iPad testing
```bash
cloudflared tunnel --url https://localhost:5173  # In a second terminal
```
Opens a public HTTPS URL. No account needed. Append `?debug=true` on the device for the stats overlay.

### Required for deployment
- **Cloudflare Pages** project
- **GitHub Secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- CI/CD: GitHub Actions — quality gate → E2E → deploy pipeline

### Build configuration highlights
- `optimizeDeps.exclude: ["onnxruntime-web"]` — ONNX uses WASM directly, skip esbuild optimization
- `assetsInclude: ["**/*.onnx"]` — treat model files as static assets
- `vite-plugin-static-copy` — copies ONNX WASM runtime files to dist
- `worker.format: "es"` — Web Worker output as ES module
- PWA service worker: `CacheFirst` for `.onnx` files (1-year TTL, 30MB max per entry)

### TypeScript strictness
Every strict flag is enabled: `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`, `forceConsistentCasingInFileNames`. Target: ES2022.

---

## Testing

### Unit tests (Vitest, 17 files, ~2600 lines)

**Game engine (heavy coverage):**
- `game-reducer.test.ts` — All phase transitions, invalid action handling, session completion, auto-end at MAX_PROBLEMS
- `difficulty.test.ts` — Promotion/demotion thresholds, boundary levels, streak resets
- `problem-generator.test.ts` — Validity across all difficulty levels, no negative results, answer ≤ 9
- `session.test.ts` — Star calculation, localStorage round-trip, corrupt data recovery

**CV pipeline (heavy coverage):**
- `postprocessing.test.ts` — IoU calculation, NMS, confidence filtering, letterbox math, L→R sorting, 80-class model compatibility
- `preprocessing.test.ts` — Letterbox aspect ratios, RGBA→planar RGB, normalization
- `interpretation.test.ts` — Digit grouping, spatial constraints, answer matching
- `temporal-buffer.test.ts` — 3-frame counting, miss-streak tolerance, reset on mismatch
- `pipeline-regression.test.ts` — Full E2E pipeline integration: synthetic tensor → postProcess → groupDetections → matchAnswer → temporal buffer. Covers all 10 digits, two-tile answers, 6/9 distinction, NMS dedup, confidence filtering, letterbox unscaling.
- `mock-recognition.test.ts` — Mock service lifecycle, detection shape validation
- `fixture-frame-source.test.ts` — Image replay, listener management

**State management:**
- `game-store.test.ts` — `tileSeen` lifecycle, `processDetections()` result shape, wrong answer handling
- `cv-store.test.ts` — Pipeline stats, detection counters, reset behavior

**Camera, hooks & utilities:**
- `frame-capture.test.ts`, `use-camera.test.ts`, `use-wake-lock.test.ts`, `feature-flags.test.ts`

**Not tested (by design):**
- Audio playback (Howler.js internals, tested manually)
- Motion/confetti animations (visual, not logic)
- Real ONNX inference (requires model + WASM runtime — tested manually on device)
- Real camera streams (OS-level, covered by E2E)

### E2E test (Playwright WebKit, 1 file)

`e2e/game-loop.spec.ts` — Full game loop with mock recognition: navigate → start → countdown → scanning → press correct digit 3× (satisfies temporal buffer) → verify celebration → complete second round. WebKit engine only (matches iPad Safari target).

### Running tests
```bash
pnpm test             # Unit tests (Vitest)
pnpm test:watch       # Unit tests in watch mode
pnpm test:e2e         # E2E (Playwright WebKit, requires pnpm build first)
```

---

## Important decisions and tradeoffs

### WASM-only inference (no WebGPU fallback)
Safari's WebGPU for ORT crashes (WebKit bug #26827). Rather than building a fallback chain (try WebGPU → fall back to WASM), the codebase hardcodes `executionProviders: ["wasm"]`. This is simpler and avoids the 2–5 second crash-and-retry penalty. The `RecognitionService` interface preserves the WebGPU seam for when the upstream fix lands.

### Single-threaded WASM (numThreads: 1)
Multi-threaded WASM requires `SharedArrayBuffer`, which requires `COOP/COEP` headers. These headers break Google Fonts CDN loading and complicate deployment. Inference latency is acceptable at single-thread.

### Canvas-based frame capture (not ImageCapture API)
Safari doesn't support `ImageCapture.grabFrame()` (the claim that "Safari 18.4 added ImageCapture" was a hallucination caught in research). The codebase uses `drawImage(video)` → `createImageBitmap(canvas)`. Direct `createImageBitmap(video)` is slow in WebKit (bug #234920).

### requestVideoFrameCallback over setInterval
`requestVideoFrameCallback` fires only when a new video frame is available, not on a fixed timer. Prevents processing the same frame twice and naturally adapts to the video stream's actual frame rate.

### Temporal buffer (3 frames, not confidence threshold)
A single high-confidence detection could be a false positive. Requiring 3 consecutive frames provides temporal stability. The `TILE_SEEN` event on frame 1 gives instant feedback so the child doesn't think the system is unresponsive during the 3-frame wait.

### Child-friendly language as an immutable rule
The codebase has an explicit rule (`.claude/rules/immutable.md`) that all game feedback must be child-friendly — no negative or punitive language. This is treated as an architectural invariant, not a UI preference. Timeout messages: "Keep trying!", "You're so close!". Success messages: "Great job!", "Amazing!".

### Phase fade transitions ≤200ms (ADR-005)
`AnimatePresence mode="wait"` keeps exiting components mounted during exit. CountdownTimer owns a `setInterval` that reads phase from the store — exceeding ~200ms could cause stale ticks. The 200ms ceiling is a hard constraint.

### No flip augmentation in training data
Horizontal/vertical flips in data augmentation create invalid examples. A flipped "3" is not a "3". Rotation is capped at ±10°. This is a domain-specific constraint documented in `model-training-guide.md`.

### PWA with CacheFirst for models
The ~11MB ONNX model is cached with a 1-year TTL. Subsequent visits load from cache instantly. Model updates require a service worker update cycle (`registerType: "autoUpdate"`).

### Dual audio format (MP3 + M4A)
Every sound exists in both formats. Howler.js selects the best for the browser. M4A (AAC) is Safari's preferred codec. MP3 is the universal fallback. Doubles audio asset size (~500KB total) but guarantees playback everywhere.

---

## Known issues and planned improvements

### Must fix (catalogued in deep-analysis.md)
| ID | Severity | File | Issue |
|----|----------|------|-------|
| S5 | High | `cv/mock-recognition.ts` | `recognize()` doesn't call `frame.close()` — ImageBitmap leak in mock mode |
| N3 | High | `cv/postprocessing.ts:198` | `d.classId as Digit` has no bounds check — a model producing classId > 9 silently passes |

### Should fix
| ID | Severity | File | Issue |
|----|----------|------|-------|
| BCI-M1 | Medium | `vite.config.ts` | Sound files not in SW precache `globPatterns` — first offline session has no audio |
| BCI-M3 | Medium | `tsconfig.app.json` | `@/*` path alias in TS but not in Vite `resolve.alias` — first `@/` import would 404 |
| BCI-L1 | Low | `e2e/game-loop.spec.ts` | Element selectors use Tailwind classes instead of `data-testid` — fragile |

### Active risks
| Risk | Status | Detail |
|---|---|---|
| 6/9 confusion | Active | Depends on training data with underlined tiles |
| Small validation set | Active | Only 25 val / 14 test images — metrics could be optimistic |
| Camera lighting variance | Active | No adaptive preprocessing — recognition degrades in poor lighting |
| iPad thermal throttling | Active | 4fps cap keeps CPU ~90% idle, but not stress-tested for long sessions |

---

## Gotchas

### iOS Safari specifics
- **The start gesture is a 4-in-1 atomic action.** "Let's Play!" simultaneously (a) unlocks AudioContext, (b) requests camera, (c) acquires wake lock, (d) starts session. All four must happen in a single user gesture — splitting them would require separate taps and iOS would block the deferred ones.
- **AudioContext goes to `"interrupted"` state** (not `"suspended"`) when the app backgrounds. The visibility change handler checks for both states and resumes with a 200ms delay.
- **Camera streams die on background.** iOS kills `getUserMedia` streams when focus is lost. The hook detects `track.readyState === "ended"` and sets status to `"interrupted"`. Camera recovery requires a new user gesture — you cannot call `getUserMedia` from a `visibilitychange` handler.
- **Wake lock also dies on background.** Re-acquired on `visibilitychange`. Must be initially acquired in a user gesture.
- **`Howler.autoSuspend = false` must be set before any Howl instance.** This is a module-level side effect in `sound-manager.ts`. Setting it after causes audio dropouts.

### ONNX Runtime Web specifics
- **WASM paths must be absolute** (`ort.env.wasm.wasmPaths = "/"`). Relative paths break inside Web Workers because the worker's base URL differs from the main page.
- **`optimizeDeps.exclude: ["onnxruntime-web"]`** is required in Vite config. Without it, esbuild tries to bundle the WASM loader and fails.
- **First inference is slow** (2–5 seconds) due to WASM compilation. Subsequent inferences are 40–80ms. ProgressiveLoader hides this behind child-friendly loading messages.
- **Output tensor is channel-major**, not anchor-major. To read class scores for anchor `i`: `output[(4 + classId) * numAnchors + i]`, not `output[i * numChannels + 4 + classId]`.

### Frame capture specifics
- **Always call `bitmap.close()`** — even on error, even when skipping frames. `ImageBitmap` holds GPU memory that won't be garbage collected.
- **Never use `createImageBitmap(video)` directly** — use the canvas intermediate step (WebKit bug #234920).
- **The capture canvas is resized, never recreated.** Recreating causes memory leaks in some WebKit versions. Set `width = 0; height = 0` on cleanup.

### Game state specifics
- **The game reducer ignores invalid transitions.** Dispatching `ANSWER_CORRECT` during `"idle"` phase is a no-op, not an error. This is intentional — the CV pipeline might fire a detection result after a phase transition has already occurred.
- **Phase exit animations must stay ≤200ms (ADR-005).** CountdownTimer's `setInterval` reads phase from the store. The timer self-clears and the reducer guards against stale ticks, but only within this timing budget.
- **SessionSummary has a StrictMode guard.** Module-level `Set` prevents `recordSession()` from double-firing during React's StrictMode double-invoke.

### Build and deployment
- **ONNX WASM files must be statically copied** — they can't be imported as ES modules. `vite-plugin-static-copy` handles this.
- **PWA manifest is custom** (`public/manifest.json`), not auto-generated by `vite-plugin-pwa`. `manifest: false` in the plugin config prevents conflicts.
- **E2E tests use `NO_HTTPS=true pnpm preview`** — Playwright WebKit doesn't support self-signed certificates well. Mock mode doesn't need camera, so HTTP is fine.

### Expansion to letters
- **`Digit` type constraint.** The `Digit` type union (`0 | 1 | ... | 9`) and `DetectedDigit` type are baked into the CV pipeline types. A letter expansion requires widening these types or creating parallel types.
- **`d.classId as Digit`** cast in `postprocessing.ts:198` will silently misinterpret classIds 10–35 (letters) as digits. The bounds check bug (N3 above) becomes a blocking issue for multi-class models.
- **`interpretation.ts` numeric grouping.** The grouping logic converts adjacent detections to numeric values. Letters need string concatenation, not numeric interpretation.
- **`game-store.ts` answer matching.** `matchAnswer(candidates, problem.answer)` compares numeric values. Spelling answers need string comparison.
