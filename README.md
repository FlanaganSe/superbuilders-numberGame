# Superbuilders

A browser-based educational game that uses real-time computer vision to recognize physical number and letter tiles via an iPad camera. Children ages 5-8 solve arithmetic problems by placing tiles on a play surface, and the app detects answers through the camera feed with instant celebratory feedback.

The entire CV pipeline runs on-device — a custom YOLO11n model executes via ONNX Runtime Web (WASM) in a dedicated Web Worker. No frames leave the device. No cloud inference. No backend.

## How It Works

```
Physical tiles on play surface
        |
iPad camera (720p rear-facing)
        |
requestVideoFrameCallback (4-10fps)
        |
ImageBitmap transfer (zero-copy) --> Web Worker
        |                               |
        |                     Letterbox 640x640
        |                     RGBA -> Planar RGB [0,1]
        |                     ONNX session.run()
        |                     Confidence filter (0.65)
        |                     NMS (IoU 0.45)
        |                     L->R sort
        |                               |
Main thread <------ DetectedDigit[] -----+
        |
  Interpretation (group digits -> multi-digit numbers)
  Temporal buffer (3 consecutive matching frames)
    Frame 1: "I see 7!" (instant visual feedback)
    Frame 3: answer committed -> game logic fires
        |
  Game engine: award stars, play sound, next problem
```

The temporal buffer prevents false positives — a single-frame detection could be a hand passing over. Three consecutive matching frames (~600ms at 5fps) provides stability while remaining responsive. `TILE_SEEN` fires on frame 1 so the child sees immediate feedback.

## Getting Started

**Prerequisites:** Node.js 22+, pnpm

```bash
pnpm install
pnpm dev
```

