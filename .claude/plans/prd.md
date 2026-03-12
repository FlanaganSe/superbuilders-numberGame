# PRD: Superbuilders — OSMO-Style Math Game with Real-Time Computer Vision

**Status:** Draft
**Date:** 2026-03-11
**Timeline:** 1-week sprint
**Primary target:** iPad (Safari mobile web) — camera faces play surface
**Secondary target:** iPhone (functional but not optimized — no stand, smaller screen, different FOV)

---

## 1. Problem

Children learn math best through physical manipulation, but bridging physical play with digital feedback requires computer vision that runs in real time on consumer hardware. OSMO proved this model works — but no open, web-based CV math game exists. There is a genuine market gap: a browser-first app that uses the device camera to recognize physical number tiles and power an interactive arithmetic game for ages 5–8, with zero cloud dependency for the child-facing experience.

---

## 2. Solution

A Safari-first web app (React + Vite SPA) that turns an iPad into a "magic window" over a physical play surface. The child sees a math problem on screen, a countdown begins, and the child places physical number tiles anywhere on the play surface (free placement). When the round starts, the app activates on-device computer vision (ONNX Runtime Web, WASM backend, running in a Web Worker) to continuously detect and recognize all visible tiles. The system auto-checks: as soon as detected digits match the correct answer, the round ends with celebration feedback. CV is inactive between rounds — no false triggers while the child arranges tiles during the countdown. The CV approach uses a lightweight object detector — leading candidate: YOLO11n (Ultralytics detection task) — that locates and classifies tiles anywhere in the camera frame, outputting bounding boxes with labels `0–9`. Using Ultralytics specifically keeps the training/export toolchain simple (`yolo detect train` → ONNX export), but the architecture does not hard-depend on Ultralytics or any specific model family. A mock RecognitionService (keyboard/button input simulating CV detections) serves as the Day 1 bridge, fully unblocking game logic and UI development while the CV model trains — no ML dependency on Day 1. The architecture (via a `RecognitionService` interface) preserves clean upgrade paths to alternative detectors, handwritten digits, and broader symbol sets without changing game logic. The game provides immediate, child-friendly feedback — visual acknowledgment within 200ms of tile detection, answer confirmation after temporal stability (~750ms), celebration animations, sound effects, and adaptive difficulty progression. No accounts, no backend, no frames leave the device.

---

## 3. Requirements

### Core Experience

1. Display math problems (addition, subtraction) appropriate for ages 5–8 on screen
2. **Free placement:** recognize physical number tiles (digits 0–9) placed anywhere on the play surface via device camera — no fixed slots or zones required
3. **Round-based game loop:** countdown timer between rounds (child arranges tiles) → round starts (CV activates) → auto-check (continuously evaluates detected digits against correct answer) → correct answer detected → celebration → next countdown
4. **Auto-check:** system continuously compares all detected digits to the current answer. When a match is found, the round ends immediately with success feedback. No manual "submit" needed.
5. **CV inactive between rounds:** detection only runs during active rounds. During the countdown, the camera feed is visible but inference is paused — no false triggers while the child moves tiles.
6. Provide immediate, differentiated feedback:
   - **Correct:** confetti + cheer animation + ascending chime → next problem
   - **Tile first detected:** instant "pop" sound + visual highlight (< 200ms)
   - **Timeout / no correct answer:** gentle encouragement + hint → retry with same problem
7. Support two-tile answers (10–19) by reading left-to-right spatial ordering of detected bounding boxes
8. Adaptive difficulty: increase after 3 correct in a row, decrease after 2 wrong at same level
9. Session design: ~10 minutes / 15–20 problems, ending with a summary screen showing stars earned (never wrong-answer counts)
10. Landscape orientation, touch targets ≥ 80×80pt, text ≥ 24pt, numbers ≥ 48pt
11. Honor `prefers-reduced-motion` — replace spring/bounce with opacity fades
12. "Tap to Start" screen that unlocks camera + AudioContext in a single user gesture
13. First-run calibration flow: guide user to confirm camera sees the play surface, confirm lighting

### Computer Vision

