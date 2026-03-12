# Implementation Plan: Superbuilders

**Date:** 2026-03-11
**PRD:** `.claude/plans/prd.md`
**Research:** `.claude/plans/research.md` (index) + 6 deep-dive files
**Sprint:** 1 week (Days 1–7)
**Status:** Draft — awaiting human review

---

## 1. Summary

Build a Safari-first React SPA that uses an iPad camera to recognize physical number tiles (0–9) via YOLO11n detection running in ONNX Runtime Web (WASM backend, Web Worker), powering an interactive math game for ages 5–8. The architecture uses all six PRD-required seam interfaces (`FrameSource`, `PreprocessingStrategy`, `RecognitionService`, `InterpretationLayer`, `GameEngine`, `VocabularyRegistry`) so every layer is independently testable and swappable. A `MockRecognitionService` (keyboard/button input) unblocks all game logic and UX development from Day 1 — no ML dependency. The real ONNX model integrates late (M9) after training completes in parallel. Each milestone produces a testable, committable artifact. Manual steps (tile creation, data labeling, model training, audio sourcing) run in parallel with code development and are explicitly called out.

---

## 2. Files to Change

No source code exists. All files are new (see Section 3).

Files to **update** during the plan:

| File | Change | Milestone |
|---|---|---|
| `CLAUDE.md` | Update stack section from TBD to pinned versions; add build commands | M1 |
| `.claude/rules/stack.md` | Replace TBD entries with finalized stack decisions from research | M1 |
| `.claude/rules/conventions.md` | Add established patterns as they emerge | All |

---

## 3. Files to Create

### Project Root

| File | Purpose | Milestone |
|---|---|---|
| `package.json` | Dependencies, scripts | M1 |
| `pnpm-lock.yaml` | Lockfile | M1 |
| `tsconfig.json` | TypeScript config (strict, paths) | M1 |
| `tsconfig.node.json` | Node TypeScript config for Vite | M1 |
| `vite.config.ts` | Vite 7 + Tailwind + mkcert + static-copy + PWA + worker config | M1 |
| `biome.json` | Biome v2 config with React domain rules | M1 |
| `index.html` | SPA entry point with viewport, fonts, meta tags | M1 |
| `.env.example` | Environment variable template | M1 |

### Source — Types (`src/types/`)

| File | Purpose | Milestone |
|---|---|---|
| `game.ts` | `GamePhase`, `GameAction`, `Problem`, `GameMode`, `DifficultyLevel`, `SessionData` | M1 |
| `cv.ts` | `DetectedDigit`, `BoundingBox`, `RecognitionResult`, `RecognitionService` interface, `FrameSource` interface, `PreprocessingStrategy` interface, `VocabularyRegistry` interface | M1 |
| `worker-protocol.ts` | `MainToWorker`, `WorkerToMain` discriminated unions | M1 |

### Source — Entry (`src/`)

| File | Purpose | Milestone |
|---|---|---|
| `main.tsx` | React entry point: `createRoot`, `StrictMode`, `App` mount | M1 |

### Source — Game Engine (`src/engine/`)

| File | Purpose | Milestone |
|---|---|---|
| `game-reducer.ts` | `useReducer` state machine: `idle → countdown → scanning → success/timeout → session-end` | M2 |
| `game-reducer.test.ts` | Unit tests for all transitions + invalid transition rejection | M2 |
| `problem-generator.ts` | `AdditionMode`, `SubtractionMode` implementations of `GameMode` interface | M2 |
| `problem-generator.test.ts` | Tests: answer ranges by difficulty, no impossible problems | M2 |
| `difficulty.ts` | Adaptive difficulty: +1 after 3 correct, -1 after 2 wrong at same level | M2 |
| `difficulty.test.ts` | Tests for progression/regression logic | M2 |
| `session.ts` | Star calculation (3/2/1 per attempt), localStorage persistence | M2 |
| `session.test.ts` | Tests for star logic, save/load, corrupt data handling | M2 |

### Source — CV Pipeline (`src/cv/`)

