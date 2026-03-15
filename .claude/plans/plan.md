# Plan: Camera-Safe UI, Spoken Feedback & Animated Onboarding

## Summary

Three independently shippable features that address the three largest UX gaps remaining after M1-M3. **Camera-Safe UI Cards** (M1) adds `bg-black/55` solid cards behind all game-phase text overlaying the camera — restructuring GameScreen and SpellingScreen into a two-section layout (card zone + clear answer zone) and shifting text colors to light-on-dark variants. **Animated Onboarding** (M2) replaces the static GhostTileGuide with a looping Motion animation showing a tile floating toward a camera icon, communicating the mechanic without text. **Spoken Feedback** (M3) creates a `spoken-feedback.ts` module that composes audible sentences from existing number-word clips + ~9 new connecting-phrase clips, playing them after the chime on correct answers and after encouragement on worked-example timeouts — gated on difficulty ≤ 3. M1 must come first because it changes the text color scheme that M2 and M3 build on. M2 and M3 are independent of each other.

## Files to change

| File | M | Changes | Why |
|---|---|---|---|
| `src/components/GameScreen.tsx` | 1,2,3 | M1: Split flex column into card section + clear zone; add `bg-black/55` card wrapper; add `bg-black/30` fill to answer zone hint; update hint text color. M2: Wrap GhostTileGuide in `AnimatePresence`. M3: Add 2 `useEffect` blocks for spoken feedback. | Central game screen — all three features touch it |
| `src/components/SpellingScreen.tsx` | 1,2 | M1: Same card/clear-zone split; same color updates. M2: Wrap GhostTileGuide in `AnimatePresence`. | Parallel structure to GameScreen |
| `src/components/ProblemDisplay.tsx` | 1 | Change equation text from dark (`text-slate-800`, `text-primary-500`) to light (`text-white`, `text-primary-300`); math prompt `text-slate-300` | Equation is the most important element — must be readable on dark card |
| `src/components/FeedbackOverlay.tsx` | 1 | Update all sub-component text colors to light-on-dark variants (~12 line changes); remove useless `drop-shadow-md` on CorrectFeedback | All feedback renders inside the card |
| `src/components/CountdownTimer.tsx` | 1 | Add `bg-black/55 rounded-3xl px-10 py-8` to outer div; update text/digit colors for dark background | Countdown floats over camera with no background |
| `src/components/SessionSummary.tsx` | 1 | Add `bg-black/55 rounded-2xl px-10 py-8` to outer div; shift all text colors to light variants | Camera still active during session-end |
| `src/components/ProgressPips.tsx` | 1 | Upgrade `bg-black/20` → `bg-black/40` for stronger contrast on dark card | Current 20% opacity is too subtle |
| `src/components/CameraUncertaintyPrompt.tsx` | 1 | `text-slate-500` → `text-slate-300` | Renders inside card |
| `src/components/GhostTileGuide.tsx` | 1,2 | M1: Label `text-slate-500` → `text-slate-300`. M2: Full rewrite — add camera icon SVG, tile movement animation (`y: [0, -32, 0]`), remove text label, add entry/exit animations, `useReducedMotion` fallback to static | M1 is a one-line color fix; M2 is the substantive redesign |
| `src/audio/sound-manager.ts` | 3 | Add 9 `phraseXxx` entries to `SoundName` union (lines 20-67) and `SOUND_FILES` record (lines 74-122) | New connecting-phrase audio clips need type registration + file mapping |

## Files to create

| File | M | Purpose |
|---|---|---|
| `src/audio/spoken-feedback.ts` | 3 | Pure functions `buildCorrectSequence` and `buildTimeoutSequence` (return `SoundName[]`), plus `playSentence` (schedules chain, returns cancel function). No Howler dependency — takes `play` callback via DI. |
| `src/audio/spoken-feedback.test.ts` | 3 | Unit tests: sequence correctness for all math modes (addition, subtraction, missing-addend), edge cases (Make-10 skipped, difficulty > 3 returns empty, spelling returns empty), `playSentence` scheduling with mock play |
| `public/sounds/phrase-and.mp3` + `.m4a` | 3 | Connecting phrase "and" |
| `public/sounds/phrase-make.mp3` + `.m4a` | 3 | Connecting phrase "make" |
| `public/sounds/phrase-then.mp3` + `.m4a` | 3 | Connecting phrase "then" |
| `public/sounds/phrase-more.mp3` + `.m4a` | 3 | Connecting phrase "more" |
| `public/sounds/phrase-take-away.mp3` + `.m4a` | 3 | Connecting phrase "take away" |
| `public/sounds/phrase-is.mp3` + `.m4a` | 3 | Connecting phrase "is" |
| `public/sounds/phrase-missing-part-is.mp3` + `.m4a` | 3 | Connecting phrase "the missing part is" |
| `public/sounds/phrase-you-found-it.mp3` + `.m4a` | 3 | Connecting phrase "you found it" |
| `public/sounds/phrase-the-answer-is.mp3` + `.m4a` | 3 | Connecting phrase "the answer is" |

## Milestone outline

