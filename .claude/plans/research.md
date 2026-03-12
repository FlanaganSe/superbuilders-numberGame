# Research: Why Detection Is Finicky

> 2026-03-12 — Updated after critical review, model artifact inspection, and training artifact verification

---

## Executive Summary

The issue is **not only training data**. There are confirmed code-level amplifiers and a training configuration bug. But the original research contained several factual errors that must be corrected before planning.

**Key corrections from critical review:**
- **T2 was wrong:** HSV augmentation IS already enabled (YOLO defaults: `hsv_s=0.7, hsv_v=0.4`). Verified from `args.yaml`.
- **C7 resolved:** Class labels confirmed correct (`{0:'0', 1:'1', ..., 9:'9'}`). Verified from ONNX metadata.
- **C8 resolved:** Output tensor confirmed named `output0`. Verified from ONNX model.
- **T6 resolved:** Scale augmentation confirmed active (`scale=0.5`). Default YOLO behavior.
- **New discovery:** `fliplr=0.5` was used in training — 50% of images were horizontally flipped. For digits, mirrored images are invalid training examples. This is a real training bug.
- **New discovery:** Validation set is only 25 images. Training metrics (mAP50 ≈ 0.877) are unreliable.
- **New discovery:** Stale `tileSeen` in game-store creates "it just sits there" UX symptom.

**The core failure cascade (unchanged, confirmed):**
1. Model intermittently misses tiles or outputs confidence below 0.65
2. Any single null frame **hard-resets** temporal buffer from count=N to count=0
3. At 4-10fps, even a 33% per-frame miss rate makes 3 consecutive matches improbable (0.67³ ≈ 30%)
4. Buffer oscillates 0↔1↔0, never reaching 3

---

## Verified From Artifacts

These facts come from inspecting the actual model file and training outputs, not from assumptions.

### ONNX Model Metadata (verified)

```
names: {0: '0', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9'}
Input: images, shape: [1, 3, 640, 640]
Output: output0, shape: [1, 14, 8400]
stride: 32, task: detect, nms: False, end2end: False
```

**Implications:** `classId as Digit` cast is correct. `results.output0` is correct. No embedded NMS — app must do its own (it does). 14 channels = 4 box + 10 class scores. All verified.

### Training Configuration (from `args.yaml`)

| Parameter | Value | Significance |
|-----------|-------|-------------|
| `hsv_s` | 0.7 | HSV saturation augmentation IS active (T2 was wrong) |
| `hsv_v` | 0.4 | HSV value augmentation IS active (T2 was wrong) |
| `scale` | 0.5 | Scale augmentation IS active (T6 resolved) |
| `mosaic` | 1.0 | Mosaic augmentation active |
| **`fliplr`** | **0.5** | **Horizontal flip ON — this is a bug for digit detection** |
| `flipud` | 0.0 | Vertical flip off (correct) |
| `label_smoothing` | 0.0 | Not used (could help) |
| `epochs` | 50 | Low but not critically so |
| `patience` | 100 | Early stopping didn't trigger (only 50 epochs) |

### Dataset Sizes (verified)

| Split | Count |
|-------|-------|
| Train | 417 images |
| Valid | 25 images |
| Test | 14 images |

25 validation images means ~2-3 per class. **All validation metrics are high-variance noise.** The confusion matrix shows "8" at 0% recall and "0" and "5" at 50% recall, but these likely reflect 1-2 missed images each, not systematic failure.

### Confusion Matrix (from normalized confusion matrix image)

| Digit | Recall | Notes |
|-------|--------|-------|
| 0 | 0.50 | 50% missed (but maybe only 2 val images) |
| 1 | 0.83 | 17% missed |
| 2 | 1.00 | |
| 3 | 1.00 | |
| 4 | 1.00 | |
| 5 | 0.50 | 50% missed; also 25% background→5 false positives |
| 6 | 1.00 | |
| 7 | 1.00 | |
| 8 | 0.00 | Never detected in validation (likely 1-2 images) |
| 9 | 1.00 | |

**Interpretation:** These numbers are unreliable due to tiny validation set. But the pattern of missed detections (0, 1, 5, 8) and background false positives (→0, →1, →5) suggests the model has learned some digit shapes better than others. Retraining with more data and larger validation set is needed for reliable evaluation.

---

## Confirmed Code Issues

### C1. Temporal buffer hard-resets on any single null frame [HIGH — primary code issue]

**File:** `src/cv/temporal-buffer.ts:29-33`

```ts
if (matchedAnswer === null) {
    count = 0; currentAnswer = null; tileSeen = false;
    return { type: "NONE" };
}
```

Any single frame where detection, grouping, or answer matching fails immediately destroys all accumulated progress. With even a modest per-frame miss rate, reaching 3 consecutive frames becomes improbable.