| File | Purpose | Milestone |
|---|---|---|
| `recognition-service.ts` | `RecognitionService` factory function (accepts resolved feature flags, not raw URL params) | M2 |
| `mock-recognition.ts` | `MockRecognitionService`: keyboard input + on-screen numpad (iPad has no keyboard) simulates detections | M2 |
| `mock-recognition.test.ts` | Tests for mock detection output format | M2 |
| `interpretation.ts` | `InterpretationLayer`: grouping, digit-count gate, answer matching | M2 |
| `interpretation.test.ts` | Tests: single-digit match, two-digit grouping, stray tile filtering, edge cases | M2 |
| `temporal-buffer.ts` | 3-frame consecutive counter, two-phase feedback (instant + commit) | M2 |
| `temporal-buffer.test.ts` | Tests: counter fill, reset on mismatch, motion gate interaction | M2 |
| `inference.worker.ts` | Web Worker: ORT session, preprocessing, post-processing, message protocol | M4 |
| `preprocessing.ts` | Letterbox resize, RGBA→planar RGB Float32Array, pre-allocation | M4 |
| `preprocessing.test.ts` | Tests: letterbox padding math, pixel normalization, channel order | M4 |
| `postprocessing.ts` | NMS, confidence filter, box decode, unletterbox, left-to-right sort | M4 |
| `postprocessing.test.ts` | Tests: synthetic tensor → expected detections, IoU calculation, NMS correctness | M4 |
| `onnx-recognition.ts` | `OnnxRecognitionService`: manages worker lifecycle, wraps postMessage | M5 |
| `motion-gate.ts` | Confidence-drop proxy (avg confidence < 0.40 → unstable) | M5 |
| `fixture-frame-source.ts` | `FixtureFrameSource` implementing `FrameSource` — loads labeled test images for regression testing | M5 |
| `fixture-frame-source.test.ts` | Tests: loads image, emits as ImageBitmap, replays sequence | M5 |

### Source — Camera (`src/camera/`)

| File | Purpose | Milestone |
|---|---|---|
| `use-camera.ts` | React hook: `getUserMedia`, stream management, `useRef`, recovery on `visibilitychange` | M3 |
| `frame-capture.ts` | `requestVideoFrameCallback` → `drawImage` → `createImageBitmap` → transfer | M3 |
| `camera-overlay.tsx` | `<video>` display + transparent debug canvas overlay | M3 |

### Source — Audio (`src/audio/`)

| File | Purpose | Milestone |
|---|---|---|
| `sound-manager.ts` | Howler.js setup, sprite config, iOS unlock, `visibilitychange` resume | M7 |
| `use-audio.ts` | React hook: play by event name, respect mute state | M7 |

### Source — Store (`src/store/`)

| File | Purpose | Milestone |
|---|---|---|
| `game-store.ts` | Zustand store wrapping `gameReducer` — single owner of game state (phase, problem, difficulty, round). CV pipeline dispatches via `getState().dispatch()`. Also holds persistent preferences (mute, cumulative stars). | M2 |
| `cv-store.ts` | Zustand: transient CV detections (subscribe-only, no React renders) | M5 |

### Source — Components (`src/components/`)

| File | Purpose | Milestone |
|---|---|---|
| `App.tsx` | Root: `LazyMotion` + `MotionConfig` + feature flag routing | M2 |
| `TapToStart.tsx` | Full-screen "Let's Play!" button — unlocks camera + AudioContext | M2 |
| `GameScreen.tsx` | Main game layout: camera feed + problem display + feedback | M2 |
| `ProblemDisplay.tsx` | Math problem rendering (e.g., "3 + 4 = ?") | M2 |
| `CountdownTimer.tsx` | Visual countdown between rounds (animated digits) | M2 |
| `FeedbackOverlay.tsx` | Correct/incorrect/tile-detected feedback animations | M6 |
| `SessionSummary.tsx` | End-of-session star display with staggered animation | M7 |
| `DebugHUD.tsx` | Dev-only: inference latency, confidence, detection overlays, buffer state | M3 |
| `MuteButton.tsx` | Persistent mute toggle (localStorage) | M7 |
| `CalibrationGuide.tsx` | First-run camera/lighting check | M5 |
| `ProgressiveLoader.tsx` | Model download progress indicator ("Getting ready...") | M7 |

### Source — Utils (`src/utils/`)

| File | Purpose | Milestone |
|---|---|---|
| `feature-flags.ts` | URL param parsing: `?recognition=mock&debug=true&overlay=boxes` | M1 |
| `feature-flags.test.ts` | Tests for param parsing | M1 |

### Source — Styles

| File | Purpose | Milestone |
|---|---|---|
| `src/index.css` | Tailwind v4 directives, `@theme` config, Lexend/Fredoka imports, safe-area | M1 |

### Public Assets

| File | Purpose | Milestone |
|---|---|---|
| `public/models/.gitkeep` | Placeholder for ONNX model files | M1 |
| `public/sounds/.gitkeep` | Placeholder for audio sprites | M1 |
| `public/manifest.json` | PWA manifest (name, icons, theme color, display: standalone) | M8 |
| `public/_headers` | Cloudflare security headers (CSP, Permissions-Policy) | M8 |
| `public/_redirects` | SPA routing: `/* /index.html 200` | M8 |

