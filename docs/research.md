# Research: Superbuilders

**Project:** OSMO-style math game with real-time computer vision
**Date:** 2026-03-11
**Status:** Single source of truth — all prior research consolidated, fact-checked, and corrected

---

## 1. Stack Decision Summary

| Layer | Choice | Confidence | Notes |
|---|---|---|---|
| **Framework** | React 19.2 + Vite 7 + TypeScript 5.x | Unanimous | Vite 7.3.1 stable; React 19.2.4 stable |
| **Delivery** | Safari-first SPA, PWA-optional | Unanimous | Works in both Safari tab and standalone mode |
| **CV Runtime** | ONNX Runtime Web 1.24.3 (WASM EP only) | Strong | WASM-only; WebGPU blocked by Safari crash bug |
| **CV Model** | Mock (Day 1) → slot classifier → detector if needed | Strong | Architecture-agnostic via RecognitionService |
| **Training** | Ultralytics CLI + Roboflow | Consensus | AGPL licensing — flag early if commercial |
| **State** | Zustand 5.x | Strong | Transient updates bypass React renders |
| **Animation** | Motion (LazyMotion + domAnimation, ~15KB) | Consensus | Rive only if mascot assets exist |
| **Audio** | Howler.js / use-sound | Consensus | Pre-recorded MP3/AAC; no speechSynthesis |
| **Styling** | Tailwind CSS v4 (@tailwindcss/vite) | Unanimous | Peer dep issue with Vite 7 — use pnpm override |
| **Lint/Format** | Biome v2 | Consensus | domains.react: "all"; exhaustive-deps gap ok for sprint |
| **Testing** | Vitest + Playwright WebKit | Unanimous | Only Playwright has WebKit engine |
| **Hosting** | Cloudflare Pages | Strong | Free unlimited static; 25MB/file limit fits models |
| **Dev HTTPS** | vite-plugin-mkcert + cloudflared tunnel | Consensus | Camera requires HTTPS |

---

## 2. Critical Platform Facts (Verified 2026-03-11)

### ORT WebGPU Crashes Safari — WASM Only for MVP

