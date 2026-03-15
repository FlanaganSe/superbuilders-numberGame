# Research: digit-training Complete State (2026-03-15)

Full investigation of `/Users/seanflanagan/proj/digit-training` -- all markdown, all
scripts, Kaggle notebook, and agent memory. Read-only. No source files modified.

---

## 1. Current State

### What Exists

The digit-training project is a standalone Python ML pipeline (separate from the
superbuilders repo) that produces the ONNX model deployed to the app. The repo is
located at `/Users/seanflanagan/proj/digit-training`.

**Non-venv tracked files:**
```
digit-training/
  scripts/
    config.py           # 36-class map, OpenRouter config, annotation prompt, thresholds
    filter.py           # blur (Laplacian variance) + perceptual hash dedup
    annotate.py         # Gemini via OpenRouter -> Detection dataclass + batch runner
    convert.py          # Detection -> YOLO label format (0-1000 -> 0-1.0 cx/cy/w/h)
    qa.py               # draw boxes, class distribution, consistency, geometry checks
    upload.py           # Roboflow batch upload
    split.py            # stratified grouped split (NEW -- did not exist in train2 era)
    requirements.txt    # openai, imagehash, supervision, roboflow, python-dotenv
  kaggle/
    train-digit-tiles.ipynb   # full Kaggle P100 training notebook
  docs/
    training.md         # comprehensive end-to-end guide (~734 lines)
    train3-results.png  # training curves (produced in train3)
    train3-confusion-matrix.png
  README.md             # project overview, pipeline diagram, results table
  .env.example          # OPENROUTER_API_KEY, ROBOFLOW_API_KEY
  .gitignore            # .venv, frames/, dataset/, runs/, auto_labels/, *.onnx, *.pt
```

**Gitignored (on disk, not in repo):**
- `frames/` -- extracted video frames
- `auto_labels/` -- Gemini raw JSON + YOLO label files + QA images
- `dataset/` -- Roboflow-exported YOLOv8 dataset
- `runs/` -- YOLO training outputs (best.pt, best.onnx, metrics)

---

### Current Model: train3

The most recent training run is **train3**. It is the current deployed model.

| Metric | Value |
|---|---|
| mAP50 (val) | 0.995 |
| mAP50-95 (val) | 0.973 |
| Precision | 0.993 |
| Recall | 0.998 |
| mAP50 (test) | 0.907 |

- Architecture: **YOLOv11n**, 36 classes (0-9 + A-Z)
- Training: **150 epochs on Kaggle P100** (~3.3 hours)
- Dataset: ~1248 source images, 3x Roboflow augmentation -> ~5000 training images
- ONNX: **10.6 MB**, output shape `[1, 40, 8400]`, opset 17, float32
- Deployed to: `~/proj/superbuilders/public/models/digit-tiles.onnx`
- Backup: `digit-tiles.onnx.pre-train3` (the train2 model)

---

### What train3 Fixed vs. train2

| train2 Bug | train3 Fix |
|---|---|
| `fliplr=0.5` (YOLO default) corrupted mirrored chars | `fliplr=0.0` explicit in local command and Kaggle notebook |
| Random Roboflow split -- near-duplicate leakage | `scripts/split.py` -- stratified grouped split by video prefix |
| Val set: 50 images (too small, metrics unreliable) | ~20% of 1248 = ~250 val images, all 36 classes covered |
| Letterbox resize unconfirmed | Documented: "Fit (white edges)" to 640x640 |
| Deployed from epoch 28 checkpoint (not final) | Trained 150 epochs; patience=50 early stopping |
| Local MPS training (~11 hours) | Kaggle P100 (~3.3 hours) |
| No grouped split script | `scripts/split.py` created |

---

### Complete Current Pipeline (step by step)

**Step 1 -- Video capture** (manual, iPad-first)
- 10-15 second clips per scene bucket (single tile, multi-tile, hard negatives, confusable pairs)
- Naming convention: `single_digit0_overhead.MOV`, `multi_digits_dim.MOV`, etc.
- `docs/training.md:119-172`

**Step 2 -- Frame extraction** (ffmpeg)
- `fps=2` for content videos; `fps=1` for negative videos
- `README.md:114-118`

**Step 3 -- Filter** (`scripts/filter.py`)
- Blur: Laplacian variance, threshold=**1.0** (recalibrated from 3.0 for white-surface tiles)
- Dedup: perceptual hash, hamming distance=8, within-prefix only
- `scripts/config.py:50-51`, `scripts/filter.py:84-107`