### CI/CD

| File | Purpose | Milestone |
|---|---|---|
| `.github/workflows/ci.yml` | Quality (typecheck + lint + test) → E2E (Playwright WebKit) → Deploy (Cloudflare Pages) | M8 |

### Test Fixtures

| File | Purpose | Milestone |
|---|---|---|
| `src/cv/fixtures/README.md` | Instructions for adding labeled test frames | M4 |
| `src/cv/fixtures/synthetic-tensor.ts` | Synthetic `Float32Array` matching YOLO output format for testing | M4 |

### Documentation

| File | Purpose | Milestone |
|---|---|---|
| `docs/decisions.md` | Append-only ADR log (initialized with stack decisions) | M1 |
| `README.md` | Setup/run instructions + CV pipeline overview (PRD deliverable §3.42) | M8 |

---

## 4. Milestone Outline

### Phase 1: Foundation (Day 1)

- [x] **M1: Project scaffolding** — Vite 7 + React 19 + TypeScript + Tailwind v4 + Biome v2 + all core types/interfaces
  - [x] Step 1 — Create package.json, install all dependencies (pinned versions), configure scripts → verify: `pnpm install` succeeds
  - [x] Step 2 — Create vite.config.ts (ORT, Tailwind, mkcert, static-copy, worker config), tsconfig.json, tsconfig.app.json, tsconfig.node.json, biome.json → verify: `pnpm typecheck` passes
  - [x] Step 3 — Create index.html, src/index.css (Tailwind v4 + fonts), src/main.tsx + App.tsx, src/vite-env.d.ts, public dirs, .env.example → verify: `pnpm build` succeeds
  - [x] Step 4 — Create src/types/game.ts, cv.ts, worker-protocol.ts with all PRD seam interfaces → verify: `pnpm typecheck` passes
  - [x] Step 5 — Create src/utils/feature-flags.ts + feature-flags.test.ts → verify: `pnpm test` passes (10/10)
  - [x] Step 6 — Create docs/decisions.md, update CLAUDE.md + stack.md with pinned versions → verify: `pnpm lint && pnpm build`
  Commit: "feat: scaffold project with Vite 7, React 19, TypeScript, Tailwind v4, Biome v2, and core type definitions"

- [x] **M2: Game loop with mock recognition** — Full game playable via keyboard input, no camera or CV needed
  - [x] Step 1 — Engine layer: game-reducer.ts, problem-generator.ts, difficulty.ts, session.ts + all tests → verify: `pnpm test`
  - [x] Step 2 — CV pipeline stubs: interpretation.ts, temporal-buffer.ts, mock-recognition.ts, recognition-service.ts + tests → verify: `pnpm test`
  - [x] Step 3 — Zustand game-store.ts wrapping gameReducer → verify: `pnpm typecheck`
  - [x] Step 4 — Skeleton UI: App.tsx (LazyMotion), TapToStart, GameScreen, ProblemDisplay, CountdownTimer, SessionSummary → verify: `pnpm typecheck && pnpm build`
  - [x] Step 5 — Final verification + reviewer fixes (SessionSummary render bug, session timing, greedy grouping) → verify: all pass
  Commit: "feat: implement game loop with mock recognition, CV stubs, and skeleton UI"

### Phase 2: Camera & CV Infrastructure (Day 2–3)

