---
name: camera_pipeline
description: Confirmed facts about the camera and frame capture pipeline: rVFC loop mechanics, stall risk, stop-race, overlay coordinate mismatch, test gaps
type: project
---

## Key findings from deep camera pipeline research (2026-03-13)

### rVFC loop — no error recovery (HIGH risk)
`frame-capture.ts:onVideoFrame` is async. `createImageBitmap` (line 99) and multi-consumer `Promise.all` (line 115) can throw. There is **no try/catch**. One throw permanently stalls the loop with no user-visible error. Fix: wrap entire `onVideoFrame` body in try/catch; re-chain with `scheduleNext` in the catch block.

**Why:** Confirmed by reading all 169 lines of frame-capture.ts. No error handling exists anywhere in the async frame path.

**How to apply:** Any plan touching frame-capture.ts must include or assume this fix is present. When implementing, single outer try/catch resolves both the stall risk and the stop-race.

### Stop-during-await race
`stop()` zeroes `canvas.width/height` (lines 150–151). If called between `drawImage` (line 96) and `createImageBitmap` (line 99), the bitmap creation throws `InvalidStateError`. Resolved by the try/catch fix above.

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