### C2. Confidence threshold 0.65 compounds C1 [HIGH — but coupled to C1]

**File:** `src/cv/postprocessing.ts:18`

The threshold of 0.65 is within a defensible range for a 10-class detector. The Ultralytics default of 0.25 is for prediction/exploration, not production deployment. However, 0.65 combined with the zero-tolerance temporal buffer (C1) creates a compounding failure: any frame where the correct class dips to 0.50-0.64 produces null → immediate reset. Lowering to 0.50 is reasonable.

**Nuance:** If C1 is fixed with miss-streak tolerance, the threshold matters less. C1 is the higher-leverage fix.

### C3. Motion gate is dead code [MEDIUM]

**File:** `src/cv/motion-gate.ts:10` vs `src/cv/postprocessing.ts:18`

Every detection surviving postprocessing has confidence ≥ 0.65 > 0.40 (the motion gate threshold). `isFrameStable` always returns `true` for non-empty arrays. Empty arrays also return `true` (line 19), passing zero-detection frames through to processDetections where they produce null → buffer reset.

This code does nothing. It should be removed or repurposed.

### C4. Grouping uses scene-wide avgWidth [MEDIUM — affects multi-digit answers]

**File:** `src/cv/interpretation.ts:64-65`

Global average width across all detections means a spurious small box tightens the proximity threshold for the real tile pair. Fix: use pair-local width `(left.bbox.width + right.bbox.width) / 2`.

### C5. Horizontal proximity factor may be too tight [LOW — tuning, not bug]

**File:** `src/cv/interpretation.ts:18` — `HORIZONTAL_PROXIMITY_FACTOR = 1.0`

The code already documents "Raise to 1.5 if adjacent tiles aren't grouping." Whether 1.0 is too tight depends on actual child placement behavior. This is a tuning parameter, not a definitive bug. Should be tested empirically on device.

### C6. Stale tileSeen creates "it just sits there" UX [MEDIUM — new finding]

**File:** `src/store/game-store.ts:82`

When temporal buffer resets (returns `NONE`), game-store's `tileSeen` is not cleared. The `NONE` case is a no-op. So after the first TILE_SEEN event sets `tileSeen=7`, if the model then loses the tile for multiple frames, the UI continues showing "I see 7!" with the tile-detected animation, while the debug HUD shows 0/3 temporal count and no detections.

This directly explains the "it just sits there" symptom: the child sees positive feedback that doesn't progress.

**Fix:** Clear `tileSeen` when temporal count drops to 0.

### C7. Dead code: unreachable tileSeen branch [INFO — cleanup]

**File:** `src/cv/temporal-buffer.ts:47-53`

The `!tileSeen` branch is unreachable because `tileSeen` is always set to `true` in the "new answer" branch (line 40) before the "same answer" path can increment count. Cosmetic, no behavioral impact.

---

## Confirmed Training Issues

### T1. Horizontal flip is enabled — invalid for digits [HIGH — new finding]

**Verified from:** `args.yaml` → `fliplr: 0.5`

50% of training images are horizontally flipped. A flipped "3" is a mirror image that doesn't exist in the real world. A flipped "2" looks like nothing a child would place. This injects noise into every class except symmetric digits (0, 8, and partially 1).

The training guide correctly says "Do NOT enable Horizontal Flip" in Roboflow settings, but the YOLO training command did not override the YOLO default of `fliplr=0.5`.

**Fix:** Add `fliplr=0.0` to the training command.

### T2. Training data is small but not catastrophically so [MEDIUM — downgraded from HIGH]

417 train images for 10 classes ≈ 42/class. The Ultralytics recommendation of "≥1,500 images per class" comes from a YOLOv5 tutorial for general-purpose COCO-scale detection. For a constrained domain (10 classes, known physical tiles, controlled backgrounds, pretrained backbone), the gap is real but the "35× below minimum" framing was misleading.

More data will help, especially for deployment environments different from training. But fixing fliplr (T1) and the code issues may yield more improvement than simply adding volume.

### T3. Validation set too small for reliable evaluation [MEDIUM — new finding]

25 validation images ≈ 2-3 per class. This makes all validation metrics (mAP50, confusion matrix, precision, recall) high-variance estimates. The results.png shows mAP50 oscillating between 0.7 and 0.95 across epochs — a sign of validation noise, not training instability.

**Fix:** When retraining, use at least 50-100 validation images (proportional to expanded training set).

### T4. No label smoothing [LOW — downgraded from MEDIUM]

`label_smoothing=0.0` in training. Adding `label_smoothing=0.1` is low-risk and may reduce overconfident wrong predictions, but it's a minor improvement compared to fixing fliplr and adding data.

### T5. More epochs with early stopping [LOW]