- [x] **M3: Camera pipeline + debug HUD** — Live camera preview on device with frame capture working
  - [x] Step 1 — Create `src/camera/use-camera.ts`: useCamera hook with getUserMedia (facingMode environment), stream in useRef, visibilitychange recovery, error handling with child-friendly messages, cleanup on unmount → verify: `pnpm typecheck`
  - [x] Step 2 — Create `src/camera/frame-capture.ts`: rVFC-based frame capture producing ImageBitmaps, drawImage→createImageBitmap pipeline, canvas lifecycle management, FrameSource-compatible design + `src/camera/frame-capture.test.ts` → verify: `pnpm typecheck && pnpm test`
  - [x] Step 3 — Create `src/camera/camera-overlay.tsx`: video element with playsinline/autoplay/muted, transparent canvas overlay for debug bounding boxes, landscape fill → verify: `pnpm typecheck`
  - [x] Step 4 — Create `src/components/DebugHUD.tsx`: gated by ?debug=true flag, shows frame count/FPS/capture status, placeholder slots for inference latency/detection overlays, corner-positioned → verify: `pnpm typecheck`
  - [x] Step 5 — Wire into existing UI: update TapToStart to call getUserMedia on tap, update App/GameScreen to show camera preview behind game UI when active, skip camera in mock mode, add tests for use-camera, fix reviewer issues (visibilitychange gesture requirement, loadedmetadata listener leak, remove stale stream field) → verify: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`
  Commit: "feat: implement camera pipeline with frame capture, debug HUD, and camera overlay"

- [x] **M4: Inference worker + processing pipeline** — Worker loads ORT, processes synthetic input, returns detections
  - [x] Step 1 — Implement `preprocessing.ts`: computeLetterbox (pure math), preprocess (OffscreenCanvas letterbox + RGBA→planar RGB), rgbaToPlanarRgb (testable without canvas), pre-allocated buffers, resetBuffers for testing → verify: `pnpm typecheck`
  - [x] Step 2 — Implement `postprocessing.ts`: computeIoU, nms (class-agnostic greedy), postProcess (confidence filter ≥0.65, channel-major decode, unletterbox, NMS IoU 0.45, left-to-right sort, normalized BoundingBox output). numAnchors/numClasses from dims, not hardcoded → verify: `pnpm typecheck`
  - [x] Step 3 — Create `src/cv/fixtures/synthetic-tensor.ts` with createSyntheticTensor factory + pre-built fixtures (DIGIT_7, DIGIT_3, multi-digit 1+3, low-confidence, NMS duplicate). Create `src/cv/fixtures/README.md` → verify: `pnpm typecheck`
  - [x] Step 4 — Write `preprocessing.test.ts` (12 tests: letterbox math, pixel normalization, channel order, alpha ignored, 2×2 grid) + `postprocessing.test.ts` (25 tests: IoU, NMS, synthetic tensor→detections, unletterbox, confidence filter, left-to-right sort, edge clamping, COCO 80-class, 320×320 anchors) → verify: `pnpm test` (144 pass)
  - [x] Step 5 — Implement `inference.worker.ts`: module worker importing onnxruntime-web/wasm, ORT bootstrap (wasmPaths='/', numThreads=1, simd=true, proxy=false), session create with graphOptimizationLevel='all', MainToWorker/WorkerToMain protocol via switch+satisfies, busy-flag frame dropping (isInferring guard), try/catch around session.run() with finally clearing flag, exhaustive default case, bitmap.close() on all paths → verify: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`
  Commit: "feat: implement inference worker with preprocessing, postprocessing, and synthetic test fixtures"

- [x] **M5: Full CV loop + auto-check** — Camera → worker → interpretation → game transitions working end-to-end
  - [x] Step 1 — Core modules: `motion-gate.ts` + test, `cv-store.ts`, `onnx-recognition.ts`, clean worker-protocol (remove unused width/height from infer), update recognition-service factory, expose temporal buffer state from game-store → verify: `pnpm typecheck`
  - [x] Step 2 — Wire full pipeline in App.tsx: frame capture → OnnxRecognitionService → motion gate → processDetections → cv-store updates. CV only active during scanning phase. → verify: `pnpm typecheck && pnpm test`
  - [x] Step 3 — Create `FixtureFrameSource` (implements `FrameSource`, loads labeled test images for M9 regression) + test. Create `CalibrationGuide` (first-run camera/lighting check, localStorage gated). → verify: `pnpm typecheck && pnpm test`
  - [x] Step 4 — DebugHUD updates: real inference latency, confidence, detection count, temporal buffer state, worker status. `?overlay=boxes` bounding box drawing on CameraOverlay. Fixture capture button. → verify: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`
  Commit: "feat: wire full CV pipeline with ONNX recognition, motion gate, and auto-check"

### Phase 3: UX Polish (Day 3–4)

- [x] **M6: Visual design + animations** — App looks and feels like a children's game
  - [x] Step 1 — Tailwind theme + typography + layout: enhance index.css color palette, verify font sizes (Fredoka ≥48pt numbers, Lexend ≥24pt body), update all components for landscape iPad layout, touch targets ≥80×80pt → verify: `pnpm typecheck`
  - [x] Step 2 — Create `FeedbackOverlay.tsx` with confetti integration: three states (correct/tile-seen/timeout), Motion animations (scale bounce, wobble, pop), canvas-confetti bursts, randomized child-friendly text, `useReducedMotion` fallbacks, answer zone hint with pulse → verify: `pnpm typecheck`
  - [x] Step 3 — Wire FeedbackOverlay into GameScreen + App: integrate overlay, add session-end confetti, pause CV inference during success phase (1.5s), update component styles for visual polish → verify: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`
  Commit: "feat: add visual design, animations, confetti, and FeedbackOverlay for children's game UX"

