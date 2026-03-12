# Product Overview

## What this is

Superbuilders is an OSMO-style math game that uses real-time computer vision to recognize physical number tiles placed in front of an iPad camera. Children ages 5–8 solve arithmetic problems (addition and subtraction) by placing physical tiles on a play surface, and the app detects the answer through the camera feed, providing instant celebratory feedback. The entire CV pipeline — from frame capture to YOLO inference — runs on-device in the browser with no cloud dependency.

## Why it exists

The project was built as a week-long challenge to replicate the core experience of OSMO's number tile recognition game using only browser technologies. The key constraint: everything must run client-side on an iPad in Safari, with no backend server. This means computer vision inference happens in-browser via WebAssembly, audio must work within iOS's restrictive autoplay policies, and the camera must be accessed through WebRTC — all inside a PWA that can be installed and used offline.

---

## Stack

### Core technologies and why they were chosen

| Technology | Version | Role | Why this over alternatives |
|---|---|---|---|
| **React** | 19.2 | UI framework | JSX transform, concurrent features, ecosystem maturity. No SSR needed (pure SPA), so Next.js was explicitly rejected (ADR-001). |
| **Vite** | 7.3 | Build tool + dev server | Sub-second HMR, native ESM, first-class WASM support. Critical for the dev loop when iterating on CV pipeline behavior. |
| **TypeScript** | 5.9 | Type safety | Strictest possible config: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `isolatedModules`. The CV pipeline has complex data shapes (tensors, bounding boxes, detection results) where type safety prevents entire classes of bugs. |
| **ONNX Runtime Web** | 1.24.3 | ML inference | WASM execution provider only. WebGPU was the original plan but Safari crashes on it (WebKit bug #26827, still unresolved as of March 2026). WASM with SIMD gives 40–80ms inference at 640x640. TensorFlow.js was considered but ONNX has better model portability from the Ultralytics/YOLO training ecosystem. |
| **Zustand** | 5.x | State management | Two stores: game state (reducer-driven) and CV state (transient, updated at inference rate). Zustand was chosen over Redux because it supports direct `getState()` calls from the CV pipeline without requiring React context — critical for the frame processing callback that runs outside React's render cycle (ADR-003). |
| **Motion** | 12.35 | Animation | `LazyMotion` + `domAnimation` features for tree-shaking. Spring physics for child-friendly bounce animations. Built-in `AnimatePresence` for phase transitions. Respects `prefers-reduced-motion`. |
| **Howler.js** | 2.2.4 | Audio | Handles iOS AudioContext suspension/resumption automatically. Sprite-based playback. Dual-format support (MP3 + M4A) for cross-browser compatibility. `autoSuspend: false` is mandatory — set before any Howl instance creation. |
| **canvas-confetti** | 1.9.4 | Celebration effects | Lightweight, zero-dependency particle system. Fires from both screen edges on correct answers and session completion. |
| **Tailwind CSS** | 4.2 | Styling | v4 uses `@theme` in CSS directly (no config file). Integrated via `@tailwindcss/vite` plugin — no PostCSS needed. Custom color palette (cream, gold, success green) designed for child-friendly aesthetics. |
| **Biome** | 2.x | Linter + formatter | Single tool replaces ESLint + Prettier. ~20x faster. `domains.react: "all"` enables full React rule set including hooks linting (ADR-004). Tab indentation. |
| **Playwright** | 1.58 | E2E testing | WebKit engine only — matches the iPad Safari target. Tests use mock recognition mode to avoid camera permission dialogs. |
| **Vitest** | 4.x | Unit testing | Co-located tests (`foo.ts` → `foo.test.ts`). happy-dom environment. 16 test files covering game logic, CV pipeline math, pipeline regression, and state transitions. |
| **Cloudflare Pages** | — | Hosting | Static site deployment. HTTPS guaranteed (required for camera API). Workbox service worker caches WASM runtime + ONNX model for offline use. |

### Key dependency decisions and tradeoffs

**ONNX over TensorFlow.js:** ONNX Runtime Web's WASM backend is more predictable on Safari than TF.js's WebGL backend. The tradeoff is that ONNX requires explicit WASM file management (static copy of `.wasm` and `.mjs` files via vite-plugin-static-copy) and `optimizeDeps.exclude` in Vite config. The benefit is seamless model portability — train with Ultralytics YOLO, export to ONNX, drop into the browser.

**WASM over WebGPU:** WebGPU would be 2–5x faster, but Safari's implementation crashes (WebKit bug #26827). Single-threaded WASM with SIMD is the only reliable execution provider. `numThreads: 1` avoids the need for `SharedArrayBuffer` and the `COOP/COEP` headers that would require. Tradeoff: slower inference (~40–80ms vs potential ~10–20ms with WebGPU), but reliable.

**Zustand over Redux:** The CV pipeline runs in a `requestVideoFrameCallback` loop outside React's lifecycle. Redux would require dispatching through React context or importing the store directly (breaking encapsulation). Zustand's `getState()` and `subscribe()` work anywhere — frame callbacks, Web Workers, initialization code. Tradeoff: less structured than Redux's action/reducer pattern, but the game store uses a dedicated reducer function anyway.

**Howler.js over Web Audio API directly:** iOS suspends AudioContext when the app backgrounds and uses a non-standard `"interrupted"` state (not just `"suspended"`). Howler handles format negotiation and provides a clean API. The `setupVisibilityResume()` function adds a 200ms-delayed `ctx.resume()` on visibility change to handle iOS's quirky timing.

**No SSR, no backend:** The entire app is a static SPA. No database — localStorage stores cumulative stars, session count, mute preference, and calibration status. This was a deliberate constraint: the game must work offline after initial load, and there's no user authentication or cloud sync to build.

---

## Architecture

### High-level data flow

```
Physical tiles on play surface
        │
        ▼
iPad camera (720p, rear-facing)
        │
        ▼
getUserMedia → <video> element (30fps native preview)
        │
        ▼
requestVideoFrameCallback (4–10fps capture rate)
        │
        ▼
drawImage(video) → OffscreenCanvas → createImageBitmap(canvas)
        │
        ▼ [ImageBitmap transferred via postMessage]
Web Worker (inference.worker.ts)
  ├─ Letterbox resize to 640×640
  ├─ RGBA → Planar RGB normalization
  ├─ ONNX Runtime session.run()
  ├─ Postprocess: confidence filter → NMS → unletterbox → sort L→R
  └─ Return DetectedDigit[] + latencyMs
        │
        ▼
Main thread
  ├─ Update cv-store (raw detections, latency, debug info)
  ├─ Motion gate: avg confidence ≥ 0.40? (skip unstable frames)
  ├─ Interpretation: group adjacent digits → candidates
  ├─ Match answer: does any candidate equal the expected answer?
  ├─ Temporal buffer: same answer 3 consecutive frames?
  │     ├─ Frame 1: TILE_SEEN → visual feedback
  │     └─ Frame 3: ANSWER_COMMITTED → correct answer!
  └─ Game store: dispatch ANSWER_CORRECT, play sound, award stars
        │
        ▼
React UI: celebration animation, confetti, next problem
```

### Why the architecture is split this way

**Web Worker isolation:** ONNX inference takes 40–80ms per frame. Running it on the main thread would cause visible UI jank during animations. The worker receives `ImageBitmap` objects via `postMessage` transferable (zero-copy GPU transfer), runs inference, and posts results back. The worker uses pre-allocated `Float32Array` and `OffscreenCanvas` buffers — no garbage collection pressure per frame.

**Busy-flag frame dropping:** The worker sets `isInferring = true` during inference. If a new frame arrives while busy, it's silently dropped (bitmap closed immediately). This prevents frame queue buildup — the system always processes the most recent available frame, not a stale queue.

**Two Zustand stores:** `game-store` holds game logic (phase, problems, scores, difficulty). `cv-store` holds transient CV data (raw detections, latency, worker status). They're separate because CV data updates at 4–10fps — if it lived in the game store, every component subscribing to game state would re-render at inference rate. The cv-store is only consumed by the DebugHUD and camera overlay.

**Temporal buffer:** Raw CV detections are noisy. A single frame might see a "7" that's actually a hand passing over. The temporal buffer requires 3 consecutive frames with the same matched answer before committing. At ~5fps, this is ~600ms of stability — long enough to filter noise, short enough to feel responsive. The buffer emits `TILE_SEEN` on frame 1 (instant visual feedback: "I see a tile!") and `ANSWER_COMMITTED` on frame 3 (game logic fires).

**Motion gate:** Before detections reach the temporal buffer, they pass through a confidence check. If the average confidence of all detections in a frame is below 0.40, the frame is skipped entirely. This filters out motion blur and partial occlusion (e.g., a hand placing a tile). The detections still update cv-store for debug visualization, but they don't advance the temporal counter.

---

## Directory structure

```
src/
├── main.tsx                    # React entry point (StrictMode + global CSS)
├── index.css                   # Tailwind @theme: colors, fonts, animations
├── vite-env.d.ts               # Vite client types
│
├── components/                 # React UI layer (12 components)
│   ├── App.tsx                 # Root orchestrator: CV pipeline wiring, phase routing
│   ├── GameScreen.tsx          # Active game: problem display, tile detection, feedback
│   ├── TapToStart.tsx          # Idle screen: audio unlock + camera request in one gesture
│   ├── CountdownTimer.tsx      # 3-2-1 countdown with tick sounds
│   ├── ProgressiveLoader.tsx   # Model loading gate with child-friendly messages
│   ├── SessionSummary.tsx      # End celebration: confetti, stars, cumulative stats
│   ├── FeedbackOverlay.tsx     # Transient overlay: correct/timeout/tile-seen states
│   ├── CalibrationGuide.tsx    # One-time camera setup checklist
│   ├── ProblemDisplay.tsx      # "3 + 4 = ?" renderer
│   ├── MuteButton.tsx          # Fixed-position audio toggle
│   ├── MockNumpad.tsx          # Dev-only digit input for mock mode
│   └── DebugHUD.tsx            # Dev-only stats overlay (?debug=true)
│
├── cv/                         # Computer vision pipeline
│   ├── inference.worker.ts     # Web Worker: ONNX init, preprocess, infer, postprocess
│   ├── onnx-recognition.ts     # Worker lifecycle wrapper (OnnxRecognitionService)
│   ├── recognition-service.ts  # Factory: createRecognitionBackend(mock|onnx)
│   ├── preprocessing.ts        # Letterbox resize, RGBA→planar RGB, normalization
│   ├── postprocessing.ts       # Confidence filter, NMS, unletterbox, L→R sort
│   ├── interpretation.ts       # Group digits → candidates, match answer
│   ├── temporal-buffer.ts      # 3-frame stability: TILE_SEEN → ANSWER_COMMITTED
│   ├── motion-gate.ts          # Confidence-based frame stability filter
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
├── audio/                      # Sound system
│   ├── sound-manager.ts        # Howler.js config, AudioContext unlock, visibility resume
│   └── use-audio.ts            # Mute-aware playback hook
│
├── types/                      # TypeScript interfaces
│   ├── game.ts                 # Problem, GamePhase, GameAction, SessionData, GameMode
│   ├── cv.ts                   # DetectedDigit, BoundingBox, RecognitionService, FrameSource
│   └── worker-protocol.ts      # MainToWorker / WorkerToMain message types
│
└── utils/
    └── feature-flags.ts        # URL param parsing: ?recognition=mock, ?debug=true, ?overlay=boxes

public/
├── manifest.json               # PWA: standalone, landscape, cream background
├── _headers                    # Cloudflare Pages headers
├── _redirects                  # Cloudflare Pages redirects
├── icons/                      # SVG icons (192, 512)
├── models/
│   └── digit-tiles.onnx        # Custom YOLO11n model (~11MB, FP32, 10-class digit detector)
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
├── decisions.md                # Append-only ADR log
├── requirements.md             # Original PRD
├── research.md                 # Comprehensive technical research (~650 lines)
└── model-training-guide.md     # Step-by-step YOLO training guide (~600 lines)
```

---

## Core concepts

### Game phases (discriminated union)

The game is a finite state machine with six phases:

1. **idle** — Welcome screen. User taps "Let's Play!" which atomically unlocks AudioContext, requests camera permission, and starts the session. All three must happen in a single user gesture (iOS requirement).

2. **countdown** — 3-second countdown with tick sounds and spring-animated numbers. Generates the next problem.

3. **scanning** — Active detection. Camera feeds frames to the CV pipeline. The problem displays with "?" as the answer. 30-second timeout per round.

4. **success** — Correct answer detected. Stars awarded (3/2/1 based on attempt number). Celebration animation + confetti. Auto-advances after 1.5s.

5. **timeout** — 30 seconds expired without correct answer. Shows the answer for learning. Encouragement message. Auto-retries after 2s with the same problem (incremented attempt number).

6. **session-end** — 15 problems completed. Confetti from both edges. Staggered star animation. Cumulative stats from localStorage. "Play Again!" button.

### Problem generation

Two `GameMode` implementations (Addition, Subtraction) generate problems with difficulty-scaled operand ranges:

| Difficulty | Addition range | Subtraction range | Answer range |
|---|---|---|---|
| Level 1 | 0–5 + 0–4 | 1–5 − 0–3 | 0–9 |
| Level 2 | 1–7 + 1–5 | 3–9 − 1–5 | 0–12 |
| Level 3 | 2–9 + 2–8 | 5–12 − 2–7 | 4–17 |
| Level 4 | 3–9 + 3–9 | 7–15 − 3–9 | 6–18 |
| Level 5 | 5–9 + 5–9 | 10–18 − 5–9 | 1–19 |

Difficulty adapts per-round: 3 consecutive correct promotes (max 5), 2 consecutive wrong demotes (min 1).

### Detection pipeline stages

1. **Preprocessing** — Letterbox resize maintains aspect ratio (gray padding at YOLO's standard value of 114/255). RGBA pixel data converted to planar RGB `[R₀…Rₙ, G₀…Gₙ, B₀…Bₙ]` normalized to [0, 1].

2. **Inference** — ONNX session.run() with input tensor `[1, 3, 640, 640]`. Output: `[1, 4+numClasses, numAnchors]` in channel-major layout.

3. **Postprocessing** — Iterate anchors, find max class score, filter by confidence threshold (0.65). Decode center-form boxes to corner-form. Remove letterbox padding. Apply NMS (IoU threshold 0.45). Sort left-to-right by x1.

4. **Interpretation** — Group adjacent detections into multi-digit candidates (e.g., a "1" tile next to a "3" tile → candidate value 13). Vertical alignment and horizontal proximity thresholds determine grouping.

5. **Temporal stabilization** — 3-frame consecutive counter prevents false positives. Frame 1 emits `TILE_SEEN` (instant visual feedback). Frame 3 emits `ANSWER_COMMITTED` (game logic fires).

6. **Motion gate** — Average confidence below 0.40 skips the temporal buffer entirely. Acts as a proxy for motion blur and hand occlusion.

---

## Key patterns and conventions

### Code organization
- **Co-located tests:** `foo.ts` → `foo.test.ts` in the same directory
- **Named exports only:** No default exports anywhere in the codebase
- **Explicit return types** on all public functions
- **Functional/immutable patterns:** Game reducer returns new state objects. Difficulty state is value-type. Temporal buffer is a closure with internal state but immutable external interface.

### State management patterns
- **Selectors for React:** `const phase = useGameStore(selectPhase)` — fine-grained subscriptions prevent unnecessary re-renders
- **Direct access for non-React:** `useGameStore.getState().gameState.phase` — used in CV pipeline callbacks
- **Transient subscription:** `useCvStore.subscribe(callback)` — used in debug components that need raw detection data at inference rate

### Animation patterns
- **Spring configs are intentional:** Buttons use `stiffness: 400, damping: 17` (snappy). Celebrations use `stiffness: 300, damping: 15` (bouncier). Tile detection pop uses `stiffness: 400, damping: 10` (very bouncy).
- **`AnimatePresence` with `mode="wait"`** for sequential phase transitions (countdown numbers)
- **`whileTap={{ scale: 0.9 }}`** on all interactive buttons for tactile feedback
- **Reduced motion:** All animations check `prefers-reduced-motion`. Confetti has `disableForReducedMotion: true`. FeedbackOverlay falls back to fade-only.

### Error handling
- Camera errors mapped to child-friendly messages (no technical jargon)
- localStorage operations wrapped in try/catch with sensible defaults
- ONNX worker errors distinguished as fatal (model load failure) vs. non-fatal (single inference failure)
- ProgressiveLoader offers "Try Again" (page reload) and "Play Without Camera" (mock mode fallback)

### Feature flags (URL parameters)
- `?recognition=mock` — Keyboard numpad instead of camera CV
- `?debug=true` — Stats overlay showing FPS, latency, detections, temporal count
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

---

## Environment and config

### Running locally
```bash
pnpm install          # Install dependencies
pnpm dev              # HTTPS dev server (mkcert auto-generates certs)
```
HTTPS is required for `getUserMedia` camera access. The `vite-plugin-mkcert` plugin handles certificate generation automatically.

### Required for deployment
- **Cloudflare Pages** project: `superbuilders-numbergame`
- **GitHub Secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- CI/CD: GitHub Actions (`.github/workflows/ci.yml`) — quality → E2E → deploy pipeline

### Build configuration highlights
- `optimizeDeps.exclude: ["onnxruntime-web"]` — ONNX uses WASM directly, skip esbuild optimization
- `assetsInclude: ["**/*.onnx"]` — treat model files as static assets
- `vite-plugin-static-copy` — copies ONNX WASM runtime files (`ort-wasm-simd-threaded.{wasm,mjs}`) to dist
- `worker.format: "es"` — Web Worker output as ES module
- PWA service worker: `CacheFirst` strategy for `.onnx` files (1-year TTL, 30MB max per entry)

### TypeScript strictness
Every strict flag is enabled: `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`, `forceConsistentCasingInFileNames`. Target: ES2022.

---

## Testing

### Unit tests (Vitest, 14 files, ~1,750 lines)

**Game engine (heavy coverage):**
- `game-reducer.test.ts` — All phase transitions, invalid action handling, session completion
- `difficulty.test.ts` — Promotion/demotion thresholds, boundary levels
- `problem-generator.test.ts` — Validity across all difficulty levels, no negative results
- `session.test.ts` — Star calculation, localStorage round-trip, corrupt data recovery

**CV pipeline (heavy coverage):**
- `postprocessing.test.ts` — IoU calculation, NMS, confidence filtering, letterbox math, L→R sorting
- `preprocessing.test.ts` — Letterbox aspect ratios, RGBA→planar RGB, normalization
- `interpretation.test.ts` — Digit grouping, spatial constraints, answer matching
- `temporal-buffer.test.ts` — 3-frame counting, reset on mismatch, event emission
- `motion-gate.test.ts` — Confidence threshold, empty detection handling
- `mock-recognition.test.ts` — Mock service lifecycle, detection shape validation
- `fixture-frame-source.test.ts` — Image replay, listener management, cleanup

**Camera & utilities:**
- `frame-capture.test.ts` — Initial state, listener management, stats snapshots
- `use-camera.test.ts` — Type validation (CameraStatus enum shape)
- `feature-flags.test.ts` — URL parameter parsing, defaults, truthy values

**Not tested (by design):**
- Audio playback (Howler.js internals)
- Motion/confetti animations (visual, not logic)
- Real ONNX inference (requires model + WASM runtime)
- Real camera streams (OS-level, tested via E2E)

### E2E test (Playwright WebKit, 1 file)

`e2e/game-loop.spec.ts` — Full game loop with mock recognition:
1. Navigate to `/?recognition=mock`
2. Click "Let's Play!"
3. Wait for countdown → scanning
4. Parse problem from DOM, calculate answer
5. Press digit key 3 times (satisfies temporal buffer)
6. Verify celebration message appears
7. Complete second round identically

**Why WebKit only:** The target device is iPad Safari. Testing in Chromium or Firefox would give false confidence about Safari-specific issues.

### Running tests
```bash
pnpm test             # Unit tests (Vitest)
pnpm test:watch       # Unit tests in watch mode
pnpm test:e2e         # E2E (Playwright WebKit, requires `pnpm build` first)
```

---

## Important decisions and tradeoffs

### WASM-only inference (no WebGPU fallback)

The research phase discovered that Safari's WebGPU implementation for ONNX Runtime crashes (WebKit bug #26827). Rather than building a fallback chain (try WebGPU → fall back to WASM), the codebase hardcodes `executionProviders: ["wasm"]`. This is simpler, more predictable, and avoids the 2–5 second crash-and-retry penalty. The tradeoff is slower inference (~40–80ms vs. ~10–20ms), but this is acceptable for a children's game where 4–10fps detection rate is sufficient.

### Single-threaded WASM (numThreads: 1)

Multi-threaded WASM requires `SharedArrayBuffer`, which requires `COOP/COEP` headers. These headers break third-party integrations and complicate deployment. Since inference latency is acceptable at single-thread, the complexity wasn't worth it. `numThreads: 1` also avoids a class of concurrency bugs in the WASM runtime.

### Canvas-based frame capture (not ImageCapture API)

Safari doesn't support `ImageCapture.grabFrame()`. The codebase uses `drawImage(video)` on a canvas, then `createImageBitmap(canvas)`. Note: `createImageBitmap(video)` directly crashes in some WebKit versions (bug #234920), so the canvas intermediate step is mandatory.

### requestVideoFrameCallback over setInterval

`requestVideoFrameCallback` (rVFC) fires only when a new video frame is available, not on a fixed timer. This prevents processing the same frame twice and naturally adapts to the video stream's actual frame rate. The callback chains itself (not scheduled in advance), so if processing takes longer than a frame interval, frames are naturally dropped.

### Separate CV store

The cv-store exists solely to prevent the game UI from re-rendering at inference rate. Without it, every detection result (4–10 per second) would cascade through the entire component tree. Only DebugHUD and the camera overlay bounding box visualization subscribe to cv-store.

### Temporal buffer (3 frames, not confidence threshold)

A single high-confidence detection could be a false positive (e.g., a printed number on the table surface). Requiring 3 consecutive frames with the same answer provides temporal stability. The buffer emits `TILE_SEEN` on frame 1 for instant visual feedback ("I see a tile!"), so the child doesn't think the system is unresponsive during the 3-frame wait.

### Child-friendly language as an immutable rule

The codebase has an explicit rule (`.claude/rules/immutable.md`) that all game feedback must be child-friendly — no negative or punitive language. Timeout messages say "Keep trying!" and "You're so close!", never "Wrong" or "Failed". Celebration messages are randomized from a list of encouraging phrases. This is treated as an architectural invariant, not a UI preference.

### PWA with CacheFirst for models

The ONNX model is ~11MB. On first load, the service worker caches it with a 1-year TTL using Workbox's `CacheFirst` strategy. Subsequent visits load the model from cache instantly. The tradeoff: updating the model requires a service worker update cycle. The `registerType: "autoUpdate"` setting handles this automatically on the next visit.

### No flip augmentation in training data

The model training guide explicitly prohibits horizontal/vertical flips in data augmentation. A flipped "3" is not a "3" — it's a backwards "3". Similarly, 90-degree rotations would make "6" and "9" ambiguous. Rotation is capped at ±10 degrees. This is a domain-specific constraint that's easy to miss.

### Dual audio format (MP3 + M4A)

Every sound effect exists in both MP3 and M4A format. Howler.js selects the best format for the browser. M4A (AAC) is Safari's preferred codec. MP3 is the universal fallback. This doubles the audio asset size (~500KB total) but guarantees playback on every target browser.

---

## Gotchas

### iOS Safari specifics
- **AudioContext must be unlocked in a user gesture.** The "Let's Play!" button simultaneously unlocks audio, requests camera permission, and starts the session. Splitting these into separate gestures would require separate taps.
- **AudioContext goes to `"interrupted"` state** (not `"suspended"`) when the app backgrounds on iOS. The visibility change handler checks for both states and resumes with a 200ms delay.
- **Camera streams die on background.** iOS kills `getUserMedia` streams when the app loses focus. The `use-camera` hook detects `track.readyState === "ended"` and sets status to `"interrupted"`, showing a "Tap to restart camera" button. You cannot call `getUserMedia` from a `visibilitychange` handler — it requires a user gesture.
- **`Howler.autoSuspend = false` must be set before any Howl instance is created.** Setting it after causes audio dropouts. This is a module-level side effect in `sound-manager.ts`.

### ONNX Runtime Web specifics
- **WASM paths must be absolute** (`ort.env.wasm.wasmPaths = "/"`). Relative paths break inside Web Workers because the worker's base URL differs from the main page.
- **`optimizeDeps.exclude: ["onnxruntime-web"]`** is required in Vite config. Without it, esbuild tries to bundle the WASM loader and fails.
- **First inference is slow** (2–5 seconds) due to WASM compilation. Subsequent inferences are 40–80ms. The ProgressiveLoader hides this behind child-friendly loading messages.
- **Output tensor is channel-major**, not anchor-major. To read class scores for anchor `i`, index as `output[(4 + classId) * numAnchors + i]`, not `output[i * numChannels + 4 + classId]`.

### Frame capture specifics
- **Always call `bitmap.close()`** — even on error, even when skipping frames. `ImageBitmap` holds GPU memory that won't be garbage collected.
- **Never use `createImageBitmap(video)` directly** — use the canvas intermediate step. WebKit bug #234920.
- **The capture canvas is resized, never recreated.** Recreating causes memory leaks in some WebKit versions. Set `width = 0; height = 0` on cleanup.

### Game state specifics
- **SessionSummary guards against React StrictMode double-invoke** using a module-level `Set` of session timestamps. Without this, `recordSession()` would fire twice, doubling the cumulative stats.
- **The game reducer ignores invalid transitions.** Dispatching `ANSWER_CORRECT` during `"idle"` phase is a no-op, not an error. This is intentional — the CV pipeline might fire a detection result after a phase transition has already occurred.

### Build and deployment
- **The ONNX WASM files must be statically copied** — they can't be imported as ES modules. `vite-plugin-static-copy` handles this.
- **PWA manifest is custom** (`public/manifest.json`), not auto-generated by `vite-plugin-pwa`. `manifest: false` in the plugin config prevents conflicts.
- **E2E tests use `NO_HTTPS=true pnpm preview`** because Playwright WebKit doesn't support self-signed certificates well. The E2E environment doesn't need camera access (mock mode), so HTTP is fine.
