# UI/UX Polish — Implementation Plan

**Date:** 2026-03-12
**Source:** `.claude/plans/ui-polish-final.md` (verified research, no assumptions)

---

## Summary

Transform the Superbuilders demo from "functional prototype" to "polished, delightful children's game" through 12 targeted changes across 5 milestones. All changes use existing dependencies (zero new packages), are compositor-safe during scanning phase, preserve E2E test selectors, and respect `prefers-reduced-motion`. The plan is ordered so each milestone is independently shippable and manually testable — earlier milestones fix real bugs and deliver highest visual impact; later milestones add ambient atmosphere.

---

## Files to Change

| File | Changes | Why |
|---|---|---|
| `src/components/TapToStart.tsx` | Add wake lock acquisition in `handleStart()`, add Motion entrance animations on title + button, add "Coming Soon" game type buttons | Wake lock fixes iPad sleep bug; entry animations + coming-soon buttons make home screen feel like a platform |
| `src/components/FeedbackOverlay.tsx` | Replace generic confetti with emoji shapes (⭐✨), thread `answer` prop to `TileSeenFeedback`, increase tile-seen animation scale, update `CORRECT_SPRING` to bouncier values | Emoji confetti is more delightful; showing "I see 7!" builds trust; bouncier springs suit ages 5-8 |
| `src/components/SessionSummary.tsx` | Replace generic confetti with emoji shapes, update star stagger spring to bouncier values | Consistent confetti upgrade across both celebration points |
| `src/components/CountdownTimer.tsx` | Map `secondsLeft` to color classes (blue→teal→amber→orange→red) | Builds urgency visually as countdown progresses |
| `src/components/GameScreen.tsx` | Strengthen answer zone border from `border-primary-300/50` to `border-primary-400`, add `ProgressPips` component | Answer zone was nearly invisible; progress indicator shows "problem N of 15" |
| `src/components/App.tsx` | Wrap PhaseRouter content in `AnimatePresence mode="wait"` + `m.div` with 150ms opacity fade | Smooth cross-fade between game phases instead of hard DOM swap |
| `src/audio/sound-manager.ts` | Add `howl.rate(0.9 + Math.random() * 0.2, id)` after `correctChime` play | Prevents audio repetition fatigue over 15 rounds |
| `src/index.css` | Add `@property --bg-x`, animated gradient on `html`, reduced-motion override | Breathing background on idle/session-end screens (camera covers viewport during gameplay) |
| `vite.config.ts` | Add `mp3,m4a` to PWA `globPatterns` | Existing sounds not in service worker precache — breaks offline after cache eviction |

## Files to Create

| File | Purpose |
|---|---|
| `src/hooks/use-wake-lock.ts` | `useWakeLock()` hook — acquires Screen Wake Lock API on mount, re-acquires on `visibilitychange`. Returns `{ supported: boolean, active: boolean }`. ~25 lines. |
| `src/components/ProgressPips.tsx` | Row of dots showing round N of total. Props: `current: number`, `total: number`. ~30 lines. Renders in GameScreen above ProblemDisplay. |

---

## Milestone Outline

### Phase 1: Foundation & Home Screen

- [x] **M1: Wake Lock + PWA Cache Fix** — Fix iPad sleep bug and offline sound caching
  - [x] Created `src/hooks/use-wake-lock.ts` + `use-wake-lock.test.ts` (4 tests)
  - [x] Called `acquire()` in `TapToStart.tsx` `handleStart()` after `unlockAudio()`, before `dispatch()`
  - [x] Added `mp3,m4a` to `globPatterns` in `vite.config.ts:34` — precache now includes sound files
  - **Verify:** `pnpm typecheck && pnpm test && pnpm build` all pass. Manually: open in Safari, start a session, confirm wake lock acquired in DevTools → Application → Service Workers. Confirm sound files appear in Cache Storage.
  - Commit: "feat: add wake lock hook and fix PWA sound caching"

