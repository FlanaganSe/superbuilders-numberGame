# Research: YOLO11n Detection Training for Digit Tiles + ONNX Browser Export

**Date:** 2026-03-11
**Scope:** Train a YOLO11n (or YOLO26n) DETECTION model on digits 0–9 from physical tiles and export to ONNX for in-browser inference via ORT Web (WASM backend, Safari-first).
**Constraint context:** PRD at `.claude/plans/prd.md`; ORT JSEP/WebGPU is banned on Safari — WASM-only baseline.

---

## 1. Current State

No CV model exists yet. The project uses a `RecognitionService` interface with a mock (keyboard/button input) that unblocks game development independently of ML training. The architecture explicitly defers model integration: `prd.md:142` identifies YOLO11n as the "leading candidate" and `prd.md:18` constrains the model budget to ≤ 15 MB FP32.

---

## 2. Dataset Format

### Directory structure

YOLO detection training requires this exact layout:

```
dataset/
├── data.yaml
├── images/
│   ├── train/          # training frames
│   └── val/            # validation frames (no overlap with train)
└── labels/
    ├── train/          # one .txt per image, same base filename
    └── val/
```

Each `.txt` label file contains one line per object in the image:

```
<class_id> <x_center> <y_center> <width> <height>
```

All five values are normalized to [0, 1] relative to image width and height. A single tile labeled as digit "3" centered at pixel (320, 240) in a 640×480 image would read:

```
3 0.5 0.5 0.15 0.20
```

Images with no tiles present (negative/background images) have an empty `.txt` file (zero bytes — the file must exist).

