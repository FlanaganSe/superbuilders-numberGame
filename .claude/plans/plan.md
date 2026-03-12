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

- [ ] **M3: Confetti + Celebration Upgrade** — Emoji confetti, bouncier springs, sound variation
  - `FeedbackOverlay.tsx`: Create emoji shapes with `confetti.shapeFromText({ text: '⭐', scalar: 2 })` and `'✨'`. Update `fireCorrectConfetti()` to use `shapes: [star, sparkle, 'circle']`, `scalar: 2`, `flat: true`, `origin: { y: 0.7 }`.
  - `SessionSummary.tsx`: Same emoji confetti upgrade on the double-cannon burst.
  - `FeedbackOverlay.tsx`: Update `CORRECT_SPRING` from `{ stiffness: 300, damping: 15 }` → `{ stiffness: 400, damping: 10 }`.
  - `SessionSummary.tsx`: Update star stagger spring from `{ stiffness: 300, damping: 15 }` → `{ stiffness: 300, damping: 8 }`.
  - `sound-manager.ts`: After `howl.play()` for `correctChime`, add `howl.rate(0.9 + Math.random() * 0.2, id)`.
  - **Verify:** `pnpm typecheck && pnpm test`. Visually: correct answer shows ⭐✨ emoji confetti bursting from lower screen area. Stars on session-end should have a jelly-like plop. Each correct chime should sound slightly different.

- [ ] **M4: Tile-Seen Feedback** — Show detected answer value, stronger animation
  - Thread `answer` prop to `TileSeenFeedback`: change line 82 from `<TileSeenFeedback key={...} />` to `<TileSeenFeedback key={...} answer={feedback.answer} />`
  - Update `TileSeenFeedback` to accept `{ readonly answer: number }` and render `I see {answer}!`
  - Increase animation scale from `[0.9, 1.05, 1]` → `[0.8, 1.15, 1]`
  - Change color from `text-primary-400` → `text-success-500`
  - **Verify:** `pnpm typecheck && pnpm test`. Visually in mock mode: type correct digit → should see "I see 7!" (not "I see a tile!") with a noticeable green bounce.

### Phase 3: Gameplay UI

- [ ] **M5: Countdown + Answer Zone + Progress** — Color urgency, visible answer zone, progress indicator
  - `CountdownTimer.tsx`: Add `COUNTDOWN_COLORS` record mapping `5→text-primary-500`, `4→text-teal-500`, `3→text-amber-500`, `2→text-orange-500`, `1→text-red-500`. Apply to `m.span` className.
  - `GameScreen.tsx:170`: Change `border-primary-300/50` → `border-primary-400`. Remove `/50` opacity.
  - Create `src/components/ProgressPips.tsx`: props `{ current: number; total: number }`. Render row of `total` small dots, first `current` filled (`bg-primary-500`), rest empty (`bg-primary-200`). Use `gap-1.5`, dot size `w-2.5 h-2.5 rounded-full`.
  - Add `<ProgressPips>` in `GameScreen.tsx` above the `m.div` wrapping ProblemDisplay. Pass `current={rounds.length}` from store, `total={MAX_PROBLEMS}`.
  - **Verify:** `pnpm typecheck && pnpm test`. E2E: `pnpm exec playwright test` — ProblemDisplay selector `.font-display.text-7xl` is unchanged (ProgressPips is a sibling, not a wrapper). Visually: countdown numbers change color 5→1; answer zone border clearly visible; dots show progress.

### Phase 4: Atmosphere

- [ ] **M6: Background + Phase Transitions** — Living background, smooth cross-fades
  - `src/index.css`: Add `@property --bg-x` registration, animated gradient on `html` (cream base + warm pastel radial gradients drifting over 10s). Add `@media (prefers-reduced-motion: reduce)` override to disable animation.
  - `App.tsx:224-230`: Wrap the PhaseRouter render (lines 225-229) in `<AnimatePresence mode="wait"><m.div key={phase.phase} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>...</m.div></AnimatePresence>`. Import `AnimatePresence` from `motion/react` and `m` from `motion/react-m` (already imported).
  - **Verify:** `pnpm typecheck && pnpm test && pnpm build`. E2E: `pnpm exec playwright test`. Visually: idle screen has slow-drifting warm gradient; phase changes cross-fade smoothly (150ms). **Critical manual test:** play through 2 full rounds verifying countdown timer still transitions correctly to scanning phase with no stutter or double-mount.

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
