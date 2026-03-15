---
name: camera_pipeline
description: Confirmed facts about the full CV pipeline: camera capture, ONNX worker, preprocessing, postprocessing, interpretation, temporal buffer, class-range filtering, mock/fixture systems, constraints
type: project
---

## Key findings (updated 2026-03-15 — full pipeline exhaustive re-survey)

### rVFC loop — try/catch exists
`frame-capture.ts:onVideoFrame` has a try/catch at line 84 with `scheduleNext(video)` in the `finally` block (line 125). The stall risk from an earlier audit has been fixed. `catch {}` swallows errors silently.

### Async callback not awaited
`frame-capture.ts:103` calls `cb(bitmap)` without await. The App.tsx async callback's returned Promise is silently discarded. Exceptions inside are unhandled rejections. Intentional — busy-flag in `onnx-recognition.ts:115` is the backpressure.

### Stop-during-await race
Mitigated by try/catch. `InvalidStateError` from zeroed canvas is swallowed; `scheduleNext` in `finally` re-chains safely.

### Preprocessing duplication (critical)
The worker (`inference.worker.ts:48-78`) duplicates letterbox+normalize logic inline using pre-allocated module-level buffers (`Float32Array(3*640*640)`, `OffscreenCanvas(640,640)`). It does NOT import from `preprocessing.ts`. Any change to letterbox behavior must be applied to BOTH files.

### Postprocessing parameters
- CONF_THRESHOLD=0.50 (raised from YOLO default 0.25 for physical tile use case, `postprocessing.ts:17`).
- IOU_THRESHOLD=0.45. NMS is class-agnostic.
- Output sorted L→R by x1. All bboxes normalized to [0,1].
- Channel-major indexing: `output[(4 + classId) * numAnchors + anchorIdx]`.
- classRange applied at argmax level — prevents letter classes from winning argmax over digit classes on 36-class model, which would suppress valid detections via NMS.

### Interpretation grouping
- `HORIZONTAL_PROXIMITY_FACTOR=1.0 x pairAvgWidth` (pair-local, not scene-wide).
- `VERTICAL_ALIGNMENT_FACTOR=0.5 x pairAvgHeight`.
- Overlapping detections (gap < 0) skipped regardless of class — duplicate anchors for same physical tile.
- `matchAnswer` uses string equality, so digit-count gate prevents ones-digit false positives.

### Temporal buffer
- REQUIRED_CONSECUTIVE_FRAMES=3, MAX_CONSECUTIVE_MISSES=2.
- Generic over T — `number` (math) or `string` (spelling).
- During miss-streak 1–2, count is NOT decremented — resumes from prior value on next valid detection. Only hard reset (missStreak > 2) clears count.
- Game store has TWO separate buffers: `temporalBuffer<number>` and `spellingTemporalBuffer<string>` (game-store.ts:60-61).

### Class range filtering
- Defined at `App.tsx:49-52`: math `{min:0, max:9}`, spelling `{min:10, max:35}`.
- `setClassRange()` updates stored value in OnnxRecognitionService; range travels with next `infer` message.
- No "current mode" state in the worker — mode is per-inference parameter.

### Wrong-tile feedback
- Separate from temporal buffer. Activates only after 3000ms into round.
- Requires 2+ consecutive wrong detections before surfacing `wrongTileSeen`.
- `wrongTileSeen` and `cameraUncertain` are mutually exclusive by construction.
- Spelling mode has no wrong-tile or cameraUncertain logic.

### Model filename
- Hardcoded as `/models/digit-tiles.onnx` at `onnx-recognition.ts:102`. Rename requires code change.

### object-cover overlay coordinate mismatch
`camera-overlay.tsx:105-107` draws boxes by multiplying normalized coords by CSS canvas dimensions. With `object-cover` and non-matching AR, video is cropped and boxes appear offset. Developer-only feature (`?overlay=boxes`), acceptable to defer.

### Mock system
- `?recognition=mock` → no camera, no worker, no frame capture. MockNumpad calls `processDetections()` directly.
- Two-digit answers: tapping the tens digit sends the full adjacently-positioned pair.
- `MockRecognitionControl.emitDigit/emitDigits` bypass `recognize()` entirely for unit tests.

### Fixture frame source
- `FixtureFrameSource` implements `FrameSource` for test/regression use.
- NOT wired into running app. `pipeline-regression.test.ts` uses synthetic tensors (`createSyntheticTensor`) directly.
- Infrastructure for future real-image regression — not yet end-to-end.

### ORT worker constraints (immutable)
- `import from 'onnxruntime-web/wasm'` only — JSEP/WebGPU crashes Safari.
- `numThreads = 1` — no SharedArrayBuffer, no COOP/COEP headers.
- `wasmPaths = "/"` absolute — relative breaks from Worker URL context.
- `isInferring` cleared in `finally` block — critical; otherwise worker deadlocks on inference error.

### Video → canvas → bitmap (immutable)
Never `createImageBitmap(video)` directly — WebKit bug #234920. Must go through canvas.

### CV phase gate
CV processing gated to `scanning` phase only (`App.tsx:165-169`). Non-scanning frames: `bitmap.close(); return`.
