# Architecture Decision Records

Append-only log. Read during planning, not loaded every session.

---

## ADR-001: React + Vite over Next.js

**Date:** 2026-03-11
**Status:** Accepted

**Context:** This is a 100% client-side camera + game app with no server-side needs. Next.js adds SSR, routing, and server complexity that provide zero value here.

**Decision:** React 19 + Vite 7 SPA. No SSR, no server components, no API routes.

**Consequences:** No SEO (not needed for a game), no server-side data fetching (all local), simpler deployment (static files on Cloudflare Pages).

---

## ADR-002: ONNX Runtime Web over TensorFlow.js

**Date:** 2026-03-11
**Status:** Accepted

**Context:** PRD mentioned TensorFlow.js or OpenCV.js as illustrative examples. Research found that TF.js has documented Worker issues on iOS (tfjs#7540), and ORT Web has a cleaner WASM-only path that avoids Safari's JSEP/WebGPU JIT crash (ORT#26827). ORT is also framework-agnostic — any ONNX model can be loaded.

**Decision:** ONNX Runtime Web 1.24.3 with WASM execution provider, running in a dedicated Web Worker. Import via `onnxruntime-web/wasm` subpath only.

**Consequences:** Training framework doesn't matter as long as it exports ONNX. Model swap is trivial. Safari stability is proven on the WASM path.

---

## ADR-003: Zustand over Redux

**Date:** 2026-03-11
**Status:** Accepted

**Context:** Need state management that supports both React component subscriptions and direct dispatch from outside React (CV pipeline dispatches game actions via `getState().dispatch()`). Redux is heavyweight for this use case.

**Decision:** Zustand 5.x. Game state machine is a pure reducer function hosted inside Zustand (not `useReducer`). CV transient state uses `subscribe` to bypass React renders.

**Consequences:** Minimal API surface, no provider wrappers, direct state access from any context (React or imperative).

---

## ADR-004: Biome over ESLint + Prettier

**Date:** 2026-03-11
**Status:** Accepted

**Context:** Biome v2 handles both linting and formatting in a single tool, is ~20x faster than ESLint+Prettier, and has first-class React support via `domains.react: "all"`.

**Decision:** Biome 2.x as the sole linter and formatter. No ESLint, no Prettier.

**Consequences:** Single config file (`biome.json`), faster CI, fewer dev dependencies. Trade-off: smaller plugin ecosystem than ESLint, but the built-in React rules cover our needs.

---

## ADR-005: AnimatePresence Phase Transitions ≤200ms

**Date:** 2026-03-12
**Status:** Accepted

**Context:** Phase transitions were instant DOM swaps. Adding `AnimatePresence mode="wait"` keeps the exiting component mounted during its exit animation. CountdownTimer owns a `setInterval` that reads phase from the store — if the exit window is too long, it could fire multiple ticks against a stale phase. The timer self-clears at `CountdownTimer.tsx:29` and the reducer guards at `game-reducer.ts:73`, making short exits safe.

**Decision:** 150ms opacity-only fade via `AnimatePresence mode="wait"` + `m.div`. No springs, no scale, no y-offset on exit. Duration must not exceed 200ms.

**Consequences:** Phase changes feel smooth instead of jarring. The 200ms ceiling is a hard constraint — any future change to exit animation duration or type (e.g., springs) must re-evaluate the CountdownTimer timing interaction.

---

## ADR-006: Class-Range Filtering Inside Argmax (Not Post-Filter)

**Date:** 2026-03-13
**Status:** Accepted

**Context:** The 36-class ONNX model outputs digit (0-9) and letter (10-35) classes. Class-agnostic NMS runs after argmax but before any post-filter. A high-confidence letter detection can suppress a valid digit detection via NMS — post-filtering the letter afterward leaves a gap where the digit was already removed. This was the root cause of "bouncing" digit detections in math mode.

**Decision:** Add a `classRange` parameter to `PostProcessParams` that constrains the argmax loop to only iterate classes within the specified range. Math mode passes `{min: 0, max: 9}`; spelling mode passes `{min: 10, max: 35}`. The worker sends the range based on the active game kind.

**Consequences:** Letter channels are never considered during math mode (and vice versa), so NMS only competes valid detections against each other. The postprocessing function remains a pure function parameterized by range — no mode coupling.

---

## ADR-007: Parallel Type Path for Spelling Mode

**Date:** 2026-03-13
**Status:** Accepted

**Context:** The math game's `Problem` type has `answer: number`, `left: number`, `right: number`, `operator: Operator` — all arithmetic-specific. A discriminated union refactor (Option B) would touch 17 test files and ~2600 lines of existing tests. The spelling feature scope is small (3-word sessions).

**Decision:** Keep `Problem` and `GameMode` unchanged. Add `SpellingProblem` as a separate type. Store holds `gameKind: "math" | "spelling"` discriminant. The game reducer is parameterized with `maxProblems` and `modeName` to handle both modes. The pipeline branches on `gameKind` in the store.

**Consequences:** Zero regression risk for math mode. Two parallel type paths exist — acceptable for v1, but a discriminated union refactor is the correct long-term shape if more game modes are added.

---

## ADR-008: StaleWhileRevalidate for ONNX Model Caching

**Date:** 2026-03-13
**Status:** Accepted

**Context:** The service worker used `CacheFirst` with 1-year expiry for ONNX model files. When the model was updated from 10-class to 36-class, devices that had cached the old model would never fetch the new one — making deployment nondeterministic across devices.

**Decision:** Change the ONNX model caching strategy from `CacheFirst` to `StaleWhileRevalidate`. The cached model is served immediately (no latency penalty), but a background fetch ensures the new version is available on the next load.

**Consequences:** Model updates propagate within one session instead of being permanently cached. Trade-off: a background fetch occurs on every load, which may be unwanted on metered connections. Acceptable for the model's ~5MB size and the critical need for update propagation.

---

## ADR-009: Engine-Layer Pure Functions for Instructional Feedback

**Date:** 2026-03-14
**Status:** Accepted

**Context:** Outhwaite et al. (2023) found that explanatory + motivational + levelling feedback is a necessary condition for learning gains in early math apps. The app previously had only motivational feedback ("Great job!"). Adding research-backed instructional feedback (worked examples, strategy hints, system-attribution for camera issues) required a clean architecture that separates feedback generation from rendering. Sweller's expertise reversal principle requires difficulty-gating: detailed explanations help novices but hurt experts.

**Decision:** All instructional feedback text is generated by pure functions in `src/engine/` (`explanation-generator.ts`, `camera-uncertainty.ts`). These functions take `Problem`, `difficulty`, and context (attempt number, timeout count) and return display strings. Feedback fades at difficulty 4+ (expertise reversal). Camera uncertainty uses system-attribution ("I lost your tile") per math anxiety research. Six distinct feedback paths: correct, correct-after-retry, wrong-tile, timeout-first, timeout-repeated, camera-uncertainty.

**Consequences:** Feedback logic is fully testable without React. New feedback paths (e.g., for learning trajectories) follow the same pattern: pure function in engine, consumed by `FeedbackOverlay.tsx`. The difficulty gate threshold (4) is a single constant — adjustable if user testing shows a different sweet spot.

---

## ADR-010: Wrong-Answer Detection Separate from Temporal Buffer

**Date:** 2026-03-14
**Status:** Accepted

**Context:** The temporal buffer (`temporal-buffer.ts`) is a proven 3-frame stability filter for CORRECT answer confirmation. Wrong-answer tracking has fundamentally different requirements: it needs to show "You made 8. We need 7" feedback when a child places an incorrect tile. The timing constraints differ (wrong answers need a >3 second guard to avoid false triggers during initial tile placement), and wrong-answer tracking serves a feedback purpose, not a game-state-transition purpose.

**Decision:** Wrong-answer detection is a separate module-level tracker in `game-store.ts`, not a modification to the temporal buffer. It tracks consecutive frames of the same non-answer value (2+ frames, >3s into scanning) and surfaces `wrongTileSeen: number | null` in the store. The temporal buffer's code and tests remain completely unchanged.

**Consequences:** The temporal buffer stays simple and well-tested. Wrong-answer sensitivity can be tuned independently (frame count threshold, time guard) without risk to the critical correct-answer path. Trade-off: two separate detection mechanisms to understand — but they serve clearly different purposes and have different consumers.

---

## ADR-011: WCAG 2.1 Contrast Compliance

**Date:** 2026-03-15
**Status:** Accepted

**Context:** Audited all text-on-background combinations against the cream background (#fef9ef, relative luminance 0.95). Since all TileSight text uses 48pt+ Fredoka One or 24pt+ Lexend, the WCAG 2.1 SC 1.4.3 large text threshold of 3:1 applies. Five color classes failed:

| Color class | Hex | Ratio on cream | Passes 3:1? |
|---|---|---|---|
| text-primary-300 | #93c5fd | 1.72:1 | No |
| text-primary-400/80 | ~blended | 2.01:1 | No |
| text-slate-400 | #94a3b8 | 2.44:1 | No |
| text-gold-500 | #eab308 | 1.83:1 | No |
| text-white/70 | — | N/A (camera bg) | Marginal |

**Decision:** Darkened each failing class to the next shade that meets 3:1:

| Original | Replacement | New ratio | Used for |
|---|---|---|---|
| text-primary-300 | text-primary-500 (#3b82f6) | 3.75:1 | "?" placeholders |
| text-primary-400/80 | text-primary-500 | 3.75:1 | Hint zone text |
| text-slate-400 | text-slate-500 (#64748b) | 4.56:1 | Secondary labels, icons |
| text-gold-500 | text-amber-600 (#d97706) | 3.05:1 | Star ratings |
| text-white/70 | text-white | — | Mode name (camera backdrop) |

The cream background (#fef9ef) was not changed — it is a deliberate design choice (off-white for reading comprehension, Rello & Baeza-Yates 2012).

**Consequences:** Placeholder "?" marks are slightly more visible (blue-500 vs blue-300). Stars shift from bright gold to warm amber — still recognizably golden. Mode name in the header is brighter white; contrast relies on the camera video backdrop in production. All combinations now meet WCAG 2.1 SC 1.4.3 for large text.