**Step 4 -- Annotate** (`scripts/annotate.py`)
- Model: `google/gemini-3.1-flash-lite-preview` via OpenRouter
- SDK: `openai.OpenAI` pointed at `https://openrouter.ai/api/v1`
- Image: base64 data URI in `image_url` content block
- Output schema: strict JSON schema, `detections: [{label, box_2d}]`
- Bbox format: **[y_min, x_min, y_max, x_max]** normalized 0-1000 (Gemini-specific order)
- Temperature: 0.1, delay: 0.15s between calls, single retry on failure
- `scripts/config.py:34-108`, `scripts/annotate.py`

**Step 5 -- Convert** (`scripts/convert.py`)
- Gemini 0-1000 coords -> YOLO 0-1.0 cx/cy/w/h format
- Empty detections -> empty .txt (valid negative example)
- `scripts/convert.py:10-24`

**Step 6 -- QA** (`scripts/qa.py`)
- Class distribution, cross-frame consistency, bbox geometry, empty frame analysis
- Draws annotated QA images to `auto_labels/batch/qa/`
- `scripts/qa.py`

**Step 7 -- Upload** (`scripts/upload.py`)
- Workspace: `seans-workspace-zsmup`, Project: `digital-tiles`
- `is_prediction=False` -- goes straight to ground-truth (not review queue)
- `scripts/upload.py:12-13, 23-77`

**Step 8 -- Roboflow dataset version** (manual UI)
- Preprocessing: Auto-Orient On, Resize "Fit (white edges)" 640x640
- Augmentation training-only: Brightness +-23%, Exposure +-10%, Gaussian blur 3.6px, noise
- No horizontal flip, vertical flip, 90-degree rotation, cutout
- 4x augmentation multiplier; no split in Roboflow (all assigned to train/)
- `docs/training.md:258-293`

**Step 9 -- Local split** (`scripts/split.py`)
- Stratified grouped split: 70% train / 20% valid / 10% test
- Three-phase: mandatory class coverage -> capacity fill -> remainder to train
- Guarantees all 36 classes in every split; handles Roboflow's `_jpg.rf.{hash}` suffix
- `scripts/split.py`

**Step 10 -- Train** (Kaggle P100 recommended)
- `kaggle/train-digit-tiles.ipynb` -- full notebook
- Key flags: `fliplr=0.0`, `flipud=0.0`, `degrees=10`, `hsv_v=0.5`, `cos_lr=True`,
  `patience=50`, `close_mosaic=15`
- `docs/training.md:326-378`, `kaggle/train-digit-tiles.ipynb`

**Step 11 -- ONNX export**
- `yolo export model=best.pt format=onnx imgsz=640 opset=17 half=False batch=1`
- Output: `[1, 40, 8400]` -- 4 box coords + 36 class scores
- `docs/training.md:438-461`

**Step 12 -- Deploy**
- `cp best.onnx ~/proj/superbuilders/public/models/digit-tiles.onnx`
- App uses StaleWhileRevalidate -- overwriting same filename is safe
- `docs/training.md:468-487`

---

### Key Technical Details

**Gemini model:** `google/gemini-3.1-flash-lite-preview` via OpenRouter.
Fallbacks: `google/gemini-3-flash-preview`, `google/gemini-2.5-flash`.
(`scripts/config.py:34-46`)

**Blur threshold is 1.0, not 3.0.** Recalibrated for white-surface tiles (low texture).
The old researcher memory at `training_pipeline.md` says 3.0 -- that is stale.
(`scripts/config.py:50`)

**Roboflow project vs. Kaggle dataset:** Upload goes to Roboflow project `"digital-tiles"`
for annotation review. Training uses a Kaggle Dataset (separate zip upload). They are
independent. (`scripts/upload.py:12-13`)

**No `scripts/run.py`.** Pipeline still runs module-by-module -- this was noted as missing
in train2 era and remains absent. Not a problem; the docs describe the module invocation.

**Class map stable:** 36 classes, IDs 0-9 digits then 10-35 letters A-Z.
(`scripts/config.py:22-29`)

**Test mAP lower than val (0.907 vs. 0.995).** Agent memory notes this is likely due to
tiny test sample sizes for some letter classes (F, L), not real model failures.

**`batch_name="v2_fresh"` hardcoded** in `scripts/upload.py` __main__ (line 100).
Cosmetic Roboflow UI label, not functional. Can be changed before next upload.

**`is_prediction=False`** in upload -- annotations go directly to ground truth labels,
not the review queue. The prior research noted `True` was used for train2; this was
corrected in train3. (`scripts/upload.py:28`)

---

