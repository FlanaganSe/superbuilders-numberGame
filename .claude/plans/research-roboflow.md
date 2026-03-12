# Research: Roboflow for Digit Tile Detection Dataset

**Date:** 2026-03-11
**Researcher:** Agent (claude-sonnet-4-6)
**Context:** YOLO11n detection model for digits 0–9 on physical tiles, exported to ONNX, running in-browser via ONNX Runtime Web on iPad Safari.

---

## 1. Roboflow Free Tier vs. Paid

### What's on the free (Public) plan

Source: [roboflow.com/pricing](https://roboflow.com/pricing)

| Limit | Value |
|---|---|
| Workspace dataset size | 250,000 images |
| Monthly free credits | $60/month equivalent |
| Projects | 10 |
| Users | 2 |
| Support | Community forum only |
| Data and models | **Publicly shared on Roboflow Universe** |

Free credits cover:
- AI Labeling: 1 credit per 100 AI-labeled images (so $0.01/image effectively)
- GPU model training: 1 credit per 30 minutes of GPU training
- Dataset export: no credit cost mentioned; appears to be free

### Critical: Privacy on Free Plan

**Datasets CANNOT be kept private on the free plan.** All content is automatically shared publicly on Roboflow Universe. A Roboflow moderator confirmed: "Our free Public plan and our free research plans are available publicly on Roboflow Universe so that everyone can benefit." ([discuss.roboflow.com/t/making-dataset-private/5981](https://discuss.roboflow.com/t/making-dataset-private/5981))

Private workspaces require a paid plan. Core plan starts at $79/month (annual). Academic discounts available — contact starter-plan@roboflow.com.

### Is 300–500 images sufficient on free tier?

Yes, numerically. 300–500 images is far below the 250,000-image workspace limit. The free tier is technically sufficient for this dataset size.

**However:** uploading training images of physical tiles (children's play materials, potentially with hands/setting visible) to a public dataset has privacy implications. These images will be publicly visible and downloadable on Roboflow Universe by anyone. For a class project or open-source demo this is acceptable; for any deployment involving children, review carefully.

### Data Ownership

Roboflow does not claim ownership of uploaded images. Their data policy states users retain ownership — but the terms of the Public plan require public sharing on Universe. See full terms at [roboflow.com/privacy](https://roboflow.com/privacy).

---

## 2. Object Detection Labeling in Roboflow

### Creating a detection project

1. Click "Create New Project" in the Roboflow dashboard
2. Select project type: **Object Detection** (not Classification or Segmentation)
3. Name the project, set annotation group
4. This creates a project that accepts bounding-box annotations

Source: [help.roboflow.com/object-detection/labeling-guide-object-detection](https://help.roboflow.com/object-detection/labeling-guide-object-detection)

### Labeling interface

The Roboflow Annotate web tool supports:
- **Bounding box draw mode**: click and drag to create boxes; crosshair cursor guides placement
- **Class selector**: pick a class label after drawing each box
- **Keyboard shortcuts**: for fast labeling
- **Label Assist**: uses a previously trained version of your model to pre-annotate future batches (bootstrapping — label ~50 images, train a fast model, then let it pre-label the rest, and you review/correct)
- **Smart Polygon**: SAM-powered polygon masks (not needed for detection, but available)
- **Box Prompting**: draw a few examples and let the model find all other instances

For this project, set up **12 classes**: `0`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `6_underline` (or just call it `6`), `9_underline`. The PRD calls for underlines to distinguish 6 and 9 — this is handled at the tile design level (underlines printed on tiles) and both can stay as class `6` and `9` if the visual difference is unambiguous; alternatively use 10 classes only.

### Multiple annotations per image

Fully supported. Draw as many bounding boxes as needed per image — YOLO detection inherently handles multiple objects per frame. Each box gets its own class label. No special configuration needed.

### Auto-labeling

Grounding DINO foundation model can auto-label. You provide text prompts like `"digit"`, `"number tile"`, `"printed number"`. Works best for common objects with clear visual descriptions. For physical tiles (unusual domain), expect imperfect results — use as a first-pass accelerant, then manually correct. Cost: ~$0.01/image from the free $60 credit allocation.

Source: [docs.roboflow.com/annotate/ai-labeling](https://docs.roboflow.com/annotate/ai-labeling)

---

## 3. Video-to-Dataset Workflow

### Direct video import — YES, Roboflow supports it

Upload MP4 or MOV directly via the web interface. Roboflow parses frames in-browser using the browser's native video codec support.

**Codec note:** H.264 MP4 works in all browsers. HEVC/H.265 MP4 is Safari-only. Record in H.264 to be safe.

### Frame rate options

A dialog at upload time lets you choose how many frames per second to sample:
- Minimum: 1 frame per 60 seconds (very sparse)
- Maximum: 60 fps (one frame per frame — dense)

For a 5-minute video:
- At 1 fps → 300 frames
- At 2 fps → 600 frames
- At 60 fps → 18,000 frames (too many; most redundant)

**Recommended for this project:** record 5-minute video → upload at 1–2 fps → get 300–600 frames. Add variety by recording multiple sessions with different lighting, angles, distances.

### Individual image max size

Per-frame images cannot exceed 20 MB or 16,400×10,900 pixels. iPad camera at full resolution produces ~5–8 MB JPEGs; this is within limits.

Source: [docs.roboflow.com/datasets/adding-data](https://docs.roboflow.com/datasets/adding-data)

### Workflow recommendation

**Option A — Upload video directly to Roboflow (simpler):**
1. Record 5-min H.264 MP4 on iPad (or phone) of tiles on play mat
2. Upload to Roboflow; select 1–2 fps sampling → ~300–600 frames
3. Label in Roboflow Annotate web tool

**Option B — Extract frames locally first:**
```bash
ffmpeg -i tiles_session.mp4 -vf fps=1 frames/frame_%04d.jpg
```
Then upload the extracted JPEGs. Gives you more control over which frames to keep (delete blurry, redundant, out-of-focus ones) before uploading.

**Recommendation:** Option B. Pre-filtering locally before upload avoids annotating 200 blurry frames. Use ffmpeg to extract at 1 fps, manually review the folder, delete junk, then upload.

---

## 4. Augmentation Pipeline for Detection

Source: [docs.roboflow.com/datasets/dataset-versions/image-augmentation](https://docs.roboflow.com/datasets/dataset-versions/image-augmentation)

### Available augmentation types (16 total)

Flip, 90° Rotate, Crop, Rotation (random angle), Shear, Grayscale, Hue, Saturation, Brightness, Exposure, Blur, Noise, Camera Gain, Motion Blur, Cutout, Mosaic

### Multiplier effect

Roboflow calls this the "augmentation multiplier." Selecting 3x means: 1 original training image + 2 augmented variants per training image → 3× the training set size. Example: 280 training images at 3× → 840 training images delivered to the model.

Each augmented image applies one or more randomly-chosen augmentations from the set you enable.

### Configuration for digit tiles — what to enable and disable

| Augmentation | Recommendation | Reason |
|---|---|---|
| Flip Horizontal | **DISABLE** | Digits become mirror images — `6` flipped looks like invalid symbol, `2`, `3`, `5`, `7` all become wrong. |
| Flip Vertical | **DISABLE** | `6` flipped becomes `9`-like, `9` becomes `6`-like. Catastrophic for accuracy. |
| 90° Rotate | **DISABLE** | Rotated digits are unreadable. |
| Rotation (random) | **ENABLE, limit to ±10°** | Small tilts simulate real placement. ±10° is a safe range. |
| Shear | **ENABLE, mild** | Simulates slight camera angle deviation. |
| Brightness | **ENABLE** | Critical — simulate varied room lighting (bright window, dim room). |
| Exposure | **ENABLE** | Complements brightness. |
| Saturation | **ENABLE** | Color tiles (if any) or surface color variation. |
| Hue | **ENABLE, mild** | Minor hue shifts for lighting color temp. |
| Blur | **ENABLE, mild** | Simulates slight camera defocus or motion. |
| Noise | **ENABLE** | Simulates JPEG compression artifacts, ISO noise. |
| Camera Gain | **ENABLE** | Simulates low-light camera gain. |
| Motion Blur | **OPTIONAL** | Simulates camera shake. Can be mild. |
| Grayscale | **DISABLE** | Tiles are black-on-white; model should learn color. Do not train on grayscale-only. |
| Crop | **ENABLE, mild** | Simulates tile partially at frame edge. |
| Cutout | **DISABLE** | Occludes random parts of digits — can destroy the digit shape needed for classification. |
| Mosaic | **OPTIONAL** | YOLOv5+ already applies Mosaic internally during training; adding it here may be redundant. |

### Previewing augmented samples

Roboflow shows a preview grid of augmented samples before you generate the dataset version. Review these to confirm no digit-destroying flips or rotations appear.

### Recommended multiplier

Start at **3×**. With 280 training images → 840 effective. This is adequate for a YOLO11n fine-tune from pretrained COCO weights. Increase to 5× if training shows poor generalization.

---

## 5. Export to YOLO Format

### YOLO11-specific format name in Roboflow

The exact format is called **"YOLOv11 PyTorch TXT"** in Roboflow's export menu. It is listed alongside YOLOv12, YOLOv10, YOLOv9, YOLOv8, YOLOv7, YOLOv5, YOLOv4, YOLO Keras, YOLO Darknet.

Source: [roboflow.com/formats](https://roboflow.com/formats)

Note from Roboflow's own blog: the Python SDK downloads it with the parameter `"yolov8"` for compatibility — the format is technically identical between YOLOv8 and YOLO11 (same PyTorch TXT structure).

### Directory structure of exported dataset

```
dataset/
├── data.yaml
├── train/
│   ├── images/
│   │   ├── img_001.jpg
│   │   └── ...
│   └── labels/
│       ├── img_001.txt
│       └── ...
├── valid/
│   ├── images/
│   └── labels/
└── test/
    ├── images/
    └── labels/
```

Note: Roboflow uses `valid/` not `val/` — the `data.yaml` references this correctly.

### data.yaml structure

```yaml
train: ../train/images
val: ../valid/images
test: ../test/images
nc: 10
names: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
```

### Label file format (per image)

One line per detected object:
```
<class_index> <x_center> <y_center> <width> <height>
```
All values normalized to [0, 1] relative to image dimensions.

### Download methods

**Browser:** Create a version → click "Export Dataset" → choose "YOLOv11 PyTorch TXT" → download as ZIP.

**Python SDK:**
```python
from roboflow import Roboflow

rf = Roboflow(api_key="YOUR_API_KEY")
project = rf.workspace("your-workspace").project("digit-tiles")
version = project.version(1)
dataset = version.download("yolov8")  # "yolov8" param works for YOLO11
```

**curl** (shown after creating a version in the UI — provides a ready-to-copy command).

Source: [blog.roboflow.com/yolov11-how-to-train-custom-data](https://blog.roboflow.com/yolov11-how-to-train-custom-data/)

---

## 6. Roboflow Universe — Pre-Existing Digit Datasets

Several datasets found on search. None were directly fetchable (403 on direct Universe page fetches), but search results provide useful metadata:

| Dataset | Images | Notes |
|---|---|---|
| [Digit0-9 by Digital Digit09](https://universe.roboflow.com/digital-digit09-xfqvi/digit0-9-p2ja1) | ~1,334 | "Digits" object detection; unclear if physical tiles or screen digits |
| [digit-detection-yolov5 by tichonet](https://universe.roboflow.com/tichonet-vfo8e/digit-detection-yolov5/dataset/1) | ~1,000 | Unknown image type; YOLOv5 format |
| [digit-meter-recognition by Caesario Dito](https://universe.roboflow.com/caesario-dito-iysmw/digit-meter-recognition) | ~2,900 | 10 classes (0–9), but likely meter/screen digits, not physical tiles |
| [led digital 1](https://universe.roboflow.com/object-detection-ok0st/led-digital-1) | ~2,400 | LED/digital display digits — NOT physical tiles |
| [handwritten-digit-recognition by siniz](https://universe.roboflow.com/siniz-heax7/handwritten-digit-recognition) | unknown | Handwritten — MNIST-style; wrong domain entirely |

### Assessment

**None of the readily available Universe datasets match this use case.** The project requires:
- **Physical printed tiles** with bold fonts (Verdana/OCR-B), black-on-white, 3×4 inches
- Specific underline convention for 6 and 9
- iPad overhead-camera perspective (play mat setting)

Meter-reading and LED-digit datasets share some visual characteristics (printed digits, high contrast) but are photographed from very different angles and contexts. Fine-tuning from one of these is possible but risky — the domain gap (meter glass, LED glow, different fonts) may hurt more than it helps.

**Recommended posture:** Start from YOLO11n pretrained weights (COCO) and train on your own custom dataset. COCO weights provide general visual features; 300+ custom images will specialize the head for your specific tiles. Do NOT use Universe digit datasets as training data — use them only as a validation sanity check if desired.

---

## 7. Alternative: Label Studio + Local Training

### If Roboflow privacy/cost is a concern

Label Studio is the leading open-source alternative. It runs fully locally — no data leaves your machine.

**Setup:**
```bash
pip install label-studio
label-studio start
# Opens at http://localhost:8080
```

Or via Docker:
```bash
docker run -it -p 8080:8080 heartexlabs/label-studio:latest
```

**Detection labeling:** Select "Object Detection with Bounding Boxes" template. Define 10 classes (0–9). Label bounding boxes directly in browser UI. Supports video frame extraction (or import pre-extracted frames).

**Export format — YOLO TXT:**
```
project-ID-at-TIMESTAMP.zip
├── classes.txt        # one class name per line
├── notes.json
├── labels/
│   ├── img_001.txt    # normalized YOLO format per image
│   └── ...
└── images/
    ├── img_001.jpg
    └── ...
```

**Missing:** Label Studio does NOT export `data.yaml`. You must write it manually:
```yaml
train: path/to/train/images
val: path/to/val/images
nc: 10
names: ['0','1','2','3','4','5','6','7','8','9']
```

And split train/val/test yourself (no built-in version management).

**Augmentation:** Label Studio has no built-in augmentation. You'd use Albumentations or torchvision transforms in the Ultralytics training config directly.

Source: [labelstud.io/blog/quickly-create-datasets-for-training-yolo-object-detection-with-label-studio](https://labelstud.io/blog/quickly-create-datasets-for-training-yolo-object-detection-with-label-studio/)

### CVAT (alternative)

CVAT is another open-source option. However, as of June 2025, CVAT has **documented, unresolved bugs** with YOLO11/Ultralytics export — labels folders fail to export, and import doesn't display in GUI. Users have had to migrate away. ([github.com/cvat-ai/cvat/issues/9433](https://github.com/cvat-ai/cvat/issues/9433))

**Do not use CVAT for YOLO11 export at this time.**

### Pros/Cons Summary

| Tool | Privacy | Augmentation | YOLO11 Export | Effort to Set Up | Auto-labeling |
|---|---|---|---|---|---|
| Roboflow (free) | Data public on Universe | Built-in (16 types) | Native, named "YOLOv11 PyTorch TXT" | Zero (web app) | Yes (Grounding DINO, credits) |
| Roboflow (paid) | Private | Same | Same | Zero | Yes |
| Label Studio (local) | Fully local | None (external tool) | YOLO TXT (no data.yaml) | Low (pip install) | No (unless self-hosted model) |
| CVAT (local) | Fully local | None | Broken as of June 2025 | Medium (Docker) | Yes (YOLO models) |

---

## 8. Dataset Quality Tips

### What makes a good detection training image for tiles

- **High contrast:** tiles are black-on-white — good. Ensure images aren't overexposed (washing out the digit) or underexposed.
- **Sharp focus:** soft/blurry frames reduce model's ability to distinguish 6 from 9, 3 from 8, etc.
- **Tight but not clipped boxes:** bounding box should enclose the entire tile face with minimal margin. Do not clip the digit.
- **Single-class-per-tile consistency:** every visible tile in every image should be annotated. Missing annotations create negative training signal (model learns that visible tiles sometimes = no detection, hurting recall).

### Diversity needed

Record images with variation across:
- **Lighting:** bright window light, overhead LED, dim room, direct flash
- **Distance:** tiles filling ~10% of frame vs. ~30% (different apparent sizes)
- **Angle:** camera directly overhead, 15° tilt, 30° tilt (simulate iPad stand variations)
- **Multiple tiles:** 1 tile, 3 tiles, 6 tiles, all 10 different tiles visible simultaneously
- **Background:** play mat color, wooden table, carpet — the PRD specifies a contrasting play mat but train on variety for robustness
- **Partial occlusion:** tile half-visible at frame edge
- **Tile orientation:** tiles placed at slight rotations (±10–15°), never upside-down (do not train on upside-down digits — they're invalid answers)

### Negative examples (background images)

Include 5–10% of images with **no tiles** — just the play mat, table, hands, etc. This teaches the model what NOT to detect and reduces false positives from table texture. Ultralytics recommends 0–10% background images. ([docs.ultralytics.com/yolov5/tutorials/tips_for_best_training_results](https://docs.ultralytics.com/yolov5/tutorials/tips_for_best_training_results/))

### Train/val/test split

**Recommended split: 80% train / 10% val / 10% test**

Roboflow applies this automatically when generating a dataset version. With 400 images:
- Train: 320 images (+ augmentation multiplier)
- Val: 40 images (no augmentation — real-world evaluation)
- Test: 40 images (held out for final accuracy check)

### Images per class

Ultralytics recommendation: ≥1,500 images per class for robust models. For this project, at 300–500 total images across 10 classes, you're averaging 30–50 images per class — well below the ideal.

**Mitigation strategies:**
1. Use augmentation (3×–5×) to multiply effective training examples
2. Start from COCO pretrained weights (transfer learning — fewer images needed)
3. Ensure each digit appears in many different combinations per image (e.g., an image with 5 tiles visible contributes 5 annotations across different classes)
4. For YOLO11n specifically: it has been successfully fine-tuned on tiny datasets (50–200 images) for constrained domains when the visual pattern is simple and high-contrast. Printed black digits on white tiles is a favorable case.

**Practical target:** Aim for at least 50 raw images where each digit appears visible across a variety of images — after augmentation (3×) this becomes ~150 training examples per class. Start training, evaluate mAP, and expand the dataset if accuracy is insufficient.

### Images with hands or clutter

Deliberately include frames with:
- A hand in the frame, not covering any digit (teaches: hands are background)
- A hand partially covering one tile (trains partial-occlusion robustness)
- Cups, phones, toys near the play area (negative class: model should not hallucinate digits on non-tile objects)

---

## Constraints

1. **Free tier public disclosure** — uploading images to Roboflow free plan makes them publicly visible on Universe. For training data captured in a home/classroom setting with personal items visible, this is a meaningful privacy trade-off. If data privacy matters, use Label Studio locally.

2. **No flips, minimal rotation** — immutable for digit detection. Horizontal/vertical flips destroy digit semantics.

3. **Label Studio lacks data.yaml and train/val split management** — requires manual scripting to match Roboflow's one-click version generation.

4. **CVAT YOLO11 export is broken** — avoid CVAT until issue #9433 is confirmed resolved.

5. **Universe digit datasets are wrong domain** — do not use for training. Physical tiles photographed from overhead on a play mat have no close match in Universe currently.

---

## Options

### Option A: Roboflow Free Tier (recommended for speed)

**Workflow:**
1. Record 5-min video sessions (H.264 MP4); extract frames locally with ffmpeg at 1 fps; delete blurry/redundant frames → ~300 clean frames
2. Create Roboflow account, new Object Detection project, 10 classes
3. Upload frames; label with bounding boxes (use Label Assist after first 50 labeled images to accelerate)
4. Generate dataset version: 80/10/10 split, augmentations enabled (Brightness, Exposure, Noise, Blur, Rotation ±10°, Shear, Crop; no flips, no 90° rotate)
5. Export as "YOLOv11 PyTorch TXT"; download ZIP or use Python SDK
6. Train with Ultralytics CLI

**Trade-offs:**
- Pro: fastest path, built-in augmentation UI, version management, Label Assist acceleration, native YOLO11 export
- Con: training images become public on Roboflow Universe

### Option B: Label Studio (local, private)

**Workflow:**
1. Extract frames with ffmpeg as above
2. `pip install label-studio && label-studio start`
3. Create detection project with 10 classes; label all frames
4. Export YOLO TXT format; write data.yaml manually; split manually (80/10/10)
5. Apply augmentation in Ultralytics training config (`augment=True`, disable flips in config)
6. Train with Ultralytics CLI

**Trade-offs:**
- Pro: fully local, fully private, no account needed
- Con: no built-in augmentation (must configure in Ultralytics training params), no version management, must manually write data.yaml and split dataset, no auto-labeling acceleration

### Option C: Hybrid — Label Studio + Roboflow export only

Label locally with Label Studio, export YOLO TXT, then import into a **private** Roboflow workspace (paid) purely for augmentation and version management. Overkill for this project — adds cost for marginal benefit.

---

## Recommendation

**Use Roboflow Free Tier (Option A)** for this project.

Reasons:
- The training images are tiles on a play mat — not sensitive personal data. Publishing them on Universe is harmless and potentially useful to others building digit-recognition CV.
- Roboflow's built-in augmentation pipeline with a visual preview is the fastest way to correctly configure the no-flip / limited-rotation setup that digit detection requires.
- Label Assist (bootstrap from first 50 labeled → auto-label remainder) can cut labeling time by 50–70% for a constrained 10-class dataset.
- Native "YOLOv11 PyTorch TXT" export with correct data.yaml is zero-friction vs. manual data.yaml authoring in Label Studio.
- The free $60/month credit covers auto-labeling 6,000 images — far more than needed.

**If data privacy becomes a concern** (e.g., faces or personal items visible in training images), switch to Label Studio. The labeling workflow is identical; the export requires ~30 extra minutes of manual setup.

**Do not use CVAT** — YOLO11 export is currently broken.

**Do not use Universe datasets** — wrong domain (meter digits, LED displays, handwritten). Train from scratch on custom images starting from COCO-pretrained YOLO11n weights.

---

## Sources

- [Roboflow Pricing](https://roboflow.com/pricing)
- [Roboflow Plans Docs](https://docs.roboflow.com/billing/plans)
- [Roboflow Privacy Policy](https://roboflow.com/privacy)
- [Roboflow Credits](https://roboflow.com/credits)
- [Making Dataset Private (Community)](https://discuss.roboflow.com/t/making-dataset-private/5981)
- [Adding Data / Video Upload](https://docs.roboflow.com/datasets/adding-data)
- [Roboflow Annotate](https://docs.roboflow.com/annotate/use-roboflow-annotate)
- [Labeling Guide: Object Detection](https://help.roboflow.com/object-detection/labeling-guide-object-detection)
- [Image Augmentation](https://docs.roboflow.com/datasets/dataset-versions/image-augmentation)
- [Augmentation for Object Detection (blog)](https://blog.roboflow.com/object-detection-augmentation/)
- [Exporting Data](https://docs.roboflow.com/datasets/dataset-versions/exporting-data)
- [Roboflow Format Catalog](https://roboflow.com/formats)
- [YOLO11 with Roboflow (blog)](https://blog.roboflow.com/use-yolo11-with-roboflow/)
- [Train YOLO11 Custom Data (blog)](https://blog.roboflow.com/yolov11-how-to-train-custom-data/)
- [Roboflow Universe](https://universe.roboflow.com/)
- [AI Labeling / Auto Label](https://docs.roboflow.com/annotate/ai-labeling)
- [Label Studio YOLO Blog](https://labelstud.io/blog/quickly-create-datasets-for-training-yolo-object-detection-with-label-studio/)
- [CVAT YOLO11 Export Bug](https://github.com/cvat-ai/cvat/issues/9433)
- [Ultralytics Training Best Practices](https://docs.ultralytics.com/yolov5/tutorials/tips_for_best_training_results/)
- [YOLO11 ONNX Browser Inference](https://github.com/nomi30701/yolo-object-detection-onnxruntime-web)
