---
name: camera_pipeline
description: Confirmed facts about the camera and frame capture pipeline: rVFC loop mechanics, stall risk, stop-race, overlay coordinate mismatch, test gaps
type: project
---

## Key findings (updated 2026-03-15 — full pipeline re-survey)

### rVFC loop — try/catch NOW EXISTS (previously missing)
As of the current codebase, `frame-capture.ts:onVideoFrame` has a try/catch at line 84 with `scheduleNext(video)` in the `finally` block (line 125). The stall risk noted in the 2026-03-13 audit has been fixed. The `catch {}` block is intentionally empty — errors are swallowed silently without logging even in debug mode. This is a low-severity issue.

### Stop-during-await race
Mitigated by the try/catch. The `catch {}` silently swallows the `InvalidStateError` from zeroed canvas and `scheduleNext` in `finally` re-chains safely.

### rVFC scheduling: next frame fires BEFORE inference completes
`scheduleNext(video)` fires at line 122, immediately after `cb(bitmap)` is invoked synchronously. The async `cb` (ONNX inference) runs concurrently. The busy-flag in `onnx-recognition.ts:103` is what prevents queuing — frames are dropped, not buffered.

### `onFrame` callback is NOT awaited
`frame-capture.ts:106` calls `cb(bitmap)` without awaiting. The App.tsx async callback's returned promise is silently discarded. Exceptions inside the callback are unhandled rejections.

### OffscreenCanvas: reused, not recreated
Canvas created once per `createFrameCapture()` call, resized in-place if dimensions change. `stop()` zeroes dimensions then nulls refs (PRD §5.13 compliance).

### object-cover coordinate mismatch in debug overlay
`camera-overlay.tsx` draws bounding boxes by multiplying normalized (0–1) coords by canvas CSS px dimensions. Video uses `object-cover` — when container AR differs from 16:9, the visible video frame is cropped and boxes appear offset. Developer-only feature (`?overlay=boxes`), acceptable to defer. Add a comment to `drawDetections`.

### Stale boxes on dropped frames
When the worker is busy, `updateDetections` is never called and the canvas is never cleared. Old boxes persist until the next successful inference.

### Test coverage: near zero
`frame-capture.test.ts`: 4 tests, all structural (stats/subscribe). Zero coverage of async loop, error paths, or multi-consumer logic.
`use-camera.test.ts`: 2 type-shape tests only.

### iPad resolution
Constraints request `ideal: 1280x720`. Safari typically delivers 1920x1080 rear camera. Actual resolution read via `track.getSettings()` at `use-camera.ts:119`. Frame capture always uses live `video.videoWidth/videoHeight`.

---

## Full pipeline state (2026-03-15 exhaustive survey)

### Preprocessing (inference.worker.ts)
Pre-allocated at module level: `Float32Array(3 * 640 * 640)` and `OffscreenCanvas(640,640)`.
Worker duplicates the letterbox+normalize logic inline rather than importing from `preprocessing.ts`.
Gray fill: 114/255 (YOLO standard). bitmap.close() immediately after getImageData, also in finally.

### Postprocessing (postprocessing.ts)
Channel-major output: `output[(4 + classId) * numAnchors + anchorIdx]`.
CONF_THRESHOLD=0.5 (default 0.25 raised for physical tile use case).
IOU_THRESHOLD=0.45.
NMS is class-agnostic. Output sorted L-to-R by x1. All bboxes normalized to [0,1].
classRange parameter is critical: without it, letter classes can suppress digit detections via NMS.

### Interpretation (interpretation.ts)
HORIZONTAL_PROXIMITY_FACTOR=1.0 x pairAvgWidth (pair-local, not scene-wide).
VERTICAL_ALIGNMENT_FACTOR=0.5 x pairAvgHeight.
Overlapping detections (gap < 0) skipped regardless of class -- duplicate anchors for one physical tile.

### Temporal buffer (temporal-buffer.ts)
REQUIRED_CONSECUTIVE_FRAMES=3, MAX_CONSECUTIVE_MISSES=2.
Generic over T -- number (math) or string (spelling).
count is NOT reset during miss-streak tolerance -- resumes from prior value on next valid detection.
Game store has TWO separate buffers: temporalBuffer<number> and spellingTemporalBuffer<string>.

### Class range filtering (ADR-006, App.tsx:49-52)
math: {min:0, max:9}, spelling: {min:10, max:35}.
Set via service.setClassRange() which updates currentClassRange sent with every infer message.
Updated reactively when gameKind changes.

### Wrong-tile feedback (game-store.ts)
Separate from temporal buffer. Activates only after 3000ms into round.
Requires 2+ consecutive wrong detections before surfacing wrongTileSeen.
wrongTileSeen and cameraUncertain are mutually exclusive by construction.

### Model filename
Hardcoded at `src/cv/onnx-recognition.ts:102` as `/models/digit-tiles.onnx`.
Rename requires code change. App uses StaleWhileRevalidate so overwriting in-place is safe.