### Documents Currency Assessment

| File | Status | Notes |
|---|---|---|
| `README.md` | Current | Describes train3, correct pipeline, correct metrics |
| `docs/training.md` | Current | Full guide updated for train3; 150-epoch Kaggle workflow |
| `kaggle/train-digit-tiles.ipynb` | Current | Correct flags (fliplr=0.0 etc.) |
| `scripts/config.py` | Current | blur threshold=1.0, gemini-3.1-flash-lite-preview |
| `scripts/filter.py` | Current | |
| `scripts/annotate.py` | Current | |
| `scripts/convert.py` | Current | |
| `scripts/qa.py` | Current | |
| `scripts/upload.py` | Current | batch_name cosmetic issue only |
| `scripts/split.py` | Current | New in train3 era |
| `.claude/plans/digit-training-research.md` | **OUTDATED** | Describes train2; all "known gaps" are fixed in train3 |
| `training_pipeline.md` (researcher memory) | **OUTDATED** | Describes train2 state from 2026-03-14 |

---

## 2. Constraints

| Constraint | Source | Why it cannot change |
|---|---|---|
| `fliplr=0.0`, `flipud=0.0` mandatory | `README.md:166-167`, `docs/training.md:373-374` | Mirrored 3, 7, 9, J, Z are invalid training data |
| `imgsz=640` in both training and export | `docs/training.md:292` | App sends 640x640 frames; mismatch breaks all inference |
| `opset=17, half=False, batch=1` for ONNX | `docs/training.md:454-460` | ORT Web 1.24.3 WASM EP does not support FP16 |
| Grouped split (video prefix) required | `docs/training.md:262`, `scripts/split.py` | Sequential frames are near-identical -- random split leaks across train/val |
| Roboflow "Fit (white edges)" resize | `docs/training.md:269` | "Stretch" distorts 9:16 portrait to 1:1, breaking character proportions |
| Augmentation on training set only | `docs/training.md:291` | Augmenting val/test inflates mAP (near-duplicate augmented copies) |
| Roboflow workspace/project IDs | `scripts/upload.py:12-13` | `seans-workspace-zsmup` / `digital-tiles` |
| Model filename hardcoded in app | `src/cv/onnx-recognition.ts:102` | `/models/digit-tiles.onnx` -- rename requires app code change |
| Overwriting same filename is safe | `docs/training.md:476` | App uses StaleWhileRevalidate not CacheFirst |

---

## 3. Options (for next iteration)

Train3 achieves near-perfect validation metrics. Any future work should be driven by
real-world device testing failures, not assumed improvement.

### Option A -- Add more letter coverage and retrain

Record additional video targeting underrepresented letters (F, L and others with thin
test representation). Run the pipeline. Retrain.

**Trade-offs:**
- Pro: Improves letter detection robustness for spelling mode
- Con: Spelling mode may not be the current priority; val metrics are already strong
- Pipeline: No script changes needed

### Option B -- Improve recording diversity and retrain

Record additional video targeting hard cases: confusable pairs (6/9, 0/O, 1/I),
different lighting, different play surfaces.

**Trade-offs:**
- Pro: Addresses real-world failure modes if they exist
- Con: Requires identifying actual failure modes from device testing first
- Pipeline: Same as Option A

### Option C -- Evaluate on device first; no retrain yet

Assess the deployed train3 model on actual iPad hardware with real tiles to find concrete
failure modes before committing to a retrain.

**Trade-offs:**
- Pro: No training cost; train3 may be sufficient for current game modes
- Con: Test mAP is 0.907 and some letter classes have thin test representation

---

## 4. Recommendation

**Option C first -- evaluate on device before retraining.**

Train3 has near-perfect val metrics and fixes every known issue from train2. Evaluate the
deployed model on actual iPad hardware (`?debug=true`) before assuming improvement is
needed. Use `docs/training.md:418-435` for the failure mode taxonomy.

If a retrain is needed, the full pipeline is scripted and documented. The critical
invariants for any next run:
1. `fliplr=0.0` -- already in both local command and Kaggle notebook; always verify
2. Run `scripts/split.py` locally after Roboflow export, before zipping for Kaggle
3. Upload dataset to Kaggle as a Dataset (not Code input) to preserve local splits
4. Roboflow resize: "Fit (white edges)" not "Stretch"
5. 4x augmentation multiplier, training images only

The old `digit-training-research.md` plan and the `training_pipeline.md` researcher
memory are stale (both describe train2). The authoritative current state is `docs/training.md`
and `README.md` in `/Users/seanflanagan/proj/digit-training`.