- [x] **M7: Audio + session flow + progressive loading** — Complete polished experience from start to finish
  - [x] Step 1 — Sound infrastructure: create `src/audio/sound-manager.ts` (Howler setup with individual MP3+M4A files, autoSuspend=false, iOS unlock, visibility resume), `src/audio/use-audio.ts` (hook with stable play ref, mute-aware), `src/components/MuteButton.tsx` (toggle with speaker icons, ≥80px touch target) → verify: `pnpm typecheck`
  - [x] Step 2 — Wire audio to game events: update TapToStart (AudioContext unlock in gesture), CountdownTimer (tick each second), GameScreen (correctChime/encouragement/tileDetectedPop), SessionSummary (fix useMemo StrictMode bug, add fanfare), add MuteButton + visibility resume to App → verify: `pnpm typecheck && pnpm test`
  - [x] Step 3 — Progressive loader: create `src/components/ProgressiveLoader.tsx` (time-based friendly text, error state with retry/mock fallback), wire into App.tsx (show when workerStatus !== ready && phase !== idle) → verify: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`
  Commit: "feat: add audio system, mute toggle, progressive loader, and session flow polish"

### Phase 4: Ship (Day 5–7)

- [x] **M8: Deployment + CI/CD** — App deployed to Cloudflare Pages with automated pipeline
  - [x] Step 1 — PWA + Service Worker + manifest + icons: add vite-plugin-pwa to vite.config.ts (Workbox settings), create manifest.json, generate placeholder icons → verify: `pnpm typecheck && pnpm build`
  - [x] Step 2 — Security headers + SPA redirects: create `public/_headers` (CSP, Permissions-Policy) + `public/_redirects` → verify: files in dist/ after build
  - [x] Step 3 — GitHub Actions CI workflow: `.github/workflows/ci.yml` with typecheck → lint → test → build → deploy → verify: YAML valid
  - [x] Step 4 — Playwright E2E test: install, configure WebKit, write game loop test, add test:e2e script → verify: `pnpm test:e2e` passes
  - [x] Step 5 — README.md + final verification → verify: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`
  Commit: "feat: add deployment pipeline, PWA caching, E2E test, and README"

- [ ] **M9: Real model integration + tuning** — Physical tiles detected on real iPad, all acceptance criteria met
  - [x] Step 1 — Model integration: update default model URL to `digit-tiles.onnx`, add tuning comments to all threshold constants → verify: `pnpm typecheck`
  - [x] Step 2 — Fix cleanup items: remove unused `_newProblem` param from NEXT_ROUND action, fix `dispose()` silently dropping pending callbacks → verify: `pnpm typecheck && pnpm test`
  - [x] Step 3 — Create fixture pipeline regression tests: synthetic end-to-end tests covering all 10 digits, two-tile grouping (15), empty surface, low-confidence filtering, motion gate suppression, 6/9 distinction, NMS dedup → verify: `pnpm test`
  - [x] Step 4 — Final verification → verify: `pnpm typecheck && pnpm test && pnpm lint && pnpm build`
  Commit: "feat: integrate digit-tiles model, add pipeline regression tests, and fix cleanup items"
  - **Manual:** Real-device iPad testing (camera, autofocus, thermal, frame rate, all acceptance criteria)

---

## 5. Manual Setup Tasks

These are NOT code tasks. They require human action and run in parallel with development.

### Before M1 (Day 1 Start)

| Task | Details | Blocks |
|---|---|---|
| **Create Roboflow account** | Sign up at roboflow.com (free tier). Create an Object Detection project named "digit-tiles" with 10 classes: `0`–`9`. | M-Train |
| **Install Ultralytics** | `pip install ultralytics albumentations` on a machine with GPU access (or MPS on Mac). Verify: `yolo --version` | M-Train |
| **Install FFmpeg** | `brew install ffmpeg` (or equivalent). Needed for frame extraction from video. | M-Train |

### Day 1 (In Parallel with M1)

