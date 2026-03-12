---
name: project_superbuilders
description: Superbuilders project context — OSMO-style math game with computer vision on iPad Safari. Key confirmed tech decisions and open issues.
type: project
---

# Superbuilders Project Context

OSMO-style math game: iPad camera recognizes physical number tiles for arithmetic game, ages 5-8.

## Confirmed stack (as of 2026-03-11)
- React 19.2 + Vite 7 (NOT Vite 6 — consolidated research table is stale)
- TypeScript 5.x
- ONNX Runtime Web — WASM baseline in dedicated worker
- Tailwind CSS v4
- Biome v2
- Vitest + Playwright (WebKit)
- Cloudflare Pages hosting

## Critical open issue: ORT WebGPU on Safari
GitHub issue #26827 (re-verified open 2026-03-11, no fix in ORT 1.24.3 or any 1.22–1.24.x): WebKit 26.2 OMG JIT regression causes 400%+ CPU / 14GB+ memory explosion when ORT runs in JSEP mode. Root cause: JSEP WASM binary (`ort-wasm-simd-threaded.jsep.wasm`) triggers WebKit OMG JIT during compilation. All JSEP configs crash identically including `['webgpu','wasm']` fallback. No WebKit patch in Safari 26.2 release notes or Safari TP 238 (Feb 2026). WebKit 26.0 is unaffected; regression is in 26.2. ORT v1.20 (Emscripten 3.x) avoids it but is 18 months old. Non-JSEP WASM path (import `onnxruntime-web/wasm`) is confirmed safe. MVP posture: import `onnxruntime-web/wasm` subpath only; no JSEP/WebGPU until WebKit regression is fixed.

## React Activity component
Real, stable, shipped in React 19.2 (Oct 1 2025). Hides subtrees without unmounting. Not needed for single-screen MVP but valid for future multi-screen navigation.

## Vite 7 plugin compatibility (resolved 2026-03-11)
- vite-plugin-static-copy 3.2.0: peerDeps `^5 || ^6 || ^7` — confirmed Vite 7 compatible
- vite-plugin-mkcert: peerDeps `>=3`, tested against Vite 7.1.9 internally — confirmed compatible
- @tailwindcss/vite 4.2.1 (latest): had peer dep `^5.2.0 || ^6` in 4.1.x line. Whether 4.2.1 widened this is unconfirmed. Check with `npm info @tailwindcss/vite@latest peerDependencies` at setup; use pnpm overrides if still narrow. Not a runtime blocker — plugin API is stable across v6→v7.
- worker.rollupOptions in vite.config.ts: valid in Vite 7. Rename to worker.rolldownOptions is a Vite 8 change only.
- Node.js requirement: Vite 7 requires Node 20.19+ or 22.12+. Node 18 dropped.
- React 19.2: confirmed released Oct 1, 2025. Current patch is 19.2.4.

## CV Model Decision (researched 2026-03-11)
- YOLO11n: 2.6M params, ~10.2MB ONNX FP32, 56.1ms CPU/ONNX, output [1,14,8400] (requires NMS in JS)
- YOLO26n: 2.4M params, ~9.89MB ONNX FP32, 38.9ms CPU/ONNX, output [1,300,6] (NMS-free, one-to-one head). Released Jan 2026, stable. 31% faster on CPU.
- Recommendation: train YOLO11n first (more community examples, proven ORT Web integration), benchmark YOLO26n as Phase 2 swap if needed.
- ONNX export: opset=17, half=False, dynamic=False, batch=1
- Training augmentation: fliplr=0.0 flipud=0.0 degrees≤10 are mandatory for digit integrity
- Dataset target: ~300 annotated frames per digit class, ~200 background negatives; use Roboflow for annotation and YOLO PyTorch TXT export
- Full training research: .claude/plans/research-yolo-training.md

## Research documents
- docs/CONSOLIDATED_RESEARCH.md — older, has stale Vite 6 reference
- docs/deep-research-2026-03-11.md — more current, correctly says Vite 7
- .claude/plans/research.md — active research log; section 4 covers Vite 7 plugin compatibility
- .claude/plans/research-yolo-training.md — YOLO11n/26n training, ONNX export, dataset strategy (2026-03-11)
- .claude/plans/research-roboflow.md — Roboflow free tier, labeling, augmentation, YOLO11 export, Label Studio fallback, dataset tips (2026-03-11)
