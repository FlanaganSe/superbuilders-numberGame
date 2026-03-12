---
name: superbuilders_project
description: OSMO-style math game project status — milestones completed and known issues
type: project
---

Stack: Vite 7 + React 19 + ONNX Runtime Web 1.24 (WASM), Zustand 5, Motion 12 (LazyMotion/domAnimation), canvas-confetti, Howler.js, Tailwind 4, Biome 2. Target: iPad Safari landscape.

All 9 milestones complete as of 2026-03-12. Full codebase review conducted 2026-03-12.

**Issues flagged in M6 review (2026-03-11) — status unknown:**
1. `NEXT_ROUND` action carries a `problem` field that `game-reducer.ts` ignores. (Note: as of full review, NEXT_ROUND no longer has a problem field — appears fixed.)
2. `SessionSummary.tsx`: `recordSession()` inside `useMemo` double-counts. (Fixed by 2026-03-12 — now uses useEffect with StrictMode guard.)
3. `FeedbackOverlay` exit animation priority ordering — no in-code safety net. (Still present.)
4. `GameScreen` timeout effect deps missing `attemptNumber`. (Still present — see issue #5 below.)
5. `key`-based remount of `m.div` for pop animation. (Still present.)
6. Zero-star session shows bare `0`. (Unknown.)
7. Manual `useReducedMotion` branches redundant with `MotionConfig`. (Still present.)

**Critical issues flagged in full codebase review (2026-03-12):**

1. **Worker `onerror` not handled** (`src/cv/onnx-recognition.ts:83–95`) — unhandled worker exceptions leave `pendingInit` unsettled forever; user sees infinite spinner with no fallback.
2. **`pendingInfer` never rejected on dispose** (`onnx-recognition.ts:110–121`) — Promise leaks when component unmounts mid-inference; closure kept alive, worse in StrictMode.
3. **`createImageBitmap` not wrapped in try/catch** (`src/camera/frame-capture.ts:99`) — if it rejects (GPU context loss, canvas resize race on Safari), `scheduleNext` never called, frame capture stops permanently with no recovery.
4. **Timeout does not push to `state.rounds`** (`src/engine/game-reducer.ts:119–136`) — `handleEndSession` totalStars/rounds count excludes timed-out rounds; `MAX_PROBLEMS` check allows more than 15 total attempts.
5. **`CountdownTimer` interval re-registers on every tick** (`src/components/CountdownTimer.tsx:26–48`) — `difficulty` in deps triggers re-render on each `COUNTDOWN_TICK`; can cause skipped or doubled ticks.

**Medium issues flagged in full codebase review (2026-03-12):**

6. **Post-`await` active check missing in `onVideoFrame`** (`frame-capture.ts:99–122`) — listeners notified after `stop()` is called; minor but can trigger recognize() on disposed service.
7. **`requestCamera()` not awaited in `handleStart`** (`TapToStart.tsx:21–30`) — game enters countdown before camera succeeds; camera failure after START_SESSION leaves game running with no video.
8. **`ctx.resume()` in visibilitychange handler unhandled rejection** (`sound-manager.ts:105–108`) — can surface in browser console on iOS.
9. **`ANSWER_COMMITTED` double-fire window** (`temporal-buffer.ts`, `game-store.ts`) — narrow but possible if two frames pass motion gate in rapid succession before Zustand flush.
10. **Unbounded do/while in problem generator** (`problem-generator.ts:41–45, 63–66`) — no iteration cap; future constraint changes could spin indefinitely on main thread.
