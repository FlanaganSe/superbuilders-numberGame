# Research: Auto-Check Matching Logic for Free-Placement Digit Detection

**Date:** 2026-03-11
**Sprint:** 1-week demo
**Scope:** Core game loop — how to decide "the answer is present" when multiple tiles are visible

---

## 1. Current State

The PRD defines the answer-check contract precisely (`.claude/plans/prd.md:29-32`):

- **Free placement**: no fixed slots, tiles go anywhere on the play surface
- **CV active only during rounds**: inference paused during countdown
- **Auto-check**: system continuously evaluates detected digits vs correct answer
- **Two-tile answers**: 10–19 supported via left-to-right bounding box ordering
- **Temporal stability**: 3 consecutive matching frames before commit (`prd.md:54`)
- **Motion gate**: suppress inference while hand disturbs scene (`prd.md:56`)
- **Confidence threshold**: ≥ 0.65, NMS IoU ~0.45 (`prd.md:57`)

The architecture defines an `InterpretationLayer` seam (`prd.md:64`) that:
> "converts raw detections into semantic answer candidates with ordering, grouping, and ambiguity handling. Groups nearby boxes into multi-digit numbers via left-to-right proximity."

No implementation exists yet. This research covers what that layer should do and why.

---

## 2. How OSMO Numbers Handles Stray Tiles (Industry Prior Art)

OSMO Numbers is the closest direct analog. From verified OSMO support documentation:

**"Count" and "Add" modes:** All visible tiles are summed. The _total_ is checked against the target. This sidesteps the stray-tile problem entirely: if 1+3+5+7+8 = 24 and the answer is 24, it counts. This only works because the problem type (reach a target sum) is forgiving of extras.

**"Connect" mode:** Tiles placed _physically close together_ are concatenated into a multi-digit number. Tiles placed apart are summed separately. This is proximity-based grouping: close = concatenate, apart = add.

**Key insight:** OSMO solves stray tiles at the _game logic level_, not the vision level. Their "Count/Add" mode uses sum-equals-target semantics. This superbuilders project uses exact-digit-match semantics ("place the answer 7"), which is a harder problem.

**What OSMO does NOT do:** There is no "answer zone" or spatial region enforced by the system. OSMO's approach relies on the game logic (sum matching) being tolerant of irrelevant tiles. OSMO's patents reference motion detection as a trigger for processing, but no public documentation describes spatial filtering.

---

## 3. The Stray Tiles Problem — Analysis

### Why "sum-equals-target" does not apply here

The game in this PRD requires the child to _place the answer value_ (e.g., for "3 + 4 = ?", place tile "7"). The problem is not "make a total of 7 with any tiles." It is "show me the number 7 as an intentional act." This means irrelevant tiles are harmful — a child with 1, 3, 5, 7, 8 visible must have "7" identified as the _intended_ answer, not just any digit match.

### Three viable approaches

**Option A: Answer-zone overlay (soft zone)**
Render a highlighted region on screen (e.g., a rounded rectangle with a gentle glow, no hard boundary). The child is instructed and learns to place their answer in this zone. During evaluation, only detections whose bounding box center falls within the zone ROI are considered.

- Pros: eliminates stray-tile problem completely; predictable UX; no spatial clustering algorithm needed; child gets a clear target for where to place tiles
- Cons: requires the camera to have a well-calibrated view of the zone; zone must be stable across device orientations and different play surfaces; adds a calibration dependency; "free placement" spirit is reduced
- Real-world analogy: Marbotic Smart Numbers requires tiles to be placed directly on the iPad screen (capacitive detection via conductive feet) — this is the extreme of this approach. Not applicable here.

**Option B: Exact-digit-count matching (digit-count gate)**
For a single-digit answer (0–9), only single detections (isolated tiles) trigger a match. For a two-digit answer (10–19), only groups of exactly two adjacent tiles trigger a match. Extra tiles that are alone or in wrong-size groups are ignored.

- Logic: "if answer is 7, we need exactly one tile reading '7' that is spatially isolated from other tiles. Ignore all groups of 2+. Ignore any single '7' tile that is within 1.5× tile-widths of another tile."
- Pros: no calibration, true free placement, handles stray tiles well in practice (child puts answer tile in open space, other tiles are scattered)
- Cons: fails if child happens to place the answer tile touching another tile; requires reliable "isolation" detection

