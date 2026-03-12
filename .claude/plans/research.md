# Research Index: Superbuilders

**Date:** 2026-03-11
**Status:** Complete — all research verified via web search, not assumptions
**PRD:** `.claude/plans/prd.md` (free placement + auto-check + round-based detection)

---

## Research Files

| File | Scope | Key Findings |
|---|---|---|
| [docs/research.md](../../docs/research.md) | Consolidated baseline research (stack, platform, CV architecture, camera, ORT config, game UX, deployment) | Written for slot-based classifier approach — superseded in areas marked below |
| [research-yolo-training.md](./research-yolo-training.md) | YOLO11n/YOLO26n detection training, dataset format, ONNX export, model sizing | YOLO11n FP32 ~10MB; train `yolo detect train` with `fliplr=0 flipud=0 degrees=10`; export `opset=17`; YOLO26n is 31% faster with NMS-free output `[1,300,6]` |
| [research-yolo-postprocessing.md](./research-yolo-postprocessing.md) | ONNX tensor format, NMS in JS, preprocessing, bounding box handling | Output is `[1,14,8400]` channel-major; no sigmoid needed; start at 320x320 for speed; pre-allocate Float32Arrays |
| [research-auto-check.md](./research-auto-check.md) | Free-placement matching logic, stray tile disambiguation, temporal buffer, motion gate, round lifecycle | Digit-count gate (answer size filters candidates); 3-frame consecutive counter; confidence-drop motion gate; OSMO uses sum-equals-target (different problem) |
| [research-game-ux.md](./research-game-ux.md) | Motion animations, canvas-confetti, Howler.js iOS audio, fonts, visual design, rewards | Motion v12.35 + domAnimation (15KB); canvas-confetti v1.9.4 (7KB); Howler 2.2.3 with `autoSuspend=false`; Lexend font (RCT-backed); 3/2/1 stars per attempt |
| [research-roboflow.md](./research-roboflow.md) | Roboflow for detection labeling, augmentation, export, free tier limits, alternatives | Free tier works (250K images, $60 credits) but data is PUBLIC; export as "YOLOv11 PyTorch TXT"; Label Studio is private fallback; CVAT broken for YOLO11 |
| [research-worker-architecture.md](./research-worker-architecture.md) | Web Worker + ORT setup in Vite, frame transfer, back-pressure, Safari gotchas, Service Worker caching | Module workers safe since Safari 15; OffscreenCanvas safe since iOS 17; `wasmPaths='/'` mandatory in Worker; Workbox default 2MB limit must be raised to 30MB |

---

## What Changed From Baseline Research

The baseline research (`docs/research.md`) was written for the **slot-based classifier** approach. The PRD evolved to **free-placement detection with auto-check**. Key superseded sections:

| Baseline Section | What Changed | New Source |
|---|---|---|
| §3 CV Architecture — "Slot classifier recommended" | Free placement chosen; full-frame YOLO11n detector, not slot classifier | research-yolo-training.md |
| §3 CV Approach Options A/B/C | Option C (full-scene detector) is now the approach | research-yolo-training.md |
| §5 YOLO Output Shape | Same shape but context updated for detection (not classification) | research-yolo-postprocessing.md |
| §6 Model Strategy — "YOLO11n-cls" | Changed to YOLO11n detection (`yolo11n.pt`, not `yolo11n-cls.pt`) | research-yolo-training.md |
| §7 Game State Machine | Changed to `idle → countdown → scanning → success/timeout → session-end` | research-auto-check.md |
| §9 Physical Design — "answer zone" | Replaced with soft visual hint + digit-count gate | research-auto-check.md |
| §10 Architecture Seams — SceneLocator, CalibrationProfile | Removed (slot-centric) | PRD §25 |

Sections that remain valid from baseline: §2 (platform facts), §4 (camera/frame extraction), §5 (ORT config), §7 (child UX parameters, except state machine), §8 (frontend details), §11 (deployment), §12 (privacy).

---

## Critical Decisions Locked by Research

