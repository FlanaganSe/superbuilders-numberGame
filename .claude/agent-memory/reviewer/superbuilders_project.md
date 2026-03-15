---
name: superbuilders_project
description: OSMO-style math game project status — milestones completed and known issues
type: project
---

Stack: Vite 7 + React 19 + ONNX Runtime Web 1.24 (WASM), Zustand 5, Motion 12 (LazyMotion/domAnimation), canvas-confetti, Howler.js, Tailwind 4, Biome 2. Target: iPad Safari landscape.

All 9 milestones complete as of 2026-03-12. Full codebase review conducted 2026-03-12.

**Issues from M6 review (2026-03-11) — updated 2026-03-12:**
1. ~~`NEXT_ROUND` problem field~~ — Fixed.
2. ~~`SessionSummary.tsx` double-counts~~ — Fixed (useEffect with StrictMode guard).
3. `FeedbackOverlay` exit animation priority — Open.
4. `GameScreen` timeout effect deps missing `attemptNumber` — Open (see critical issue #5).
5. `key`-based remount of `m.div` for pop animation — Open.
6. Zero-star session shows bare `0` — Unknown.
7. Manual `useReducedMotion` branches redundant with `MotionConfig` — Open.

**Critical issues flagged in full codebase review (2026-03-12):**

1. **Worker `onerror` not handled** (`src/cv/onnx-recognition.ts:83–95`) — unhandled worker exceptions leave `pendingInit` unsettled forever; user sees infinite spinner with no fallback.
2. **`pendingInfer` never rejected on dispose** (`onnx-recognition.ts:110–121`) — Promise leaks when component unmounts mid-inference; closure kept alive, worse in StrictMode.
3. ~~**`createImageBitmap` not wrapped in try/catch**~~ — Fixed. try/catch now exists at `frame-capture.ts:84`.
4. **Timeout does not push to `state.rounds`** (`src/engine/game-reducer.ts:119–136`) — `handleEndSession` totalStars/rounds count excludes timed-out rounds; `MAX_PROBLEMS` check allows more than 15 total attempts.
5. **`CountdownTimer` interval re-registers on every tick** (`src/components/CountdownTimer.tsx:26–48`) — `difficulty` in deps triggers re-render on each `COUNTDOWN_TICK`; can cause skipped or doubled ticks.

**Medium issues flagged in full codebase review (2026-03-12):**

6. **Post-`await` active check missing in `onVideoFrame`** (`frame-capture.ts:99–122`) — listeners notified after `stop()` is called; minor but can trigger recognize() on disposed service.
7. **`requestCamera()` not awaited in `handleStart`** (`TapToStart.tsx:21–30`) — game enters countdown before camera succeeds; camera failure after START_SESSION leaves game running with no video. Still open after M1/M2.
8. **`ctx.resume()` in visibilitychange handler unhandled rejection** (`sound-manager.ts:105–108`) — can surface in browser console on iOS.
9. **`ANSWER_COMMITTED` double-fire window** (`temporal-buffer.ts`, `game-store.ts`) — narrow but possible if two frames pass motion gate in rapid succession before Zustand flush.
10. **Unbounded do/while in problem generator** (`problem-generator.ts:41–45, 63–66`) — no iteration cap; future constraint changes could spin indefinitely on main thread.

**Issues flagged in M1/M2 review (2026-03-12):**

11. **Old `WakeLockSentinel` leaked on rapid re-acquire** (`use-wake-lock.ts:25–37`) — if `acquire()` is called twice before the first system release, the first sentinel is overwritten in `sentinelRef` and never released. Re-acquire path has no test coverage.
12. **`delay: 0.2` leaks into `whileTap` on the play button** (`TapToStart.tsx:59`) — the shared `transition` prop applies the 0.2 s delay to the tap scale-down, making it feel broken on device. Fix: move `delay` off the shared `GENTLE_SPRING` spread or add per-gesture `transition` override on `whileTap`.

**Issues flagged in M3 review (2026-03-13):**

13. **`droppedFrames` never resets between sessions** (`cv-store.ts`) — `useCvStore.reset()` is called on service dispose (unmount), but if the same session continues and the backend is never torn down, the counter accumulates across games. The game store is reset on `START_SESSION` but `droppedFrames` is not. Cosmetic for now.
14. **`numClasses` optional in `RecognitionResult` but required in `WorkerToMain`** (`types/cv.ts:64`) — the type mismatch means non-ONNX paths (mock backend, error fallback) produce a `RecognitionResult` with `numClasses: undefined`, which is correctly handled by the `?.` conditional in `updateDetections`, but the asymmetry is silent. Low risk.
15. **Spelling timeout test uses math `SAMPLE_PROBLEM`** (`game-reducer.test.ts:148`) — the spelling timeout test passes a `Problem` (math shape) to `COUNTDOWN_COMPLETE` in a Spelling session. This works because the reducer doesn't validate problem type, but the test doesn't actually verify the new word is different from the timed-out one, leaving the "new word" intent untested.