The dev server uses [mkcert](https://github.com/nicolo-ribaudo/vite-plugin-mkcert) for HTTPS, which is required for camera access (`getUserMedia`). Opens at `https://localhost:5173`.

**iPad testing** — tunnel from a second terminal:

```bash
cloudflared tunnel --url https://localhost:5173
```

No account needed. Append `?recognition=mock&debug=true` for development without a camera.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | HTTPS dev server (mkcert) |
| `pnpm build` | Production build (typecheck + Vite) |
| `pnpm preview` | Preview production build |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:watch` | Unit tests in watch mode |
| `pnpm test:e2e` | E2E tests (Playwright WebKit) |
| `pnpm lint` | Lint + format check (Biome) |
| `pnpm lint:fix` | Auto-fix lint + format |
| `pnpm typecheck` | TypeScript type checking |

## Feature Flags

URL query parameters, cached at module level:

| Flag | Values | Effect |
|---|---|---|
| `recognition` | `mock` | On-screen numpad instead of camera CV |
| `debug` | `true` | FPS, inference latency, detection counts, temporal state |
| `overlay` | `boxes` | Bounding box visualization on camera feed |

Example: `https://localhost:5173/?recognition=mock&debug=true`

## Architecture

### Game State Machine

Six-phase finite state machine using a [discriminated union](docs/product-overview.md#game-phases-discriminated-union) on `phase.phase`:

```
idle --> countdown (3s) --> scanning (CV active, 30s timeout)
                              |                |
                          (correct)        (timeout)
                              |                |
                           success          timeout
                              |           (retry same problem)
                              |                |
                              +--- NEXT_ROUND -+
                              |
                   rounds >= 15? --> session-end
                              |
                              +--> countdown (next problem)
```

The reducer ([`src/engine/game-reducer.ts`](src/engine/game-reducer.ts)) ignores invalid transitions — dispatching `ANSWER_CORRECT` during `idle` is a no-op, not an error. This is intentional because the CV pipeline may fire results after a phase transition has already occurred.

### State Management

Two Zustand stores with intentionally separate update rates:

- **`game-store`** — Game logic (phase, problems, scores, difficulty). Updated on game events.
- **`cv-store`** — Transient CV data (raw detections, latency, worker status). Updated at inference rate (4-10fps). Only consumed by `DebugHUD` and camera overlay.

Separation prevents every game UI component from re-rendering at inference rate. The CV pipeline dispatches via `getState()` outside React's render cycle — Zustand's direct access is critical here (and why Redux was rejected; see [ADR-003](docs/decisions.md#adr-003-zustand-over-redux)).

### Adaptive Difficulty

Difficulty (levels 1-5) adapts per-round: 3 consecutive correct answers promotes, 2 consecutive wrong demotes. All answers are constrained to 0-9 — the child places a single physical tile, and the model recognizes individual digits.

### Instructional Feedback

Feedback is generated by pure functions in `src/engine/` based on [learning science research](docs/learning-science-research.md):

- **Correct answers:** Celebration + brief instructional reinforcement
- **Wrong tile detected:** "You made 8. We need 7." with strategy hints
- **Timeout:** Worked example showing the correct answer
- **Camera uncertainty:** System-attribution ("I lost your tile") — never child-attribution, per math anxiety research
- **Expertise reversal:** Detailed explanations fade at difficulty 4+ (Sweller's principle)

See [ADR-009](docs/decisions.md#adr-009-engine-layer-pure-functions-for-instructional-feedback) and [ADR-010](docs/decisions.md#adr-010-wrong-answer-detection-separate-from-temporal-buffer).

## The Model

Custom **YOLO11n** (Ultralytics nano) trained on physical digit and letter tiles.

| Property | Value |
|---|---|
| File | `public/models/digit-tiles.onnx` |
| Size | ~10.6 MB (FP32) |
| Input | `[1, 3, 640, 640]` RGB normalized [0,1] |
| Output | `[1, 40, 8400]` — 4 box coords + 36 class scores x 8400 anchors |
| Classes | 36 (digits 0-9 + letters A-Z) |
| Inference | ~40-80ms per frame (WASM + SIMD, single-threaded) |
| Metrics | mAP50: 0.995, mAP50-95: 0.973 |

**Why FP32:** FP16 is 2-7x slower in browser WASM without native half-precision SIMD. INT8 has no compute speedup on Safari (Relaxed SIMD unavailable). FP32 via standard `f32x4` SIMD is fastest. The larger model size is mitigated by service worker caching.

**Why WASM, not WebGPU:** Safari crashes on ORT WebGPU (WebKit bug #26827, open as of March 2026). Single-threaded WASM (`numThreads: 1`) avoids `SharedArrayBuffer` and `COOP/COEP` header requirements.

**Training pipeline:** Physical tiles filmed on iPhone, frames extracted via ffmpeg, annotated via Gemini (OpenRouter), trained on Kaggle P100 through Roboflow. Documented in the standalone [`digit-training`](docs/research/digit-training-pipeline.md) project.

**Class-range filtering** ([ADR-006](docs/decisions.md#adr-006-class-range-filtering-inside-argmax-not-post-filter)): In math mode, the argmax loop is constrained to classes 0-9 so letter detections never suppress digit detections via NMS.

## Testing

**Unit tests** (Vitest, 17 files) cover:
- Game engine: reducer transitions, difficulty adaptation, problem generation constraints, session persistence
- CV pipeline: preprocessing math, postprocessing (IoU, NMS, letterbox), interpretation (digit grouping), temporal buffer (3-frame counting, miss tolerance)
- Pipeline regression: synthetic YOLO tensors through the full pipeline for all 10 digits, multi-tile answers, 6/9 distinction, confidence filtering
- State management: store lifecycle, detection processing, wrong-answer tracking

**E2E test** (Playwright WebKit): Full game loop with mock recognition — start session, countdown, place correct digit (3x for temporal buffer), verify celebration, complete multiple rounds.

**Not tested by design:** Audio playback (Howler internals), animations (visual), real ONNX inference (requires WASM runtime — tested manually on device), real camera streams (OS-level).

```bash
pnpm test                  # Unit tests
pnpm test:e2e              # E2E (requires pnpm build first)
```

## Deployment

**Hosting:** Cloudflare Pages (static SPA). HTTPS guaranteed, which is required for camera access.

**CI/CD:** GitHub Actions pipeline on push to `main`:

```
Quality & Build          E2E Tests              Deploy
(typecheck, lint,   -->  (Playwright WebKit  --> (wrangler pages deploy
 unit tests, build)       against preview)       to Cloudflare Pages)
```

Build artifacts are produced once and reused across jobs. Deploy is conditional on main branch only.

**Caching:** Workbox service worker precaches JS, CSS, WASM runtime, and audio files. The ONNX model uses `StaleWhileRevalidate` — cached model served immediately, background fetch ensures updates propagate by next load ([ADR-008](docs/decisions.md#adr-008-stalewhilerevalidate-for-onnx-model-caching)).

**Security headers** (`public/_headers`): CSP restricts to self-origin with `wasm-unsafe-eval` for ONNX. Camera permitted via `Permissions-Policy`, microphone denied. No external `connect-src` — nothing phones home.

## Privacy

No backend, no analytics, no tracking. All processing happens on-device:

- Camera frames never leave the browser — transferred to a local Web Worker via zero-copy `postMessage`
- No external network requests during gameplay (CSP enforces `connect-src 'self'`)
- Persistence is localStorage only: cumulative stars, session count, mute preference, calibration status
- The app works fully offline after initial load

## Stack

| Technology | Role |
|---|---|
| React 19.2 + Vite 7.3 | SPA framework + build tool |
| TypeScript 5.9 | Strict mode (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| ONNX Runtime Web 1.24.3 | ML inference (WASM execution provider) |
| Zustand 5.x | State management (two stores, reducer-driven) |
| Tailwind CSS 4.2 | Styling (v4 `@theme` in CSS, `@tailwindcss/vite` plugin) |
| Motion 12.35 | Animation (`LazyMotion` + `domAnimation`, spring physics) |
| Howler.js 2.2.4 | Audio (iOS AudioContext handling, dual MP3+M4A format) |
| canvas-confetti 1.9.4 | Celebration particle effects |
| Biome 2.x | Linter + formatter (replaces ESLint + Prettier) |
| Vitest 4.x | Unit testing (co-located, happy-dom) |
| Playwright 1.58 | E2E testing (WebKit only — matches iPad Safari target) |
| Cloudflare Pages | Static hosting + CDN |

Technology choices and tradeoffs are documented in [ADRs](docs/decisions.md).

## Spelling Mode (In Progress)

The 36-class model already recognizes letters A-Z alongside digits. Expansion to a spelling game is partially complete:

**Done:** Model deployed, class-range filtering per game mode, `SpellingProblem` type, `SpellingScreen` component, age-appropriate CVC/CVCC word lists, dynamic class-count reading from model output.

**Remaining:** UI polish, phonics audio integration (pre-recorded, not TTS), learning trajectory redesign for spelling progression.

The spelling mode design is grounded in [orthographic mapping research](docs/research/literacy-science.md) (Ehri 2014) and the [Elkonin sound box](docs/research/phonics-deep-dive.md) methodology — the tile-placement mechanic structurally maps to the letter-box stage, the highest-efficacy variant per systematic review evidence.

## Documentation

| Document | Purpose |
|---|---|
| [`docs/product-overview.md`](docs/product-overview.md) | Architecture, directory structure, patterns, gotchas |
| [`docs/decisions.md`](docs/decisions.md) | Append-only ADR log (10 decisions) |
| [`docs/requirements.md`](docs/requirements.md) | Original PRD |
| [`docs/learning-science-research.md`](docs/learning-science-research.md) | Learning science synthesis and product implications |
| [`docs/research/`](docs/research/) | Deep evidence base (math design, literacy, phonics, ML pipeline) |
