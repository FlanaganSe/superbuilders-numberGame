---
name: project_superbuilders
description: Superbuilders project context — OSMO-style math game with computer vision on iPad Safari.
type: project
---

# Superbuilders Project Context

OSMO-style math game: iPad camera recognizes physical number tiles for arithmetic game, ages 5-8.

## Confirmed stack
React 19, Vite 7, TypeScript, ONNX Runtime Web (WASM), Zustand, Motion, Howler.js, canvas-confetti, Tailwind CSS 4, Biome, Vitest + Playwright (WebKit), Cloudflare Pages.

## Critical constraint: ORT WebGPU on Safari
GitHub issue #26827 — WebKit 26.2 OMG JIT regression causes CPU/memory explosion when ORT runs in JSEP mode. Non-JSEP WASM path (`onnxruntime-web/wasm`) is safe. MVP imports WASM subpath only; no JSEP/WebGPU until WebKit regression is fixed.

## Canonical documentation
- `docs/product-overview.md` — architecture, domain model, patterns, gotchas. Updated 2026-03-15 to reflect 36-class model, StaleWhileRevalidate, 10 ADRs, and letter expansion status.
- `docs/research.md` — verified platform facts, corrections, sources
- `docs/decisions.md` — append-only ADR log. Current through ADR-010 as of 2026-03-14.
- `docs/learning-science-research.md` — consolidated learning science research (Outhwaite, Clements/Sarama, guided play, feedback, etc.)
- `.claude/rules/stack.md` — exact versions and tooling
- Training pipeline documented in standalone `~/proj/digit-training` project (see `docs/training.md` there).

## Research sessions summary
Multiple deep research sessions conducted 2026-03-12 to 2026-03-13 covering: UI/UX polish, CV pipeline architecture, camera capture, inference pipeline, temporal buffer tuning, spelling mode type system, build/CI, competitive analysis, and library evaluation. Key conclusions are reflected in `docs/product-overview.md` and `docs/decisions.md` (ADR-001 through ADR-010).
