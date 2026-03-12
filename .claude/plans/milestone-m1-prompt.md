# Milestone M1: Project Scaffolding

## Context

Read these files before starting:
- `.claude/plans/plan.md` — full implementation plan (you are executing M1)
- `.claude/plans/prd.md` — product requirements
- `.claude/plans/research.md` — research index (skim for stack decisions)
- `.claude/plans/research-worker-architecture.md` — Vite + ORT config details (§1 is critical for vite.config.ts)
- `CLAUDE.md` — project rules and conventions

## Goal

Scaffold the project: Vite 7 + React 19 + TypeScript + Tailwind v4 + Biome v2. Define all core type interfaces. Produce a building, linting, typechecking, dev-serving project with zero implementation logic.

## What to build

**Project setup:**
1. Init with `pnpm create vite` (React + TypeScript template), then replace/configure as needed
2. Install all production and dev dependencies from plan.md Appendix A (pinned versions)
3. Configure `vite.config.ts` — this is the highest-risk config file. Research-verified settings:
   - `optimizeDeps.exclude: ['onnxruntime-web']`
   - `resolve.conditions: ['browser']`
   - `assetsInclude: ['**/*.onnx']`
   - `vite-plugin-static-copy` to copy `ort-wasm-simd-threaded.wasm` from `node_modules/onnxruntime-web/dist/` to output
   - `worker: { format: 'es' }`
   - `@tailwindcss/vite` plugin
   - `vite-plugin-mkcert` for local HTTPS
4. Configure `biome.json` with React domain rules
5. Configure `tsconfig.json` (strict mode, path aliases if useful)
6. Set up `index.html` with viewport meta, font preconnects for Google Fonts (Lexend + Fredoka One)
7. Create `src/index.css` with Tailwind v4 directives and font imports
8. Create `src/main.tsx` (minimal: createRoot + StrictMode + placeholder App)
9. Create `public/models/.gitkeep` and `public/sounds/.gitkeep`
10. Create `.env.example`

**Type definitions (the core of M1):**

Create `src/types/game.ts`, `src/types/cv.ts`, `src/types/worker-protocol.ts`.

The PRD (§3.25) requires six explicit seam interfaces. All six must exist in `src/types/cv.ts` as explicit interfaces — they can start thin but must be real interfaces:
- `FrameSource` — camera stream, fixture replay, prerecorded playback
- `PreprocessingStrategy` — normalize, resize, contrast
- `RecognitionService` — model init, inference, dispose
- `InterpretationLayer` — raw detections → answer candidates
- `GameEngine` — problem generation, round lifecycle, auto-check
- `VocabularyRegistry` — symbol labels, ambiguity policy (digits today, expandable tomorrow)

Also in cv.ts: `DetectedDigit`, `BoundingBox`, `RecognitionResult`.

In game.ts: `GamePhase` (discriminated union: idle/countdown/scanning/success/timeout/session-end), `GameAction` (discriminated union for all transitions), `Problem`, `GameMode` interface, `DifficultyLevel`, `SessionData`.

In worker-protocol.ts: `MainToWorker` and `WorkerToMain` as discriminated unions with the `satisfies` operator pattern.

**Feature flags:**

Create `src/utils/feature-flags.ts` + `feature-flags.test.ts`. Parse URL params: `?recognition=mock&debug=true&overlay=boxes`. Return a typed config object.

**Documentation:**

Create `docs/decisions.md` — append-only ADR log. Add initial entries for: React+Vite (not Next.js), ORT Web (not TF.js), Zustand (not Redux), Biome (not ESLint+Prettier).

Update `CLAUDE.md` and `.claude/rules/stack.md` — replace TBD entries with the pinned versions from Appendix A.

## Peer dep note

If `@tailwindcss/vite` has a peer dep that doesn't include Vite 7, add to package.json:
```json
"pnpm": { "overrides": { "@tailwindcss/vite>vite": "$vite" } }
```

## Verification (all must pass)

```bash
pnpm dev          # Serves with HTTPS (mkcert)
pnpm typecheck    # All types compile
pnpm test         # Runs (feature-flags test should pass)
pnpm lint         # Biome passes
pnpm build        # Production build succeeds
```

## Manual steps I need to handle in parallel

Flag these to me at the end — they're not your responsibility but I need to start them today:
- Create Roboflow account + Object Detection project "digit-tiles" (10 classes: 0-9)
- `pip install ultralytics albumentations` on a machine with GPU/MPS
- `brew install ffmpeg`
- Print physical tiles (0-9 × 2 copies, 3×4 inches, matte laminate)
- Source 5 audio assets (correct chime, encouragement, tile pop, fanfare, countdown tick)

## Guidelines

- Named exports, explicit return types on public functions, co-located tests
- Prefer immutable patterns and discriminated unions
- Don't implement game logic, CV logic, or UI components beyond the minimal main.tsx — that's M2+
- If a dependency version doesn't exist or has a breaking conflict, resolve it and note what you did
- At the end, list any concerns or risks you noticed during setup