| Task | Details | Blocks |
|---|---|---|
| **Create physical tiles** | Print 20 tiles (0–9 × 2) on cardstock. Specs: 3×4 inches, black digit on white matte background, Verdana bold font, 3–4mm black border, underline on 6 and 9. Laminate (matte, NOT glossy — glossy creates glare). | M-Train, M9 |
| **Create play mat** | Solid-color contrasting background (e.g., green or blue felt/construction paper). Large enough for tiles to be arranged freely. | M-Train, M9 |
| **Source audio assets** | Download 5 sounds from Pixabay/Mixkit (no attribution required). Needed sounds: correct chime (~1.2s), encouragement tone (~0.8s), tile-detected pop (~0.3s), session-end fanfare (~3s), countdown tick (~0.2s). Download as WAV. | M7 |

### Day 2–3 (In Parallel with M3–M5)

| Task | Details | Blocks |
|---|---|---|
| **Record training video** | Use iPad (or phone) to record 5-minute H.264 MP4 videos of tiles on play mat. Record multiple sessions varying: (a) tile position across full frame, (b) distance/zoom, (c) rotation ±10°, (d) lighting (bright, dim, side-lit), (e) multiple tiles visible simultaneously, (f) hand partially over tile, (g) play mat with no tiles (negative examples). Aim for ~50 minutes total footage across all digits. | M-Train |
| **Extract frames** | `ffmpeg -i recording.mp4 -vf fps=1 frames/%05d.jpg` — extract at 1fps. Review extracted frames, delete blurry/redundant ones. Target: ~300–500 clean frames. | M-Train |
| **Label in Roboflow** | Upload frames to Roboflow. Draw bounding boxes around each tile, assign class (0–9). Use Label Assist after first 50 images to accelerate. Include 5–10% background images (no tiles). Tips: (a) annotate ALL visible tiles in each image, (b) tight boxes with minimal margin, (c) check 6/9 labels carefully. | M-Train |

### Day 3–4 (In Parallel with M5–M6)

| Task | Details | Blocks |
|---|---|---|
| **Generate dataset version** | In Roboflow: create a version with 80/10/10 train/val/test split. Enable augmentations: Brightness, Exposure, Noise, Blur, Rotation ±10°, Shear, Crop. **DISABLE:** Horizontal Flip, Vertical Flip, 90° Rotate, Cutout. Set multiplier to 3×. Preview augmented samples — verify no digit-destroying transforms. | M-Train |
| **Export dataset** | Export as "YOLOv11 PyTorch TXT" format. Download ZIP. Unzip to a local directory. | M-Train |
| **Train YOLO11n** | Run the training command (see below). Monitor validation mAP — stop early if it plateaus. Expect 1–3 hours on GPU. | M9 |
| **Export ONNX** | Export best weights to ONNX (see below). Verify file size is < 15MB. | M9 |

#### Exact Training Command

```bash
yolo detect train \
  data=/path/to/dataset/data.yaml \
  model=yolo11n.pt \
  epochs=150 \
  imgsz=640 \
  batch=16 \
  device=0 \
  fliplr=0.0 \
  flipud=0.0 \
  degrees=10.0 \
  translate=0.1 \
  scale=0.4 \
  perspective=0.0005 \
  hsv_h=0.015 \
  hsv_s=0.7 \
  hsv_v=0.4 \
  mosaic=1.0 \
  mixup=0.0 \
  patience=50 \
  close_mosaic=10
```

Use `device=mps` on Apple Silicon Mac. Use `device=cpu` as last resort (slow).

#### Exact ONNX Export Command

```bash
yolo export \
  model=runs/detect/train/weights/best.pt \
  format=onnx \
  imgsz=640 \
  half=False \
  dynamic=False \
  simplify=True \
  opset=17 \
  batch=1
```

If inference > 120ms on iPad at 640×640, re-export at `imgsz=320` and retrain at 320×320.

### Day 2 (In Parallel with M3)

| Task | Details | Blocks |
|---|---|---|
| **Generate audio sprites** | Install `audiosprite` globally: `npm install -g audiosprite`. Run: `audiosprite --output public/sounds/game-sfx --format howler2 --export mp3,m4a correct-chime.wav encouragement.wav tile-pop.wav fanfare.wav tick.wav`. Produces `game-sfx.mp3`, `game-sfx.m4a`, `game-sfx.json`. | M7 |

### Before M8 (Day 5)

| Task | Details | Blocks |
|---|---|---|
| **Create Cloudflare Pages project** | Sign up / log in to Cloudflare dashboard. Create a Pages project linked to the GitHub repo. Set build command: `pnpm build`, output directory: `dist`. | M8 |
| **Generate Cloudflare API token** | Create API token with "Cloudflare Pages — Edit" permissions. Add as GitHub Actions secret: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. | M8 |
| **Set up GitHub repository** | Push project to GitHub. Enable Actions. | M8 |

### Before M9 (Day 5–6)