14. CV inference runs entirely in a Web Worker — never blocks UI thread
15. CV inference is **only active during rounds** — paused during countdown and between rounds
16. ONNX Runtime Web with WASM execution provider only (`numThreads = 1`, no COOP/COEP required)
17. **WASM-only for initial implementation** — ONNX Runtime Web's JSEP build path has documented Safari/WebKit WASM JIT stability issues. The confirmed safe path is the non-JSEP WASM build (`ort.env.wasm`) in a dedicated worker — this avoids known JIT compilation crashes regardless of execution provider. WebGPU is a Phase 5 benchmark target: verify JSEP/WebGPU stability on the target iPad before adopting. The architecture must preserve the WebGPU seam but must not depend on it.
18. Ship FP32 model — detector ~10–12 MB. FP16 is slower in browser WASM (no native FP16 SIMD). INT8 runs as real integer arithmetic in ORT but yields no speedup on current Safari WASM — efficient INT8 dot products require Relaxed SIMD (`i16x8.dot_i8x16_i7x16_s`), which Safari has not yet shipped. Verify Relaxed SIMD status on target device. Defer INT8 to Phase 5 benchmark if model exceeds 10 MB. Budget ≤ 15 MB for any single model file.
19. **Full-frame detection** — detector scans entire camera frame for tiles (no answer-zone ROI cropping needed with free placement)
20. Frame scheduling: capture at ~4–10 fps via `requestVideoFrameCallback`; drop frames under pressure, never queue
21. Temporal stability: require 3 consecutive matching recognitions before committing an answer
22. Two-phase feedback: fast visual acknowledgment (< 200ms) + commit after stability (~750ms)
23. Motion/stability gate: suppress inference while hand is actively disturbing the scene
24. Confidence threshold ≥ 0.65. NMS with IoU ~0.45 and left-to-right box sorting for multi-digit reading.

### Architecture