GitHub issue [#26827](https://github.com/microsoft/onnxruntime/issues/26827) is **open and unresolved**. Using ORT Web in JSEP mode on WebKit 26.2 triggers a WebKit OMG JIT compiler bug: 400%+ CPU, 1–14GB+ memory explosion, eventual iOS crash. **All JSEP configurations crash identically** — `['webgpu', 'wasm']` fallback does NOT protect.

The non-JSEP WASM path (`onnxruntime-web/wasm` subpath, shipping `ort-wasm-simd-threaded.wasm`) is unaffected. No fix has shipped on either the ORT or WebKit side.

**Decision:** Import `onnxruntime-web/wasm` specifically. Use `executionProviders: ['wasm']`, `numThreads: 1`. The RecognitionService interface preserves the WebGPU seam for when the upstream fix lands.

### Safari 26 / iOS 26 — Current Platform

Apple renumbered to Safari 26 / iOS 26 at WWDC25. WebGPU is shipped in Safari 26 (but unusable for ORT due to #26827). WASM launch performance improved via new in-place interpreter. Worker debugging significantly improved.

### ImageCapture.grabFrame() Does Not Exist in Safari

The `ImageCapture` API is **not implemented in WebKit on any version**. The claim in earlier research that "Safari 18.4 added ImageCapture" was a hallucination. The correct frame extraction path is: `requestVideoFrameCallback` → `ctx.drawImage(video)` → `createImageBitmap(canvas)`.

### WebKit Bug #234920 — Performance, Not Crash

`createImageBitmap(videoElement)` works but is slow (CPU copy path instead of GPU-accelerated). Drawing to canvas first, then `createImageBitmap(canvas)`, avoids this. The PRD constraint to never use `createImageBitmap(video)` directly is sound.

### Relaxed SIMD Not Available in Safari

Safari has only shipped `relaxed_laneselect` (bitmask-select subset). The i8 dot product instruction (`i16x8.dot_i8x16_i7x16_s`) needed for efficient INT8 matmul is not available. Relaxed SIMD baseline is blocked by Safari since December 2025. ORT handles this gracefully via runtime detection (`env.wasm.relaxedSimd: false`).

### Quantization: FP32 Is Best for Safari WASM

- **FP16:** Confirmed slower by ORT's own docs — no native FP16 SIMD in any browser WASM.
- **INT8:** Real integer arithmetic (not upcast to FP32), but no compute speedup on Safari because Relaxed SIMD is unavailable. Main benefit is download size (~4× smaller), not speed.
- **FP32:** Best compute performance on Safari WASM via standard `f32x4` SIMD.

Ship FP32 for Phase 1. Evaluate INT8 for download size only if model exceeds 10MB. Benchmark at Phase 5.

### speechSynthesis Is Unreliable on iOS Safari

Breaks on backgrounding, poor voice quality, inconsistent voice selection across iOS versions. Use pre-recorded audio (ElevenLabs or human recording, MP3/AAC format).

### iOS 26 Home Screen = Web App by Default

Every site added to Home Screen opens as a web app by default on iOS 26. Ship a manifest and icons, but design for both Safari tab and standalone modes. Do not make installed-PWA the only supported mode.

### Vite 7 Plugin Compatibility

- `vite-plugin-static-copy` 3.2.0: peer dep includes `^7.0.0`. Works.
- `vite-plugin-mkcert`: peer dep `>=3`. Tested against Vite 7. Works.
- `@tailwindcss/vite`: peer dep may still be `^5.2.0 || ^6`. Check `npm info @tailwindcss/vite@latest peerDependencies` at setup. If narrow, add pnpm override. Runtime is compatible — metadata-only issue.
- `worker.rollupOptions` is valid in Vite 7. The rename to `rolldownOptions` is Vite 8 only.

### React 19.2 `<Activity>` Component

Real and stable (shipped Oct 2025). Preserves subtree DOM/state when `mode="hidden"`. Useful for camera preservation during navigation. Not needed for single-screen MVP but available for future multi-screen flows.

---

## 3. CV Architecture

### The Most Important Insight: Constrain the Scene

The physical setup matters more than the model choice. For the MVP:
- Fixed board/mat with clearly marked answer zone (1–2 tile slots)
- Matte, high-contrast tiles with known orientation cues (underline on 6/9)
- Guided onboarding for device placement and lighting

This changes the problem from "recognize digits anywhere in an uncontrolled scene" to "classify one or two digits in a known region under controlled expectations."

### CV Approach Options

**Option A — Slot classifier (recommended start):**
Calibrate board → crop 1–2 answer slots → classify each as `blank | 0..9 | unknown`. Fastest demo, least data, easiest debugging.

**Option B — Hybrid answer-zone pipeline:**
Locate answer lane → propose candidates via contour or lightweight detector → classify crops → order/group into answer. Better bridge to free placement.

**Option C — Full-scene detector:**
YOLO over full frame → detect digits anywhere → group/order. Highest data burden, highest latency, hardest to debug in one week.

**Recommendation:** Architect for Option B interfaces. Implement Option A first. Escalate to C only if product requirements demand free placement.

### Pipeline Architecture

```
Camera (30fps preview)
    |
    v
requestVideoFrameCallback (fires when decoded frame ready)
    |
    v
Main thread: drawImage(video) → createImageBitmap(canvas) → transfer to Worker
    |
    v
[Web Worker]
  Preprocess: crop ROI, resize, normalize to [0,1] → Float32Array
    |
    v
  ONNX Runtime Web inference (WASM EP, single-threaded)
    |
    v
  Post-process: confidence filter (≥0.65), NMS if detector, left-to-right sort
    |
    v
[Main Thread]
  Temporal buffer: require 3 consecutive matching recognitions before commit
    |
    v
  Two-phase feedback:
    Phase 1 (< 200ms): visual acknowledgment ("I see something")
    Phase 2 (~750ms): answer committed after stability
    |
    v
  Zustand store → React render → UI feedback (animation, audio)
```

### Frame Scheduling

| Stage | Rate | Rationale |
|---|---|---|
| Live video preview | Browser-native (30fps) | No custom work |
| Frame capture to worker | 4–10 fps | Only when previous inference complete |
| Adaptive backoff | 2 fps | If inference > 150ms |
| Background/pause | 0 fps | Stop on visibilitychange |

**Key rule:** Drop frames under pressure, never queue them.

### Multi-Tile Recognition (10–19)

Two tiles detected → sort by x-coordinate → leftmost = tens, rightmost = units → `[1, 5]` → answer `15`. If IoU > 0.3 between boxes: prompt "Try spreading the tiles apart a little!"

### What Was Ruled Out

| Option | Why |
|---|---|
| MediaPipe | iOS Safari breakage (issue #3576); no digit recognition built-in |
| TensorFlow.js | WebGL Worker issues (tfjs#5454); WASM multithreading fails on iOS (tfjs#7540) |
| Transformers.js | Vision models 200MB+; too heavy |
| Tesseract.js | 2–5s per frame; 15MB download |
| BarcodeDetector | Chromium only; WebKit bug |
| OpenCV.js alone | Brittle under real-world lighting; 7MB WASM |
| Server-side inference | Latency kills real-time feel; privacy concerns with children |
| Cloud VLM (GPT-4o/Claude) | 1–3s per call; too slow for core loop |

---

## 4. Camera & Frame Extraction

### Correct Frame Extraction Pipeline (Verified)

1. **Schedule:** `requestVideoFrameCallback` (supported since iOS 15.4, Baseline since Oct 2024)
2. **Extract:** `ctx.drawImage(videoElement, ...)` on main thread (lightweight, not a UI-thread violation)
3. **Create transferable:** `createImageBitmap(canvas)` — NOT from video element (WebKit #234920)
4. **Transfer:** `postMessage([bitmap], [bitmap])` zero-copy to Worker
5. **Cleanup:** Worker calls `bitmap.close()` after inference

### iOS Safari Camera Constraints

| Constraint | Detail |
|---|---|
| `<video playsinline autoplay muted>` | Without `playsinline`, Safari goes fullscreen |
| getUserMedia on user gesture only | "Tap to Start" pattern; handle `NotAllowedError` with retry UI |
| No SharedArrayBuffer without COOP/COEP | Irrelevant — we use `numThreads: 1` |
| Canvas memory leaks | Set `.width = 0; .height = 0` before releasing; never recreate mid-session |
| `bitmap.close()` required | GPU memory not released until explicit close |
| iOS AudioContext starts suspended | Unlock on first user gesture; resume on `visibilitychange` |
| Audio format | MP3 or AAC only — no OGG/WebM on iOS |
| Thermal throttling | No JS API; monitor inference latency, back off adaptively |
| `facingMode: 'environment'` | Sometimes ignored on iOS; fallback: `enumerateDevices()` + filter for "back"/"rear" |
| iOS caps streams at 720p | Regardless of higher `ideal` values |
| `deviceId` randomized per session | Cannot cache; re-enumerate each session |

### Camera Configuration

```typescript
const constraints: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
  },
  audio: false,
};
```

### Camera Recovery

```typescript
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    const tracks = stream.getVideoTracks();
    if (tracks.some(t => t.readyState === 'ended')) {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoEl.srcObject = stream;
    }
    if (Howler.ctx.state === 'suspended' || Howler.ctx.state === 'interrupted') {
      Howler.ctx.resume();
    }
  } else {
    pauseInference();
  }
});
```

---

## 5. ONNX Runtime Web Configuration

### Vite Config (Three-Part Requirement)

All three are mandatory — missing any one causes silent failure:

```typescript
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  optimizeDeps: {
    exclude: ['onnxruntime-web'],       // 1: prevent pre-bundling
  },
  assetsInclude: ['**/*.onnx'],          // 2: treat ONNX as asset
  plugins: [
    viteStaticCopy({                     // 3: copy WASM binaries
      targets: [{
        src: 'node_modules/onnxruntime-web/dist/*.wasm',
        dest: '.',
      }],
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'onnx-runtime': ['onnxruntime-web'],
        },
      },
    },
  },
});
```

### Web Worker Pattern

```typescript
// inference.worker.ts
import * as ort from 'onnxruntime-web/wasm';  // non-JSEP subpath

ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = '/';

let session: ort.InferenceSession | null = null;

self.onmessage = async (e: MessageEvent) => {
  if (e.data.type === 'init') {
    session = await ort.InferenceSession.create(e.data.modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    self.postMessage({ type: 'ready' });
    return;
  }
  if (e.data.type === 'infer' && session) {
    const inputTensor = new ort.Tensor('float32', e.data.buffer, e.data.shape);
    const results = await session.run({ images: inputTensor });
    const output = results['output0'].data as Float32Array;
    self.postMessage({ type: 'detections', data: postProcess(output) });
  }
};
```

### YOLO Output Shape (10-class digit model)

`float32[1, 14, 8400]` — 14 = 4 (bbox: cx, cy, w, h) + 10 (class scores 0–9). Access: `rawOutput[attribute * 8400 + candidateIndex]`. Post-process: iterate 8400 candidates → max class score → filter ≥ 0.65 → NMS (IoU ~0.45) → sort left-to-right.

### Expected Performance (iPad WASM SIMD, single-threaded)

- Warm inference at 640×640: ~40–80ms
- At 320×320: ~20–40ms
- Cold first inference: 2–5s (model compilation) — show loading indicator
- Model load: ~1–3s depending on cache

---

## 6. Model Strategy & Training

### Do Not Lock to a Specific Model Family

The app depends on interfaces (`RecognitionService`, `VocabularyRegistry`), not on YOLO class IDs, vendor export formats, or "detection always returns boxes." The leading candidate is YOLO11n-cls (Ultralytics classification) for slot classification, upgradeable to YOLO11n detection on the same toolchain — but the architecture permits any ONNX-exportable model.

### MNIST Bridge Model (Day 1)

`mnist-8.onnx` from the ONNX Model Zoo: **26KB**, 98.9% accuracy on MNIST test set. Input: float32 (1, 1, 28, 28) grayscale. Operators fully supported in ORT Web WASM. Valid bridge if upstream crop/isolation is reliable. Domain gap (handwritten → printed tiles) is manageable for a bridge. Not a long-term solution.

### Training Data Strategy

1. Build physical tiles first
2. Record 5-min video of tiles under varied lighting/angles/hands
3. Extract at 1 FPS → ~300 frames
4. Upload to Roboflow → label/augment
5. Target: 150–200 real images per class minimum

**Critical augmentation rules:**
- `fliplr: 0`, `flipud: 0` — flips destroy digit identity
- `degrees: ≤ 10` — slight rotation ok; 90°+ makes 6↔9 ambiguous
- Include: glare, shadows, partial hand occlusion, empty board, 6/9 ambiguity cases

### 6/9 Disambiguation

1. Physical tile design: underline below digit (like UNO)
2. Train as separate classes: `6-underline`, `9-underline`
3. Orientation constraint from fixed camera angle
4. Context hint from game expectations as last resort

### Ultralytics Licensing

AGPL-3.0 or enterprise. Fine for demo sprint. Flag immediately if commercial use is planned. The architecture commitment is "exportable lightweight classifier," not "Ultralytics specifically." YOLO26 is now available alongside YOLO11 — evaluate both.

---

## 7. Game UX

### Child UX Parameters (Research-Backed)

| Parameter | Value |
|---|---|
| Touch target minimum | 80 × 80 pt (~2.8cm on iPad) |
| Visual acknowledgment | < 200ms (above 500ms children lose causality sense) |
| Font family | Nunito, Fredoka One, or Lexend |
| Label text | ≥ 24pt |
| Numbers | ≥ 48pt |
| Max interactive elements | 2–3 per screen |
| Orientation | Landscape only |
| `prefers-reduced-motion` | Replace spring/bounce with opacity fades |

### Feedback Model

| Event | Response |
|---|---|
| Tile first detected | "Pop" sound + visual highlight (< 200ms) |
| Correct answer confirmed | Confetti + cheer + ascending chime (1.5s) |
| Wrong answer | Gentle wobble + encouragement + soft tone (0.8s) |
| 2nd wrong attempt | Hint: number line or dot visualization |
| Session complete | Star rain + "Well done!" (3s) |

**No punitive language, red X, or buzzer. Ever.**

### Difficulty Progression

| Level | Problem Type | Answer Range |
|---|---|---|
| 1 | Count (match a number) | 1–5 |
| 2 | Simple addition | 1+1 to 5+5 |
| 3 | Missing addend | 3+?=7 |
| 4 | Subtraction | 10–3=? |
| 5 | Teen numbers | Two-tile answers 10–19 |

Adaptive: increase after 3 consecutive correct, decrease after 2 wrong at same level. Session: ~10 min / 15–20 problems, ending with star summary (never wrong-answer counts).

### Game State Machine

```
idle → calibrating → ready → scanning → evaluating → success/retry → session-end
```

Implement via `useReducer` with explicit `GamePhase` and `GameAction` types. Escalate to XState only if state graph grows complex post-MVP.

### Mascot

Skip Rive unless mascot assets exist at sprint start. Motion handles all programmatic feedback.

### Audio

- iOS AudioContext starts suspended — unlock on "Tap to Start"
- `Howler.autoSuspend = false` to prevent 30-sec idle suspend
- Resume on `visibilitychange` if suspended/interrupted
- Audio sprites for fewer HTTP requests
- MP3 or AAC only (no OGG/WebM on iOS)

---

## 8. Frontend Details

### Zustand — Two Update Frequencies

1. **High-frequency (3–10 Hz):** Raw CV detections → `store.subscribe()` (transient, no React renders)
2. **Low-frequency (event-driven):** Game state changes → Zustand selectors (triggers React renders)

Persist only game state to localStorage (score, mute preference), never CV state.

### Motion — Spring Parameters for Children

- Correct answer: stiffness 200–400, damping 8–10 (bouncy, fun)
- Wrong answer: stiffness 200, damping 15+ (gentle settle)
- `whileTap` works on iPad touch; CSS `:hover` does NOT

### Tailwind v4

No `tailwind.config.js`. Everything via CSS `@theme` directive. Use `h-dvh` for dynamic viewport height (handles iOS Safari toolbar). Use `env(safe-area-inset-*)` with `viewport-fit=cover` for notch/home bar.

### Biome v2

`domains: { react: "all" }` covers most React rules. Known gap: `exhaustive-deps`. Manageable for sprint; add slim ESLint overlay post-sprint if needed.

### Progressive Loading

1. **Instant:** App shell + game UI renders
2. **User gesture:** Camera initialized on "Tap to Start"
3. **Background:** Model downloads and compiles (show progress indicator)

Code-split ONNX runtime into its own chunk. Model files in `public/models/`, cached by Service Worker `CacheFirst`.

---

## 9. Physical Design

### Tile Specifications

| Attribute | Spec |
|---|---|
| Font | Verdana or OCR-B, bold |
| Size | 3 × 4 inches (7.5 × 10cm) |
| Color | Black digit on white matte background |
| Border | 3–4mm solid black |
| 6 vs 9 | Underline below digit |
| Material | Laminated cardstock (matte, NOT glossy) |
| Count | Two copies of each digit (0–9) = 20 tiles |

### Camera/Screen Geometry (CRITICAL — Phase 1 Hardware Spike)

The screen must face the child AND the camera must see the play surface. Options to evaluate:

1. **Mirror clip (OSMO approach):** Front camera + mirror/prism redirects view downward. Proven, cheap. Best UX.
2. **Overhead gooseneck mount:** iPad above table, screen angled toward child. Screen readability may suffer.
3. **External USB-C webcam:** Webcam on tripod aimed at surface. Clean separation but adds hardware.
4. **Steep rear-camera angle:** iPad nearly vertical, rear camera points behind device. Poor UX.

The hardware spike tests whichever options are physically available.

---

## 10. Architecture Seams

These interfaces isolate concerns so future expansion doesn't require rewriting core logic. Several start as thin types/wrappers in MVP.

| Seam | Responsibility |
|---|---|
| **FrameSource** | Camera stream, fixture replay, prerecorded playback |
| **SceneLocator** | Play surface detection, ROI extraction, transforms |
| **PreprocessingStrategy** | Crop, rectify, normalize, orientation |
| **RecognitionService** | Model init, inference, dispose (all backends: YOLO, classifier, cloud, mock, fixture) |
| **InterpretationLayer** | Raw detections → semantic answer candidates with ordering/grouping |
| **CalibrationProfile** | Board shape, answer zones, tolerances, confidence thresholds |
| **VocabularyRegistry** | Symbol definitions, label IDs, ambiguity policy |
| **GameEngine** | Problem generation, attempt lifecycle, retry, progression |

### RecognitionService Interface

```typescript
interface RecognitionService {
  readonly name: string;
  initialize(): Promise<void>;
  recognize(frame: ImageData | ImageBitmap): Promise<RecognitionResult>;
  dispose(): void;
}

interface RecognitionResult {
  digits: DetectedDigit[];
  confidence: number;
  latencyMs: number;
  debugInfo?: DebugOverlayData;
}

interface DetectedDigit {
  value: number;
  bbox: BoundingBox;
  confidence: number;
}
```

### GameMode Interface

```typescript
interface GameMode {
  readonly name: string;
  generateProblem(difficulty: number): Problem;
  validateAnswer(problem: Problem, answer: number[]): ValidationResult;
  getHint(problem: Problem, attempt: number): Hint;
}
```

---

## 11. Deployment & Testing

### Cloudflare Pages

Free unlimited static bandwidth. 25MB/file limit fits all models. SPA routing via `_redirects`: `/* /index.html 200`. Security headers via `_headers` file. Pages Functions for API key proxy if cloud VLM is used.

### Security Headers

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; media-src 'self' blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self'
```

Omit COEP for MVP — Safari doesn't support `credentialless` mode, and `numThreads: 1` eliminates the SharedArrayBuffer requirement.

### CI/CD (GitHub Actions)

Three jobs: `quality` (typecheck + lint + test) → `e2e` (build + Playwright WebKit) → `deploy` (Cloudflare Pages on main merge). Install only WebKit browser for Playwright (`npx playwright install webkit`).

### Testing Strategy

| Layer | Tool | What |
|---|---|---|
| Unit | Vitest + happy-dom | Game logic, interpretation, temporal smoothing, answer validation |
| Fixture | Vitest | Labeled frames through recognition pipeline with pass/fail thresholds |
| E2E | Playwright WebKit | Full game loop with mocked recognition |
| Real-device | iPad + cloudflared | Camera behavior, autofocus, thermal — desktop WebKit is not a substitute |

**Playwright WebKit camera caveat:** `grantPermissions` does NOT work on WebKit (issue #11714). Mock `RecognitionService`, not camera API.

### Debug Surfaces

Build early — camera apps are hard to debug from logs:

- **Debug HUD** (`?debug=true`): inference latency, confidence, detection overlays, temporal buffer state
- **Overlay modes** (`?overlay=raw|roi|boxes|crops`): visualization of what the model sees
- **Feature flags** (`?recognition=mock&fixtures=true`): swap backends without rebuilding
- **Fixture capture/replay**: save frames, replay through pipeline deterministically
- **Freeze frame**: hold current frame for inspection

---

## 12. Privacy & Child Safety

- No camera frames leave the device in default product path
- No user accounts, PII storage, or analytics SDKs in child-facing flow (COPPA)
- Cloud VLM (if implemented): disabled by default, adult/dev-gated, explicitly non-default
- API keys via Cloudflare Pages Function proxy, never in client code
- Parent stats gated behind adult-math PIN (e.g., "What is 14 × 3?")

---

## 13. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Model accuracy insufficient | Blocks demo | Tiered fallback: retrain → swap architecture → upgrade to detector → cloud VLM rescue (adult-gated) |
| Custom model not ready in time | Delays integration | Mock RecognitionService unblocks game dev from Day 1; MNIST bridge for early CV integration |
| Camera/screen geometry unsolvable | UX failure | Phase 1 hardware spike tests multiple options |
| iPad thermal throttling | Kills responsiveness | 4fps cap → adaptive 2fps → pause on background |
| iOS camera permission re-prompts | Breaks flow | "Tap to Start" pattern; NotAllowedError retry UI |
| 6 vs 9 confusion | Wrong answers | Underlined tiles + separate training classes |
| Detection flicker / false positives | Frustrating UX | 3-frame temporal stability; motion gate during hand movement |
| Model too large for cold start | Slow first load | Service Worker pre-cache; loading indicator; model < 12MB |
| @tailwindcss/vite peer dep | Install failure | pnpm override; check at setup time |

---

## 14. Open Questions (Resolve Before/During Phase 1)

1. **Answer slots vs. free placement?** — Slots strongly recommended for MVP. Must be locked before planning.
2. **Exact iPad model?** — Camera FOV, focal distance, WebGPU hardware support.
3. **Roboflow access?** — Free tier (public data) or paid? Fallback: PyTorch + Label Studio.
4. **Demo lighting?** — Bring a desk lamp if fluorescent overhead creates glare.
5. **Ultralytics AGPL** — Acceptable for demo; flag for commercial.
6. **Pre-recorded voice prompts?** — Ages 5–6 can't read. ElevenLabs or human recording.
7. **COOP/COEP acceptable?** — Needed for threaded WASM; not needed for single-threaded baseline.
8. **Confirm ONNX Runtime Web is acceptable** (requirements say "such as TensorFlow.js or OpenCV.js" — illustrative, not prescriptive).

---

## 15. Corrections to Earlier Research

| Earlier Claim | Correction |
|---|---|
| `ImageCapture.grabFrame()` works on Safari 18.4+ | **Wrong.** ImageCapture is not in WebKit at all. Hallucination. |
| WebGPU fallback chain `['webgpu', 'wasm']` protects Safari | **Wrong.** All JSEP configs crash identically. WASM-only. |
| FP16 ~6MB is the target model size | **Wrong.** FP16 is 2–7× slower in browser WASM. Ship FP32. |
| INT8 has "no speedup — runtime converts back to fp32" | **Partially wrong.** INT8 is real integer arithmetic. But no compute speedup on Safari because Relaxed SIMD is unavailable. |
| speechSynthesis is option #1 for voice | **Wrong.** Unreliable on iOS Safari. Use pre-recorded audio. |
| Vite 6 is current stable | **Stale.** Vite 7.3.1 is current stable. |
| Touch targets 2cm × 2cm | **Too small.** Research-backed minimum for ages 5–8: 80 × 80pt (~2.8cm). |
| OpenCV.js threaded build works in Workers | **Wrong.** Only non-threaded build works (OpenCV #25790). |

---

## 16. Sources

### Platform
- [WebKit Features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
- [WebKit Features in Safari 26.2](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/)
- [Safari Technology Preview 238](https://webkit.org/blog/17848/release-notes-for-safari-technology-preview-238/)
- [requestVideoFrameCallback — Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)
- [WebKit Bug #234920](https://bugs.webkit.org/show_bug.cgi?id=234920)
- [Relaxed SIMD status](https://web-platform-dx.github.io/web-features-explorer/limited-availability/)

### ONNX Runtime
- [ORT Web docs](https://onnxruntime.ai/docs/tutorials/web/)
- [ORT WebGPU Safari crash — #26827](https://github.com/microsoft/onnxruntime/issues/26827)
- [ORT INT8 no WASM speedup — #21535](https://github.com/microsoft/onnxruntime/issues/21535)
- [ORT Relaxed SIMD — #22533](https://github.com/microsoft/onnxruntime/issues/22533)
- [ORT performance diagnosis](https://onnxruntime.ai/docs/tutorials/web/performance-diagnosis.html)
- [ONNX Model Zoo — MNIST](https://github.com/onnx/models/tree/main/validated/vision/classification/mnist)

### Framework
- [React 19.2](https://react.dev/blog/2025/10/01/react-19-2)
- [React Activity](https://react.dev/reference/react/Activity)
- [Vite 7](https://vite.dev/blog/announcing-vite7)
- [Vite 7 migration](https://vite.dev/guide/migration)
- [@tailwindcss/vite + Vite 7 — #18381](https://github.com/tailwindlabs/tailwindcss/issues/18381)

### Child Safety
- [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)
- [FTC COPPA 2026 policy statement](https://www.ftc.gov/news-events/news/press-releases/2026/02/ftc-issues-coppa-policy-statement-incentivize-use-age-verification-technologies-protect-children)

### Other
- [Ultralytics YOLO docs](https://docs.ultralytics.com/)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [MediaPipe web](https://ai.google.dev/edge/mediapipe/solutions/guide)
- [Playwright WebKit camera permissions — #11714](https://github.com/nicedoc/playwright/issues/11714)
