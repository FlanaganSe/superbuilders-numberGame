---
name: training_pipeline
description: Confirmed facts about the digit-tile ONNX model training pipeline — class mapping, dataset sizes, augmentation bugs, preprocessing alignment, and retraining guidance
type: project
---

# Training Pipeline Facts

**Why:** Deep research done 2026-03-13. Future sessions should not re-derive these from scratch.

## Confirmed facts

### Active model (as of 2026-03-13, commit 3e2133c)
- **Active model:** `digit-tiles.onnx` is a **36-class alphanumeric model** outputting `[1, 40, 8400]`. Classes: `0-9` + `A-Z`. Date embedded: 2026-03-13.
- **Backup model:** `digit-tiles.onnx.bak` is the **original 10-class digit model** outputting `[1, 14, 8400]`. Date embedded: 2026-03-12.
- **Contract mismatch:** The game only uses digits 0–9 but the active model includes 26 letter classes. Letter class IDs 10–35 pass through as phantom "digit" values with no bounds check (`postprocessing.ts:198`).
- **No lineage for active model:** No training logs, dataset manifests, or eval metrics exist for the 2026-03-13 36-class model.

### 10-class `.bak` model (last known good digit-only model)
- **Class map:** classId 0→digit 0, ..., classId 9→digit 9. Verified from ONNX metadata `names` field.
- **Dataset size:** train=417 (≈42/class), valid=25 (≈2–3/class), test=14. Metrics are high-variance noise.
- **Confirmed training bug:** `fliplr=0.5` was used (YOLO default not overridden). 50% of training images horizontally flipped — invalid for asymmetric digits.
- **Active augmentations:** HSV saturation (0.7), HSV value (0.4), scale (0.5), mosaic (1.0) — all YOLO defaults, all active.
- **Roboflow resize:** "Stretch to 640×640" — distorts aspect ratio. Inference uses **letterbox** with gray 114 padding. Minor train/inference mismatch.
- **Preprocessing at inference:** letterbox → gray 114 fill → planar RGB [R,G,B] → /255 → Float32Array [1,3,640,640].
- **Weak classes:** 0 (50% recall), 1 (83%), 5 (50%), 8 (0% recall) in confusion matrix.
- **Export:** opset=17, FP32, no embedded NMS, batch=1. All correct.
- **Inference output:** [1, 14, 8400] — 14 = 4 box + 10 class scores, 8400 anchors at 640×640.

## CacheFirst + in-place swap = split device population
The model was replaced in-place at the same URL (`/models/digit-tiles.onnx`) in commit `3e2133c`. CacheFirst never revalidates. Devices that cached the old 10-class model serve it indefinitely; fresh devices get the 36-class model. **Always version model filenames** (e.g., `digit-tiles-v1.onnx`) on any update.

## Retraining recommendation

Priority 0 (no training): restore 10-class `.bak` as `digit-tiles-v1.onnx`, add classId bounds check in `postprocessing.ts:198`, preserve single-digit candidates in interpretation grouping.

Priority 1 (next training): fix `fliplr=0.0`, change Roboflow preprocessing to letterbox (not stretch), add data for weak classes (0, 1, 5, 8) from real iPad camera in deployment environment, expand validation to 10–15/class, train 200 epochs with `patience=50 label_smoothing=0.1`, deploy as `digit-tiles-v2.onnx`.

**How to apply:** When any retrain discussion comes up, start from these verified facts rather than re-inspecting artifacts. When model swap or deployment is discussed, always raise the versioned filename requirement.