25. Architecture must define explicit boundary interfaces (seams) that isolate scene assumptions from recognition logic from game logic. Required seams:
    - **FrameSource** — camera stream, fixture replay, prerecorded playback (decouples recognition from live camera)
    - **PreprocessingStrategy** — normalize, orientation, contrast adjustment (future materials/lighting/handwriting don't require rewriting the recognizer)
    - **RecognitionService** — model init, inference, dispose (runtime/model swap freedom; all backends — lightweight detector, cloud VLM, mock, fixture — implement same contract)
    - **InterpretationLayer** — converts raw detections into semantic answer candidates with ordering, grouping, and ambiguity handling (game logic never reasons about logits or frame-level noise). Groups nearby boxes into multi-digit numbers via left-to-right proximity.
    - **GameEngine** — problem generation, round lifecycle (countdown → active → result), auto-check logic, progression (clean separation between vision and product behavior)
    - **VocabularyRegistry** — symbol definitions, label IDs, ambiguity policy (digits today, operators/shapes/handwriting tomorrow)
    These seams do not all require heavy implementation in the MVP — several can start as simple types or thin wrappers — but they must exist as explicit interfaces so that future expansion does not require rewriting core logic.
26. `GameMode` interface: pluggable game modes (counting, addition, subtraction, missing-addend) with independent problem generation and validation
27. State management: Zustand for global app state with transient updates for high-frequency CV data (via `subscribe`, bypassing React renders); `useReducer` for game phase state machine (explicit transitions, no impossible states)
28. Game state machine via `useReducer`: `idle → countdown → scanning → success/timeout → session-end`. Escalate to XState only if state graph grows complex post-MVP.
29. Progressive loading: app shell renders instantly; camera on user gesture; model downloads in background
30. Service Worker caching (`CacheFirst`) for ONNX model and WASM runtime files
31. Debug HUD (dev-only): inference latency, confidence scores, detection bounding box overlays, temporal buffer state, fixture capture/replay
32. Feature flags via URL params: `?recognition=mock&debug=true&overlay=boxes`

### Physical Design

33. Tiles: black digit on white matte background, 3×4 inches, bold machine-readable font (Verdana/OCR-B), 3–4mm black border, underline on 6 and 9
34. Two copies of each digit (0–9) = 20 tiles total
35. Play mat with contrasting background color (helps detector distinguish tiles from surface)
36. **Camera setup:** the camera always faces the canvas/play surface. The exact physical arrangement (stand angle, mount type, camera selection) is flexible — the app must work regardless of specific iPad model or stand configuration, as long as the camera has a clear view of the tiles.
37. iPhone: app renders correctly in landscape and camera functions, but physical setup guidance is iPad-primary.

### Deliverables

38. Working iPad web app running the math game
39. Physical number tiles (0–9, duplicates) for demonstration
40. Audio assets: sound effects (correct chime, encouragement tone, tile-detected pop, session-end celebration) and optional voice prompts (pre-recorded MP3/AAC, sourced via ElevenLabs, freesound.org, or human recording — budget ~2–3 hours)
41. 3–5 minute demo video showing the game in action
42. README with setup/run instructions and CV pipeline overview

---

## 4. Non-goals

- **Native app / App Store distribution** — web-only for MVP; Capacitor is a post-MVP option
- **Next.js / SSR** — 100% client-side app; SSR is pure overhead for camera + game
- **WebGPU acceleration for initial implementation** — deferred due to unverified JSEP/WebGPU stability on Safari; architecture preserves WebGPU seam for Phase 5 benchmarking
- **Multi-threaded WASM** — requires COOP/COEP headers that break Safari cross-origin; single-thread is sufficient for both classifier and YOLO-Nano models
- **Fixed answer slots** — free placement is the chosen approach; no rigid slot zones
- **Handwritten digit recognition** — extension path documented but not in MVP scope
- **Multiplication / division** — addition and subtraction only for ages 5–8
- **User accounts, database, persistence** — localStorage only (game state, score, mute preference)
- **Cloud inference in child-facing flow** — all recognition local-only by default. Cloud VLM (if implemented as rescue path) must be: (a) disabled by default, (b) gated behind developer/adult-only activation, (c) explicitly labeled as non-default in the architecture, (d) subject to privacy review before any user-facing deployment. It is never the demo path.
- **Analytics SDKs** — no PostHog/GA in child-facing flow (COPPA complexity)
- **Mascot / Rive animation** — only if assets exist at sprint start; Motion handles all programmatic feedback
- **`window.speechSynthesis`** — unreliable on iOS Safari; use pre-recorded audio for voice prompts
- **OpenCV.js for MVP** — perspective correction handled via training-time augmentation; classical template matching not needed given lightweight detector approach. Add OpenCV.js post-MVP if needed for calibration or rectification

---

## 5. Technical Constraints

### Immutable Rules (from project invariants)

1. **Camera access requires HTTPS or localhost** — use `vite-plugin-mkcert` for local dev; `cloudflared` tunnel for real-device testing
2. **CV processing must not block the UI thread** — all inference in a dedicated Web Worker
3. **All game feedback must be child-friendly** — no negative/punitive language, only encouraging prompts

### Architecture Constraints

4. Safari-first: target current stable Safari/iOS on the provided iPad; also test iPhone Safari. Verify exact Safari/iOS version during hardware spike.
5. `getUserMedia` must be triggered inside a user gesture handler ("Tap to Start"), never on mount
6. Hold `MediaStream` in a `useRef`, not `useState` (avoids re-render teardown)
7. Frame extraction: `drawImage(video)` to canvas first, then `createImageBitmap(canvas)` — never `createImageBitmap(video)` directly (WebKit bug #234920)
8. `<video playsinline autoplay muted>` is mandatory — without `playsinline`, Safari goes fullscreen
9. Camera recovery on `visibilitychange`: check `track.readyState`, restart if `'ended'`
10. iOS AudioContext starts suspended — unlock on first user gesture; resume on `visibilitychange` with `Howler.ctx.resume()`
11. Audio format: MP3 or AAC only — no OGG or WebM on iOS Safari
12. `bitmap.close()` required after use — GPU memory leak otherwise
13. Canvas cleanup: set `.width = 0; .height = 0` before releasing; never recreate capture canvas mid-session
14. Vite config must exclude `onnxruntime-web` from pre-bundling, treat `.onnx` as assets, and copy WASM binaries to output
15. No secrets in client code — cloud VLM API keys (if any) go through a Cloudflare Pages Function proxy
16. If any model file exceeds 20 MB, move to Cloudflare R2 for asset hosting (25 MB per-file hard limit on Pages)

### Stack (Recommended — pin exact versions at project setup)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React 19.x + Vite (latest stable) + TypeScript 5.x | Unanimous on React + Vite SPA; pin exact versions at project setup |
| CV Runtime | ONNX Runtime Web (WASM EP) | Best Safari story; framework-agnostic model swap |
| CV Model | Mock (Day 1) → lightweight detector (leading candidate: YOLO11n) | Architecture commits to `RecognitionService` interface, not a specific model family. YOLO11n is leading candidate — detects and classifies tiles anywhere in frame. |
| Training | Ultralytics CLI (leading candidate) + Roboflow (labeling/augmentation) | Evaluate alternatives if licensing (AGPL) or benchmarks warrant. Roboflow for dataset management. |
| State | Zustand | Transient updates for CV; event-driven for game |
| Animation | Motion (`LazyMotion` + `domAnimation`, ~15KB) | WAAPI-backed, 120fps, spring physics |
| Audio | Howler.js / `use-sound` | iOS AudioContext handling; sprite support |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Rust engine; `@theme` CSS config |
| Lint/Format | Biome v2 | 20× faster than ESLint+Prettier; React domain rules |
| Testing | Vitest (unit) + Playwright WebKit (E2E) | Co-located tests; only Playwright has WebKit engine |
| Hosting | Cloudflare Pages | Free unlimited static bandwidth; 25MB file limit fits model |
| Dev HTTPS | `vite-plugin-mkcert` + `cloudflared` tunnel | Camera requires HTTPS; tunnel for real-device testing |

---

## 6. Acceptance Criteria

### Performance (measured on target iPad)

- [ ] Tap-to-start → first live camera preview: **< 1.5 seconds**
- [ ] Model ready after first app load (including download): **< 3 seconds**
- [ ] Warm inference latency (single full-frame detection): **< 120 ms**
- [ ] Visual acknowledgment of tile detection: **< 200 ms** (first phase — "I see something")
- [ ] Answer commit after temporal stability (3 matching frames at 4–5 fps): **< 1000 ms** (second phase — grading)
- [ ] Sustained gameplay without thermal throttle: **≥ 10 minutes**

### Accuracy

- [ ] Correctly detects and recognizes digits 0–9 on physical tiles anywhere in frame at ≥ **95% per-frame accuracy** under controlled lighting
- [ ] False accept rate during 3-minute demo session: **effectively zero** (no incorrect answer committed without user placing a wrong tile)
- [ ] Correctly handles two-tile answers (10–19) via left-to-right spatial ordering of detected bounding boxes
- [ ] Does not commit an answer while hand is actively over the play surface
- [ ] Correctly distinguishes 6 from 9 (with underlined tiles)
- [ ] CV inference only runs during active rounds — no detections during countdown

### Game UX

- [ ] Correct answer auto-detected → confetti + cheer + sound within feedback window
- [ ] Round timeout triggers gentle encouragement + hint — **no punitive language, red X, or buzzer**
- [ ] Countdown between rounds gives child time to arrange tiles before detection begins
- [ ] Difficulty adapts: increases after 3 consecutive correct, decreases after 2 wrong at same level
- [ ] Session ends with star summary screen after ~15–20 problems
- [ ] `prefers-reduced-motion` replaces all spring/bounce animations with fades
- [ ] Mute button persists across sessions (localStorage)
- [ ] Works in both Safari tab mode and standalone (Add to Home Screen) mode

### Technical

- [ ] All CV inference runs in Web Worker — main thread never blocked by model execution
- [ ] Switching `?recognition=mock` enables full game loop without camera or model
- [ ] Debug HUD (`?debug=true`) displays inference latency, confidence, and detection overlays
- [ ] `pnpm build` produces a deployable static bundle under 2 MB (excluding `.onnx` model files and `.wasm` runtime binaries)
- [ ] Unit tests pass: game logic, interpretation logic, temporal smoothing, answer validation
- [ ] Fixture-based recognizer regression tests: a curated set of labeled frames (good light, poor light, hand occlusion, 6/9 ambiguity, two-tile, empty board) run through the recognition pipeline in CI with pass/fail thresholds
- [ ] E2E test (Playwright WebKit): full game loop with mocked recognition
- [ ] **Real-device iPad acceptance gate:** full game loop tested on actual target iPad hardware — desktop WebKit automation does not substitute for real-device validation of camera behavior, autofocus, and thermal characteristics
- [ ] Cloudflare Pages deployment serves app with correct security headers

### Deliverables

- [ ] Physical tiles printed, cut, and laminated (20 tiles: 0–9 × 2)
- [ ] Play mat with contrasting background for tile detection
- [ ] Audio assets sourced and integrated (effects + optional voice prompts)
- [ ] 3–5 minute demo video captured
- [ ] README documents setup, run, and CV pipeline approach

---

## 7. Key Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Detector accuracy insufficient for demo | Blocks demo | Tiered fallback via `RecognitionService`: (1) retrain with more data/augmentation, (2) swap to alternative detector architecture, (3) Cloud VLM as last-resort rescue only — must be adult/dev-gated, disabled by default. |
| Custom model not ready in time | Delays integration testing | Mock RecognitionService (keyboard/button input) fully unblocks game logic and UI development from Day 1 — no ML dependency. Start custom training early in parallel and integrate when ready. |
| Free-placement false positives (stray tiles, hands, clutter) | Wrong answers committed | Confidence threshold + temporal stability + motion gate. Training data includes negative examples (hands, table clutter). |
| iPad thermal throttling | Kills responsiveness | 4fps inference cap; adaptive backoff to 2fps; pause on background |
| iOS camera permission re-prompts (standalone) | Breaks flow | "Tap to Start" pattern; handle `NotAllowedError` with retry UI |
| 6 vs 9 confusion | Wrong answers | Underlined physical tiles + separate training classes |
| Detection flicker / false positives | Frustrating UX | 3-frame temporal stability before commit; motion gate during hand movement |
| Model too large for fast cold start | Slow first load | Service Worker pre-cache; loading indicator; model < 12MB |

---

## 8. Open Questions (resolve before or during Phase 1)

1. ~~Answer slots vs. free placement?~~ — **LOCKED: Free placement with auto-check.** CV detects all tiles on the play surface; system continuously evaluates against the correct answer during active rounds. Detection paused between rounds (countdown).
2. **Roboflow access?** — Free tier (public data) or paid? Fallback: PyTorch + Label Studio locally.
3. **Ultralytics AGPL licensing** — acceptable for demo sprint; flag early if commercial use is planned.
4. **Pre-recorded voice prompts needed?** — Ages 5–6 can't read; pre-recorded audio (ElevenLabs or human voice) is the viable path since `speechSynthesis` is unreliable on iOS.
5. **`ImageCapture.grabFrame()` optimization?** — Canvas intermediate (`drawImage(video)` → `createImageBitmap(canvas)`) is the specified approach (constraint #7). `grabFrame()` may be cleaner — benchmark on target iPad during Phase 1 hardware spike, but do not depend on it.
6. **Vite plugin compatibility?** — Verify `@tailwindcss/vite`, `vite-plugin-static-copy`, and `vite-plugin-mkcert` are compatible with the selected Vite version. Resolve any peer dependency conflicts during project setup.
7. **ONNX Runtime Web vs. requirements doc?** — Original requirements specify "TensorFlow.js or OpenCV.js" as examples. ONNX Runtime Web is a stronger choice (confirmed by all research), but the phrasing was "such as" (illustrative). Confirm with stakeholder (Patrick Skinner) that ONNX Runtime Web is acceptable.
8. **Round countdown duration?** — How long does the child get to arrange tiles before detection starts? Recommend 5–10 seconds, configurable.
9. **Round timeout?** — How long does a round last before timing out with encouragement? Recommend 30–60 seconds, configurable.

---

*Next step: `/research` to resolve open questions, then `/plan` to break into daily milestones.*