| Task | Details | Blocks |
|---|---|---|
| **Copy ONNX model to project** | Copy `best.onnx` from training output to `public/models/yolo11n-digits.onnx`. Verify size < 15MB. | M9 |
| **Prepare demo environment** | Set up iPad on stand with play mat, good lighting (desk lamp if needed), tiles ready. Test camera view covers full play surface. | M9 |
| **Record demo video** | After M9 is verified: record 3–5 minute video showing game in action. | Deliverable |

---

## 6. Risks

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| 1 | **ORT WASM fails to load in Safari Worker** | Blocks entire CV pipeline | Low (verified in research) | Test M4 on real iPad early via cloudflared. `wasmPaths='/'` is mandatory. Fallback: ORT proxy mode (`env.wasm.proxy=true`) on main thread. |
| 2 | **Model accuracy insufficient** | Demo fails | Medium | Tiered fallback: (a) retrain with more data/augmentation, (b) lower confidence threshold, (c) switch to 320×320 if speed is the issue but accuracy is fine at 640×640, (d) mock recognition for demo if all else fails. |
| 3 | **Labeling takes too long** | Delays training → delays M9 | Medium | Use Roboflow Label Assist after 50 images. Multi-tile frames reduce per-tile annotation effort. Consider synthetic data augmentation if real data is insufficient. |
| 4 | **iPad thermal throttling kills performance** | Session ends prematurely | Medium | 4fps inference cap + adaptive backoff to 2fps. Pause inference during celebrations. Monitor via debug HUD. |
| 5 | **6/9 confusion despite underlines** | Wrong answers | Medium | Dedicated fixture tests. If persistent: add orientation dot (top-right corner) as secondary cue. Retraining with more 6/9 examples. |
| 6 | **Vite + ORT bundling issues** | Build fails | Low-Medium | Research covers exact config. `optimizeDeps.exclude: ['onnxruntime-web']`, `resolve.conditions: ['browser']`. Test build early in M1. |
| 7 | **Audio won't play on iOS** | Silent game | Low (pattern is well-documented) | Howler.ctx.resume() in Tap-to-Start gesture handler. Handle `'interrupted'` state. Test on real device in M7. |
| 8 | **Camera permission denied / re-prompted** | Breaks UX flow | Low | `NotAllowedError` retry UI in TapToStart. Test standalone (Add to Home Screen) mode. |
| 9 | **Tailwind v4 peer dep conflict with Vite 7** | Install failure | Low | `pnpm.overrides` in package.json. Check `npm info @tailwindcss/vite@latest peerDependencies` at setup. |
| 10 | **Training takes too long / no GPU available** | Delays M9 | Medium | Use `device=mps` on Apple Silicon. Reduce epochs if validation plateaus early. Consider Google Colab free tier as backup GPU. |

### Critical Path

```
M1 → M2 → M3 → M4 → M5 → M6/M7 → M8 → M9
                                         ↑
                        Manual: tiles → record → label → train → export
```

M6 and M7 can proceed in parallel after M5. M9 is the integration point where both tracks converge. If training is not done by Day 5, M8 deploys with `?recognition=mock` and M9 is deferred.

---

## 7. Open Questions