**Option C: All-detections match, subset check**
On every frame, collect all detected digits. For single-digit answers, check if the target digit appears at all. For two-digit answers, check if any adjacent pair (sorted left-to-right) forms the target number.

- Pros: simplest to implement
- Cons: the stray-tile problem manifests immediately — if the answer is "7" and tile "7" is visible as a random stray tile, the round ends falsely. For a 1-week demo with controlled setup this may be acceptable, but it is the most fragile approach.

### Recommendation for stray tiles

**Use Option B (exact-digit-count gate) as the primary approach, with Option A (soft zone overlay) as a UI hint.** The zone is visual only — the spatial gate enforces it computationally. Specifically:

1. Render a soft zone on screen (rounded rectangle, labeled "Put your answer here", animated subtle pulse)
2. The detection logic considers all tiles in frame but scores candidates: a "candidate answer" is either (a) a single tile for single-digit answers, or (b) a two-tile group for two-digit answers, where the tiles are horizontally adjacent within the tile-proximity threshold
3. Candidates that additionally fall within the soft zone get a priority boost — but this boost is a tie-breaker, not a hard gate, so the system degrades gracefully if the child places the answer just outside the zone

This gives the child a clear target without requiring calibration, while the digit-count gate handles the algorithmic stray-tile problem.

---

## 4. Multi-Digit Grouping Algorithm

For two-digit answers (10–19), the system must determine when two tiles form a number vs are separate.

### The OCR/text-detection precedent

Text detection systems (PaddleOCR, CRAFT, etc.) group character bounding boxes into words using a horizontal gap threshold: if the gap between two boxes is less than N × (average character width), they belong to the same word. This is the standard approach.

For physical tiles, which are uniform in size, the algorithm simplifies to:

```
gap_between_boxes = left_edge_of_right_box - right_edge_of_left_box
tile_width = average of bounding box widths for all current detections

if gap_between_boxes < tile_width * GAP_MULTIPLIER:
    tiles form a multi-digit group
```

**Threshold selection:** A GAP_MULTIPLIER of 1.0 to 1.5 is appropriate. With tiles at 3-inch physical width and reasonable camera-to-surface distance, touching tiles have ~0 gap, tiles one tile-width apart have gap ≈ tile_width. Testing at 1.0× means tiles must nearly touch. Testing at 1.5× gives a half-tile tolerance. Start at 1.0× and tune with physical tiles.

### Vertical alignment check

Two tiles must also be roughly on the same horizontal line:

```
y_overlap = compute vertical overlap between two bounding boxes
tile_height = average bounding box height

if abs(center_y_A - center_y_B) < tile_height * 0.5:
    vertically aligned
```

### Full grouping algorithm (InterpretationLayer)

```
Input: detections[] = [{label, bbox, confidence}] (post-NMS, confidence >= 0.65)
Output: candidates[] = {digits: string, bbox: merged_bbox}

1. Sort detections left-to-right by bbox.x_center
2. For each pair of adjacent detections:
   a. Check vertical alignment: |center_y_A - center_y_B| < 0.5 * avg_height
   b. Check horizontal proximity: gap < avg_width * 1.0 (tunable)
   c. If both pass: form a two-digit group (left.label + right.label)
3. Any detection not grouped with an adjacent detection = single-digit candidate
4. Return all candidates (single-digit and two-digit groups)
```

For MVP (answers 0–18 based on addition up to ages 5–8), only single-digit and two-digit candidates matter. No candidate with 3+ tiles is valid.

### Answer matching

```
function matchesAnswer(candidates, answer):
  answerStr = answer.toString()  // "7" or "15"

  for candidate in candidates:
    if candidate.digits === answerStr:
      // Digit-count gate: candidate.digits.length must equal answerStr.length
      return { matched: true, candidate }

  return { matched: false }
```

The digit-count gate is implicit: a single-digit answer only matches a single-tile candidate, not a two-tile group. A two-digit answer only matches a two-tile group, not two separate singles.

