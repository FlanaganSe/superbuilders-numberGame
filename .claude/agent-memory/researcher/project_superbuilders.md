---
name: project_superbuilders
description: TileSight project context — OSMO-style math game with computer vision on iPad Safari.
type: project
---

# TileSight Project Context

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
Multiple deep research sessions conducted 2026-03-12 to 2026-03-15 covering: UI/UX polish, CV pipeline architecture, camera capture, inference pipeline, temporal buffer tuning, spelling mode type system, build/CI, competitive analysis, and library evaluation. Key conclusions are reflected in `docs/product-overview.md` and `docs/decisions.md` (ADR-001 through ADR-010).

## Build system and deployment (2026-03-15 deep audit)

**Build entry chain:** `index.html` → `src/main.tsx` → `src/components/App.tsx`. Worker entry: `src/cv/inference.worker.ts` (referenced via `new URL()` in `onnx-recognition.ts`).

**Critical vite.config.ts facts:**
- `optimizeDeps.exclude: ["onnxruntime-web"]` — required; esbuild bundling the WASM loader fails
- `worker.format: "es"` — Web Workers as ES modules; required for Vite module worker syntax
- `viteStaticCopy` copies `ort-wasm-simd-threaded.wasm` + `.mjs` from node_modules to dist root
- `VitePWA` uses `manifest: false` — custom `public/manifest.json` takes precedence
- SW precaches `**/*.{js,css,html,wasm,mp3,m4a}` (max 30MB), ONNX model via `StaleWhileRevalidate`
- `mkcert` disabled when `VITEST=true` or `NO_HTTPS=true`

**Latent trap: `@/*` path alias.** `tsconfig.app.json` defines `"@/*": ["./src/*"]` but vite.config.ts has NO corresponding `resolve.alias`. TypeScript accepts `@/` imports but Vite would 404 at runtime. No current code uses `@/` — all imports are relative. Adding one would silently break unless `resolve.alias` is added to vite.config.ts.

**CI/CD:** GitHub Actions — 3 serial jobs: quality (typecheck+lint+test+build) → e2e (Playwright WebKit) → deploy (wrangler pages deploy, main branch only). Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

**E2E tests:** `NO_HTTPS=true pnpm preview --port 4173` — HTTPS disabled because WebKit doesn't support self-signed certs in Playwright. Mock mode used (no camera needed).

**Known open issues:**
- BCI-M1 (Medium): Sound files may not be precached for offline — `globPatterns` includes `mp3,m4a` but needs verification
- BCI-M3 (Medium): `@/*` alias not in Vite resolve.alias — latent breakage
- BCI-L1 (Low): E2E selectors use Tailwind classes not data-testid
- S5 (High): `cv/mock-recognition.ts` recognize() may not close ImageBitmap — bitmap leak in mock mode
- N3 (High): `cv/postprocessing.ts:198` — `d.classId as Digit` has no bounds check; ADR-006 classRange mitigates in production but raw check missing

## Supporting systems audit (2026-03-15)

**Feature flags** (`src/utils/feature-flags.ts`): URL-param, module-cached, pure function `parseFeatureFlags()`. Three flags: `?recognition=mock|onnx`, `?debug`, `?overlay=boxes`. Fully tested (10 cases).

**LocalStorage keys** (all try/catch wrapped, graceful defaults):
- `superbuilders-cumulative` → `{ totalStars, sessionsPlayed }` (`session.ts:35,56`)
- `superbuilders-mute` → `"true"|"false"` (`session.ts:78,86`)
- `superbuilders_calibrated` → `"true"` (`CalibrationGuide.tsx:14,22`)
Note: hyphen vs. underscore inconsistency in key names — cosmetic, not a bug.
StrictMode guard in `SessionSummary.tsx:45-47` — module-level `Set` prevents `recordSession()` double-fire.

**Test coverage:** 21 test files total. Heavy coverage on CV pipeline (preprocessing, postprocessing, interpretation, temporal buffer, pipeline regression with all 10 digits). Heavy coverage on game engine (reducer, difficulty, problem-generator, explanation-generator, spelling-words, camera-uncertainty, session/localStorage). Good coverage on state (game-store, cv-store). Thin coverage on camera hooks (use-camera.test.ts is type-only, wake lock visibilitychange not tested). No ErrorBoundary in codebase.

**Fixture system** (`src/cv/fixtures/`): `synthetic-tensor.ts` factory creates YOLO11n channel-major tensors with named pre-built fixtures (DIGIT_7, DIGIT_3, DIGIT_1_LEFT, DIGIT_3_RIGHT, LOW_CONFIDENCE, DIGIT_7_DUPLICATE). `fixture-frame-source.ts` replays images as ImageBitmap for regression without hardware. No real .jpg fixtures exist yet — convention documented in `src/cv/fixtures/README.md`.

**No analytics or telemetry** — zero third-party tracking. `console.log` gated by `?debug=true` (`use-camera.ts:133-134,170-172`).

**CI pipeline:** quality (typecheck+lint+test+build) → e2e (WebKit only) → deploy (main only, SHA-pinned wrangler action). `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` env set.

**Public assets:** Model backups: `.pre-train3` (train2), `.old`, `.bak`. Sounds in MP3+M4A: correct, encourage, tile-pop, fanfare, countdown-tick, zero-nine, prompt-make-ten/missing/left/altogether.