| # | Question | Impact | Needed By | Suggested Resolution |
|---|---|---|---|---|
| 1 | **Confirm ONNX Runtime Web is acceptable** — Requirements doc says "TensorFlow.js or OpenCV.js" (illustrative). Research strongly recommends ORT. | Stack decision | M1 | Confirm with Patrick Skinner. Research shows TF.js has Worker issues on iOS (tfjs#7540) and OpenCV.js is brittle alone. ORT is the correct choice. |
| 2 | **Ultralytics AGPL licensing** — Acceptable for demo; flag for commercial. | Legal | Before commercial use | Acceptable for demo sprint. If commercial use is planned, evaluate: (a) Ultralytics Enterprise license, or (b) alternative training framework (PyTorch directly, or ONNX export from a non-AGPL tool). |
| 3 | **Pre-recorded voice prompts?** — Ages 5–6 can't read. Worth the effort? | UX for youngest users | M7 | Defer to post-MVP. Lexend font improves readability. Text prompts are sufficient for demo with adult supervision. Add voice prompts as enhancement if time permits. |
| 4 | **iPad model / iOS version** — Need exact hardware specs for benchmarking. | Performance tuning | M5 | Ask for the specific iPad model and iOS version. Verify Safari/iOS version at first real-device test. |
| 5 | **Training GPU access** — Do you have a machine with NVIDIA GPU or Apple Silicon? | Training timeline | M-Train | If no GPU: use Google Colab free tier (T4 GPU, ~2hr training limit). If Apple Silicon: `device=mps` works. CPU training is possible but very slow (12+ hours). |
| 6 | **320×320 vs 640×640 inference** — Research index locked 320×320 for speed, but training research commands all use 640×640, and accuracy at 320 is unvalidated on these tiles. | Model performance | M9 | Default to 640×640 (conservative — accuracy is proven at standard resolution). If inference > 120ms on iPad, retrain at 320×320. Postprocessing is resolution-agnostic (`numAnchors` read from output dims). Synthetic test tensors match training `imgsz`. This overrides the research index lock with explicit rationale. |

---

## Appendix A: Dependency List (Pinned Versions)

### Production Dependencies

```
react@19.2.x
react-dom@19.2.x
onnxruntime-web@1.24.3
zustand@5.x
motion@12.35.x
canvas-confetti@1.9.4
howler@2.2.3
```

### Development Dependencies

```
typescript@5.x
vite@7.3.x
@vitejs/plugin-react@latest
@tailwindcss/vite@latest
@biomejs/biome@latest
vitest@latest
@testing-library/react@latest
happy-dom@latest
playwright@latest
vite-plugin-static-copy@3.2.x
vite-plugin-mkcert@latest
vite-plugin-pwa@latest
@types/howler@latest
@types/canvas-confetti@latest
```

### Peer Dep Note

If `@tailwindcss/vite` peer dep does not include Vite 7, add to `package.json`:

```json
"pnpm": {
  "overrides": {
    "@tailwindcss/vite>vite": "$vite"
  }
}
```

---

## Appendix B: Project Structure

```
superbuilders/
├── public/
│   ├── models/                  # .onnx model files (gitignored, cached by SW)
│   ├── sounds/                  # Audio sprites (MP3 + M4A)
│   ├── manifest.json            # PWA manifest
│   ├── _headers                 # Cloudflare security headers
│   └── _redirects               # SPA routing
├── src/
│   ├── main.tsx                 # React entry point
│   ├── index.css                # Tailwind v4 + fonts + theme
│   ├── types/
│   │   ├── game.ts              # Game domain types
│   │   ├── cv.ts                # CV domain types + all 6 PRD seam interfaces
│   │   └── worker-protocol.ts   # Worker message types
│   ├── engine/
│   │   ├── game-reducer.ts      # State machine
│   │   ├── problem-generator.ts # GameMode implementations
│   │   ├── difficulty.ts        # Adaptive difficulty
│   │   └── session.ts           # Stars + localStorage
│   ├── cv/
│   │   ├── recognition-service.ts   # Interface + factory
│   │   ├── mock-recognition.ts      # Keyboard mock
│   │   ├── onnx-recognition.ts      # Real ORT backend
│   │   ├── inference.worker.ts      # Web Worker
│   │   ├── preprocessing.ts         # Letterbox + normalization
│   │   ├── postprocessing.ts        # NMS + box decode
│   │   ├── interpretation.ts        # Grouping + matching
│   │   ├── temporal-buffer.ts       # Consecutive counter
│   │   ├── motion-gate.ts           # Stability detection
│   │   └── fixture-frame-source.ts  # Test fixture replay
│   ├── camera/
│   │   ├── use-camera.ts           # Camera hook
│   │   ├── frame-capture.ts        # rVFC + frame transfer
│   │   └── camera-overlay.tsx      # Video + overlay canvas
│   ├── audio/
│   │   ├── sound-manager.ts        # Howler setup
│   │   └── use-audio.ts            # React hook
│   ├── store/
│   │   ├── game-store.ts           # Zustand game state
│   │   └── cv-store.ts             # Zustand transient CV
│   ├── components/
│   │   ├── App.tsx
│   │   ├── TapToStart.tsx
│   │   ├── GameScreen.tsx
│   │   ├── ProblemDisplay.tsx
│   │   ├── CountdownTimer.tsx
│   │   ├── FeedbackOverlay.tsx
│   │   ├── SessionSummary.tsx
│   │   ├── CalibrationGuide.tsx
│   │   ├── ProgressiveLoader.tsx
│   │   ├── DebugHUD.tsx
│   │   └── MuteButton.tsx
│   └── utils/
│       └── feature-flags.ts
├── .github/workflows/
│   └── ci.yml
├── index.html
├── vite.config.ts
├── tsconfig.json
├── biome.json
└── package.json
```

---

*This plan does NOT implement anything. Review, then run `/milestone M1` to begin.*