- [x] **M1: Camera-Safe UI Cards** — Add semi-transparent dark cards behind all game-phase text overlaying the camera feed, ensuring readability over any background
- [ ] **M2: Animated Onboarding** — Replace the static GhostTileGuide with a looping tile-toward-camera animation that communicates the mechanic without text
- [ ] **M3: Spoken Feedback** — Compose and play audible explanations from number-word + connecting-phrase clips on correct answers and worked-example timeouts

## Manual setup tasks

1. **Record 9 connecting-phrase audio clips** (blocks M3)
   - Use the **same ElevenLabs voice** as existing word pronunciations (same voice ID, same settings)
   - Record each phrase as a separate file: "and", "make", "then", "more", "take away", "is", "the missing part is", "you found it", "the answer is"
   - Keep clips short (0.3-0.8s) — these are connectors, not narration
   - Export as MP3
   - Convert each to M4A: `for f in phrase-*.mp3; do ffmpeg -i "$f" -c:a aac -b:a 128k "${f%.mp3}.m4a"; done`
   - Place both formats in `public/sounds/`
   - File naming: `phrase-and.mp3`, `phrase-make.mp3`, `phrase-then.mp3`, `phrase-more.mp3`, `phrase-take-away.mp3`, `phrase-is.mp3`, `phrase-missing-part-is.mp3`, `phrase-you-found-it.mp3`, `phrase-the-answer-is.mp3`

2. **Visual iPad test after M1** (validates M1 before proceeding)
   - Play all 5 game modes on iPad Safari
   - Verify text readability across varied backgrounds (white wall, dark table, moving hand, bright window)
   - Verify the answer zone hint box is clearly outside the card
   - Verify CalibrationGuide visual is unchanged
   - Verify `prefers-reduced-motion` disables answer-zone pulse animation

## Risks

1. **Color tuning on iPad** — The light-on-dark color choices (`text-primary-300`, `text-slate-300`, `text-success-400`) are based on WCAG contrast analysis against `bg-black/55`. They should pass, but the iPad's LCD color rendering and ambient light sensor may shift perceived contrast. This is a visual tuning concern, not a code risk — may require one iteration of color adjustment after iPad test.

2. **Card width on narrow viewports** — The `bg-black/55 rounded-2xl px-8 py-6` card is sized by content (widest child = ProblemDisplay equation at text-7xl). On smaller iPads (iPad mini, 8.3" landscape = ~1024px wide), the card may be too wide relative to visible camera edges. The card should have `max-w-lg` or similar cap.

3. **setTimeout chain leaks in spoken feedback** — If `NEXT_ROUND` fires while a spoken sentence is playing, pending `play()` calls could execute against the next scanning phase. The dual-cleanup pattern (cancel start timer + cancel inner chain) handles this, but must be implemented correctly. Unit tests for `playSentence` with early cancellation are essential.

4. **ElevenLabs voice consistency** — Connecting phrases must match the timbre/pace of existing number-word clips. If the voice ID or settings differ, the composed sentence will sound jarring. Use the exact same ElevenLabs voice configuration.

5. **GhostTileGuide AnimatePresence interaction** — Adding `AnimatePresence` around GhostTileGuide in both screens means the guide gets an exit animation on dismiss. The dismiss is triggered by `setShowGuide(false)` in a `useEffect` — `AnimatePresence` requires the component to have a `key` and to unmount via its parent conditional. The existing conditional rendering pattern (`{isScanning && showGuide && ... && <GhostTileGuide />}`) works with `AnimatePresence` as long as a `key` prop is added.

## Resolved decisions

1. **Simplified audio for all math** — Use "and...make" pattern for all addition/missing-addend at difficulty ≤ 3. Audio speaks the fact ("three and five make eight"); visual shows the process (count-on animation). Mayer's redundancy principle: complementary channels improve learning; redundant channels hurt.

2. **Make-10 spoken feedback** — Skip correct-answer audio (target=10, no `number10` clip). Timeout worked-example audio ("the answer is [N]") works for Make-10 because the answer is 1-9. **TODO at end: consider recording a `phrase-make-ten` clip for future enhancement.**

3. **Subtraction spoken feedback** — Include. Pattern: `[number{left}, phraseTakeAway, number{right}, phraseIs, number{answer}]`. **Critical gate: `problem.left <= 9` only** — subtraction at difficulty 3 can have `left` up to 12 (`problem-generator.ts:32`), but `number10/11/12` don't exist. Skip spoken feedback when left > 9.

4. **Timeout worked-example audio** — Simplified to just `[phraseTheAnswerIs, number{answer}]` (2 tokens, ~0.8s). The visual count-on animation already teaches the process; audio confirms the answer. Works for ALL modes including Make-10 (answer is always 0-9).

5. **Phrases registered in code** — Only 5 of 9 recorded clips are registered in `SoundName`: `phraseAnd`, `phraseMake`, `phraseTakeAway`, `phraseIs`, `phraseTheAnswerIs`. The other 4 (`phraseThen`, `phraseMore`, `phraseYouFoundIt`, `phraseMissingPartIs`) sit in `public/sounds/` for future use.