1. **YOLO11n first, YOLO26n as Phase 2 swap** — YOLO11n has more community examples; YOLO26n is 31% faster but output format changes. Same training pipeline; only JS parser changes.
2. **320x320 inference resolution** — tiles are physically large in frame; small-object accuracy not the bottleneck; ~2x faster than 640x640.
3. **Digit-count gate for stray tiles** — single-digit answers match only isolated tiles; two-digit answers match only adjacent pairs. No spatial zone calibration needed.
4. **3-frame consecutive counter** (not circular buffer) — simplest temporal stability implementation; at 4fps = 750ms, within 1000ms budget.
5. **Confidence-drop motion gate first** — avg confidence < 0.40 marks frame unstable; add frame differencing only if insufficient.
6. **canvas-confetti for particles + Motion for structured animations** — both iOS-safe, tiny bundles.
7. **Howler.js directly** (not use-sound wrapper) — need direct `Howler.ctx` access for iOS `interrupted` state handling.
8. **Lexend font** — RCT-backed reading fluency improvement for ages 5-8; Fredoka One for large number display.
9. **Roboflow free tier** — sufficient for dataset; data goes public (acceptable for tile images).
10. **Option A: ORT in dedicated module worker** — OffscreenCanvas in Worker fully safe on Safari 26; `wasmPaths='/'` absolute path mandatory.

---

## Open Questions Resolved by Research

| PRD Open Question | Resolution | Source |
|---|---|---|
| #2 Roboflow access? | Free tier works; data is public; Label Studio fallback if privacy needed | research-roboflow.md |
| #5 `ImageCapture.grabFrame()`? | Does NOT exist in Safari; use canvas intermediate | docs/research.md §2 |
| #6 Vite plugin compatibility? | All verified for Vite 7 | docs/research.md §2 |
| #8 Round countdown duration? | 5-10s recommended, configurable | research-auto-check.md §7 |
| #9 Round timeout? | 30-60s recommended, configurable | research-auto-check.md §7 |

## Open Questions Still Pending

| Question | Status | Action |
|---|---|---|
| #3 Ultralytics AGPL licensing | Acceptable for demo; flag if commercial | Confirm with stakeholder |
| #4 Pre-recorded voice prompts? | Lexend font helps readability; voice prompts recommended for ages 5-6 | Source audio during sprint (Pixabay/Mixkit) |
| #7 ONNX Runtime Web vs requirements doc? | ONNX RT Web is the stronger choice; requirements say "such as" (illustrative) | Confirm with Patrick Skinner |

---

## Stack Finalized

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Framework | React + Vite + TypeScript | 19.2 / 7.3 / 5.x | Pin at setup |
| CV Runtime | ONNX Runtime Web (WASM EP) | 1.24.3 | `/wasm` subpath only |
| CV Model | Mock → YOLO11n detection → (YOLO26n Phase 2) | — | ~10MB FP32 ONNX |
| Training | Ultralytics CLI + Roboflow | latest / free | AGPL; Roboflow free = public data |
| State | Zustand | 5.x | Transient CV via subscribe; game via useReducer |
| Animation | Motion (LazyMotion + domAnimation) | 12.35 | ~15KB; whileTap for touch |
| Confetti | canvas-confetti | 1.9.4 | ~7KB; disableForReducedMotion built-in |
| Audio | Howler.js | 2.2.3 | Sprites; autoSuspend=false; MP3+M4A |
| Font | Lexend (body) + Fredoka One (numbers) | Google Fonts | RCT-backed readability |
| Styling | Tailwind CSS v4 | @tailwindcss/vite | pnpm override if peer dep issue |
| Lint/Format | Biome v2 | latest | domains.react: "all" |
| Testing | Vitest + Playwright WebKit | latest | Co-located; only Playwright has WebKit |
| Hosting | Cloudflare Pages | — | 25MB/file; CacheFirst via Workbox |
| Dev HTTPS | vite-plugin-mkcert + cloudflared | — | Camera requires HTTPS |
| SW/Caching | vite-plugin-pwa (Workbox) | latest | maximumFileSizeToCacheInBytes: 30MB |

---

*Next step: `/plan` to break into daily milestones.*