---

## 5. Temporal Matching Strategy

### Problem

At 4–10 fps with WASM inference, a detection window exists. The child's hand enters frame (placing a tile), detection flickers (tile occluded), hand exits, tiles stabilize.

### N-frame rolling buffer

Maintain a fixed-size circular buffer of the last N frame results:

```typescript
type FrameResult = { matched: boolean; candidate: Candidate | null; ts: number }
const BUFFER_SIZE = 3  // consecutive matching frames required (prd.md:54)
const buffer: FrameResult[] = []
```

**Commit rule:** If the last N entries in the buffer all have `matched: true` AND all identify the same candidate digits, commit the answer.

**Reset rule:** If any frame in the buffer has `matched: false`, reset the counter (do not clear the buffer — just require the last N consecutive to match).

### Timing math

At 4 fps: 3 frames = 750ms. At 5 fps: 3 frames = 600ms. At 10 fps: 3 frames = 300ms.

The PRD acceptance criterion is "< 1000ms" (`.claude/plans/prd.md:163`). At 4 fps, 3 consecutive frames hits 750ms — within budget. This means the buffer size should be 3 and the minimum frame rate must be ≥ 3 fps to meet the SLA.

**Do not use wall-clock time alone.** Wall-clock debouncing (e.g., "if match is stable for 750ms") can trigger mid-flicker if a transient match appears at t=0 and t=750ms with a mismatch at t=375ms. The N-frame consecutive buffer is more robust because it requires uninterrupted stability.

### Two-phase feedback

The PRD specifies (`.claude/plans/prd.md:55`): < 200ms for first visual acknowledgment, ~750ms for commit.

- **Phase 1 — instant feedback:** On the first frame that has any high-confidence matching candidate (even before the buffer fills), fire a "tile seen" event (pop sound + highlight). This requires NO buffer — just a single frame match above confidence threshold.
- **Phase 2 — commit:** Only when the N-frame buffer is fully satisfied. Fire "answer correct" (confetti + cheer + round end).

The two phases are independent:
- Phase 1 uses immediate detection result
- Phase 2 uses the rolling buffer

---

## 6. Motion Gate Implementation

### Goal

Suppress inference (or suppress answer commitment) while the child's hand is actively over the play surface. A moving hand causes partial tile occlusion, lower confidence scores, and incorrect detections.

### Approach: Frame differencing on the CPU, before inference

This runs in the Web Worker as a pre-inference step. It is cheap and does not require a second model.

**Algorithm:**
```
1. Capture current frame as ImageData (grayscale)
2. Compute mean absolute difference (MAD) against previous frame:
   MAD = sum(|pixel[i] - prev_pixel[i]|) / pixel_count
3. If MAD > MOTION_THRESHOLD: mark frame as "in motion", skip inference or suppress commit
4. Update prev_frame = current_frame
```

**MOTION_THRESHOLD guidance:**
- Frame differencing studies show threshold values of 20–35 (on 0–255 scale) work well for detecting significant scene changes in surveillance contexts
- For this use case (hand movement is large, tile placement is discrete), a threshold of 15–25 on 8-bit grayscale is appropriate
- A lower threshold (15) catches subtle hand presence; a higher one (30) only catches gross motion
- Start at 20, tune with real hardware

**Alternative — confidence drop proxy:**
If average confidence of all detections in a frame drops significantly (e.g., below 0.45 vs normal 0.65+), infer that occlusion is occurring and suppress the frame from the buffer. This is a model-output signal rather than a pixel signal. It is a useful secondary gate and easy to implement: add a `stable` flag per frame result.

**Interaction with temporal buffer:**
The cleanest design: frames where MAD > threshold are tagged `motion=true`. Frames tagged as motion count as `matched: false` for buffer purposes — they break the consecutive-match streak. This automatically prevents committing through hand movement without needing a separate state.

**Downside of frame differencing:**
The camera must be stationary (true for this use case — iPad on stand). If the device moves, false motion events flood the system. This constraint is already satisfied by the physical setup.

---

## 7. Round Lifecycle State Machine

### States

```
idle → countdown → scanning → success
                 → timeout
```

