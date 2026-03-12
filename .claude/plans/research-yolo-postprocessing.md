# Research: YOLO11 Detection Post-Processing in Browser Web Worker

**Date:** 2026-03-11
**Scope:** YOLO11n detection model (10 classes: digits 0–9), ONNX export, ONNX Runtime Web WASM, Web Worker, iPad Safari
**Status:** Final — verified against Ultralytics issues, ORT docs, and working open-source implementations

---

## 1. Current State

The existing research (`docs/research.md` §5) establishes:
- ORT WASM-only is mandatory (JSEP/WebGPU crashes Safari WebKit 26.2, issue #26827)
- Worker pattern is defined (`onnxruntime-web/wasm` subpath, `numThreads: 1`)
- Output shape for 10-class model is `float32[1, 14, 8400]`
- The worker message skeleton exists conceptually

What is missing: the verified, step-by-step implementation of every stage from `ImageBitmap` received in the worker through to `DetectedDigit[]` returned to the main thread. This document fills that gap.

---

## 2. Constraints

These cannot change (from `docs/research.md` and `.claude/rules/immutable.md`):

| Constraint | Source | Why |
|---|---|---|
| Import `onnxruntime-web/wasm` subpath only | docs/research.md §5 | JSEP build crashes Safari 26.2 |
| `numThreads: 1` | docs/research.md §5 | No SharedArrayBuffer without COOP/COEP; Safari limitation |
| CV must not block UI thread | `.claude/rules/immutable.md` | Worker-only inference |
| `bitmap.close()` required after use | docs/research.md §4 | GPU memory leak otherwise |
| No sigmoid needed on YOLO11/v8 output | Ultralytics issues #751, #14131 | Model applies sigmoid internally at export |
| Confidence threshold ≥ 0.65 | `docs/research.md` §3, prd.md §23 | PRD requirement |
| NMS IoU threshold ~0.45 | prd.md §24 | PRD requirement |
| FP32 model, not FP16/INT8 | docs/research.md §2 | FP16 slower in WASM; INT8 no speedup without Relaxed SIMD |

---

## 3. YOLO11 Output Tensor Format (Verified)

### Shape

For a model with `N` classes exported at input size `S×S`:

```
output shape: float32[1, 4+N, num_anchors]
```

For YOLO11n with 10 classes at 640×640:
- `num_anchors = 8400` (= 80×80 + 40×40 + 20×20 = 6400 + 1600 + 400)
- Output: `float32[1, 14, 8400]`

For 320×320 input:
- `num_anchors = 2100` (= 1600 + 400 + 100)
- Output: `float32[1, 14, 2100]`

**Sources:**
- Ultralytics discussion #17254: "Output tensor of Yolo11"
- Ultralytics issue #14131: "yolov8n onnx model outputs [1, 84, 8400]"
- Ultralytics issue #7739: confirmed channel-major layout

### Channel layout

The 14 channels (rows) are:
```
channel 0:  cx   — bounding box center x, normalized to [0, inputWidth]
channel 1:  cy   — bounding box center y, normalized to [0, inputHeight]
channel 2:  w    — bounding box width, normalized to [0, inputWidth]
channel 3:  h    — bounding box height, normalized to [0, inputHeight]
channel 4:  score for class 0 (digit "0")
channel 5:  score for class 1 (digit "1")
...
channel 13: score for class 9 (digit "9")
```

**Critical facts:**
1. There is NO separate objectness/confidence score. YOLO11 (like YOLOv8) dropped the dedicated objectness channel present in YOLOv5. The per-class score IS the detection confidence. Source: Ultralytics issue #751, discussion #778.
2. Sigmoid activation is already applied by the model at export time. Do NOT apply sigmoid again. Source: Ultralytics discussion #20712.
3. Box coordinates are in `[0, inputSize]` pixel space (e.g., 0–640), NOT normalized [0, 1]. Source: Ultralytics issue #7739 and working implementations.

### Memory layout (flat Float32Array indexing)

The tensor is stored in **channel-major (C-contiguous) order**: all 8400 values for channel 0 come first, then all 8400 for channel 1, etc.

```
flat index = channel * num_anchors + anchor_index
```

Examples for a 640×640 model (num_anchors = 8400):
```javascript
const cx    = output[0 * 8400 + i];   // channel 0, anchor i
const cy    = output[1 * 8400 + i];   // channel 1, anchor i
const w     = output[2 * 8400 + i];   // channel 2, anchor i
const h     = output[3 * 8400 + i];   // channel 3, anchor i
const score0 = output[4 * 8400 + i];  // class 0 score, anchor i
const score1 = output[5 * 8400 + i];  // class 1 score, anchor i
// ...
const score9 = output[13 * 8400 + i]; // class 9 score, anchor i
```

**A common bug** treats the flat array as row-major `[numAnchors, numChannels]` with index `i * 14 + channel`. This produces silently wrong results. The correct formula is `channel * numAnchors + i`. Confirmed in Ultralytics issue #7739 fix.

---

## 4. Input Preprocessing

### Expected input tensor

```
float32[1, 3, inputH, inputW]   — channel-first (NCHW)
```

Standard input: `[1, 3, 640, 640]` or `[1, 3, 320, 320]` (see §9 for resolution tradeoffs).

### Normalization

Normalize to `[0, 1]` by dividing each pixel value by 255. Source: Ultralytics export docs and all working JavaScript implementations.

```
pixelNormalized = rawPixelValue / 255.0
```

Do NOT use ImageNet mean/std subtraction or normalize to `[-1, 1]`. YOLO models expect `[0, 1]`.

### Channel order

**RGB** — not BGR. Canvas `getImageData` provides RGBA in red-first order, which matches what the YOLO model expects. No channel swap needed.

Source: Ultralytics docs; YOLO training pipeline uses RGB internally. Most Python implementations that do BGR→RGB conversion are working from OpenCV which loads in BGR — not relevant to canvas.

### Letterboxing

Resize the source image to fit inside `inputSize × inputSize` while preserving aspect ratio, then pad the remainder with gray (value 114/255 = 0.447). This is the Ultralytics default — using value 114 for padding matches training behavior.

**Why letterbox instead of stretch:** Stretching distorts aspect ratios and degrades accuracy. The model was trained on letterboxed images.

**Scale and padding calculation:**

```typescript
function computeLetterbox(
  srcW: number, srcH: number, targetSize: number
): { scale: number; padX: number; padY: number } {
  const scale = Math.min(targetSize / srcW, targetSize / srcH);
  const scaledW = Math.round(srcW * scale);
  const scaledH = Math.round(srcH * scale);
  const padX = Math.floor((targetSize - scaledW) / 2);
  const padY = Math.floor((targetSize - scaledH) / 2);
  return { scale, padX, padY };
}
```

### ImageBitmap → Float32Array in a Web Worker

The worker receives an `ImageBitmap` transferred from the main thread (zero-copy). The correct approach in a Worker uses `OffscreenCanvas`:

```typescript
function preprocessToFloat32(
  bitmap: ImageBitmap,
  targetSize: number
): { tensor: Float32Array; padX: number; padY: number; scale: number } {
  const { scale, padX, padY } = computeLetterbox(
    bitmap.width, bitmap.height, targetSize
  );

  // Create OffscreenCanvas — available in Workers since iOS 16.4+
  const canvas = new OffscreenCanvas(targetSize, targetSize);
  const ctx = canvas.getContext('2d')!;

  // Fill with letterbox gray (114/255)
  ctx.fillStyle = `rgb(114,114,114)`;
  ctx.fillRect(0, 0, targetSize, targetSize);

  // Draw image scaled and padded
  const scaledW = Math.round(bitmap.width * scale);
  const scaledH = Math.round(bitmap.height * scale);
  ctx.drawImage(bitmap, padX, padY, scaledW, scaledH);

  const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
  const { data } = imageData; // Uint8ClampedArray, RGBA interleaved

  const numPixels = targetSize * targetSize;
  const float32 = new Float32Array(3 * numPixels);

  // Convert RGBA interleaved → RGB channel-first (NCHW), normalize to [0,1]
  for (let i = 0; i < numPixels; i++) {
    float32[i]                 = data[i * 4]     / 255; // R channel
    float32[numPixels + i]     = data[i * 4 + 1] / 255; // G channel
    float32[2 * numPixels + i] = data[i * 4 + 2] / 255; // B channel
  }

  return { tensor: float32, padX, padY, scale };
}
```

**Notes:**
- `OffscreenCanvas` is available in Safari Workers since iOS 16.4. This project targets iOS 26 — safe.
- The `data` array from `getImageData` is RGBA interleaved. The three-pass loop above separates channels. A single-pass version is also valid and slightly faster.
- Do not use `createImageBitmap` inside the worker for resizing — OffscreenCanvas is the supported path.
- Pre-allocate the `Float32Array` as a module-level variable and reuse it across frames to avoid GC pressure (see §9).

### Pre-allocated version (performance-critical path)

```typescript
const INPUT_SIZE = 640;
const NUM_PIXELS = INPUT_SIZE * INPUT_SIZE;
// Pre-allocated buffers — created once at module init, reused every frame
const inputBuffer = new Float32Array(3 * NUM_PIXELS);
const offscreen = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
const ctx2d = offscreen.getContext('2d')!;
```

---

## 5. Complete NMS Implementation

### Overview

Non-Maximum Suppression filters the 8400 raw candidates down to the actual detections. The steps are:

1. For each anchor, find the max class score and its class index
2. Discard all anchors with max score < confidence threshold (≥ 0.65)
3. Convert surviving boxes from center format (cx, cy, w, h) to corner format (x1, y1, x2, y2) in original image coordinates
4. Sort survivors by score descending
5. Greedy NMS: iterate sorted list, keep each box unless it has IoU > iouThreshold with an already-kept box
6. Return kept boxes

### IoU calculation

```typescript
function computeIoU(
  ax1: number, ay1: number, ax2: number, ay2: number,
  bx1: number, by1: number, bx2: number, by2: number
): number {
  const interX1 = Math.max(ax1, bx1);
  const interY1 = Math.max(ay1, by1);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);

  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const interArea = interW * interH;

  if (interArea === 0) return 0;

  const areaA = (ax2 - ax1) * (ay2 - ay1);
  const areaB = (bx2 - bx1) * (by2 - by1);
  return interArea / (areaA + areaB - interArea);
}
```

### Complete post-processing function

```typescript
interface RawDetection {
  x1: number; y1: number; x2: number; y2: number;
  score: number;
  classId: number;
}

function postProcess(
  output: Float32Array,
  numAnchors: number,      // 8400 at 640×640, 2100 at 320×320
  numClasses: number,      // 10 for digits 0-9
  scale: number,           // from letterbox computation
  padX: number,            // letterbox x padding (pixels)
  padY: number,            // letterbox y padding (pixels)
  origW: number,           // original image width before letterboxing
  origH: number,           // original image height before letterboxing
  confThreshold: number,   // 0.65
  iouThreshold: number     // 0.45
): RawDetection[] {
  // --- Step 1 & 2: Filter by confidence, decode box ---
  const candidates: RawDetection[] = [];

  for (let i = 0; i < numAnchors; i++) {
    // Find max class score (channels 4..4+numClasses-1)
    let maxScore = 0;
    let classId = 0;
    for (let c = 0; c < numClasses; c++) {
      const s = output[(4 + c) * numAnchors + i];
      if (s > maxScore) {
        maxScore = s;
        classId = c;
      }
    }

    if (maxScore < confThreshold) continue;

    // Decode box: channel-major indexing
    const cx = output[0 * numAnchors + i];
    const cy = output[1 * numAnchors + i];
    const w  = output[2 * numAnchors + i];
    const h  = output[3 * numAnchors + i];

    // Convert center format → corner format (still in model input pixel space)
    const mx1 = cx - w / 2;
    const my1 = cy - h / 2;
    const mx2 = cx + w / 2;
    const my2 = cy + h / 2;

    // Unletterbox: remove padding and reverse scale to original image coords
    const x1 = Math.max(0, Math.min(origW, (mx1 - padX) / scale));
    const y1 = Math.max(0, Math.min(origH, (my1 - padY) / scale));
    const x2 = Math.max(0, Math.min(origW, (mx2 - padX) / scale));
    const y2 = Math.max(0, Math.min(origH, (my2 - padY) / scale));

    candidates.push({ x1, y1, x2, y2, score: maxScore, classId });
  }

  // --- Step 3: Sort by score descending ---
  candidates.sort((a, b) => b.score - a.score);

  // --- Step 4: Greedy NMS (class-agnostic — fine for 1 tile per class) ---
  const kept: RawDetection[] = [];
  const suppressed = new Uint8Array(candidates.length); // 0 = active, 1 = suppressed

  for (let i = 0; i < candidates.length; i++) {
    if (suppressed[i]) continue;
    kept.push(candidates[i]);
    for (let j = i + 1; j < candidates.length; j++) {
      if (suppressed[j]) continue;
      const iou = computeIoU(
        candidates[i].x1, candidates[i].y1, candidates[i].x2, candidates[i].y2,
        candidates[j].x1, candidates[j].y1, candidates[j].x2, candidates[j].y2,
      );
      if (iou > iouThreshold) suppressed[j] = 1;
    }
  }

  return kept;
}
```

**Notes on NMS choices:**
- Class-agnostic NMS (suppress regardless of class) is appropriate here because two different digit tiles will never legitimately overlap. Class-aware NMS is only needed when two different classes can occupy the same spatial region.
- Using `Uint8Array` for the `suppressed` flag avoids JS boolean array boxing overhead.
- No external library (TensorFlow.js `nonMaxSuppression`, etc.) is needed or wanted — adding TF.js just for NMS adds 400KB+ and Worker initialization overhead.

---

## 6. Bounding Box Post-Processing

### Center → corner conversion

Already done inside `postProcess` above during unletterboxing. Summary of the two operations:

**Model space to corner format:**
```
x1 = cx - w/2
y1 = cy - h/2
x2 = cx + w/2
y2 = cy + h/2
```

**Unletterbox (model input space → original image space):**
```
origX1 = (x1 - padX) / scale
origY1 = (y1 - padY) / scale
origX2 = (x2 - padX) / scale
origY2 = (y2 - padY) / scale
```

Clamp results to `[0, origW]` and `[0, origH]` respectively.

### Left-to-right sorting for multi-digit numbers

After NMS, sort detections by `x1` (left edge of bounding box):

```typescript
kept.sort((a, b) => a.x1 - b.x1);
```

The leftmost tile is the tens digit, rightmost is the units digit. For digits 10–19 this gives `[1, X]` → number `10 + X`.

### Proximity grouping

Two tiles that are very close together form one multi-digit number. Two tiles far apart are likely two separate numbers (or clutter). A simple threshold-based approach is sufficient:

```typescript
function groupDigits(
  detections: RawDetection[],
  frameWidth: number,
  gapThresholdFraction: number = 0.15  // fraction of frame width
): number[][] {
  if (detections.length === 0) return [];

  // Already sorted left-to-right
  const sorted = [...detections].sort((a, b) => a.x1 - b.x1);
  const gapThreshold = frameWidth * gapThresholdFraction;

  const groups: RawDetection[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    // Gap between right edge of previous box and left edge of current box
    const gap = curr.x1 - prev.x2;
    if (gap <= gapThreshold) {
      groups[groups.length - 1].push(curr);
    } else {
      groups.push([curr]);
    }
  }

  // Convert each group of detections into a number
  return groups.map(group =>
    group.map(d => d.classId)
  );
}
```

Example: tiles "1" at x=100–180 and "5" at x=200–280 → gap = 20px, threshold = 96px → same group → `[1, 5]` → answer 15.

**Tuning note:** `gapThresholdFraction = 0.15` (15% of frame width) is a starting value. The actual optimal value depends on tile size relative to frame. If tiles are ~3 inches and the frame is ~12 inches wide, tiles in the same number will be 0–1 tile-widths apart, while separate answers will be 2+ tile-widths apart. 15% of 1280px = 192px gap, which should separate them adequately at typical setups.

---

## 7. ONNX Runtime Web Tensor API

### Creating input tensors

```typescript
import * as ort from 'onnxruntime-web/wasm';

// Constructor signature:
// new ort.Tensor(type, data, dims)
// type: 'float32' | 'int32' | 'uint8' | etc.
// data: TypedArray
// dims: number[] — must match data.length product

const inputTensor = new ort.Tensor(
  'float32',
  float32Data,             // Float32Array of length 1*3*640*640 = 1,228,800
  [1, 3, 640, 640]
);
```

The `Tensor` constructor does NOT copy `float32Data` — it wraps the same buffer. This means pre-allocated buffers can be reused safely as long as inference is awaited before the buffer is rewritten.

### Running inference

```typescript
// Feed name must match the model's input name.
// For Ultralytics YOLO exports: input name is 'images', output name is 'output0'
const feeds: Record<string, ort.Tensor> = { images: inputTensor };
const results = await session.run(feeds);
const output0 = results['output0'];
```

To verify the input/output names for a custom model, inspect it with `Netron` (netron.app) or `onnxruntime` Python API. The names are set at export time.

### Reading output tensors

```typescript
const rawData = results['output0'].data as Float32Array;
const dims = results['output0'].dims; // e.g., [1, 14, 8400]
```

`output0.data` is the underlying `Float32Array`. It is valid only until the session runs again. Extract values before the next `session.run()` call.

### Memory management

ORT Web WASM does not require explicit tensor disposal in the way WebGPU does. However:

```typescript
// Input tensors: no explicit disposal needed for WASM EP
// Output tensors: no dispose() method exists on Tensor in ORT Web
// Session: call session.release() when done (e.g., on worker terminate)
await session.release();
```

The `Tensor` class does not have a `.dispose()` method in ORT Web (unlike TF.js). Memory is managed by the WASM heap. Avoid holding references to output tensors across frames.

### Session creation with optimal WASM config

```typescript
import * as ort from 'onnxruntime-web/wasm';

// Must set before InferenceSession.create()
ort.env.wasm.numThreads = 1;          // Single thread — no SharedArrayBuffer needed
ort.env.wasm.simd = true;             // Fixed-width SIMD — supported in Safari
ort.env.wasm.proxy = false;           // We're already in a Worker — no proxy needed
ort.env.wasm.wasmPaths = '/';         // Serve .wasm files from root

const session = await ort.InferenceSession.create('/models/yolo11n-digits.onnx', {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all',      // Enables all ORT graph optimizations
  enableCpuMemArena: true,            // Reduces allocation overhead
  enableMemPattern: true,             // Enables memory pattern optimization
  // Do NOT set interOpNumThreads or intraOpNumThreads — numThreads=1 controls both
});
```

**`ort.env.wasm.wasmPaths`** must point to where the `.wasm` binaries are served. With the Vite config in `docs/research.md` §5, they are copied to the build root, so `'/'` is correct.

### Vite config reminder (from docs/research.md §5)

All three of these are required for ORT Web to work with Vite. Missing any one causes silent failure:

1. `optimizeDeps.exclude: ['onnxruntime-web']` — prevent pre-bundling
2. `assetsInclude: ['**/*.onnx']` — treat ONNX files as static assets
3. `vite-plugin-static-copy` — copy `.wasm` binaries to `dist/`

---

## 8. Complete Worker Message Protocol

### Message types

```typescript
// Main → Worker
type WorkerInboundMessage =
  | { type: 'init'; modelUrl: string }
  | { type: 'infer'; bitmap: ImageBitmap }
  | { type: 'dispose' };

// Worker → Main
type WorkerOutboundMessage =
  | { type: 'ready' }
  | { type: 'detections'; detections: DetectedDigit[]; latencyMs: number }
  | { type: 'error'; message: string };

interface DetectedDigit {
  classId: number;    // 0-9
  score: number;      // 0.65–1.0
  x1: number; y1: number; x2: number; y2: number;  // original image coords
}
```

### Worker skeleton

```typescript
// cv.worker.ts
import * as ort from 'onnxruntime-web/wasm';

ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;
ort.env.wasm.wasmPaths = '/';

const INPUT_SIZE = 640;
const NUM_CLASSES = 10;
const CONF_THRESHOLD = 0.65;
const IOU_THRESHOLD = 0.45;
const NUM_PIXELS = INPUT_SIZE * INPUT_SIZE;

// Pre-allocated — reused every frame
const inputBuffer = new Float32Array(3 * NUM_PIXELS);
const offscreen = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
const offCtx = offscreen.getContext('2d')!;

let session: ort.InferenceSession | null = null;
let isInferring = false;

self.onmessage = async (e: MessageEvent<WorkerInboundMessage>): Promise<void> => {
  const msg = e.data;

  if (msg.type === 'init') {
    try {
      session = await ort.InferenceSession.create(msg.modelUrl, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      self.postMessage({ type: 'ready' } satisfies WorkerOutboundMessage);
    } catch (err) {
      self.postMessage({
        type: 'error',
        message: `Init failed: ${String(err)}`,
      } satisfies WorkerOutboundMessage);
    }
    return;
  }

  if (msg.type === 'infer') {
    if (!session || isInferring) {
      msg.bitmap.close(); // Must close even if skipping
      return;
    }
    isInferring = true;
    const t0 = performance.now();

    try {
      const bitmap = msg.bitmap;
      const origW = bitmap.width;
      const origH = bitmap.height;

      // 1. Preprocess
      const { padX, padY, scale } = preprocessInPlace(bitmap, origW, origH);
      bitmap.close(); // Release GPU memory immediately after draw

      // 2. Infer
      const inputTensor = new ort.Tensor('float32', inputBuffer, [1, 3, INPUT_SIZE, INPUT_SIZE]);
      const results = await session.run({ images: inputTensor });
      const rawOutput = results['output0'].data as Float32Array;
      const numAnchors = results['output0'].dims[2] as number;

      // 3. Post-process
      const detections = postProcess(
        rawOutput, numAnchors, NUM_CLASSES,
        scale, padX, padY, origW, origH,
        CONF_THRESHOLD, IOU_THRESHOLD
      );

      const latencyMs = performance.now() - t0;
      self.postMessage({
        type: 'detections',
        detections,
        latencyMs,
      } satisfies WorkerOutboundMessage);
    } catch (err) {
      self.postMessage({
        type: 'error',
        message: `Infer failed: ${String(err)}`,
      } satisfies WorkerOutboundMessage);
    } finally {
      isInferring = false;
    }
    return;
  }

  if (msg.type === 'dispose') {
    await session?.release();
    session = null;
  }
};

function preprocessInPlace(
  bitmap: ImageBitmap,
  origW: number,
  origH: number
): { scale: number; padX: number; padY: number } {
  const scale = Math.min(INPUT_SIZE / origW, INPUT_SIZE / origH);
  const scaledW = Math.round(origW * scale);
  const scaledH = Math.round(origH * scale);
  const padX = Math.floor((INPUT_SIZE - scaledW) / 2);
  const padY = Math.floor((INPUT_SIZE - scaledH) / 2);

  // Fill with letterbox gray
  offCtx.fillStyle = 'rgb(114,114,114)';
  offCtx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  offCtx.drawImage(bitmap, padX, padY, scaledW, scaledH);

  const { data } = offCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  for (let i = 0; i < NUM_PIXELS; i++) {
    inputBuffer[i]                 = data[i * 4]     / 255;
    inputBuffer[NUM_PIXELS + i]    = data[i * 4 + 1] / 255;
    inputBuffer[2 * NUM_PIXELS + i] = data[i * 4 + 2] / 255;
  }

  return { scale, padX, padY };
}
```

### Main thread usage

```typescript
// In React component or hook
const worker = new Worker(
  new URL('./cv.worker.ts', import.meta.url),
  { type: 'module' }
);

worker.postMessage({ type: 'init', modelUrl: '/models/yolo11n-digits.onnx' });

worker.onmessage = (e: MessageEvent<WorkerOutboundMessage>) => {
  if (e.data.type === 'ready') { /* model loaded, enable inference */ }
  if (e.data.type === 'detections') { /* handle results */ }
  if (e.data.type === 'error') { /* handle error */ }
};

// Called from requestVideoFrameCallback callback:
function sendFrame(bitmap: ImageBitmap): void {
  // Transfer ownership — zero-copy, bitmap unusable on main thread after this
  worker.postMessage({ type: 'infer', bitmap }, [bitmap]);
}
```

---

## 9. Performance Optimization

### Pre-allocation strategy

| Resource | Approach | Why |
|---|---|---|
| `Float32Array` for input | One module-level allocation, reused every frame | Avoid GC on every 1.2MB allocation |
| `OffscreenCanvas` | Created once at module init | Canvas setup is expensive |
| `RawDetection[]` candidates | Re-create each frame (typically 5–30 items) | Small enough that GC cost is negligible |
| `Uint8Array` suppressed | Re-create each frame (same length as candidates) | Small |

Do NOT pre-allocate `candidates` as a fixed-size array — the variable-length filtering makes this complex and error-prone.

### Resolution: 640×640 vs 320×320

| Resolution | Anchors | Approximate WASM inference time (iPad, FP32 SIMD, single-thread) | Accuracy impact |
|---|---|---|---|
| 640×640 | 8400 | ~40–80ms | Full — tiles at normal scale |
| 320×320 | 2100 | ~15–30ms | Slight reduction — acceptable for large tiles |

**Recommendation for this project:** Start with **320×320**. The physical tiles are 3×4 inches and the camera-to-surface distance is 1–2 feet, making tiles relatively large in the frame. Small-object detection accuracy (where 640 helps most) is not the bottleneck. 320×320 halves memory bandwidth, quartersthe anchor count, and keeps inference well inside the 120ms budget even on worst-case iPad hardware.

If accuracy tests show missed detections at 320×320, switch the model input to 640×640. The post-processing code is parameterized by `numAnchors` from `results['output0'].dims[2]` — no code changes needed when switching resolutions.

### Frame drop policy

The `isInferring` guard in the worker (already in the skeleton above) ensures frames are dropped under pressure rather than queued. This is the correct behavior. Source: `docs/research.md` §3 "Key rule: Drop frames under pressure, never queue them."

### Avoiding GC pressure in the hot loop

- The channel-extraction inner loop (`for i < numPixels`) creates no temporary objects — all writes are direct typed array indexed writes.
- The NMS candidate array (`RawDetection[]`) is the only allocation per frame after warm-up. With a confidence threshold of 0.65 and typical game conditions (2–3 tiles visible), this array will be 2–15 items.
- `performance.now()` inside the worker is available and has sub-millisecond resolution in workers.

### Expected inference times on iPad (WASM SIMD, single-thread, FP32)

These are derived from the existing research (`docs/research.md` §5) and consistent with community benchmarks for YOLO-nano class models on mobile CPUs:

| Stage | Time |
|---|---|
| Preprocessing (320×320, OffscreenCanvas) | ~5–15ms |
| ORT WASM inference (320×320) | ~15–30ms |
| Post-processing (NMS, 2100 anchors) | < 2ms |
| Total per frame (320×320) | **~20–45ms** (22–50 FPS theoretical) |
| Total per frame (640×640) | **~50–100ms** (10–20 FPS theoretical) |
| Cold first inference (any size) | +2–5s (model compilation) |

At 4–10 fps capture rate, even 50ms inference stays within budget. The 120ms budget from the PRD acceptance criteria (`docs/research.md` §5) is comfortably met at 320×320.

---

## 10. YOLO11 ONNX Export Command

For reference when training completes:

```python
from ultralytics import YOLO
model = YOLO('yolo11n.pt')  # or path to custom trained weights
model.export(
    format='onnx',
    imgsz=320,          # or 640 — matches INPUT_SIZE in worker
    simplify=True,      # ONNX simplifier removes redundant ops
    opset=12,           # Opset 12 has full ORT Web WASM support
    dynamic=False,      # Static shapes — better ORT Web performance
    half=False,         # FP32 — not FP16 (slower in WASM)
)
```

This produces `yolo11n.onnx` with:
- Input: `float32[1, 3, imgsz, imgsz]`, name `'images'`
- Output: `float32[1, 14, num_anchors]`, name `'output0'`

Source: Ultralytics export docs (docs.ultralytics.com/modes/export/).

---

## 11. Options

Three approaches for the post-processing architecture:

### Option A — Inline post-processing in worker (recommended)

All post-processing (confidence filter, box decode, NMS, unletterbox) happens inside the worker before `postMessage`. The main thread receives `DetectedDigit[]` — clean, already in original image coordinates.

**Tradeoffs:**
- Pro: Main thread never touched by raw tensor math
- Pro: Single message per frame with final results
- Pro: Worker can be tested independently with synthetic Float32Arrays
- Con: Worker does slightly more work per frame (acceptable — NMS is < 2ms)

### Option B — Send raw tensor to main thread, post-process there

Worker sends the raw `Float32Array` output to main thread; main thread post-processes.

**Tradeoffs:**
- Pro: Worker is thinner
- Con: 1.2MB (640) or 300KB (320) tensor copy via `postMessage` on every frame even with transfer — transferring ArrayBuffer means the worker loses ownership, requiring re-allocation next frame
- Con: Violates the invariant "CV processing must not block the UI thread"
- **Reject**

### Option C — Separate NMS ONNX model

Export YOLO with embedded NMS, or load a separate NMS ONNX model. Seen in some PyImageSearch tutorials.

**Tradeoffs:**
- Pro: Offloads NMS to ONNX graph, potentially hardware-accelerated
- Con: Requires an additional model file and session
- Con: NMS ONNX ops have known compatibility issues in ORT Web WASM
- Con: The hand-written NMS is < 40 lines and < 2ms — there is no performance problem to solve
- **Reject for this project**

---

## 12. Recommendation

Use **Option A** (inline post-processing in worker).

Implement the worker exactly as shown in §8. Key decisions summarized:

1. **Input size: 320×320** — sufficient for large tiles, halves inference time vs. 640×640
2. **Channel-major indexing:** `output[channel * numAnchors + i]` — the correct formula
3. **No sigmoid:** model already applies it at export
4. **No objectness channel:** YOLO11 has none — max class score is the detection confidence
5. **Letterbox with gray value 114** — matches Ultralytics training default
6. **Class-agnostic NMS** — correct for non-overlapping digit tiles
7. **Pre-allocate Float32Array and OffscreenCanvas** — eliminates per-frame GC pressure
8. **`isInferring` guard** — drop frames under pressure, never queue
9. **Proximity grouping** for multi-digit numbers uses x-gap threshold (~15% of frame width)
10. **Sort by `x1`** after NMS for correct left-to-right digit ordering

---

## Sources

- Ultralytics issue [#751](https://github.com/ultralytics/ultralytics/issues/751) — no objectness in YOLOv8/11 ONNX output
- Ultralytics discussion [#778](https://github.com/orgs/ultralytics/discussions/778) — output tensor format
- Ultralytics issue [#7739](https://github.com/ultralytics/ultralytics/issues/7739) — correct channel-major indexing fix
- Ultralytics issue [#14131](https://github.com/ultralytics/ultralytics/issues/14131) — [1,84,8400] layout confirmation
- Ultralytics discussion [#17254](https://github.com/orgs/ultralytics/discussions/17254) — YOLO11 output tensor format
- Ultralytics discussion [#20712](https://github.com/orgs/ultralytics/discussions/20712) — no sigmoid needed post-export
- [ORT Web env flags](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html) — numThreads, simd, proxy, wasmPaths
- ORT issue [#22776](https://github.com/microsoft/onnxruntime/issues/22776) — iOS device support status (closed June 2025)
- ORT issue [#19148](https://github.com/microsoft/onnxruntime/issues/19148) — numThreads > 1 warning without crossOriginIsolated
- [ORT WebAssembly Flags API](https://onnxruntime.ai/docs/api/js/interfaces/Env.WebAssemblyFlags.html) — complete flag reference
- [nomi30701/yolo-object-detection-onnxruntime-web](https://github.com/nomi30701/yolo-object-detection-onnxruntime-web) — working YOLO+ORT browser implementation
- [Hyuto/yolov8-onnxruntime-web](https://github.com/Hyuto/yolov8-onnxruntime-web) — YOLOv8 browser reference implementation
- [Ultralytics ONNX export docs](https://docs.ultralytics.com/integrations/onnx/)
- [MDN OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) — Worker canvas support
- [Roboflow NMS in NumPy](https://blog.roboflow.com/how-to-code-non-maximum-suppression-nms-in-plain-numpy/) — algorithm reference
- `docs/research.md` §2, §3, §5 — existing verified project research (ORT Safari constraints, pipeline architecture, performance numbers)