- Source: [Roboflow — What is the YOLO Annotation Format?](https://roboflow.com/formats/yolo) and [Ultralytics Datasets Overview](https://docs.ultralytics.com/datasets/detect/)

### `data.yaml` format

```yaml
path: /absolute/path/to/dataset   # root directory
train: images/train
val: images/val
test: images/test                  # optional

nc: 10                             # number of classes
names:
  0: "0"
  1: "1"
  2: "2"
  3: "3"
  4: "4"
  5: "5"
  6: "6"
  7: "7"
  8: "8"
  9: "9"
```

- Source: [Ultralytics Model YAML Configuration Guide](https://docs.ultralytics.com/guides/model-yaml-config/)

### Resolution

Training resolution is controlled by `imgsz` (default: 640). Ultralytics letterboxes all inputs to this square size. Training at 640 is standard and matches inference resolution. For inference at a lower resolution you must retrain at that size — do not change imgsz post-training.

### Minimum images per class

Ultralytics' own best-practices guide (written for YOLOv5 but unchanged in philosophy) recommends:

- **Soft minimum:** 100–500 images per class when using COCO-pretrained weights (transfer learning heavily reduces data requirements)
- **Strong target:** ≥ 1,500 images per class for production-quality results
- **Instances target:** ≥ 10,000 labeled objects per class (a single training image can contain multiple tiles)

For digit tiles (visually simple, consistent shape, consistent size), 300–500 real frames per digit with heavy augmentation is a credible starting point — expect to iterate. Use one training image with multiple tiles (e.g., 3 tiles visible at once) to efficiently reach instance counts without multiplying annotation effort.

- Source: [Ultralytics YOLOv5 Training Tips](https://docs.ultralytics.com/yolov5/tutorials/tips_for_best_training_results/)

---

## 3. Exact Training Commands

### Install

```bash
pip install ultralytics
```

YOLO11n weights download automatically on first use from the Ultralytics assets GitHub release. Manual download URL (if needed):

```
https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.pt
```

### Minimal training command

```bash
yolo detect train \
  data=/path/to/dataset/data.yaml \
  model=yolo11n.pt \
  epochs=100 \
  imgsz=640 \
  batch=16 \
  device=0
```

### Full command with digit-safe augmentation

```bash
yolo detect train \
  data=/path/to/dataset/data.yaml \
  model=yolo11n.pt \
  epochs=150 \
  imgsz=640 \
  batch=16 \
  device=0 \
  fliplr=0.0 \
  flipud=0.0 \
  degrees=10.0 \
  translate=0.1 \
  scale=0.4 \
  perspective=0.0005 \
  hsv_h=0.015 \
  hsv_s=0.7 \
  hsv_v=0.4 \
  mosaic=1.0 \
  mixup=0.0 \
  patience=50 \
  close_mosaic=10
```

Key parameter notes:
- `model=yolo11n.pt`: starts from COCO-pretrained nano detection weights. Do NOT use a classification checkpoint (`yolo11n-cls.pt`) — that is a different architecture.
- `batch=16`: safe default for most GPUs. Use `batch=-1` to auto-size to 60% GPU memory.
- `epochs=150`: reasonable for a 10-class custom dataset from pretrained weights. Reduce if validation loss plateaus early (patience=50 handles this).
- `close_mosaic=10`: disables mosaic augmentation for the last 10 epochs, which stabilizes final training.
- `device=0`: first CUDA GPU. Use `device=cpu` for CPU (slow), `device=mps` for Apple Silicon.

- Source: [Ultralytics Train Mode Docs](https://docs.ultralytics.com/modes/train/) and [Roboflow YOLO11 Custom Training Guide](https://blog.roboflow.com/yolov11-how-to-train-custom-data/)

---

## 4. Critical Augmentation Rules for Digits

### What to DISABLE

| Parameter | Value | Reason |
|-----------|-------|--------|
| `fliplr` | **0.0** | Horizontal flip mirrors every digit — 2↔irreversible mirror, 3↔mirror, 5↔mirror. Must be zero. |
| `flipud` | **0.0** | Default is already 0.0 but explicitly set it. Vertical flip inverts digits nonsensically. |
| `degrees` | **≤ 10** | Rotation > 10° creates 6↔9 confusion (6 upside-down is 9). The tiles have an underline to disambiguate 6/9, but the model must learn this at modest angles only. |
| `perspective` | **very small** (≤ 0.0005) | Excessive perspective distortion changes digit appearance; small amounts mimic camera angle variation. |
| `mixup` | **0.0** | Image blending creates ghost digit artifacts that corrupt label semantics. |

### What IS helpful

| Parameter | Suggested Value | Benefit |
|-----------|-----------------|---------|
| `hsv_h` | 0.015 | Minor hue shift handles different lighting color temperatures |
| `hsv_s` | 0.7 | Saturation variation covers different tile aging/print quality |
| `hsv_v` | 0.4 | Brightness variation is the most important for real-world lighting |
| `translate` | 0.1 | Tile appears at different positions in frame |
| `scale` | 0.4 | Tile appears at different distances/zoom levels |
| `mosaic` | 1.0 | Four-image mosaic during training is highly effective — tiles naturally appear with other tiles in frame |
| `erasing` | 0.4 (default) | Random region erasing mimics partial occlusion (hand partially covering a tile) |

### Albumentations blur augmentation

Ultralytics automatically activates Albumentations augmentations (including `Blur` and `MedianBlur`) if the `albumentations` package is installed. These apply with low probability and are beneficial for mimicking camera autofocus variation. Install separately:

```bash
pip install albumentations
```

These are applied automatically — no additional config needed.

- Source: [Ultralytics Augmentation Docs](https://docs.ultralytics.com/guides/yolo-data-augmentation/) and [Ultralytics Config Reference](https://docs.ultralytics.com/usage/cfg/)

---

## 5. ONNX Export

### YOLO11n export command (verified)

```bash
# CLI
yolo export \
  model=runs/detect/train/weights/best.pt \
  format=onnx \
  imgsz=640 \
  half=False \
  dynamic=False \
  simplify=True \
  opset=17 \
  batch=1
```

```python
# Python equivalent
from ultralytics import YOLO
model = YOLO("runs/detect/train/weights/best.pt")
model.export(
    format="onnx",
    imgsz=640,
    half=False,        # FP32 — FP16 is slower in browser WASM
    dynamic=False,     # static input shape: [1, 3, 640, 640]
    simplify=True,     # uses onnxslim to clean the graph
    opset=17,          # see opset section below
    batch=1,
)
```

Key flag notes:
- `half=False`: required per PRD constraint `prd.md:18`. FP16 offers no speedup in Safari WASM (no native FP16 SIMD).
- `dynamic=False`: static shapes are friendlier for ORT WASM optimization and avoid shape inference overhead at runtime.
- `simplify=True`: default as of Ultralytics recent versions; uses `onnxslim` to clean the computation graph.
- `opset=17`: see justification below.

### Opset version

ORT 1.20 supports ONNX opset up to 21. ORT Web 1.24.3 (current npm latest as of 2026-03-11) supports WASM backend across opset 7–21. However, WASM backend operator coverage is a subset of the full ONNX operator set depending on backend (wasm vs webgpu vs webgl).

The safest conservative choice for WASM-only deployment is **opset 17**, which:
- Is supported by ORT 1.18+ (all recent versions)
- Avoids any opset 18-21 operators that may lack WASM coverage
- Is well-tested for YOLO-family models in browsers

Ultralytics auto-selects opset based on PyTorch version (PyTorch 2.4+ → opset 20 in some configs), but explicitly setting `opset=17` overrides this and is the safe cross-runtime choice.

- Source: [ORT Compatibility Docs](https://onnxruntime.ai/docs/reference/compatibility.html), [Ultralytics Export Docs](https://docs.ultralytics.com/modes/export/)

### Output tensor shape for YOLO11n with 10 classes

YOLO11 detection (non-NMS export, `nms=False` which is the default) produces:

```
output: float32[1, 14, 8400]
```

Where:
- `1` = batch size
- `14` = 4 box coords (cx, cy, w, h) + 10 class confidence scores (10 digits)
- `8400` = detection anchors (80×80 + 40×40 + 20×20 grid = 8400 cells at 640px input)

Post-processing required in JavaScript: transpose to [8400, 14], filter by max class confidence ≥ threshold (0.65 per PRD), apply NMS (ORT has NMSoperator, or implement manually).

For comparison, COCO-trained YOLO11n has shape `[1, 84, 8400]` (80 classes + 4 = 84). The formula is `nc + 4`.

- Source: [Ultralytics Community — YOLO11 ONNX output format](https://community.ultralytics.com/t/yolo11-onnx-export-format-and-parsing-output/789), [GitHub discussion on output parsing](https://github.com/orgs/ultralytics/discussions/20712)

---

## 6. Expected Model Size

| Metric | YOLO11n (detection) |
|--------|---------------------|
| Parameters | 2.6 M |
| FLOPs | 6.5 B |
| mAP val50-95 (COCO) | 39.5 |
| CPU ONNX inference | 56.1 ± 0.8 ms |
| ONNX FP32 file size | ~10.2 MB |

The 10.2 MB figure is for the COCO-pretrained model (80 classes). A 10-class custom model will be slightly smaller because the classification head shrinks, but the backbone dominates. Expect **~9–10 MB** for FP32 with 10 classes. This is **within the 15 MB budget** in PRD `prd.md:50`.

- Source: [Ultralytics YOLO11 Docs](https://docs.ultralytics.com/models/yolo11/), [OpenVINO YOLO11 docs confirming ~10.2 MB](https://docs.openvino.ai/2024/notebooks/yolov11-object-detection-with-output.html)

---

## 7. YOLO11 vs YOLO26

### Release status

YOLO26 is real and stable. It was announced at YOLO Vision 2025 (September 2025, London) and released in January 2026. It has a published ArXiv paper ([2509.25164](https://arxiv.org/abs/2509.25164)) and official Ultralytics docs.

### Benchmark comparison (nano variants, COCO val)

| Metric | YOLO11n | YOLO26n |
|--------|---------|---------|
| Parameters | 2.6 M | 2.4 M |
| FLOPs | 6.5 B | 5.4 B |
| mAP val50-95 | 39.5 | 40.9 |
| CPU ONNX speed | 56.1 ms | 38.9 ms |
| T4 TensorRT speed | 1.5 ms | 1.7 ms |
| ONNX FP32 file size | ~10.2 MB | ~9.89 MB |

YOLO26n is ~31% faster on CPU ONNX, +1.4 mAP points, and 0.2M fewer parameters at comparable file size.

- Source: [Ultralytics YOLO26 vs YOLO11 comparison](https://docs.ultralytics.com/compare/yolo26-vs-yolo11/), [Ultralytics YOLO26 Docs](https://docs.ultralytics.com/models/yolo26/), [HuggingFace yolo26n ONNX — 9.89 MB confirmed](https://huggingface.co/onnx-community/yolo26n-ONNX/blob/main/onnx/model.onnx)

### Key architectural differences

YOLO26 removes Distribution Focal Loss (DFL) and introduces a native NMS-free inference path via a one-to-one head. This has direct browser implications:

**YOLO26 ONNX output tensors** (two options):

1. **One-to-one head (default, NMS-free):** shape `[1, 300, 6]` where 6 = [x1, y1, x2, y2, confidence, class_id]. No NMS required. Simpler JavaScript post-processing — just threshold by confidence.
2. **One-to-many head (classic):** shape `[1, nc+4, 8400]` — same format as YOLO11, requires NMS.

The default export uses the one-to-one head. This is a **breaking change** from YOLO11's output format.

**DFL removal** also means YOLO26 eliminates softmax/DFL operations that were poorly supported by some edge accelerators. For ORT WASM this is a benefit — fewer exotic ops, better graph optimization.

- Source: [Ultralytics YOLO26 Docs](https://docs.ultralytics.com/models/yolo26/), [GitHub issue #23645 on YOLO26 ONNX FP16 output](https://github.com/ultralytics/ultralytics/issues/23645)

### Which exports better to ONNX for browser use?

**YOLO26n is the stronger choice for this project**, with caveats:

Advantages of YOLO26n:
- 31% faster CPU/WASM inference — directly reduces per-frame latency from ~56ms toward ~39ms at 640px, getting closer to the 120ms target at 4fps (prd.md:163)
- NMS-free one-to-one output simplifies JavaScript post-processing
- Fewer FLOPS means lower compute cost on iPad's single-threaded WASM worker
- DFL removal eliminates potential WASM-unsupported ops

Risks of YOLO26n:
- Released January 2026 — ecosystem maturity lower than YOLO11 (tutorials, community examples, debug tooling)
- Output tensor format change `[1,300,6]` vs `[1,14,8400]` — existing ORT Web YOLO inference boilerplate needs updating
- Less battle-tested in browser deployments; YOLO11 has more community examples for ORT Web
- **UNCERTAIN:** The one-to-one head's maximum 300 detections is more than enough for 10 tiles but worth verifying

Advantages of YOLO11n:
- More community examples for browser inference
- Stable, well-understood ONNX output format `[1, nc+4, 8400]`
- Roboflow, LearnOpenCV, and PyImageSearch tutorials all verified for YOLO11

**Recommendation direction:** YOLO26n is preferable for performance. The output format change is manageable — just requires writing to the `[1,300,6]` parser instead of `[1,14,8400]`. If YOLO26 training proves finicky (less community support), fall back to YOLO11n.

---

## 8. Training Data Strategy for Physical Tiles

### Physical tile specs (from PRD `prd.md:33`)

- 3×4 inch tiles
- Black digit on white matte background
- Bold font (Verdana or OCR-B)
- 3–4mm black border
- Underline on 6 and 9

### Recording and labeling workflow

**Step 1 — Capture video**

Record 3–5 minutes of each tile placed on the play mat under the iPad camera. Vary:
- Tile position across the full frame (all quadrants)
- Distance (zoom level)
- Rotation (0°, ±5°, ±10° — never beyond ±15°)
- Lighting: overhead, side-lit, slightly dim
- Backgrounds: the play mat, and clutter/edge cases
- Partial occlusion: finger partially over tile

**Step 2 — Extract frames**

```bash
# ffmpeg: extract 1 frame per second (adjust rate as needed)
ffmpeg -i recording.mp4 -vf fps=1 frames/%05d.jpg

# For more frames (2 per second)
ffmpeg -i recording.mp4 -vf fps=2 frames/%05d.jpg
```

Avoid extracting at full video frame rate — consecutive frames at 30fps are nearly identical and waste annotation effort without improving diversity.

**Step 3 — Annotate**

Recommended tools:
- **Roboflow** (free tier, online): upload frames, draw bounding boxes, export in YOLO11 PyTorch TXT format directly. Supports smart labeling with SAM-2 assist.
- **Label Studio** (free, self-hosted): full control, more setup
- **CVAT** (free, self-hosted or cloud): strong for batch annotation of video frames

The "Repeat Previous" feature in Roboflow is useful when the same tile appears across many frames — copy and adjust rather than re-annotate.

### Dataset size targets

| Goal | Images per class | Total images | Total instances |
|------|-----------------|--------------|-----------------|
| Baseline (iterate from here) | 200–300 | 2,000–3,000 | ~5,000+ |
| Production quality | 500–1,000 | 5,000–10,000 | ~15,000+ |

A single frame showing 3 tiles of different digits counts toward 3 class instances. Efficient multi-tile frames accelerate instance counts.

### Negative examples (no digit tiles visible)

Add 5–10% of total training images as **background images** (empty `.txt` label files):
- Play mat with no tiles
- Hands on play mat
- Table clutter (game boxes, toys)
- Play mat with tiles at extreme angles that should not be detected

This reduces false positives from hands, shadows, and surface texture.

### Synthetic data option

Synthetic compositing (cut-out tile images placed on background textures) is viable and can multiply dataset size with zero annotation cost. Key factors:
- Use real tile photography as source (not rendered fonts — texture and print quality matter)
- Randomize background, lighting, rotation (within ±10°), scale, and position
- Add realistic blur, noise, and color jitter to bridge the synthetic-to-real gap
- Recent research confirms this approach works with YOLO11 ([ArXiv 2509.15045](https://arxiv.org/html/2509.15045v1))

Albumentations is the standard library for this. A synthetic pipeline could generate thousands of labeled composites overnight, bootstrapping the dataset before real annotation catches up.

### Labeling tool for the YOLO format

Roboflow's export format "YOLOv11 PyTorch TXT" produces exactly the annotation format Ultralytics expects, including the `data.yaml` file. This is the lowest-friction path.

- Source: [Roboflow YOLO11 training guide](https://blog.roboflow.com/yolov11-how-to-train-custom-data/), [Roboflow video annotation guide](https://blog.roboflow.com/annotating-video/)

---

## 9. iPad Safari / ORT Web Compatibility

### ORT Web version

Current npm version: `onnxruntime-web@1.24.3` (as of 2026-03-11). This is the version to target.

### WASM backend and ONNX opset

ORT WASM backend (non-JSEP, safe on Safari — see project memory and PRD `prd.md:49`) supports ONNX operators up to opset 21 in principle, but with subset coverage dependent on which operators are used. All standard YOLO detection ops (Conv, BatchNorm, Sigmoid, Mul, Concat, Reshape, Transpose) are well-supported in ORT WASM at opset 17.

Export with `opset=17` and validate by running the exported model through ORT Web locally before committing.

### WebGPU status (informational — not for MVP)

Safari 26 beta (iOS/iPadOS 26) ships full WebGPU support. ONNX Runtime and others confirmed working in Safari 26 beta. However, the JSEP/WebGPU build path of ORT Web has a documented Safari 26.2 JIT regression (ORT GitHub issue #26827, still open as of 2026-03-11). The MVP uses WASM-only. Phase 5 benchmarks should re-evaluate JSEP once that regression is resolved.

- Source: [ORT Compatibility](https://onnxruntime.ai/docs/reference/compatibility.html), [ORT Web docs](https://onnxruntime.ai/docs/tutorials/web/), [WWDC25 WebGPU announcement](https://dev.to/arshtechpro/wwdc-2025-webgpu-on-apple-platforms-16pa)

---

## 10. Options

### Option A: YOLO11n

Standard, well-documented path. ONNX output `[1, 14, 8400]` requires NMS post-processing in JavaScript. ~10.2 MB FP32. 56ms CPU ONNX inference. Community tutorials are plentiful.

**Trade-off:** Slower inference; more complex JS post-processing; still within budget.

### Option B: YOLO26n (recommended)

Newer architecture. ONNX output `[1, 300, 6]` (NMS-free, one-to-one head). ~9.89 MB FP32. 38.9ms CPU ONNX inference. 31% faster; simpler post-processing. Lower ecosystem maturity (released January 2026).

**Trade-off:** Less community support; output format differs from all existing YOLO browser examples.

### Option C: Start YOLO11n, plan YOLO26n upgrade

Train and integrate with YOLO11n first (more examples, easier debugging). Once working, export YOLO26n from the same dataset and A/B benchmark inference latency on target iPad. Swap if YOLO26n meets the 120ms target and YOLO11n does not.

**Trade-off:** Extra work; but de-risks both the ML pipeline and the browser integration.

---

## 11. Recommendation

**Train on YOLO11n first, benchmark against YOLO26n post-integration.**

Rationale:
1. YOLO11n is pretrained, well-documented, and has extensive ORT Web community examples for the `[1, nc+4, 8400]` output format.
2. The ~56ms CPU inference is 2–3 detection cycles at 4fps — within the 120ms frame budget (prd.md:163) assuming reasonable overhead.
3. YOLO26n's 31% speedup is appealing but the output format change (`[1,300,6]`) plus lower ecosystem maturity adds integration risk. It's better as a Phase 2 swap after the pipeline is proven.
4. Training approach is identical for both models — same dataset, same `data.yaml`, same augmentation flags. Switching from YOLO11n to YOLO26n at export time requires only changing the model checkpoint (`yolo11n.pt` → `yolo26n.pt`) and updating the JS inference parser.

### Concrete next steps

1. Record ~5 min video per digit (10 digits = ~50 min of footage)
2. Extract at 1fps → ~300 frames per digit, ~3,000 total frames
3. Annotate via Roboflow with bounding boxes; export as YOLO11 PyTorch TXT format
4. Add ~200 background (negative) images
5. Split 80/20 train/val
6. Train YOLO11n: `yolo detect train data=data.yaml model=yolo11n.pt epochs=150 fliplr=0.0 flipud=0.0 degrees=10.0 scale=0.4 hsv_v=0.4`
7. Export: `yolo export model=best.pt format=onnx imgsz=640 half=False opset=17 batch=1`
8. Validate ONNX in ORT Web WASM locally before wiring into the RecognitionService
9. Benchmark on target iPad; if inference > 120ms, export YOLO26n from same checkpoint and retest

---

## Sources

- [Ultralytics YOLO11 Documentation](https://docs.ultralytics.com/models/yolo11/)
- [Ultralytics YOLO26 Documentation](https://docs.ultralytics.com/models/yolo26/)
- [Ultralytics Train Mode](https://docs.ultralytics.com/modes/train/)
- [Ultralytics Export Mode](https://docs.ultralytics.com/modes/export/)
- [Ultralytics ONNX Integration](https://docs.ultralytics.com/integrations/onnx/)
- [Ultralytics Data Augmentation Guide](https://docs.ultralytics.com/guides/yolo-data-augmentation/)
- [Ultralytics Config Reference (all hyperparameters)](https://docs.ultralytics.com/usage/cfg/)
- [Ultralytics YOLOv5 Training Tips (dataset size)](https://docs.ultralytics.com/yolov5/tutorials/tips_for_best_training_results/)
- [Ultralytics YOLO26 vs YOLO11 Comparison](https://docs.ultralytics.com/compare/yolo26-vs-yolo11/)
- [Roboflow — YOLO Annotation Format](https://roboflow.com/formats/yolo)
- [Roboflow — YOLO11 Custom Training](https://blog.roboflow.com/yolov11-how-to-train-custom-data/)
- [Roboflow — Video Annotation](https://blog.roboflow.com/annotating-video/)
- [ONNX Runtime Compatibility](https://onnxruntime.ai/docs/reference/compatibility.html)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
- [HuggingFace yolo26n-ONNX (9.89 MB confirmed)](https://huggingface.co/onnx-community/yolo26n-ONNX/blob/main/onnx/model.onnx)
- [Ultralytics Community: YOLO11 ONNX output format](https://community.ultralytics.com/t/yolo11-onnx-export-format-and-parsing-output/789)
- [GitHub YOLO26 ONNX FP16 issue #23645](https://github.com/ultralytics/ultralytics/issues/23645)
- [YOLO26 ArXiv paper 2509.25164](https://arxiv.org/abs/2509.25164)
- [Synthetic data + YOLO11 ArXiv 2509.15045](https://arxiv.org/html/2509.15045v1)
- [WWDC25 WebGPU on Apple Platforms](https://dev.to/arshtechpro/wwdc-2025-webgpu-on-apple-platforms-16pa)
- [Ultralytics Blog: YOLO26 release](https://www.ultralytics.com/blog/meet-ultralytics-yolo26-a-better-faster-smaller-yolo-model)
