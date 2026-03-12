# Deep Analysis: Superbuilders

*2026-03-12 — Read-only audit. No code changes made.*

---

## TL;DR

The architecture is sound, the code quality is high, and the technology choices are well-reasoned. **The custom digit-tile ONNX model exists and is correctly wired up** — input/output names, shapes, class ordering, preprocessing, and postprocessing all match. Training metrics are strong (mAP50: 0.887, precision: 0.923) on 417 images. Expanding to letters, image cards, or even handwriting (with caveats) is architecturally feasible without rewriting the core.

---

## 1. Does This Actually Work?

### Model verification (confirmed correct)

| Check | Expected | Actual | Match |
|-------|----------|--------|-------|
| File exists | `public/models/digit-tiles.onnx` | 11MB, present | Yes |
| Input name | `images` | `images` | Yes |
| Input shape | `[1, 3, 640, 640]` | `[1, 3, 640, 640]` | Yes |
| Output name | `output0` | `output0` | Yes |
| Output shape | `[1, 4+10, 8400]` | `[1, 14, 8400]` | Yes |
| Class map | classId 0→digit 0, ..., 9→9 | `{0:'0', 1:'1', ..., 9:'9'}` | Yes |
| FP32 (no half) | Required for WASM | `half: False` | Yes |
| NMS in model | `False` (code does its own) | `nms: False` | Yes |
| Letterbox gray 114 | YOLO standard | Code uses 114 | Yes |
| Planar RGB /255 | YOLO standard | Code does this | Yes |
| Opset | ORT 1.24 compatible | opset 17 | Yes |

Export command was correct:
```bash
yolo export model=runs/detect/train/weights/best.pt format=onnx imgsz=640 opset=17 half=False batch=1
```

### Training metrics (50 epochs, 417 train images, 25 val)

- **mAP50: 0.887** / **mAP50-95: 0.877** (close values = tight bounding boxes)
- **Precision: 0.923** / **Recall: 0.876**

These are strong for the dataset size. Note: labels are in Roboflow polygon format, but Ultralytics correctly converts polygons to bounding boxes for detection training.

### What works today
- Full game loop: start → generate problem → accept answer → score → session summary
- Mock recognition mode (`?recognition=mock`) — fully playable with on-screen numpad
- Camera capture pipeline (getUserMedia → rVFC → ImageBitmap transfer to worker)
- ONNX inference worker (loads model, runs inference, returns detections)
- Post-processing (NMS, confidence thresholds, temporal buffering)
- Sound, animation, confetti, child-friendly UX
- **Real CV recognition pipeline — model is trained, exported, and correctly integrated**

### Risks and caveats

| Risk | Severity | Detail |
|------|----------|--------|
| Small val/test sets | Medium | Only 25 val / 14 test images. Metrics could be optimistic. Real-world testing on iPad is essential. |
| Safari WASM-only constraint | Medium | ORT WebGPU/WebGL crash on Safari (WebKit OMG JIT bug, open since Jan 2026). WASM works but is 5-10x slower than WebGPU. Currently fine at 4-10fps. |
| Camera lighting variance | Medium | Tile recognition quality degrades in poor lighting. No adaptive preprocessing exists yet. |
| 6/9 confusion | Medium | Tiles need an underline or orientation mark; depends on training data coverage. |
| Thermal throttling | Low | iPad chassis handles it; 4fps cap keeps CPU 90%+ idle. |
| Model size on first load | Low | ~11MB ONNX model cached via CacheFirst SW strategy. First load is slow on cellular. |
| No offline model fallback | Low | If model fetch fails, no graceful degradation path exists. |

---

## 2. Architecture Assessment

### Verdict: Well-designed, no fundamental flaws

The codebase follows clean functional patterns throughout. Specific strengths:

- **CV off main thread**: All inference runs in a dedicated Web Worker with zero-copy ImageBitmap transfer. UI never blocks.
- **Type-safe worker protocol**: `satisfies MainToWorker` / `satisfies WorkerToMain` catches message type mismatches at compile time.
- **Clean phase machine**: Game reducer uses discriminated unions (`phase.phase`) — each phase only exposes its relevant fields. No invalid states representable.
- **Frame ownership discipline**: Single-consumer owns the ImageBitmap and calls `.close()`. No leaks in the main pipeline.
- **Feature flags via URL params**: Clean, cacheable, no build-time branching.
- **RecognitionService interface**: Abstraction seam at `src/types/cv.ts:52` means swapping ONNX → WebGPU → cloud API requires zero game logic changes.

### No horrible decisions found