50 epochs with patience=100 means early stopping never triggered. The loss curves in results.png show training was still improving at epoch 50. Training for 150-300 epochs with `patience=50` is low-cost and may help. But this is secondary to data quality (T1, T2).

---

## What Is Correct (verified)

| Component | Status | Verification |
|-----------|--------|-------------|
| Tensor format `[1, 14, 8400]` channel-major | Correct | ONNX model inspection |
| Class label ordering (0-9 numeric) | Correct | ONNX metadata `names` field |
| Output tensor name `output0` | Correct | ONNX model inspection |
| No sigmoid needed (baked into ONNX export) | Correct | Ultralytics issue #23700 |
| Box decoding (cx,cy,w,h → corner-form) | Correct | Standard YOLO decode |
| Class-agnostic NMS | Correct | Physical tiles don't overlap; per-class would retain confused duplicates |
| Letterbox math (gray=114, correct unletterbox) | Correct | Unit tested |
| WASM single-thread (`numThreads: 1`) | Correct | Multi-thread requires COOP/COEP, breaks Safari |
| SIMD enabled | Correct | Safari supports since iOS 16.4 |
| Busy-flag frame dropping | Correct | Returns null, preserves temporal buffer state |
| rVFC chaining | Correct | Natural frame-rate adaptation |
| Canvas-intermediate for Safari (not direct createImageBitmap(video)) | Correct | WebKit bug #234920 |
| HSV augmentation in training | Correct | `hsv_s=0.7, hsv_v=0.4` (YOLO defaults active) |
| Scale augmentation in training | Correct | `scale=0.5` (YOLO default active) |
| Mosaic augmentation in training | Correct | `mosaic=1.0` (YOLO default active) |
| Vertical flip disabled | Correct | `flipud=0.0` |
| No NMS baked into ONNX | Correct | `nms: False, end2end: False` in model metadata |

---

## The Four User Symptoms Explained

### "Confidence bouncing between valid values and '-'"
**Root cause (FIXED in prior session):** Busy-dropped frames returned `EMPTY_RESULT` which overwrote cv-store. Fix applied: return `null` for skipped frames.

### "Temporal buffer stuck at 0/3 with high confidence"
**Root causes:** C1 (hard reset on single null) + C2 (0.65 threshold) + C4 (grouping brittle for multi-digit). A high-confidence detection in the debug HUD doesn't mean the full pipeline (detection → grouping → answer matching → temporal buffer) succeeded. Any step failing produces null → reset.

### "Sometimes matching numbers incorrectly"
**Root causes:** T1 (fliplr creating mirrored digit noise) + T2 (limited training data). The class label ordering hypothesis (old C7) is now **ruled out** — labels are correct.

### "Worse in untrained environments"
**Root causes:** T2 (limited training variety) + T1 (fliplr noise degrading learned features). Note: HSV augmentation IS present, so lighting variation should be partially handled. The remaining environment sensitivity is from limited scene diversity in training data.

### "It just sits there"
**Root cause:** C6 (stale tileSeen). After initial TILE_SEEN, the UI shows "I see 7!" indefinitely even as the temporal buffer resets on every frame. The positive feedback persists while no progress is being made.

---

## Corrections to Prior Research

| Prior Claim | Status | Correction |
|------------|--------|-----------|
| T2: HSV augmentation missing | **Wrong** | `hsv_s=0.7, hsv_v=0.4` active in training (YOLO defaults) |
| C7: Class labels possibly alphabetical | **Wrong** | ONNX metadata confirms `{0:'0', 1:'1', ..., 9:'9'}` |
| C8: Output tensor name risk | **Resolved** | ONNX model output confirmed as `output0` |
| T6: Scale augmentation not enabled | **Resolved** | `scale=0.5` active (YOLO default) |
| T1: "35× below recommended minimum" | **Misleading** | That recommendation is for general COCO-scale, not constrained domain-specific detection |
| C6: NMS IoU 0.45 causes duplicate leakage | **Speculative** | The same-digit overlap guard in interpretation.ts already mitigates this; no evidence of real-world phantom multi-digit candidates |
| T3: Gradient step calculation | **Wrong** | 50 epochs × (417/16 batch) ≈ 1,300 iterations, not 20,850 |
| New: fliplr=0.5 training bug | **Missed by both** | Verified from training args |
| New: 25-image validation set | **Missed by both** | Makes all quoted metrics unreliable |
| New: Stale tileSeen UX issue | **Missed by original** | Causes "it just sits there" symptom |

---

## Prioritized Recommendations

### Phase 1: Code fixes (no new model needed)

