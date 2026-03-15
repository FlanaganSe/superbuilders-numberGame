# Plan: Learning-Science-Driven Enhancements

## Summary

Tiers 1-3 from the learning-science research are already implemented for math (process praise, vocabulary rotation, visual scaffolds, adaptive difficulty with response time, ghost-tile onboarding, idle prompts, color-coded pips). Three gaps remain: (1) SpellingScreen has real parity issues and a pedagogically weak "copy the word" interaction; (2) UX polish, accessibility, and confidence-aware CV messaging are unfinished; (3) the math feedback system is operator-aware but not strategy-aware — the research rates strategy-aware feedback as High impact and it's the lightweight path to learning trajectory work without over-engineering. Three milestones, each independently shippable with explicit verification gates.

---

## Files to Change

### `src/components/SpellingScreen.tsx`
- **M1:** Fix parity gaps: add `GhostTileGuide` (exists in GameScreen, missing here), add idle-time escalation (GameScreen has `idleSeconds` counter — SpellingScreen only has static pulse), add wrong-tile feedback path (GameScreen has `wrongTileSeen` — SpellingScreen doesn't consume it), add `CameraUncertaintyPrompt` (the store already computes `cameraUncertain` — SpellingScreen ignores it).
- **M1:** Progressive encoding redesign. Scaffold level determines word visibility: level 1 = word hidden (audio only), level 2 = first letter revealed, level 3 = full word shown (current behavior). Tappable replay-audio button. Show detected letters with per-letter match highlighting (green = correct position).

### `src/engine/game-reducer.ts`
- **M1:** State-machine change at line 159. Currently: spelling timeout always → countdown (new word). Change to: if `attemptNumber < 3`, return `{ phase: "scanning", problem, attemptNumber: attemptNumber + 1 }` (same word, escalated scaffold). If `attemptNumber >= 3`, proceed to countdown (new word). This is the core architectural decision of M1 — the scaffold level IS the attemptNumber. Critical invariant: when the reducer takes the retry path, `CountdownTimer` never fires, so `spellingProblem` in Zustand persists correctly across the retry. ~5 lines of change.

### `src/engine/spelling-words.ts`
- **M1:** Add `getWordAudioName(word: string): SoundName` for audio file lookup.

### `src/audio/sound-manager.ts`
- **M1:** Register 27 word-pronunciation sounds (`word-at`, `word-go`, `word-cat`, etc.).
- **M2:** Register 1-2 idle prompt sounds.

### `src/audio/use-audio.ts`
- **M1:** Extend `SoundName` union with word pronunciation names.

### `src/components/GameScreen.tsx`
- **M2:** Remove "Level {difficulty}" badge at line 275-278 (CLT: extraneous element, NN/G: not meaningful for ages 5-8; pips + mode name already shown). Keep "Level Up!" animation on promotion. Add idle audio prompt at 10s. Add subtle phase-enter scale animation (0.97→1 spring on mount).

### `src/store/game-store.ts`
- **M1:** Read avg confidence from detections BEFORE `interpret()` discards it (line 171). Use to gate wrong-tile policy for spelling (same gap exists for math already).
- **M2:** Full confidence-aware wrong-tile policy: if avg confidence < threshold AND detection unstable (< 2 frames), use system-attribution instead of wrong-tile feedback. Feature-flag via `?cv-confidence=true`.

### `src/engine/camera-uncertainty.ts`
- **M2:** Add low-confidence messaging tier: "Let me look again..." when detection is ambiguous but not absent.

### `src/engine/explanation-generator.ts`
- **M1:** Expand spelling feedback from the flat `"The word is ${problem.displayAnswer}."` fallback (line 151) into scaffold-tiered process praise keyed on `attemptNumber`: "You spelled it from memory!" (attempt 1/scaffold 1), "The first letter helped!" (attempt 2/scaffold 2), "You matched all the letters!" (attempt 3/scaffold 3).
- **M3:** Make math feedback strategy-specific rather than only operator-specific. Currently: Addition gets count-on, Subtraction gets count-back. Change to: distinguish count-on opportunities, make-ten composition, part-whole reasoning, and decomposition strategies. Different feedback paths for "5 + 3 = ?" (count-on) vs. "7 + ? = 10" (make-ten complement) vs. "3 + ? = 8" (part-whole). Gate detail by difficulty (existing expertise reversal).

### `src/engine/session.ts`
- **M3:** Add optional `responseTimeMs` to `RoundResult`. Compute from existing `currentRoundStartedAt` in game state.

### `src/types/game.ts`
- **M3:** Add `responseTimeMs?: number` to `RoundResult`.

### `src/components/SessionSummary.tsx`
- **M3:** Add one rotating caregiver coaching tip below "Play More!" button (always visible, never interrupts play). Show first-try percentage more prominently (already computed but small text).

### `src/index.css`
- **M2:** WCAG contrast audit. Verify all `@theme` color pairs meet 3:1 for large text (48pt+ Fredoka One, 24pt+ Lexend). Fix failures.

### `src/components/ProgressPips.tsx`
- **M2:** Distinguish timeout rounds (light gray pip) from answered rounds.

### `src/components/FeedbackOverlay.tsx`
- **M1:** Add spelling-specific correct feedback path with process praise varying by scaffold level (attemptNumber).

### `src/components/App.tsx`
- **M2:** Remove `CalibrationGuide.onComplete` dead prop (line 249 passes `() => {}`).

### Minor fixes (M2)
- **`src/components/CalibrationGuide.tsx`:** Remove unused `onComplete` prop from interface.
- **`tsconfig.json` or `vite.config.mts`:** Either remove the `@/*` path alias or add matching `resolve.alias` — currently type-checks but would 404 at runtime if used.

---

## Files to Create

### `src/components/SpellingWordAudio.tsx` (M1)
Tappable speaker icon that plays the target word's pronunciation. SVG speaker icon with tap spring animation. Visible at all scaffold levels. Uses `useAudio` hook.

### `src/engine/spelling-scaffold.ts` (M1)
Pure functions for progressive encoding:
- `getScaffoldReveal(word: string, attemptNumber: number): Array<{ letter: string; revealed: boolean }>` — maps attemptNumber (1/2/3) to visibility per character. Attempt 1: all hidden. Attempt 2: first letter revealed. Attempt 3+: all revealed.
- `getSpellingProcessPraise(attemptNumber: number): string` — process praise per scaffold level.

### `src/engine/caregiver-prompts.ts` (M3)
Single pure function returning one process-oriented tip:
- `getCaregiverTip(mode: string, sessionCount: number): string`
- Pool: "Ask your child: How did you figure that out?", "Try asking: What number would make ten?", "Say: You worked hard on that one!", "Ask: Can you find another way?"
- Deterministic by sessionCount to avoid flicker. No analytics, no trend, no personalization.

---

## Milestone Outline

### M1: Spelling Overhaul
- [x] M1: Fix SpellingScreen parity gaps and transform spelling from visual copying to progressive encoding
  - [x] Step 1 — Reducer change: add scaffold retry for spelling timeout (attemptNumber < 3 → retry, >= 3 → new word) + unit tests → verify: `pnpm test src/engine/game-reducer.test.ts`
  - [x] Step 2 — Create `spelling-scaffold.ts` + co-located tests (getScaffoldReveal, getSpellingProcessPraise) → verify: `pnpm test src/engine/spelling-scaffold.test.ts`
  - [x] Step 3 — Update `explanation-generator.ts` with scaffold-aware spelling timeout hints + tests → verify: `pnpm test src/engine/explanation-generator.test.ts`
  - [x] Step 4 — Audio: extend SoundName with word pronunciations, register in sound-manager, add getWordAudioName helper → verify: `pnpm typecheck`
  - [x] Step 5 — Create `SpellingWordAudio.tsx` (speaker icon + tap animation) and update `FeedbackOverlay.tsx` with spelling process praise → verify: `pnpm typecheck`
  - [x] Step 6 — Add camera miss-streak tracking to processSpellingDetections in `game-store.ts` → verify: `pnpm test src/store/game-store.test.ts`
  - [x] Step 7 — Rewrite `SpellingScreen.tsx`: scaffold-aware letter boxes, GhostTileGuide, idle escalation, CameraUncertaintyPrompt, audio playback → verify: `pnpm typecheck`
  - [x] Step 8 — Full verification gate → verify: `pnpm test && pnpm typecheck && pnpm lint:fix && pnpm build`
  Commit: "feat: transform spelling mode with progressive encoding scaffolds"

**Research basis:** Ehri (2014) — orthographic mapping requires memory retrieval, not visual copying. Weiser & Mathes (2011) — encoding instruction improves phonemic awareness, spelling, decoding, fluency. Tile placement is a validated Elkonin box (NASET). Ouellette & Senechal — even failed encoding attempts build phonemic awareness.

**Upfront state-machine decision:** The scaffold level maps to `attemptNumber` (already tracked by the reducer). The ONLY reducer change: at `game-reducer.ts:159`, replace "Spelling always → countdown" with "if `attemptNumber < 3`, return to scanning with `attemptNumber + 1` (same word, escalated scaffold); else → countdown (new word)." This preserves the existing `spellingProblem` in Zustand across retries because `CountdownTimer` never fires on the retry path.

**SpellingScreen parity fixes (bundled because we're rewriting the component):**
- Add `GhostTileGuide` (first-scan onboarding, matches GameScreen)
- Add idle-time escalation counter (matches GameScreen `idleSeconds` pattern)
- Add wrong-tile feedback path (consume `wrongTileSeen` from store)
- Add `CameraUncertaintyPrompt` (store already computes it)

**Limitations (honest):** This is whole-word encoding, not synthetic phonics — clean isolated phonemes require human recording (§3.16), not AI TTS. At age 5, most children will fall to scaffold level 3 (equivalent to current behavior). That's OK — the scaffold catches them.

**Verification:**
- Unit tests for `spelling-scaffold.ts` (all scaffold levels, edge cases)
- Unit tests for reducer change (timeout at each scaffold level, session completion after 3 words with mixed scaffolds)
- Unit tests for `getSpellingProcessPraise` (all levels)
- Update `game-store.test.ts` for spelling wrong-tile detection
- Manual on-device iPad test: complete a 3-word spelling session exercising all scaffold levels

---

### M2: UX Polish, Accessibility & Confidence-Aware CV
- [x] M2: WCAG audit, remove Level N, idle audio, confidence-aware wrong-tile messaging, minor bug fixes
  - [x] Step 1 — Feature flag (`cvConfidence`) + CalibrationGuide dead prop removal + tsconfig path alias removal + feature flag test → verify: `pnpm test src/utils/feature-flags.test.ts && pnpm typecheck`
  - [x] Step 2 — WCAG contrast audit + fixes + write ADR-011 → verify: `pnpm typecheck`
  - [x] Step 3 — Remove Level badge from GameScreen + register idle audio + add idle audio effect → verify: `pnpm typecheck`
  - [x] Step 4 — Confidence-aware wrong-tile policy in game-store.ts + tests → verify: `pnpm test src/store/game-store.test.ts`
  - [x] Step 5 — Full verification gate → verify: `pnpm test && pnpm typecheck && pnpm lint:fix && pnpm build`
  Commit: "feat: add WCAG contrast fixes, confidence-aware CV, and UX polish"

**Research basis:** WCAG 2.1 SC 1.4.3 — contrast. CLT — extraneous visual elements cost attention. NN/G — "Level N" not meaningful for 5-8. JLS (2020) — audio reduces feedback neglect. Math anxiety (Frontiers 2024) — CV misclassification experienced as "I'm bad at math" is a motivational event.

**Confidence-aware CV (policy, not plumbing):** `DetectedDigit.confidence` already exists and flows through to `processDetections`. Confidence is dropped by `interpret()` at `game-store.ts:171`. The work: in `processDetections`, read avg confidence from the raw `DetectedDigit[]` BEFORE `interpret()` discards it. In the wrong-tile logic, if avg confidence < threshold (start at 0.65) AND detection is unstable (< 2 frames), use system-attribution ("Let me look again...") instead of "You made X, we need Y." Feature-flag via `?cv-confidence=true` for on-device tuning.

**Minor fixes bundled:**
- Remove `CalibrationGuide.onComplete` dead prop (App.tsx:249 passes `() => {}`)
- Fix or remove `@/*` TS path alias that has no Vite `resolve.alias` counterpart (type-checks but would 404 at runtime)

**Verification:**
- WCAG audit results documented in `docs/decisions.md` (ADR-011)
- Unit tests for confidence-aware wrong-tile policy (high confidence → wrong-tile, low confidence → system-attribution, stable vs unstable)
- Manual on-device iPad test: verify Level N removed, idle audio plays, confidence messaging works with real tiles at angles

---

### M3: Strategy-Aware Feedback & Caregiver Tip
- [x] M3: Make math feedback strategy-specific and add one caregiver tip at session end
  - [x] Step 1 — Strategy-aware explanation-generator: subitizing path, make-ten partner language, part-whole process praise, subitizing gate in getCountSequence + update existing tests + add new tests → verify: `pnpm test src/engine/explanation-generator.test.ts`
  - [x] Step 2 — Create caregiver-prompts.ts + co-located tests → verify: `pnpm test src/engine/caregiver-prompts.test.ts`
  - [x] Step 3 — Add caregiver tip to SessionSummary.tsx → verify: `pnpm typecheck`
  - [x] Step 4 — Full verification gate → verify: `pnpm test && pnpm typecheck && pnpm lint:fix && pnpm build`
  Commit: "feat: add strategy-aware math feedback and caregiver coaching tip"

**Research basis:** Outhwaite et al. (2023) — explanatory + motivational feedback + levelling = necessary condition for effective apps. Current feedback is operator-aware (addition→count-on, subtraction→count-back) but not strategy-specific. Different mathematical structures benefit from different explanations: count-on for small addends, make-ten composition for near-ten problems, part-whole decomposition for missing addend. Berkowitz et al. (2015) — math-at-home app increased achievement; only 2/25 apps support adult interaction.

**Strategy-aware feedback (the lightweight path to trajectory work):** Instead of building a full skill graph (§6.15, high effort), make the existing `explanation-generator.ts` smarter about what mathematical strategy a problem exercises. This is §6.16 in the research — rated High impact, Medium effort. Examples:
- Addition `5 + 3`: "Five, then three more: 6, 7, 8!" (count-on — current)
- Make 10 `7 + ? = 10`: "Seven and three make ten! Three is the complement of seven." (make-ten composition — NEW: adds complement language)
- Missing Part `3 + ? = 8`: "Three and five make eight. The missing part is five!" (part-whole — current but could add: "You found the other part!")
- Small addition `1 + 2`: "One and two make three!" (subitizing-friendly — NEW: no count sequence for sums ≤ 5)

**Caregiver tip (deliberately minimal):** One rotating tip on session summary. Process-oriented ("Ask: How did you figure that out?"). Never interrupts play. No trend analytics, no dashboards — just one sentence.

**Response time capture (silent):** Record `responseTimeMs` per round from existing `currentRoundStartedAt`. No UI display in this milestone. Data available for future trajectory work.

**Verification:**
- Unit tests for all new explanation paths in `explanation-generator.ts`
- Unit tests for `getCaregiverTip` (deterministic selection, process-oriented content)
- Manual review: play through all 4 math modes, verify feedback specificity

---

## Manual Setup Tasks

### Before M1: Record Word Pronunciation Audio
**Blocks:** M1

Create audio files for all 27 spelling words:
- **Format:** MP3 + M4A dual format (54 files total)
- **Voice:** Clear, warm, consistent. AI voice is a reasonable hypothesis for whole-word pronunciation but NOT established for this exact age range (TTS evidence is from older learners — §3.16). Test with real children if possible.
- **Content:** Single word, clear, slightly slower than conversational. ~200ms silence padding.
- **Naming:** `word-at.mp3` / `word-at.m4a`, `word-cat.mp3` / `word-cat.m4a`, etc.
- **Location:** `public/sounds/`

**The 27 words** (from `src/engine/spelling-words.ts`):
- 2-letter (7): `at`, `go`, `in`, `it`, `no`, `on`, `up`
- 3-letter (20): `cat`, `dog`, `hat`, `cup`, `pig`, `hen`, `mop`, `nut`, `rug`, `bed`, `bat`, `fan`, `pen`, `mug`, `bug`, `cub`, `jug`, `fig`, `kid`, `hug`

### Before M2: Record Idle Prompt Audio
**Blocks:** M2 (idle audio feature only)

1-2 files:
- `idle-wonder.mp3` / `idle-wonder.m4a` — "I wonder which tile you'll choose!"
- Same voice, format, location as above.

---

## Risks

| Milestone | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| M1 | Audio files not ready | Medium | High | User creates before M1. Dev/test with silent placeholder. |
| M1 | 5-year-olds can't encode from memory | Medium | Low | Scaffold 3 = current behavior. No child stuck. Failed attempts still valuable. |
| M1 | Reducer change introduces state bugs | Low | High | The change is ~5 lines at one conditional. Test all paths: timeout at each scaffold level, success at each level, 3-word completion. Preserve invariant: `spellingProblem` persists across retry because `CountdownTimer` never fires on retry path. |
| M2 | Confidence threshold too aggressive | Medium | Medium | Conservative default (< 0.65 AND unstable). Feature-flagged. Stable high-confidence wrong tiles always shown. |
| M2 | WCAG fixes alter visual identity | Low | Low | Only fix failing pairs. |
| M3 | Strategy-aware feedback adds complexity to explanation-generator | Low | Low | Pure function, fully tested, extends existing pattern. |

---

## Open Questions

1. **Spelling timeout flow:** Timeout at scaffold 1 → retry at scaffold 2 → timeout at scaffold 2 → retry at scaffold 3 → timeout at scaffold 3 → new word. This maps scaffold to `attemptNumber` (1/2/3). Stars: `starsForAttempt(attemptNumber)` = 3/2/1. **Recommended: yes.** Confirm?

2. **AI voice vs. human recording:** AI voice (ElevenLabs, Play.ht) is a reasonable starting hypothesis for whole-word pronunciation but the TTS evidence is from older learners. For a demo this is fine. For production, test with real children. Confirm AI for now?

3. **Confidence threshold starting point:** 0.65 with feature flag. The confusable pairs (6/9, 1/7) at odd angles are the primary concern. Worth testing on-device before committing.