State transitions and guards:

| From | Event | Guard | To |
|---|---|---|---|
| `idle` | `START_SESSION` | — | `countdown` |
| `countdown` | `COUNTDOWN_DONE` | timer reaches 0 | `scanning` |
| `scanning` | `ANSWER_MATCHED` | N-frame buffer satisfied | `success` |
| `scanning` | `ROUND_TIMEOUT` | wall clock > round_duration | `timeout` |
| `success` | `NEXT_PROBLEM` | user tap OR auto-advance delay | `countdown` |
| `timeout` | `RETRY` | — | `countdown` (same problem) |
| `timeout` | `HINT_SHOWN` | — | stays in `timeout` showing hint |

### CV inference lifecycle tied to state

CV inference (Web Worker active) only during `scanning` state:

- Enter `scanning` → `worker.postMessage({ type: 'START_INFERENCE' })`
- Exit `scanning` → `worker.postMessage({ type: 'STOP_INFERENCE' })`

The worker's inference loop:
```typescript
onmessage = (e) => {
  if (e.data.type === 'START_INFERENCE') inferenceActive = true
  if (e.data.type === 'STOP_INFERENCE') inferenceActive = false
  // frame loop only posts results back when inferenceActive = true
}
```

This satisfies PRD constraint: "CV inference is only active during rounds — paused during countdown" (`.claude/plans/prd.md:48`).

### Timer management

Two timers:
1. **Countdown timer** (UI side): counts down from N seconds (recommend 5–10s, configurable). When it hits 0, dispatches `COUNTDOWN_DONE` to the game reducer.
2. **Round timeout timer** (UI side, starts on `scanning` entry): if the child hasn't answered in 30–60s, dispatch `ROUND_TIMEOUT`.

Both timers use `useRef` + `clearInterval` on state exit to avoid memory leaks. `setInterval` in the main thread is fine for these (not frame-critical). The CV inference loop is separate and runs in the worker.

### React state management

Use `useReducer` for the game phase machine (as specified in the PRD: `.claude/plans/prd.md:70`). The reducer handles all valid transitions. Invalid transitions (e.g., `ANSWER_MATCHED` while in `countdown`) are ignored by the reducer — this prevents impossible states.

Zustand handles high-frequency CV data — the `InterpretationLayer` writes to a Zustand store that React subscribes to via `subscribe` (not `useStore`), so CV results don't trigger re-renders unless they change game-relevant state.

---

## 8. Edge Cases — Analysis and Mitigations

### Child places correct answer AND has same digit elsewhere

Example: answer is 7, child places tile "7" in the answer zone, but also has tile "7" sitting randomly on the table.

With the soft zone visual + digit-count gate: if the zone is instructionally effective, the child will place their "intentional" 7 closer to the zone while the other 7 is farther away. Both will be detected. Both are single-digit candidates for digit "7". The buffer will fill on the first frame that sees any "7" candidate — the round ends correctly regardless of which "7" wins. No ambiguity.

### Two copies of the same digit (e.g., two "5" tiles visible)

Both are detected and post-NMS, both survive (different positions). If the answer is 5, the first frame produces multiple single-digit "5" candidates. The match logic returns true on the first matching candidate. Round ends correctly.

If the answer is 55 (out of scope for ages 5–8 addition), this could be a problem. For the MVP scope (single-digit and two-digit ≤ 18), this is not an issue.

### Tiles partially occluded by hand

- Confidence drops below 0.65 threshold — detection is dropped by NMS
- MAD motion gate fires — frame is tagged as motion, rejected from buffer
- Both gates together ensure that during hand placement, no commit occurs

### Child removes tiles during active round

Detections disappear. Next frame: no match. Buffer streak breaks. System goes back to waiting. No special handling needed — the N-frame buffer naturally handles this.

### Answer is 0

"0" is a valid single tile. No special case needed. Single-tile detection for class "0" is treated identically to any other digit.

### 6 vs 9 confusion

The PRD calls for underlined physical tiles (`.claude/plans/prd.md:79`). The CV model must be trained to distinguish 6 and 9 as separate classes — this is a training concern, not a game logic concern. The interpretation layer does not need special handling. Fixture tests should include upright and rotated tiles.

