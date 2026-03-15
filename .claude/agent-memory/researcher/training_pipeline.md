---
name: training_pipeline
description: Current state of the digit-tile ONNX model training pipeline -- train3 (deployed 2026-03-15), class mapping, pipeline scripts, dataset config, and retraining guidance
type: project
---

# Training Pipeline Facts

**Why:** Deep research done 2026-03-13 (app side) + 2026-03-14 (digit-training repo, train2)
+ 2026-03-15 (full re-survey after train3 completion). train3 fixed every known issue from train2.

## Deployed model state (as of 2026-03-15)

- **Active model:** `digit-tiles.onnx` is **train3** -- YOLOv11n, 36-class, outputting `[1, 40, 8400]`.
  Classes: `0-9` + `A-Z`.
- **Backup:** `digit-tiles.onnx.pre-train3` -- the old train2 model.
- **Val metrics:** mAP50=0.995, mAP50-95=0.973, Precision=0.993, Recall=0.998.
- **Test mAP:** 0.907 -- lower due to thin test samples for some letter classes (F, L), not real failures.
- **ONNX:** 10.6 MB, opset 17, float32, batch=1.

## digit-training repo location

`/Users/seanflanagan/proj/digit-training` -- separate Python project, not in superbuilders repo.

## Key files

- `scripts/config.py` -- 36-class map, OpenRouter API config, annotation prompt, YOLO thresholds
- `scripts/filter.py` -- blur (Laplacian variance, threshold=**1.0**) + perceptual hash dedup (hamming=8), within-prefix
- `scripts/annotate.py` -- Gemini via OpenRouter, base64 image, json_schema structured output
- `scripts/convert.py` -- Gemini 0-1000 coords -> YOLO 0-1.0 cx/cy/w/h format
- `scripts/qa.py` -- draws boxes, class distribution, consistency, geometry checks
- `scripts/upload.py` -- Roboflow batch upload (workspace: seans-workspace-zsmup, project: digital-tiles)
- `scripts/split.py` -- stratified grouped split by video prefix (NEW in train3 era; absent in train2)
- `kaggle/train-digit-tiles.ipynb` -- full Kaggle P100 training notebook
- `docs/training.md` -- authoritative end-to-end guide (~734 lines)

**`scripts/run.py` does not exist** -- pipeline runs module-by-module.

## LLM annotation details

- Model: `google/gemini-3.1-flash-lite-preview` via OpenRouter (OpenAI-compatible SDK)
- Fallbacks: `google/gemini-3-flash-preview`, `google/gemini-2.5-flash`
- Prompt: detect white card tiles, return label + box_2d [y_min, x_min, y_max, x_max] 0-1000
- `json_schema` strict mode with provider pinning to Google
- Temperature: 0.1
- Gemini coordinate order: **[y_min, x_min, y_max, x_max]** (not x-first -- Gemini-specific)
- `is_prediction=False` on upload -- annotations go to ground truth, not review queue

## Class map

36 classes, IDs 0-9 = digits, 10-35 = letters A-Z. Stable since train2.
(`scripts/config.py:22-29`)

## train3 pipeline settings

- Filter blur threshold: **1.0** (recalibrated from 3.0 -- white-surface tiles have low texture)
- Roboflow resize: "Fit (white edges)" 640x640 (not "Stretch")
- Augmentation: 4x multiplier, training set only (brightness, exposure, blur, noise; no flip/rotation)
- No split in Roboflow (all assigned to train/); local `scripts/split.py` redistributes
- Grouped split target: 70% train / 20% valid / 10% test; all 36 classes in every split
- Training: 150 epochs, Kaggle P100, ~3.3 hrs
- Key YOLO flags: `fliplr=0.0`, `flipud=0.0`, `degrees=10`, `hsv_v=0.5`, `cos_lr=True`,
  `patience=50`, `close_mosaic=15`
- ONNX export: `opset=17, half=False, batch=1, imgsz=640`

## What train3 fixed (vs. train2)

- `fliplr=0.5` default was corrupting mirrored characters -> now `fliplr=0.0` explicit
- Random Roboflow split leaking sequential frames -> now grouped by video prefix via `scripts/split.py`
- Val set was only 50 images -> now ~250 images, all 36 classes covered
- Letterbox resize was unconfirmed -> now "Fit (white edges)" documented and enforced
- Deployed from epoch 28 checkpoint -> now full 150-epoch run with patience=50
- Local MPS training -> now Kaggle P100 (3.3 hrs vs. ~11 hrs)

## App integration

- Model path hardcoded: `src/cv/onnx-recognition.ts:102` -- `/models/digit-tiles.onnx`
- App uses StaleWhileRevalidate (not CacheFirst) -- overwriting same filename is safe
- `classRange` param in app selects digit-only (0-9) vs. letter mode (10-35)

## How to apply

For next retraining, `docs/training.md` is the authoritative guide.
Key invariants that must not change:
1. `fliplr=0.0` and `flipud=0.0` -- mirrored characters are invalid training data
2. `imgsz=640` in both training and ONNX export
3. `opset=17, half=False, batch=1` for ONNX (ORT Web 1.24.3 WASM EP constraint)
4. Always run `scripts/split.py` locally; never use Roboflow's random split
5. Upload dataset to Kaggle as a Dataset (not Code input) to preserve local splits
6. Roboflow resize: "Fit (white edges)" not "Stretch"

When deployment is discussed: overwriting `digit-tiles.onnx` in place is safe (StaleWhileRevalidate).
The CacheFirst concern from train2 era was resolved -- the app's service worker uses SWR.
