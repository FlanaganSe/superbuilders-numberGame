# Research: Web Worker Inference Pipeline Architecture

**Date:** 2026-03-11
**Status:** Complete — verified against ORT docs, GitHub issues, caniuse, MDN, and WebKit sources
**Scope:** Frame capture → transfer → inference → results for real-time object detection on iPad Safari

---

## 1. ONNX Runtime Web + Web Worker Setup in Vite

### Current version

ORT Web 1.24.3 is the latest stable release as of 2026-03-11 (published ~March 6, 2026). The 1.24.x line is a patch series; the last major API change that affected Worker usage was v1.19.0 (non-threaded WASM binary removed).

Source: [onnxruntime npm](https://www.npmjs.com/package/onnxruntime-web), [ORT releases](https://github.com/microsoft/onnxruntime/releases)

### Import subpath: `onnxruntime-web/wasm` vs `onnxruntime-web`

Use `import * as ort from 'onnxruntime-web/wasm'` — the `/wasm` conditional subpath excludes the WebGL and WebGPU (JSEP) builds, reducing JS bundle size. This is the only safe path for Safari because the JSEP WASM binary triggers the WebKit OMG JIT crash (ORT issue #26827, still open in 1.24.3).

The `onnxruntime-web` bare import pulls in all execution provider code. The `/wasm` subpath is explicitly documented as a "conditional import" for WASM-EP-only use.

**Known package.json exports issue:** In some ORT versions, the `node` condition for subpaths (including `/wasm`) resolves to `null`, which causes Vite to error with "No known conditions." The fix is to add `resolve.conditions: ['browser']` in `vite.config.ts` or use `optimizeDeps.exclude: ['onnxruntime-web']` to prevent Vite from pre-bundling ORT.

Source: [ORT issue #22361](https://github.com/microsoft/onnxruntime/issues/22361), [ORT deploy docs](https://onnxruntime.ai/docs/tutorials/web/deploy.html)

### WASM binary file in 1.19.0+

As of v1.19.0, the old non-threaded WASM binaries (`ort-wasm.wasm`, `ort-wasm-simd.wasm`) were **removed**. There is now only one non-JSEP binary:

- `ort-wasm-simd-threaded.wasm` — the standard build used by `onnxruntime-web/wasm`

The name is misleading: `numThreads: 1` makes it run single-threaded, and it does NOT require `crossOriginIsolated=true` in single-thread mode. The SharedArrayBuffer path is only activated when `numThreads > 1`.

Source: [ORT issue #25666](https://github.com/microsoft/onnxruntime/issues/25666), [ORT issue #21811](https://github.com/microsoft/onnxruntime/issues/21811)

### wasmPaths configuration

`ort.env.wasm.wasmPaths` accepts either a string path prefix or an object mapping filename → URL:

```typescript
// String prefix (trailing slash required):
ort.env.wasm.wasmPaths = '/';

// Object mapping (exhaustive for non-JSEP build):
ort.env.wasm.wasmPaths = {
  'ort-wasm-simd-threaded.wasm': '/ort-wasm-simd-threaded.wasm',
};
```

**Critical:** The WASM files must be served from the same origin as the JS bundle. In a Worker, relative paths resolve against the worker script URL, not the page URL — this causes failures if the worker is served from a different path. Always use absolute paths (e.g., `'/'` prefix) when running ORT inside a Worker.

Source: [ORT env flags docs](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html), [ORT issue #25096](https://github.com/microsoft/onnxruntime/issues/25096), [ORT issue #22504](https://github.com/microsoft/onnxruntime/issues/22504)

### Vite worker creation: three patterns

Vite 7 supports three patterns for worker creation. The standard-closest approach is recommended:

**Pattern 1 — `new URL()` + `new Worker()` (Vite-recommended):**
```typescript
// In component or hook:
const worker = new Worker(
  new URL('./inference.worker.ts', import.meta.url),
  { type: 'module' }
);
```
This is what Vite docs call the "standards-leaning" approach. During development, Vite serves the worker as a module. During production build, Vite compiles it away (no browser module worker required in production).

**Pattern 2 — `?worker` suffix:**
```typescript
import InferenceWorker from './inference.worker?worker';
const worker = new InferenceWorker();
```
Returns a constructor. Worker code is bundled separately.

**Pattern 3 — `?worker&inline`:**
Inlines as base64. Avoids a separate request but inflates the main bundle. Not recommended for a large worker like an ORT session manager.

**Recommendation:** Use Pattern 1 (`new URL()` + `{ type: 'module' }`). It is the documented recommendation in Vite 7, works in CI without special configuration, and is closer to the web standard.

**Vite config requirement for workers:**
```typescript
// vite.config.ts
export default defineConfig({
  worker: {
    format: 'es',  // required for ESM workers
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],  // prevent pre-bundling
  },
  assetsInclude: ['**/*.onnx'],    // treat .onnx as asset (gets hash + copy)
  plugins: [
    viteStaticCopy({
      targets: [{
        src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
        dest: '.',
      }],
    }),
  ],
});
```

Source: [Vite features docs](https://vite.dev/guide/features), [vite-web-workers-demo](https://github.com/andrewsosa/vite-web-workers-demo), [typeonce.dev Vite workers](https://www.typeonce.dev/snippet/vite-js-type-safe-web-worker-with-react)

### Module workers in Safari: supported since Safari 15

`new Worker(url, { type: 'module' })` is supported in Safari 15+ (iOS and macOS). For the target platform (Safari 26/iOS 26), this is a non-issue.

Source: [caniuse worker ECMAScript modules](https://caniuse.com/mdn-api_worker_worker_ecmascript_modules)

### TypeScript typing for Worker messages

Use discriminated unions. The `satisfies` operator (TypeScript 4.9+) gives compile-time checks without widening the type:

```typescript
// worker-protocol.ts (shared between main thread and worker)
export type MainToWorker =
  | { type: 'init'; modelUrl: string }
  | { type: 'infer'; bitmap: ImageBitmap; width: number; height: number };

export type WorkerToMain =
  | { type: 'ready' }
  | { type: 'detections'; results: DetectedDigit[] }
  | { type: 'error'; message: string };
```

```typescript
// In inference.worker.ts:
self.onmessage = (e: MessageEvent<MainToWorker>) => { ... };
self.postMessage({ type: 'ready' } satisfies WorkerToMain);

// In main thread:
worker.onmessage = (e: MessageEvent<WorkerToMain>) => { ... };
worker.postMessage({ type: 'init', modelUrl } satisfies MainToWorker);
```

Source: [typeonce.dev Vite workers](https://www.typeonce.dev/snippet/vite-js-type-safe-web-worker-with-react)

### Full worker bootstrap pattern

```typescript
// inference.worker.ts
import * as ort from 'onnxruntime-web/wasm';
import type { MainToWorker, WorkerToMain } from './worker-protocol';

// Must be set before any InferenceSession.create() call
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = '/';  // absolute — worker URL resolution otherwise breaks this

let session: ort.InferenceSession | null = null;

self.onmessage = async (e: MessageEvent<MainToWorker>): Promise<void> => {
  const { data } = e;
  if (data.type === 'init') {
    try {
      session = await ort.InferenceSession.create(data.modelUrl, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      (self.postMessage as (msg: WorkerToMain) => void)({ type: 'ready' });
    } catch (err) {
      (self.postMessage as (msg: WorkerToMain) => void)({
        type: 'error',
        message: String(err),
      });
    }
    return;
  }
  if (data.type === 'infer' && session) {
    // ... preprocessing + inference (see Section 5)
  }
};
```

---

## 2. Frame Transfer Pattern

### requestVideoFrameCallback exact usage

```typescript
const scheduleCapture = (): void => {
  videoEl.requestVideoFrameCallback(onFrame);
};

const onFrame = async (_now: DOMHighResTimeStamp, _meta: VideoFrameCallbackMetadata): Promise<void> => {
  if (!workerBusy) {
    captureAndSend();
  }
  // Re-register for next frame only if still active
  if (inferenceActive) {
    videoEl.requestVideoFrameCallback(onFrame);
  }
};
```

The callback receives: `now` (DOMHighResTimeStamp), `metadata` (includes `width`, `height`, `mediaTime`, `presentedFrames`, `processingDuration`). The `presentedFrames` counter is useful for detecting dropped frames.

Supported since **Safari 15.4** (iOS 15.4). This is a non-issue for Safari 26.

Source: [web.dev rVFC article](https://web.dev/articles/requestvideoframecallback-rvfc), [MDN rVFC](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)

### Main thread: drawImage → createImageBitmap → transfer

```typescript
const captureAndSend = async (): Promise<void> => {
  if (workerBusy || !session) return;
  workerBusy = true;

  // Step 1: draw video to capture canvas (NOT createImageBitmap(video) — WebKit #234920)
  captureCtx.drawImage(videoEl, 0, 0, CAPTURE_W, CAPTURE_H);

  // Step 2: createImageBitmap from canvas (GPU-accelerated path)
  const bitmap = await createImageBitmap(captureCanvas);

  // Step 3: transfer zero-copy to worker
  worker.postMessage(
    { type: 'infer', bitmap, width: CAPTURE_W, height: CAPTURE_H } satisfies MainToWorker,
    [bitmap]  // transfer list — bitmap is neutered on main thread after this
  );
  // bitmap is now invalid on main thread; do NOT call bitmap.close() here
};
```

**Zero-copy semantics:** After `postMessage([bitmap], [bitmap])`, the `bitmap` reference on the main thread becomes neutered (accessing `.width` throws). The worker now owns the object. No copy occurs.

Source: [MDN Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects), [MDN ImageBitmap.close()](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap/close)

### OffscreenCanvas in Worker — Safari support status

**VERIFIED:** OffscreenCanvas with 2D context is **fully supported in Safari iOS 17.0+**. Partial support existed in iOS 16.2–16.7. The target platform (Safari 26 / iOS 26) has full support, including inside Web Workers.

The OffscreenCanvas 2D context in a Worker is the correct path for `drawImage(bitmap)` → `getImageData()` inside the worker.

Source: [caniuse OffscreenCanvas](https://caniuse.com/offscreencanvas), [MDN OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)

---

## 3. Back-Pressure / Frame Dropping

### The "busy flag" pattern

The correct pattern is a single boolean flag, checked synchronously before any async work:

```typescript
// Main thread:
let workerBusy = false;

const onFrame = (_now: DOMHighResTimeStamp, _meta: VideoFrameCallbackMetadata): void => {
  if (!workerBusy) {
    workerBusy = true;
    captureAndSend(); // async, but flag is set synchronously
  }
  if (inferenceActive) {
    videoEl.requestVideoFrameCallback(onFrame);
  }
};

// Reset flag when worker responds:
worker.onmessage = (e: MessageEvent<WorkerToMain>): void => {
  if (e.data.type === 'detections') {
    workerBusy = false;
    handleDetections(e.data.results);
  }
};
```

**Key property:** `requestVideoFrameCallback` fires at display frame rate (up to 60fps on iPad). The busy flag ensures inference runs at its natural rate (4–10fps under normal load), and every intervening frame is silently dropped. No queue ever builds. This is the correct "drop frames, never queue" pattern.

**What happens if you postMessage while worker is busy?** Nothing fails — the message goes into the worker's message queue and processes sequentially. This is exactly the problem the busy flag prevents: without it, frames pile up in the queue, causing increasing latency and eventual stall.

Source: [web.dev rVFC](https://web.dev/articles/requestvideoframecallback-rvfc), [Streams back-pressure](https://webrtchacks.com/real-time-video-processing-with-webcodecs-and-streams-processing-pipelines-part-1/)

### Adaptive rate control (on top of busy flag)

Track inference latency. If latency > 150ms, reduce effective rate by not re-registering rVFC every frame:

```typescript
let skipFrames = 0;
let frameCount = 0;

const onFrame = (_now: DOMHighResTimeStamp): void => {
  if (frameCount++ % (skipFrames + 1) === 0 && !workerBusy) {
    workerBusy = true;
    captureAndSend();
  }
  if (inferenceActive) {
    videoEl.requestVideoFrameCallback(onFrame);
  }
};

// In detections handler: update skipFrames based on latencyMs
```

---

## 4. ImageBitmap Lifecycle

### When to call bitmap.close()

**Always close in the Worker, after preprocessing is complete** — not before, not in the main thread.

```typescript
// Inside inference.worker.ts, in the 'infer' handler:
self.onmessage = async (e: MessageEvent<MainToWorker>): Promise<void> => {
  if (e.data.type === 'infer') {
    const { bitmap, width, height } = e.data;
    try {
      const float32 = preprocessBitmap(bitmap, width, height); // uses bitmap
      bitmap.close(); // explicit GPU memory release — do this immediately after use
      // ... run inference with float32
    } catch (err) {
      bitmap.close(); // also close on error path
      // ... post error
    }
  }
};
```

**Why close explicitly?** `ImageBitmap.close()` disposes GPU/hardware resources associated with the bitmap. Without it, the resources are held until garbage collection — which in a tight inference loop (4–10fps) means accumulating dozens of unreleased GPU buffers before GC runs. On iOS, this causes visible memory pressure and can trigger the OS to kill the tab.

**After transfer to worker:** The main thread reference is already neutered, so the main thread cannot call `close()`. Only the worker can.

Source: [MDN ImageBitmap.close()](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap/close), [WHATWG spec](https://html.spec.whatwg.org/dev/imagebitmap-and-animations.html)

### Canvas cleanup: `.width = 0; .height = 0`

Setting canvas dimensions to zero explicitly destroys the canvas surface and releases the GPU backing store. This is especially important on Safari/iOS, which has a hard limit on total canvas memory. Without this, releasing the JS reference still leaves the backing buffer alive until GC.

**When to do this:** Only when tearing down the camera session entirely (component unmount, tab close). Do NOT do this between frames — recreating canvas surfaces mid-session is expensive and causes jank. Keep one capture canvas alive for the session duration.

Source: [Konva canvas memory docs](https://konvajs.org/docs/performance/Avoid_Memory_Leaks.html), [PQINA canvas memory limit](https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit)

---

## 5. Preprocessing in Worker

### Full preprocessing pipeline

```typescript
const MODEL_INPUT_SIZE = 640; // or 320

const preprocessBitmap = (
  bitmap: ImageBitmap,
  srcWidth: number,
  srcHeight: number
): Float32Array => {
  // 1. Create OffscreenCanvas at model input size
  const canvas = new OffscreenCanvas(MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('no 2d context');

  // 2. Letterbox resize (preserve aspect ratio, pad with gray)
  const scale = Math.min(MODEL_INPUT_SIZE / srcWidth, MODEL_INPUT_SIZE / srcHeight);
  const scaledW = Math.round(srcWidth * scale);
  const scaledH = Math.round(srcHeight * scale);
  const offsetX = Math.round((MODEL_INPUT_SIZE - scaledW) / 2);
  const offsetY = Math.round((MODEL_INPUT_SIZE - scaledH) / 2);

  ctx.fillStyle = '#808080'; // YOLO uses gray padding
  ctx.fillRect(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  ctx.drawImage(bitmap, offsetX, offsetY, scaledW, scaledH);

  // 3. Extract pixel data
  const imageData = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const { data } = imageData; // Uint8ClampedArray, RGBA interleaved

  // 4. Convert RGBA → planar RGB Float32 normalized to [0, 1]
  //    ONNX/YOLO expects [1, 3, H, W] — channels-first
  const pixelCount = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  const float32 = new Float32Array(3 * pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    float32[i]                   = data[i * 4]     / 255.0; // R
    float32[i + pixelCount]      = data[i * 4 + 1] / 255.0; // G
    float32[i + pixelCount * 2]  = data[i * 4 + 2] / 255.0; // B
    // Alpha channel (i * 4 + 3) discarded
  }

  return float32;
};
```

**`willReadFrequently: true`** on OffscreenCanvas forces software rasterization, which is slower on GPU-accelerated writes but faster on `getImageData()` reads. Since we call `getImageData()` exactly once per frame and `drawImage()` exactly once per frame, benchmark both approaches. For a 640×640 canvas with a single draw+read cycle, the tradeoff is context-dependent — the ORT preprocessing tutorial uses hardware canvas without `willReadFrequently`, which is fine if the GPU→CPU readback is acceptable.

**Aspect ratio handling:** Letterboxing (scale to fit, pad remainder with gray) is the standard YOLO preprocessing approach. The scale factors must be saved to unproject bounding boxes back to original frame coordinates:

```typescript
// Store these for postprocessing:
const scaleX = scaledW / MODEL_INPUT_SIZE;
const scaleY = scaledH / MODEL_INPUT_SIZE;
const padX = offsetX / MODEL_INPUT_SIZE;
const padY = offsetY / MODEL_INPUT_SIZE;
```

Source: [ORT classify images tutorial](https://onnxruntime.ai/docs/tutorials/web/classify-images-nextjs-github-template.html), [Ultralytics YOLO issue #17763](https://github.com/ultralytics/ultralytics/issues/17763)

---

## 6. Worker Communication Protocol

### Full discriminated union message protocol

```typescript
// src/workers/inference-protocol.ts

export type MainToWorker =
  | { type: 'init'; modelUrl: string }
  | { type: 'infer'; bitmap: ImageBitmap; width: number; height: number }
  | { type: 'terminate' };

export type WorkerToMain =
  | { type: 'ready' }
  | { type: 'detections'; results: DetectedDigit[]; latencyMs: number }
  | { type: 'error'; message: string; fatal: boolean };

export interface DetectedDigit {
  value: number;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number }; // normalized 0–1
}
```

### Initialization flow

Model loading is async (~1–3s first load, ~100ms from SW cache). The worker must signal readiness before the main thread sends `'infer'` messages:

```
Main: new Worker(url, { type: 'module' })
Main: worker.postMessage({ type: 'init', modelUrl: '/models/yolo11n.onnx' })
Worker: ort.InferenceSession.create(...) [blocks ~1–3s]
Worker: postMessage({ type: 'ready' })
Main: sets workerReady = true
Main: begins requestVideoFrameCallback loop
```

Display a loading indicator between `new Worker()` and receiving `'ready'`.

### Termination and cleanup

```typescript
// Main thread cleanup (on component unmount or session end):
const cleanup = (): void => {
  inferenceActive = false;
  worker.postMessage({ type: 'terminate' } satisfies MainToWorker);
  // Give worker time to clean up, then terminate
  setTimeout(() => worker.terminate(), 100);
};

// Worker side:
if (data.type === 'terminate') {
  if (session) {
    session.release(); // ORT cleanup
    session = null;
  }
  self.close(); // terminates the worker
}
```

---

## 7. Service Worker Caching for Model Files

### vite-plugin-pwa with Workbox

The recommended approach is `vite-plugin-pwa` using Workbox's `generateSW` strategy with `runtimeCaching` for large binary files.

```typescript
// vite.config.ts additions
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  strategies: 'generateSW',
  registerType: 'autoUpdate',
  workbox: {
    // Bump the precache limit — default 2MB blocks .onnx and .wasm
    maximumFileSizeToCacheInBytes: 30 * 1024 * 1024, // 30MB
    // Precache the WASM runtime binary:
    globPatterns: ['**/*.{js,css,html,wasm}'],
    // Runtime cache for model files (loaded on demand, not precached):
    runtimeCaching: [
      {
        urlPattern: /\/models\/.*\.onnx$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'onnx-models',
          expiration: {
            maxEntries: 5,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})
```

**`maximumFileSizeToCacheInBytes`:** Workbox defaults to 2MB, which silently excludes `.onnx` (~10MB) and `.wasm` (~8MB) from precaching. Must be raised. Setting to 30MB covers both. For precaching, use `globPatterns` that include `*.wasm`; for `.onnx` files loaded at runtime (not at install time), use `runtimeCaching` with `CacheFirst`.

**Cache invalidation:** `CacheFirst` never re-fetches once cached. To force invalidation when the model changes, include a version hash in the filename (e.g., `yolo11n.abc123.onnx`) and update the URL reference in the app.

### Workbox vs hand-written service worker

Use vite-plugin-pwa + Workbox. The hand-written alternative is 200+ lines of boilerplate for cache-first, cache versioning, and SW registration lifecycle — Workbox handles all of this correctly. The only reason to write by hand is if you need a custom caching strategy Workbox doesn't support (not the case here).

### Does vite-plugin-pwa work for this? Yes

It supports Vite 7, Workbox 7+, and the `runtimeCaching` configuration described above. WASM and ONNX model caching via this setup is a documented community pattern.

Source: [vite-plugin-pwa generate-sw](https://vite-pwa-org.netlify.app/workbox/generate-sw), [workbox issue #2653](https://github.com/GoogleChrome/workbox/issues/2653), [vite-plugin-pwa GitHub](https://github.com/vite-pwa/vite-plugin-pwa)

---

## 8. Safari-Specific Worker Gotchas

### Module workers: supported since Safari 15

`new Worker(url, { type: 'module' })` is supported in **Safari 15+** on both macOS and iOS. Nested workers were added in Safari 15.5. The target platform (Safari 26) has no issues here.

Source: [caniuse worker ECMAScript modules](https://caniuse.com/mdn-api_worker_worker_ecmascript_modules)

### SharedArrayBuffer: NOT available without COOP/COEP

SharedArrayBuffer requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`). Safari does not support `credentialless` mode. Cloudflare Pages allows setting COOP/COEP via `_headers` but this may break embedded cross-origin resources.

**For this project: irrelevant.** `numThreads: 1` means the threaded WASM binary (`ort-wasm-simd-threaded.wasm`) runs without spawning any threading worker, and does not need SharedArrayBuffer. Do not set `crossOriginIsolated` headers for MVP.

Source: [ORT issue #25666](https://github.com/microsoft/onnxruntime/issues/25666), [docs/research.md:536](../docs/research.md)

### WASM SIMD in Workers on Safari

Standard fixed-width 128-bit WASM SIMD is **fully supported in Safari 26 / iOS 26**. SIMD works inside Web Workers. The `ort-wasm-simd-threaded.wasm` binary (which ORT selects automatically for SIMD-capable environments) runs correctly.

**Relaxed SIMD is NOT available on Safari.** Only `relaxed_laneselect` (bitmask-select subset) shipped. The `i16x8.dot_i8x16_i7x16_s` instruction needed for efficient INT8 matmul is absent. ORT detects this at runtime via `env.wasm.relaxedSimd: false`. No manual configuration needed — ORT falls back gracefully to standard SIMD ops.

Source: [docs/research.md:53](../docs/research.md), [caniuse WASM SIMD](https://www.testmuai.com/web-technologies/wasm-simd-safari/)

### Worker performance on iPad

No direct benchmarks for ORT in a dedicated Worker on iPad Safari were found. From ORT's own performance data and community reports, WASM SIMD single-threaded inference on iPad class hardware at 640×640 input:

- **Warm inference:** ~40–80ms (consistent with docs/research.md)
- **Cold first inference:** 2–5s (WASM JIT compilation)
- **Worker overhead vs main thread:** Negligible — the Worker itself adds <1ms per message round-trip; the preprocessing is the dominant cost

Safari 26's in-place WASM interpreter improvement (announced at WWDC25) reduces the JIT compilation cost for the first-run cold start.

Source: [docs/research.md:304](../docs/research.md), [WebKit WWDC25 announcement](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)

### Known issues with Web Workers on iOS Safari

1. **ORT proxy worker (`env.wasm.proxy = true`):** The built-in ORT proxy feature creates an internal worker. When you are already running ORT inside a Worker (which is this project's approach), do NOT also enable `proxy`. The proxy feature is an alternative approach for main-thread ORT — using it inside a Worker causes nested workers, which adds complexity and has historically had issues.

2. **WASM path resolution inside worker:** This is the #1 failure mode. ORT attempts to fetch WASM files relative to the worker script URL when running inside a Worker. If the worker script is at `/assets/inference.worker.abc123.js`, ORT resolves WASM paths relative to `/assets/`. The fix is `ort.env.wasm.wasmPaths = '/'` (absolute path to document root).

3. **Dynamic import inside worker:** ORT uses dynamic import internally. In Safari, this has historically worked in module workers but not in classic workers. Using `{ type: 'module' }` in the Worker constructor is required.

4. **No issues with OffscreenCanvas 2D in Workers on Safari 17+:** Confirmed fully supported.

Source: [ORT issue #25096](https://github.com/microsoft/onnxruntime/issues/25096), [ORT web demo issue #15](https://github.com/microsoft/onnxruntime-web-demo/issues/15), [caniuse OffscreenCanvas](https://caniuse.com/offscreencanvas)

---

## Constraints

1. **JSEP/WebGPU path must not be used on Safari** — ORT issue #26827 is open and unresolved in 1.24.3. `onnxruntime-web/wasm` subpath only.
2. **`numThreads = 1` is mandatory** — avoids COOP/COEP requirement; single-thread is sufficient for YOLO-Nano at 4–10fps.
3. **`wasmPaths` must be absolute** — Worker URL resolution breaks relative paths.
4. **OffscreenCanvas 2D in Worker requires iOS 16.2+ (partial), iOS 17+ (full)** — fully safe for Safari 26 target.
5. **Module worker (`type: 'module'`) required** — ORT uses dynamic import internally.
6. **Canvas `.width = 0; .height = 0` only on session teardown** — not between frames.
7. **`bitmap.close()` always in Worker** — GPU memory leak otherwise.
8. **Workbox `maximumFileSizeToCacheInBytes` must be raised** — default 2MB blocks `.onnx` and `.wasm`.

---

## Options

### Option A — ORT in dedicated module worker (RECOMMENDED)

Inference session lives entirely in a `type: 'module'` dedicated Worker. Main thread does rVFC → drawImage → createImageBitmap → postMessage(bitmap, [bitmap]). Worker preprocesses via OffscreenCanvas, runs ORT, posts detections back.

**Trade-offs:**
- (+) Clean separation of concerns
- (+) No main thread blocking, ever
- (+) OffscreenCanvas 2D preprocessing in Worker is fully supported on Safari 26
- (+) Module worker is the correct ORT import mechanism
- (-) One extra message round-trip per frame (~0.5ms overhead — negligible)
- (-) `wasmPaths` must be absolute — easy to miss, causes cryptic failures

### Option B — ORT in worker, preprocessing on main thread

Main thread: rVFC → drawImage → getImageData → build Float32Array → postMessage(float32). Worker: receive Float32Array → run ORT → post detections.

**Trade-offs:**
- (+) Avoids OffscreenCanvas-in-worker (eliminating one potential Safari compat concern, though it is not an actual concern for Safari 26)
- (+) Float32Array is also transferable (zero-copy if in an ArrayBuffer)
- (-) Preprocessing on main thread (light but still some CPU time)
- (-) ArrayBuffer transfer means you need a pre-allocated buffer pool to avoid GC pressure
- (-) More complex main thread code

### Option C — ORT proxy mode (main thread)

Use ORT's built-in `env.wasm.proxy = true` to have ORT internally manage a Worker for its own computation.

**Trade-offs:**
- (+) Simpler setup — no manual Worker code
- (-) Requires Blob URL worker creation, which may conflict with strict CSP
- (-) Not compatible with WebGPU EP
- (-) Does not fix the JSEP crash — `proxy: true` still uses JSEP binary if configured
- (-) Less control over frame scheduling and back-pressure
- (-) Internal ORT worker had historical issues in Vite builds ([ORT web demo issue #15](https://github.com/microsoft/onnxruntime-web-demo/issues/15))

---

## Recommendation

**Use Option A (ORT in dedicated module worker).**

This is the pattern the existing research (`docs/research.md:section 5`) already describes. The OffscreenCanvas concern for Safari is resolved — full support exists from iOS 17+, and the target is iOS 26. The only non-obvious requirement is `wasmPaths = '/'` (absolute), which must be set before any `InferenceSession.create()` call inside the worker.

The complete architecture in implementation order:

1. Define `inference-protocol.ts` with discriminated union message types
2. Implement `inference.worker.ts` with absolute `wasmPaths`, `numThreads: 1`, init/infer/terminate handlers, OffscreenCanvas preprocessing, `bitmap.close()` after each use
3. Create the worker in the `FrameSource` / `RecognitionService` layer using `new Worker(new URL('./inference.worker.ts', import.meta.url), { type: 'module' })`
4. Implement the busy-flag frame drop in the rVFC callback
5. Wire vite-plugin-pwa with `maximumFileSizeToCacheInBytes: 30MB` and `runtimeCaching` CacheFirst for `.onnx`
6. Copy `ort-wasm-simd-threaded.wasm` to `public/` via `vite-plugin-static-copy`
7. Test with `?debug=true` HUD showing inference latency to verify the busy flag is working correctly

---

## Sources

- [ONNX Runtime Web deploy docs](https://onnxruntime.ai/docs/tutorials/web/deploy.html)
- [ORT env flags docs](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html)
- [ORT issue #26827 — Safari JSEP crash](https://github.com/microsoft/onnxruntime/issues/26827)
- [ORT issue #25096 — Worker import failure](https://github.com/microsoft/onnxruntime/issues/25096)
- [ORT issue #25666 — threaded/non-threaded WASM clarification](https://github.com/microsoft/onnxruntime/issues/25666)
- [ORT issue #21811 — missing WASM binaries in 1.19.0](https://github.com/microsoft/onnxruntime/issues/21811)
- [ORT issue #22361 — Vite node condition null error](https://github.com/microsoft/onnxruntime/issues/22361)
- [ORT web demo issue #15 — Vite bundler incompatibility](https://github.com/microsoft/onnxruntime-web-demo/issues/15)
- [ORT classify images tutorial](https://onnxruntime.ai/docs/tutorials/web/classify-images-nextjs-github-template.html)
- [Vite features docs — Web Workers](https://vite.dev/guide/features)
- [typeonce.dev — type-safe Vite workers](https://www.typeonce.dev/snippet/vite-js-type-safe-web-worker-with-react)
- [caniuse — worker ECMAScript modules](https://caniuse.com/mdn-api_worker_worker_ecmascript_modules)
- [caniuse — OffscreenCanvas](https://caniuse.com/offscreencanvas)
- [MDN — Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
- [MDN — ImageBitmap.close()](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap/close)
- [MDN — requestVideoFrameCallback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)
- [web.dev — rVFC article](https://web.dev/articles/requestvideoframecallback-rvfc)
- [web.dev — OffscreenCanvas article](https://web.dev/articles/offscreen-canvas)
- [vite-plugin-pwa generate-sw](https://vite-pwa-org.netlify.app/workbox/generate-sw)
- [Workbox issue #2653 — maximumFileSizeToCacheInBytes](https://github.com/GoogleChrome/workbox/issues/2653)
- [WebKit WWDC25 Safari 26 announcement](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)
- [Canvas memory management — Konva](https://konvajs.org/docs/performance/Avoid_Memory_Leaks.html)
- [Canvas memory limit — PQINA](https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit)
- [ORT WasmFilePaths API reference](https://onnxruntime.ai/docs/api/js/interfaces/Env.WasmFilePaths.html)
- [schiener.io — willReadFrequently explainer](https://www.schiener.io/2024-08-02/canvas-willreadfrequently)