---

## 9. Practical Approach for 1-Week Demo Sprint

### Recommended minimal viable implementation

**Day 1–2:** Game logic with MockRecognitionService (keyboard input, button press). Build the full state machine and temporal buffer against mocked detection streams. Test thoroughly — this is the hardest logic to get right and can be done without a real CV model.

**Day 3–4:** Wire real ONNX model inference to the same interface. The InterpretationLayer (grouping + matching) connects here.

**Day 5:** Physical tile testing. Tune GAP_MULTIPLIER, MOTION_THRESHOLD, and confidence threshold with actual tiles on the actual play surface.

### What to simplify for the sprint

1. **Skip the soft zone overlay spatial gate for Phase 1.** Use Option B (digit-count gate) only. The visual zone is a UI hint — draw it — but do not implement coordinate-based filtering in the InterpretationLayer. Reason: calibrating the on-screen zone to the physical play surface requires perspective transform work that is not necessary if the digit-count gate works reliably.

2. **Use Option C (all-detections subset check) as the very first implementation**, then gate it with the digit-count filter. Start: "does the answer digit appear anywhere?" Then add: "is it in an isolated group of the right size?" This lets you verify the pipeline end-to-end before adding the stray-tile filter.

3. **Motion gate via confidence drop first.** Implement the confidence-drop proxy (average confidence < 0.40 → mark frame as unstable) before implementing frame differencing. It requires no additional code path in the worker — just check the inference result. Add frame differencing if testing reveals it's needed.

4. **N-frame buffer: implement as a simple counter, not a full circular buffer.** Track `consecutiveMatchCount: number`. On match: increment. On mismatch: reset to 0. When count reaches 3: commit. This is simpler to reason about than a ring buffer and sufficient for the MVP.

---

## 10. Constraints

These cannot change without an architecture change:

1. **CV inference in Web Worker only** — immutable rule (`.claude/rules/immutable.md:2`). The InterpretationLayer runs inside the worker, not on the main thread.
2. **CV inactive during countdown** — PRD requirement (`.claude/plans/prd.md:48`). State machine must enforce this.
3. **3 consecutive matching frames required** — PRD requirement (`.claude/plans/prd.md:54`). Buffer must be frame-consecutive, not time-based.
4. **Confidence threshold ≥ 0.65** — PRD requirement (`.claude/plans/prd.md:57`). Pre-NMS filtering.
5. **No UI-thread inference** — immutable. PostMessage boundary between worker and main thread.

---

## 11. Options Summary

| # | Stray Tile Strategy | Complexity | Reliability | Sprint Fit |
|---|---|---|---|---|
| A | Soft zone spatial filter | Medium (needs calibration) | High | Defer coordinate filtering; keep visual hint |
| B | Digit-count gate (exact tile count) | Low | Medium-High | **Recommended** |
| C | All-detections subset (unconstrained) | Lowest | Low (stray-tile false positives) | Day-1 prototype only |

| # | Temporal Strategy | Complexity | Reliability | Sprint Fit |
|---|---|---|---|---|
| X | Simple consecutive counter | Lowest | Good | **Recommended** |
| Y | Circular buffer with per-candidate tracking | Medium | Better (handles digit changes) | Post-sprint refinement |

| # | Motion Gate | Complexity | Reliability | Sprint Fit |
|---|---|---|---|---|
| M1 | Confidence drop proxy | Lowest | Medium | **Start here** |
| M2 | Frame differencing (MAD) | Low | High | Add if M1 insufficient |

---

## 12. Recommendation

### The complete minimal viable auto-check algorithm

