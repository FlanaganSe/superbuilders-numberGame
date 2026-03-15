# Research: Platform Knowledge Base

**Project:** Superbuilders — OSMO-style math game with real-time computer vision
**Last verified:** 2026-03-11
**Status:** Verified platform facts and constraints. For architecture and implementation details, see `product-overview.md`.

---

## 1. Critical Platform Facts (Verified 2026-03-11)

### ORT WebGPU Crashes Safari — WASM Only for MVP

GitHub issue [#26827](https://github.com/microsoft/onnxruntime/issues/26827) is **open and unresolved**. Using ORT Web in JSEP mode on WebKit 26.2 triggers a WebKit OMG JIT compiler bug: 400%+ CPU, 1–14GB+ memory explosion, eventual iOS crash. **All JSEP configurations crash identically** — `['webgpu', 'wasm']` fallback does NOT protect.

The non-JSEP WASM path (`onnxruntime-web/wasm` subpath, shipping `ort-wasm-simd-threaded.wasm`) is unaffected. No fix has shipped on either the ORT or WebKit side.

**Decision:** Import `onnxruntime-web/wasm` specifically. Use `executionProviders: ['wasm']`, `numThreads: 1`. The RecognitionService interface preserves the WebGPU seam for when the upstream fix lands.

### Safari 26 / iOS 26 — Current Platform

Apple renumbered to Safari 26 / iOS 26 at WWDC25. WebGPU is shipped in Safari 26 (but unusable for ORT due to #26827). WASM launch performance improved via new in-place interpreter. Worker debugging significantly improved.

### ImageCapture.grabFrame() Does Not Exist in Safari

The `ImageCapture` API is **not implemented in WebKit on any version**. The claim in earlier research that "Safari 18.4 added ImageCapture" was a hallucination. The correct frame extraction path is: `requestVideoFrameCallback` → `ctx.drawImage(video)` → `createImageBitmap(canvas)`.

### WebKit Bug #234920 — Performance, Not Crash

`createImageBitmap(videoElement)` works but is slow (CPU copy path instead of GPU-accelerated). Drawing to canvas first, then `createImageBitmap(canvas)`, avoids this. The PRD constraint to never use `createImageBitmap(video)` directly is sound.

### Relaxed SIMD Not Available in Safari

Safari has only shipped `relaxed_laneselect` (bitmask-select subset). The i8 dot product instruction (`i16x8.dot_i8x16_i7x16_s`) needed for efficient INT8 matmul is not available. Relaxed SIMD baseline is blocked by Safari since December 2025. ORT handles this gracefully via runtime detection (`env.wasm.relaxedSimd: false`).

### Quantization: FP32 Is Best for Safari WASM

- **FP16:** Confirmed slower by ORT's own docs — no native FP16 SIMD in any browser WASM.
- **INT8:** Real integer arithmetic (not upcast to FP32), but no compute speedup on Safari because Relaxed SIMD is unavailable. Main benefit is download size (~4x smaller), not speed.
- **FP32:** Best compute performance on Safari WASM via standard `f32x4` SIMD.

Ship FP32 for Phase 1. Evaluate INT8 for download size only if model exceeds 10MB. Benchmark at Phase 5.

### speechSynthesis Is Unreliable on iOS Safari

Breaks on backgrounding, poor voice quality, inconsistent voice selection across iOS versions. Use pre-recorded audio (ElevenLabs or human recording, MP3/AAC format).

### iOS 26 Home Screen = Web App by Default

Every site added to Home Screen opens as a web app by default on iOS 26. Ship a manifest and icons, but design for both Safari tab and standalone modes. Do not make installed-PWA the only supported mode.

### Vite 7 Plugin Compatibility

- `vite-plugin-static-copy` 3.2.0: peer dep includes `^7.0.0`. Works.
- `vite-plugin-mkcert`: peer dep `>=3`. Tested against Vite 7. Works.
- `@tailwindcss/vite`: peer dep may still be `^5.2.0 || ^6`. Check `npm info @tailwindcss/vite@latest peerDependencies` at setup. If narrow, add pnpm override. Runtime is compatible — metadata-only issue.
- `worker.rollupOptions` is valid in Vite 7. The rename to `rolldownOptions` is Vite 8 only.

### React 19.2 `<Activity>` Component

Real and stable (shipped Oct 2025). Preserves subtree DOM/state when `mode="hidden"`. Useful for camera preservation during navigation. Not needed for single-screen MVP but available for future multi-screen flows.

---

## 2. CV Alternatives Evaluated

| Option | Why Ruled Out |
|---|---|
| MediaPipe | iOS Safari breakage (issue #3576); no digit recognition built-in |
| TensorFlow.js | WebGL Worker issues (tfjs#5454); WASM multithreading fails on iOS (tfjs#7540) |
| Transformers.js | Vision models 200MB+; too heavy |
| Tesseract.js | 2–5s per frame; 15MB download |
| BarcodeDetector | Chromium only; WebKit bug |
| OpenCV.js alone | Brittle under real-world lighting; 7MB WASM |
| Server-side inference | Latency kills real-time feel; privacy concerns with children |
| Cloud VLM (GPT-4o/Claude) | 1–3s per call; too slow for core loop |

---

## 3. Licensing

### Ultralytics

AGPL-3.0 or enterprise. Fine for demo sprint. Flag immediately if commercial use is planned. The architecture commitment is "exportable lightweight classifier," not "Ultralytics specifically." YOLO26 is now available alongside YOLO11 — evaluate both.

---

## 4. Privacy & Child Safety

- No camera frames leave the device in default product path
- No user accounts, PII storage, or analytics SDKs in child-facing flow (COPPA)
- Cloud VLM (if implemented): disabled by default, adult/dev-gated, explicitly non-default
- API keys via Cloudflare Pages Function proxy, never in client code
- Parent stats gated behind adult-math PIN (e.g., "What is 14 x 3?")

---

## 5. Risk Register

| Risk | Status | Detail |
|---|---|---|
| Model accuracy insufficient | RESOLVED | Custom 36-class YOLO11n model (train3) deployed — mAP50: 0.995. Training pipeline documented in `~/proj/digit-training` |
| Custom model not ready in time | RESOLVED | Mock recognition mode + COCO model shipped; game fully playable without custom model |
| Camera/screen geometry unsolvable | RESOLVED | Rear camera working; guided device placement implemented |
| iPad thermal throttling | ACTIVE | 4fps cap implemented, but not stress-tested for long sessions |
| iOS camera permission re-prompts | RESOLVED | "Tap to Start" pattern implemented with NotAllowedError retry UI |
| 6 vs 9 confusion | ACTIVE | Depends on custom training with underlined tiles; not yet trained |
| Detection flicker / false positives | RESOLVED | Temporal buffer + motion gate implemented |
| Model too large for cold start | RESOLVED | StaleWhileRevalidate service worker (ADR-008); ~11MB model loads from cache after first visit |
| @tailwindcss/vite peer dep | RESOLVED | Working with pnpm |

---

## 6. Corrections to Earlier Research

| Earlier Claim | Correction |
|---|---|
| `ImageCapture.grabFrame()` works on Safari 18.4+ | **Wrong.** ImageCapture is not in WebKit at all. Hallucination. |
| WebGPU fallback chain `['webgpu', 'wasm']` protects Safari | **Wrong.** All JSEP configs crash identically. WASM-only. |
| FP16 ~6MB is the target model size | **Wrong.** FP16 is 2–7x slower in browser WASM. Ship FP32. |
| INT8 has "no speedup — runtime converts back to fp32" | **Partially wrong.** INT8 is real integer arithmetic. But no compute speedup on Safari because Relaxed SIMD is unavailable. |
| speechSynthesis is option #1 for voice | **Wrong.** Unreliable on iOS Safari. Use pre-recorded audio. |
| Vite 6 is current stable | **Stale.** Vite 7.3.1 is current stable. |
| Touch targets 2cm x 2cm | **Too small.** Research-backed minimum for ages 5–8: 80 x 80pt (~2.8cm). |
| OpenCV.js threaded build works in Workers | **Wrong.** Only non-threaded build works (OpenCV #25790). |

---

## 7. Sources

### Platform
- [WebKit Features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
- [WebKit Features in Safari 26.2](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/)
- [Safari Technology Preview 238](https://webkit.org/blog/17848/release-notes-for-safari-technology-preview-238/)
- [requestVideoFrameCallback — Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)
- [WebKit Bug #234920](https://bugs.webkit.org/show_bug.cgi?id=234920)
- [Relaxed SIMD status](https://web-platform-dx.github.io/web-features-explorer/limited-availability/)

### ONNX Runtime
- [ORT Web docs](https://onnxruntime.ai/docs/tutorials/web/)
- [ORT WebGPU Safari crash — #26827](https://github.com/microsoft/onnxruntime/issues/26827)
- [ORT INT8 no WASM speedup — #21535](https://github.com/microsoft/onnxruntime/issues/21535)
- [ORT Relaxed SIMD — #22533](https://github.com/microsoft/onnxruntime/issues/22533)
- [ORT performance diagnosis](https://onnxruntime.ai/docs/tutorials/web/performance-diagnosis.html)
- [ONNX Model Zoo — MNIST](https://github.com/onnx/models/tree/main/validated/vision/classification/mnist)

### Framework
- [React 19.2](https://react.dev/blog/2025/10/01/react-19-2)
- [React Activity](https://react.dev/reference/react/Activity)
- [Vite 7](https://vite.dev/blog/announcing-vite7)
- [Vite 7 migration](https://vite.dev/guide/migration)
- [@tailwindcss/vite + Vite 7 — #18381](https://github.com/tailwindlabs/tailwindcss/issues/18381)

### Child Safety
- [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)
- [FTC COPPA 2026 policy statement](https://www.ftc.gov/news-events/news/press-releases/2026/02/ftc-issues-coppa-policy-statement-incentivize-use-age-verification-technologies-protect-children)

### Other
- [Ultralytics YOLO docs](https://docs.ultralytics.com/)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [MediaPipe web](https://ai.google.dev/edge/mediapipe/solutions/guide)
- [Playwright WebKit camera permissions — #11714](https://github.com/nicedoc/playwright/issues/11714)