Every non-obvious technical choice has a defensible rationale:
- WASM-only ORT (forced by Safari WebKit bug)
- FP32 model (FP16 is 2-7x slower on WASM without native SIMD; INT8 no faster without Relaxed SIMD)
- Single-threaded inference (SharedArrayBuffer requires COOP/COEP headers which break Google Fonts CDN)
- `numThreads: 1` (correct given the above constraint)
- Zustand over Redux (appropriate for this scale)
- No SSR (camera-first SPA, no SEO need)

---

## 3. Code Issues Found

### Must fix (before real CV goes live)

| ID | File | Issue |
|----|------|-------|
| S5 | `src/cv/mock-recognition.ts:62` | `recognize()` doesn't call `_frame.close()` — ImageBitmap leak. One-line fix. |
| N3 | `src/cv/postprocessing.ts:198` | `d.classId as Digit` has no bounds check. A misbehaving model producing classId > 9 silently passes as a valid digit. Add a filter. |

### Should fix (quality)

| ID | File | Issue |
|----|------|-------|
| BCI-M1 | `vite.config.ts:34` | Sound files (.mp3, .m4a) not in SW precache `globPatterns`. First offline session has no audio. |
| BCI-M3 | `tsconfig.app.json:27-30` | `@/*` path alias defined in TS but not in Vite `resolve.alias`. First `@/` import will 404 in Vite. |
| BCI-L1 | `e2e/game-loop.spec.ts:15` | Locates elements by Tailwind classes instead of `data-testid`. Fragile. |

### Previously reported bug that's actually fine
The prior `docs/research.md` claims `pendingInfer` hangs forever on a fatal ORT crash. Code inspection shows both fatal and non-fatal error paths explicitly resolve `pendingInfer` at `src/cv/onnx-recognition.ts:68` and `:73`. No deadlock exists.

---

## 4. Expandability

### Can this do more than digits?

| Expansion | Feasibility | Effort | Notes |
|-----------|-------------|--------|-------|
| **Letter tiles (A-Z)** | High | Medium | Same YOLO pipeline, 26 more classes. ~2,600 training images minimum. Main challenge: b/d, p/q confusion pairs. |
| **Spelling game** | High | Medium | Letter recognition + game engine changes. Reducer needs word-level validation instead of arithmetic. |
| **Image cards** (firetruck, car) | Medium | Medium | Same YOLO approach. Needs 200-500 images per object type. Two-stage approach (detect card → classify image) is cleaner. COCO pretrained weights already cover common objects. |
| **Handwriting (marker)** | Hard | High | Children's handwriting has extreme variability. Digits-only via MNIST-style CNN is feasible (~5-10ms inference). Full letter handwriting needs pre-trained HTR models (200MB+) — not viable on-device in WASM today. |
| **Multiple game modes** | High | Low | The `RecognitionService` interface + phase machine already supports this. Add a game-select screen, parameterize the reducer. |

### Architecture supports expansion
The key insight: the `RecognitionService` interface decouples "what the camera sees" from "what the game does with it." You could have:
- `DigitRecognitionService` (current)
- `LetterRecognitionService` (same YOLO, different model)
- `ImageCardRecognitionService` (same YOLO, different model)
- `HandwritingRecognitionService` (different model architecture entirely)

All plug into the same game store subscription. The game reducer just needs to accept different answer types.

---

## 5. Technology Choices: Were Alternatives Correctly Rejected?

| Alternative | Why rejected | Correct? |
|-------------|-------------|----------|
| Apple Vision Framework | Not accessible from JS in PWA/WKWebView | Yes |
| WebNN | No Safari implementation | Yes |
| TensorFlow.js | Known Safari Worker + WASM multithreading failures | Yes |
| MediaPipe | Safari breakage | Yes |
| Tesseract.js (OCR) | ~5s/frame — unusable for real-time | Yes |
| Cloud APIs (Google Vision, etc.) | 1-3s latency + COPPA concerns for children's app | Yes |

**ONNX Runtime Web with WASM backend is the correct choice for this use case.**

---

## 6. What Would I Do Next?

Priority order:
1. **Test on real iPad with physical tiles** — the model and pipeline are wired up; real-world validation is the next step
2. Fix the ImageBitmap leak in mock-recognition (one-line)
3. Add classId bounds checking in postprocessing
4. Add sound files to SW precache
5. If expanding to letters/spelling: train a separate 36-class model (digits + letters), add game-select screen

---

## 7. Bottom Line

This is a well-engineered codebase with clean architecture, correct technology choices, and a solid expansion path. The fundamental approach (ONNX YOLO on iPad Safari via WASM) is validated. The custom digit-tile model is trained (mAP50: 0.887, precision: 0.923), correctly exported, and properly integrated. The pipeline from camera → preprocessing → inference → postprocessing → game engine is complete and should work end-to-end. The main unknown is real-world performance with physical tiles under varied lighting conditions — that requires iPad testing.