- [x] **M2: Home Screen Polish** — Make TapToStart look like a platform, not a prototype
  - [x] Added Motion entrance animations: `m.h1` with gentle spring, `m.button` with delay: 0.2, Coming Soon with delay: 0.4
  - [x] Added "Coming Soon" disabled buttons below "Let's Play!" (Spelling 🔤, Image Quiz 🖼️)
  - **Verify:** `pnpm typecheck && pnpm test && pnpm lint && pnpm build` — all pass (204 tests, 0 lint issues). E2E selector `getByRole("button", { name: "Let's Play!" })` preserved.

### Phase 2: Reward Feedback

- [x] **M3: Confetti + Celebration Upgrade** — Emoji confetti, bouncier springs, sound variation
  - [x] Step 1 — Emoji confetti in `FeedbackOverlay.tsx`: module-level `CONFETTI_SCALAR`, `EMOJI_STAR`, `EMOJI_SPARKLE` via `shapeFromText`; updated `fireCorrectConfetti()` with `shapes`, `scalar`, `flat: true`, `origin: { y: 0.7 }`
  - [x] Step 2 — Bouncier `CORRECT_SPRING` in `FeedbackOverlay.tsx`: stiffness 300→400, damping 15→10
  - [x] Step 3 — Bouncier star stagger in `SessionSummary.tsx`: damping 15→8 (jelly-like plop)
  - [x] Step 4 — Pitch variation in `sound-manager.ts`: `howl.rate(0.9 + Math.random() * 0.2, id)` for correctChime only
  - [x] SessionSummary confetti intentionally NOT changed — per user preference, session-end keeps colored rectangles for variety
  - **Verify:** `pnpm typecheck && pnpm test && pnpm lint && pnpm build` — all pass (204 tests, 0 lint issues)

- [x] **M4: Tile-Seen Feedback** — Show detected answer value, stronger animation
  - [x] Step 1 — Threaded `answer` prop to `TileSeenFeedback` in `FeedbackOverlay.tsx:82-85`
  - [x] Step 2 — Updated `TileSeenFeedback` signature to `{ readonly answer: number }`, render `I see {answer}!`
  - [x] Step 3 — Increased animation scale from `[0.9, 1.05, 1]` → `[0.8, 1.15, 1]`
  - [x] Step 4 — Changed color from `text-primary-400` → `text-success-500` (green = positive reinforcement)
  - **Verify:** `pnpm typecheck && pnpm test && pnpm lint && pnpm build` — all pass
  Commit: "feat: emoji confetti, bouncier springs, pitch variation, and tile-seen feedback"

### Phase 3: Gameplay UI

- [x] **M5: Countdown + Answer Zone + Progress** — Color urgency, visible answer zone, progress indicator
  - [x] `CountdownTimer.tsx`: Added `COUNTDOWN_COLORS` record mapping `5→text-primary-500`, `4→text-teal-500`, `3→text-amber-500`, `2→text-orange-500`, `1→text-red-500`. Applied to `m.span` className via dynamic lookup with fallback.
  - [x] `GameScreen.tsx:176`: Changed `border-primary-300/50` → `border-primary-400`. Removed `/50` opacity.
  - [x] Created `src/components/ProgressPips.tsx`: props `{ current: number; total: number }`. Row of `total` small dots with `bg-black/20` backdrop for camera contrast, first `current` filled (`bg-primary-500`), rest empty (`bg-primary-200`).
  - [x] Added `<ProgressPips>` in `GameScreen.tsx` above the `m.div` wrapping ProblemDisplay. Fine-grained selector `useGameStore((s) => s.gameState.rounds.length)`.
  - **Verified:** `pnpm typecheck && pnpm test && pnpm lint && pnpm build` — all pass (204 tests, 0 lint issues). E2E: `pnpm exec playwright test` — 1 passed. Tailwind v4 default palette colors (teal-500, amber-500, orange-500, red-500) compiled correctly — no theme additions needed.

### Phase 4: Atmosphere

