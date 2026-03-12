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