| Priority | Change | File | Impact |
|----------|--------|------|--------|
| 1 | Add miss-streak tolerance (reset after 2+ consecutive nulls, not 1) | `temporal-buffer.ts:29-33` | **Highest leverage** — prevents single-frame misses from destroying progress |
| 2 | Clear stale tileSeen when temporal count drops to 0 | `game-store.ts:82` | Fixes "it just sits there" UX symptom |
| 3 | Lower confidence threshold to 0.50 | `postprocessing.ts:18` | More detections survive to temporal buffer; less impactful if #1 is done well |
| 4 | Use pair-local width in grouping proximity check | `interpretation.ts:64-65` | Fixes grouping instability when spurious detections present |
| 5 | Remove dead motion gate code | `motion-gate.ts`, `App.tsx:166` | Reduces confusion; gate does nothing |
| 6 | Remove unreachable tileSeen branch | `temporal-buffer.ts:47-53` | Dead code cleanup |

### Phase 2: Retrain model

| Priority | Change | Impact |
|----------|--------|--------|
| 1 | Add `fliplr=0.0` to training command | Stops injecting mirrored digits as valid training examples |
| 2 | Add more training data from deployment environments | Better generalization (target: 100+ images/class) |
| 3 | Increase validation set proportionally | Reliable metrics for model evaluation |
| 4 | Add `label_smoothing=0.1` | May reduce overconfident wrong predictions |
| 5 | Train for 150+ epochs with `patience=50` | Ensure convergence |
| 6 | Add more background-only images | Reduce false positives |

**Recommended training command:**
```bash
yolo detect train \
  data=dataset/data.yaml \
  model=yolo11n.pt \
  epochs=200 \
  imgsz=640 \
  device=mps \
  fliplr=0.0 \
  label_smoothing=0.1 \
  patience=50
```

Note: `hsv_s`, `hsv_v`, `scale`, `mosaic` don't need to be specified — they're YOLO defaults and already active.

### What NOT to do

- **Don't re-specify HSV/scale/mosaic augmentation** — they're already on by default. Adding them to the command is harmless but creates a false impression they were missing.
- **Don't lower NMS IoU threshold without evidence** — the prior C6 claim was speculative. The interpretation layer's duplicate guard already handles same-digit overlaps.
- **Don't add spatial ROI enforcement** — the "answer zone" is a UI hint. The app can't know where the answer zone maps to in camera space without calibration.
- **Don't upgrade to YOLO11s** — fix data quality first; larger model won't help with mirrored-digit noise.
- **Don't change REQUIRED_CONSECUTIVE_FRAMES from 3** — the miss-streak tolerance addresses the symptom without weakening the confirmation threshold.

---

## Direct Answers to the Four Questions

### 1. Is the issue ONLY in training data?

**No.** The temporal buffer hard-reset (C1) and stale tileSeen (C6) are code issues independent of model quality. Even a perfect model has occasional frame misses.

### 2. Is there ALSO an issue with code/orchestration?

**Yes.** C1 (zero-tolerance temporal buffer), C6 (stale tileSeen), C2 (threshold compounding C1), and C4 (brittle grouping) are all confirmed code contributors. The motion gate is dead code that should be cleaned up.

### 3. Would new training data improve performance?

**Yes, if targeted.** But first fix `fliplr=0.0` — the current model was trained with 50% mirrored digit images. New data alone won't help if the augmentation bug persists. Highest-value data: deployment environments where the app currently struggles, hard negatives (hands, clutter, table textures), and confusion pairs.

### 4. Other unknowns?

- Real-device failure breakdown (detection miss vs grouping failure vs temporal reset) is not instrumented
- Actual camera settings returned by Safari on iPad are never inspected
- Whether the `object-cover` CSS on the video element causes the debug overlay boxes to be misaligned (visual debugging issue, not detection issue)
- Effective inference FPS under real load on target iPad hardware

---

## Sources

### Verified from artifacts
- ONNX model metadata: `public/models/digit-tiles.onnx` inspected via `onnx.load()`
- Training args: `~/proj/digit-training/runs/detect/train/args.yaml`
- Training metrics: `~/proj/digit-training/runs/detect/train/results.csv`
- Confusion matrix: `~/proj/digit-training/runs/detect/train/confusion_matrix_normalized.png`
- Dataset: `~/proj/digit-training/dataset/data.yaml` — `names: ['0', '1', ..., '9']`
- Dataset sizes: train=417, valid=25, test=14

### External
- [Ultralytics config — conf default 0.25](https://docs.ultralytics.com/usage/cfg/)
- [Tips for Best Training Results](https://docs.ultralytics.com/yolov5/tutorials/tips_for_best_training_results/)
- [Data Augmentation — YOLO defaults](https://docs.ultralytics.com/guides/yolo-data-augmentation/)
- [YOLOv11 output format — discussions #17254](https://github.com/orgs/ultralytics/discussions/17254)
- [WebKit Bug 234920 — createImageBitmap(video) slow](https://bugs.webkit.org/show_bug.cgi?id=234920)