- [x] **M6: Background + Phase Transitions** — Living background, smooth cross-fades
  - [x] `src/index.css`: Added `@property --bg-x` registration (Safari 15.4+), animated gradient on `html` with two opposing radial gradients (pale yellow + pale pink) drifting over cream base on 10s ease-in-out infinite alternate. Added `@keyframes bg-drift`. Added `prefers-reduced-motion: reduce` override for `html` alongside existing `.animate-pulse-soft` rule.
  - [x] `App.tsx`: Added `AnimatePresence` import from `motion/react` and `import * as m from "motion/react-m"`. Wrapped `showLoader` ternary in `<AnimatePresence mode="wait">` with both branches as `m.div` — loader keyed `"loader"`, PhaseRouter keyed `phase.phase`. 150ms opacity-only fade, no springs, no scale.
  - **Verified:** `pnpm typecheck && pnpm test && pnpm lint && pnpm build` — all pass (204 tests, 0 lint issues). E2E: `pnpm exec playwright test` — 1 passed. Camera overlay, CalibrationGuide, DebugHUD, MuteButton all remain outside AnimatePresence.

---

## Manual Setup Tasks

### Before M1: PNG App Icons (optional, 5 min)
iOS ignores SVG for home screen icons. If you want proper PWA icon on iPad:
```bash
# Requires ImageMagick. Install with: brew install imagemagick
convert -background none public/icons/icon-192.svg public/icons/icon-192.png
convert -background none public/icons/icon-512.svg public/icons/icon-512.png
```
Then update `public/manifest.json` icons array to include PNG entries alongside SVG.
**Depends on:** Nothing. Nice-to-have before any milestone.

### After M6: Physical iPad Playtest (30 min)
Play 3 complete sessions on real iPad hardware. Check:
- [ ] Wake lock: iPad stays awake during scanning (no screen dimming)
- [ ] Confetti: ⭐✨ emoji render correctly, no frame drops during burst
- [ ] Sound: correct chime varies slightly each round
- [ ] Countdown: colors change 5→1
- [ ] Answer zone: border clearly visible over camera feed
- [ ] Progress pips: visible and accurate
- [ ] Phase transitions: smooth cross-fade, no timer glitches
- [ ] Background: gradient visible on start/end screens
- [ ] Overall frame rate: no jank during scanning phase
**Depends on:** All milestones complete.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase fade transition causes CountdownTimer double-fire | Low | Medium — phantom tick could advance to wrong phase | CountdownTimer self-clears at line 29 if phase !== "countdown"; reducer guards at line 73. Keep exit animation ≤200ms. Manual test required. |
| CSS `@property` gradient repaint during gameplay | Very Low | Low — background is behind camera overlay during scanning | Gradient is on `html`; camera overlay is `absolute inset-0` covering it. Even if repaint occurs, it's invisible and behind composited layers. |
| `shapeFromText` emoji rendering on older iPads | Low | Low — falls back to colored circles if emoji not supported | `'circle'` is in the shapes array as fallback. canvas-confetti handles missing shapes gracefully. |
| Wake Lock not available in PWA mode (iPadOS < 18.4) | Medium | Low — game works, iPad just may sleep | `try/catch` pattern means failure is silent. In-browser Safari works from 16.4+. |
| ProgressPips store subscription adds re-renders | Very Low | Very Low — rounds.length changes once per round | Fine-grained Zustand selector `(s) => s.gameState.rounds.length` only triggers on length change. |

---

## Open Questions

1. **"Coming Soon" button labels** — The plan uses "Spelling 🔤" and "Image Quiz 🖼️". Are these the game type names you want, or should they be different? Yes they are. 
2. **Progress pips visibility over camera** — During scanning, the camera is the background. Should pips have a semi-transparent dark backdrop for contrast, or rely on the z-10 content layer being sufficient? Whatever is best practice
3. **Confetti emoji on session-end** — Should the double-cannon session-end confetti also use emoji shapes, or keep it as the current colored rectangles for variety between "round win" and "session complete"? Less emoji's is better I think