```
InterpretationLayer (runs in Web Worker):

Per frame (when inferenceActive = true):
  1. MOTION GATE:
     - If avg_confidence_of_all_detections < 0.40: mark frame unstable, skip commit check

  2. GROUPING:
     - Sort detections left-to-right by x_center
     - For each adjacent pair: check y-alignment (|dy| < 0.5 * avg_height)
       AND x-proximity (gap < 1.0 * avg_width)
     - Grouped pairs → two-digit candidates (e.g., "15")
     - Ungrouped detections → single-digit candidates (e.g., "7")

  3. MATCH:
     - targetStr = currentAnswer.toString()
     - For each candidate: if candidate.digits === targetStr: match = true

  4. BUFFER:
     - if match: consecutiveMatches++
     - else: consecutiveMatches = 0
     - if consecutiveMatches >= 3: postMessage({ type: 'ANSWER_COMMITTED', ... })

  5. FEEDBACK (Phase 1, independent of buffer):
     - if any candidate.digits === targetStr (even on first frame):
         postMessage({ type: 'TILE_SEEN', candidate })
```

This algorithm:
- Is implementable in < 1 day
- Handles the stray-tile problem via digit-count gate
- Satisfies the 3-frame temporal stability requirement
- Provides two-phase feedback (instant + commit)
- Degrades gracefully on detection noise (missed frames just reset the counter)
- Has no external dependencies beyond what the PRD specifies

**Risk:** If two "7" tiles are visible and the answer is "7", both are detected, both match, and the system commits correctly. If the child accidentally places a "7" tile on the table at any point during a round, it will trigger "tile seen" feedback and eventually commit. Mitigations: (a) the soft zone UI hint guides the child; (b) the countdown gives the child time to arrange tiles before inference starts; (c) the 3-frame buffer prevents a quick accidental placement from triggering a false commit if the tile is removed within 2 frames.

---

## Sources

- [Osmo (game system) - Wikipedia](https://en.wikipedia.org/wiki/Osmo_(game_system))
- [OSMO Numbers support — dot tiles vs number tiles](https://support.playosmo.com/hc/en-us/articles/115009541888)
- [A Peek into Osmo's Reflective AI Technology](https://www.tumblr.com/playosmo/94655155207/a-peek-into-osmos-reflective-ai-technology)
- [OSMO patent: Virtualization of Tangible Interface Objects (US2015339532)](https://patentsonthesolesofyourshoes.blogspot.com/2016/02/oh-patents-osmos-virtualized-tangible.html)
- [MDig: Multi-digit Recognition on Mobile (Stanford CS231m)](https://web.stanford.edu/class/cs231m/projects/final-report-yang-pu.pdf)
- [Bounding Box Sorting Algorithm for Text/Object Detection (Medium)](https://vigneshgig.medium.com/bounding-box-sorting-algorithm-for-text-detection-and-object-detection-from-left-to-right-and-top-cf2c523c8a85)
- [How to sort YOLOv8 output boxes (Ultralytics GitHub issue #4971)](https://github.com/ultralytics/ultralytics/issues/4971)
- [Gesture stabilization: 10-frame history buffer + majority voting (ThinkRobotics)](https://thinkrobotics.com/blogs/tutorials/advanced-human-pose-tracking-and-gesture-recognition-a-complete-development-guide)
- [Motion Detection: Frame Differencing Part 1 (Medium)](https://medium.com/@itberrios6/introduction-to-motion-detection-part-1-e031b0bb9bb2)
- [Motion detection threshold ~35 on 0–255 scale (ICIT paper)](https://www.ripublication.com/irph/ijict_spl/ijictv4n15spl_10.pdf)
- [Sliding window majority voting for action recognition (ACM DL)](https://dl.acm.org/doi/10.1145/3529399.3529425)
- [useReducer as finite state machine (Kyle Shevlin)](https://kyleshevlin.com/how-to-use-usereducer-as-a-finite-state-machine/)
- [Game loop in Web Worker pattern (Simon Ghales, GitHub Gist)](https://gist.github.com/simonghales/3bf189c97f0a0fea2f028566c45ce414)
- [Web Workers with TensorFlow.js (Edison Chee)](https://edisonchee.com/writing/web-workers-with-tensorflow.js/)
- [Real-time Online Video Detection with Temporal Smoothing Transformers (ECCV 2022)](https://arxiv.org/abs/2209.09236)
- [Marbotic Smart Numbers — capacitive detection technology (Macworld review)](https://www.macworld.com/article/229501/marbotic-smart-letters-and-smart-numbers-review-toys-tablets-educational-fun.html)
- Tangible user interface TUIO protocol: object ID + XY position + orientation per detected object
