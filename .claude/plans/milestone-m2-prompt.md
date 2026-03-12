# Milestone M2: Game Loop with Mock Recognition

## Context

Read these files before starting:
- `.claude/plans/plan.md` — full plan (you are executing M2)
- `.claude/plans/prd.md` — product requirements (§3.1–3.13 for game UX, §3.25–3.28 for architecture)
- `.claude/plans/research-auto-check.md` — auto-check algorithm, digit-count gate, temporal buffer, grouping logic
- `.claude/plans/research-game-ux.md` — Motion library setup, spring configs, star/rewards system
- `src/types/` — read ALL type files from M1. You are implementing these interfaces.
- `CLAUDE.md` — project rules and conventions

Verify M1 is complete first: run `pnpm typecheck && pnpm lint && pnpm build`. If anything fails, fix it before proceeding.

## Goal

Make the full game playable via keyboard/numpad input with no camera or CV. A user should be able to: tap start → see a math problem → type a digit (or tap numpad on iPad) → get correct/incorrect feedback → see difficulty adapt → finish a session with stars. All game logic is unit-tested.

## What to build

**Game engine (`src/engine/`):**

1. `game-reducer.ts` — Pure reducer function (NOT a React hook). State machine: `idle → countdown → scanning → success/timeout → session-end`. The Zustand store wraps this: `dispatch: (action) => set(state => gameReducer(state, action))`. This is the single source of truth — the CV pipeline will later call `gameStore.getState().dispatch()` directly from outside React.
2. `game-reducer.test.ts` — Test every valid transition. Test that invalid transitions are rejected (e.g., `scanning` from `idle` without going through `countdown`).
3. `problem-generator.ts` — Implement `AdditionMode` and `SubtractionMode` satisfying the `GameMode` interface from M1. Addition: operands that sum to 0–19. Subtraction: no negative results. Answers appropriate for ages 5–8 by difficulty level.
4. `problem-generator.test.ts` — Answer ranges by difficulty, no impossible problems, no negative subtraction results.
5. `difficulty.ts` — +1 level after 3 consecutive correct, -1 after 2 wrong at same level. Never below level 1.
6. `difficulty.test.ts` — Progression, regression, floor behavior.
7. `session.ts` — Stars per problem: 3 (first attempt), 2 (second), 1 (third+), never 0. Session ends after configurable problem count (~15–20). Cumulative stars persisted to localStorage. Handle corrupt/missing localStorage gracefully (reset to defaults).
8. `session.test.ts` — Star calculation, save/load round-trip, corrupt data recovery.

**CV pipeline stubs (`src/cv/`):**

9. `recognition-service.ts` — Factory function that accepts resolved feature flags (from `feature-flags.ts`), returns the appropriate `RecognitionService` implementation. Currently only returns `MockRecognitionService`.
10. `mock-recognition.ts` — Implements `RecognitionService`. Listens for keyboard digit presses (0–9) AND renders an on-screen numpad for iPad (no physical keyboard on target device). Emits `DetectedDigit` objects matching the interface from M1.
11. `mock-recognition.test.ts` — Output format matches `DetectedDigit` type.
12. `interpretation.ts` — Implements `InterpretationLayer` interface. Takes `DetectedDigit[]`, groups nearby boxes into multi-digit numbers via left-to-right sort + vertical alignment check (`|center_y_A - center_y_B| < 0.5 * avg_height`) + proximity gate (`gap < 1.0 * avg_width`). Digit-count gate: single-digit answers match only isolated tiles, two-digit answers (10–19) match only adjacent pairs. Returns matched answer or null. See `research-auto-check.md §12` for the full algorithm.
13. `interpretation.test.ts` — Single-digit match, two-digit grouping, stray tile filtering, vertical misalignment rejection, empty input.
14. `temporal-buffer.ts` — 3-frame consecutive counter. If same answer matches 3 frames in a row → emit `ANSWER_COMMITTED`. On first match frame → emit `TILE_SEEN` (instant feedback). Mismatch resets counter to 0. See `research-auto-check.md §6–7`.
15. `temporal-buffer.test.ts` — Counter fills to 3, resets on mismatch, handles interleaved answers.

**Store (`src/store/`):**

16. `game-store.ts` — Zustand store wrapping `gameReducer`. Exposes `dispatch(action)`, selectors for phase/problem/stars/mute. Mute preference persisted to localStorage.

**Skeleton UI (`src/components/`):**

17. `App.tsx` — Root component. Wrap with `LazyMotion` + `MotionConfig reducedMotion="user"` (import `domAnimation` feature bundle from `motion`). Route based on game phase.
18. `TapToStart.tsx` — Full-screen "Let's Play!" button. On tap: dispatches `START` action to game store. (Camera + AudioContext unlock will be added in M3/M7.)
19. `GameScreen.tsx` — Main game layout. Shows problem + feedback area + mock input.
20. `ProblemDisplay.tsx` — Renders current problem (e.g., "3 + 4 = ?"). Uses Fredoka One font at ≥48pt for numbers.
21. `CountdownTimer.tsx` — Visual countdown between rounds. Duration configurable (default 5s, per PRD §8.8).
22. `SessionSummary.tsx` — End-of-session screen. Shows stars earned. "Play Again" button.

UI should be functional, not polished — visual design is M6. Use Lexend for body text, Fredoka One for numbers. Landscape-oriented layout.

## Key design decisions already made

- **Zustand wraps the reducer, not `useReducer` hook** — because the CV pipeline (M5) will dispatch from outside React via `gameStore.getState().dispatch()`. The reducer function is still pure and tested independently.
- **InterpretationLayer runs on main thread** — ~5μs/frame is trivial. Direct game state access avoids bidirectional worker messaging. See plan.md M2 design note.
- **No camera, no audio, no animations yet** — those are M3, M7, M6 respectively. Keep the UI minimal.

## Verification (all must pass)

```bash
pnpm typecheck    # All types compile
pnpm test         # ALL unit tests pass: game-reducer, problem-generator,
                  #   difficulty, interpretation, temporal-buffer, session,
                  #   mock-recognition, feature-flags
pnpm lint         # Biome passes
pnpm build        # Production build succeeds
```

Then manually verify:
- Open `pnpm dev` in browser with `?recognition=mock`
- Play through a full game loop: tap start → solve problems → see session summary
- Verify difficulty increases after 3 correct, decreases after 2 wrong
- Verify stars are calculated and shown
- Verify on-screen numpad works (for iPad compatibility)

## Guidelines

- Co-located tests: `foo.ts` → `foo.test.ts`
- Named exports, explicit return types on public functions
- All game feedback must be child-friendly — no negative/punitive language (immutable rule)
- Don't build camera, audio, animations, or anything from M3+
- If M1's type interfaces need adjustment to fit the implementation, update them and note what changed
- At the end, list any concerns or risks you noticed
