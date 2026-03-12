# Research: Game UX Layer — Celebrations, Animations, Audio, Design

**Date:** 2026-03-11
**Scope:** iPad math game for ages 5-8. Builds on docs/research.md (the consolidated tech research).
**Status:** Verified — all library APIs and versions confirmed via web search / npm.

---

## 1. Current State

The existing research doc (`docs/research.md`, sections 7 and 8) establishes these UX decisions already:

| Decision | Source |
|---|---|
| Animation: Motion (LazyMotion + domAnimation, ~15KB) | `docs/research.md:19` |
| Audio: Howler.js + audio sprites | `docs/research.md:398-403` |
| Font candidates: Nunito, Fredoka One, Lexend | `docs/research.md:352` |
| Spring params: stiffness 200-400, damping 8-10 (bouncy) | `docs/research.md:417` |
| `whileTap` works on iPad touch; CSS `:hover` does not | `docs/research.md:419` |
| `Howler.autoSuspend = false` required | `docs/research.md:399` |
| AudioContext: resume on `visibilitychange` | `docs/research.md:221-227` |
| Camera recovery + audio resume pattern | `docs/research.md:215-229` |
| No red X, no buzzer, encouraging language only | `docs/research.md:370` |
| Score/mute persisted to localStorage, not CV state | `docs/research.md:413` |

This research deepens each of those decisions with exact APIs, code patterns, and sourced trade-offs.

---

## 2. Library Versions (Verified)

| Library | Version | Notes |
|---|---|---|
| `motion` (npm) | **12.35.2** (as of 2026-03-11, published 1 day prior) | Was `framer-motion`; package renamed |
| `canvas-confetti` | **1.9.4** | Last published ~4 months before research date |
| `howler` | **2.2.3** | Current stable; download at howlerjs.com |
| `audiosprite` (dev tool) | Latest on npm | FFmpeg-based; Howler2 output format |

Sources: [motion npm](https://www.npmjs.com/package/motion), [canvas-confetti npm](https://www.npmjs.com/package/canvas-confetti), [howlerjs.com](https://howlerjs.com/)

---

## 3. Motion Library — Detailed API

### 3.1 Package and Import Paths

The npm package is `motion` (not `framer-motion`). `framer-motion` still exists on npm as a compatibility shim.

```typescript
// Full bundle (avoid — no tree shaking of unused features)
import { motion } from 'motion/react';

// Recommended: LazyMotion + slim m.* components
import { LazyMotion, domAnimation, MotionConfig } from 'motion/react';
import * as m from 'motion/react-m';
```

### 3.2 LazyMotion: domAnimation vs domMax

| Feature | domAnimation (+15KB) | domMax (+25KB) |
|---|---|---|
| Keyframe animations | Yes | Yes |
| Variants | Yes | Yes |
| Exit animations (`AnimatePresence`) | Yes | Yes |
| `whileTap` / `whileHover` / `whileFocus` | Yes | Yes |
| Pan / drag gestures | No | **Yes** |
| Layout animations (`layout` prop) | No | **Yes** |

**Decision for this project:** `domAnimation` is sufficient. We do not need drag or layout animations for the game UX. Pan/drag is only needed for future features.

Source: [motion LazyMotion docs](https://motion.dev/docs/react-lazy-motion), [reduce bundle size docs](https://motion.dev/docs/react-reduce-bundle-size)

### 3.3 Spring Configs for Child UX

Physical properties (`x`, `scale`, `rotate`) use spring physics by default. Visual properties (`opacity`, `backgroundColor`) use tween.

```typescript
// Correct answer — bouncy, delightful
const correctSpring = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 8,
  mass: 0.8,
};

// Wrong answer — gentle settle, not punitive
const gentleWobble = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 15,
};

// Tile-detected pop — quick acknowledgment
const popSpring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 10,
};
```

Research-backed: stiffness 200-400, damping 8-10 for "bouncy fun"; damping 15+ for settle (`docs/research.md:417`).

### 3.4 Key Animation Patterns

**Correct answer scale bounce:**
```typescript
<m.div
  animate={{ scale: [1, 1.3, 1] }}
  transition={correctSpring}
/>
```

**Gentle encouragement wobble:**
```typescript
<m.div
  animate={{ rotate: [-3, 3, -3, 3, 0] }}
  transition={{ duration: 0.5, ease: 'easeInOut' }}
/>
```

**Star rain — staggered children falling:**
```typescript
import { stagger } from 'motion/react';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger(0.08),
    },
  },
};

const starVariants = {
  hidden: { y: -100, opacity: 0, rotate: -20 },
  visible: {
    y: 400,
    opacity: [0, 1, 1, 0],
    rotate: [0, 180, 360],
    transition: {
      duration: 1.2,
      ease: 'easeIn',
    },
  },
};
```

**Confetti via Motion** is not the recommended approach (see section 5). Use `canvas-confetti` for particle confetti; use Motion for structured star/shape animations.

### 3.5 `whileTap` on iPad Safari

`whileTap` uses pointer events internally, not raw touch events. It fires on first-point touch and filters secondary pointers. It works correctly on iPad Safari.

**Gotcha:** Standard CSS `:hover` is unreliable on touch — do not use it for interactive states. Motion's `whileHover` also behaves unreliably on touch. Use only `whileTap` for touch interaction.

```typescript
<m.button
  whileTap={{ scale: 0.95 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
  Tap me
</m.button>
```

Source: [Motion gestures docs](https://motion.dev/docs/react-gestures)

### 3.6 `prefers-reduced-motion` Handling

Motion provides two mechanisms:

**Option A — Site-wide via MotionConfig:**
```typescript
<MotionConfig reducedMotion="user">
  {/* All motion components auto-disable transform/layout animations.
      Opacity and color animations still work. */}
</MotionConfig>
```

**Option B — Granular via hook:**
```typescript
import { useReducedMotion } from 'motion/react';

function CelebrationAnimation() {
  const shouldReduce = useReducedMotion();
  return (
    <m.div
      animate={shouldReduce
        ? { opacity: [0, 1] }              // opacity only
        : { scale: [1, 1.4, 1], opacity: [0, 1] } // full bounce
      }
    />
  );
}
```

**Recommendation:** Wrap the app in `<MotionConfig reducedMotion="user">`. Then use `useReducedMotion()` inside celebration components to substitute opacity fades for spring physics (`docs/research.md:358`).

Source: [Motion accessibility docs](https://motion.dev/docs/react-accessibility), [useReducedMotion docs](https://motion.dev/docs/react-use-reduced-motion)

### 3.7 Performance on iPad at 120fps

Motion's hybrid engine uses the Web Animations API for GPU-compositor-thread animations (transforms, opacity). JavaScript spring physics are used only when browser APIs can't provide the capability (e.g., interruptible springs, gesture tracking). In practice:

- **Simple transforms** (scale, translateY, rotate): run on compositor; no main-thread cost; 120fps on ProMotion iPads.
- **Spring physics** (interruptible, high stiffness): runs in JS rAF loop. Still smooth at 60fps; may stutter slightly at 120fps under thermal throttling.
- **Key risk:** Do not animate `width`, `height`, `top`, `left` — these force layout recalculation. Only animate `transform` and `opacity`.
- **Multiple simultaneous springs** (star rain with 20 stars): each runs independently in JS. Prefer CSS keyframe animation for particles at scale; use Motion for 3-5 featured elements.

Source: [Motion performance docs](https://motion.dev/docs/react), [Motion GitHub](https://github.com/motiondivision/motion)

---

## 4. Howler.js — Detailed iOS Audio API

### 4.1 Version and Install

```bash
pnpm add howler
pnpm add -D @types/howler  # DefinitelyTyped types
```

Current version: **2.2.3**. The npm package is `howler`.

### 4.2 iOS AudioContext Unlock Pattern

iOS Safari starts the AudioContext in `suspended` state. It must be resumed within a user gesture event handler — not in a timeout or promise chain derived from one.

The correct pattern for this app's "Tap to Start" screen:

```typescript
// On the Tap to Start button handler:
async function handleTapToStart(): Promise<void> {
  // 1. Resume AudioContext (this must run synchronously in user gesture)
  if (Howler.ctx && Howler.ctx.state !== 'running') {
    await Howler.ctx.resume();
  }
  // 2. Initialize camera (also requires user gesture)
  await initCamera();
  // 3. Transition to game
  setPhase('calibrating');
}
```

**Why one button handles both:** Camera `getUserMedia` also requires a user gesture on iOS. One tap unlocks both AudioContext AND camera permission prompt. This is the standard pattern for this type of app.

### 4.3 Global Howler Configuration

Set before creating any `Howl` instances:

```typescript
import { Howler } from 'howler';

// Prevent 30-second idle auto-suspend (causes silent failures mid-session)
Howler.autoSuspend = false;

// Volume (0.0 - 1.0)
Howler.volume(0.8);
```

**Note:** `Howler.autoSuspend = false` is the correct current API. Verified via GitHub issue [#1234](https://github.com/goldfire/howler.js/issues/1234).

### 4.4 `visibilitychange` Resume Pattern

The existing research doc already has the correct pattern (`docs/research.md:215-229`). The confirmed Howler-specific code:

```typescript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const ctx = Howler.ctx;
    // iOS can set state to 'interrupted' (not just 'suspended')
    if (ctx && (ctx.state === 'suspended' || ctx.state === 'interrupted')) {
      // Small delay — immediate resume sometimes fails on iOS
      setTimeout(() => { ctx.resume(); }, 200);
    }
  }
});
```

**iOS quirk:** The AudioContext `state` can be `'interrupted'` (not just `'suspended'`) after Siri activation or a phone call. Handle both states. Source: [Howler issue #1702](https://github.com/goldfire/howler.js/issues/1702), [issue #1559](https://github.com/goldfire/howler.js/issues/1559).

### 4.5 Audio Sprite Configuration

All game sounds in one file = one HTTP request, no per-sound network latency.

```typescript
import { Howl } from 'howler';

const sfx = new Howl({
  // MP3 first for iOS (no OGG/WebM support); M4A as alternative
  src: ['sounds/game-sfx.mp3', 'sounds/game-sfx.m4a'],
  sprite: {
    // [startMs, durationMs]
    correctChime:      [0,    1200],
    encouragement:     [1500, 800],
    tileDetectedPop:   [2500, 300],
    sessionEndFanfare: [3000, 3000],
    countdownTick:     [6200, 200],
    hintTone:          [6600, 600],
  },
  preload: true,
  volume: 0.8,
  onloaderror: (id, err) => console.error('Audio load failed:', err),
});

// Play:
sfx.play('correctChime');
```

**Format recommendation:** Include both `mp3` and `m4a` (AAC in M4A container). iOS Safari supports both; MP3 has slightly broader tooling support. Do **not** include OGG or WebM — no iOS support.

Source: [Howler.js GitHub](https://github.com/goldfire/howler.js/), [Howler audio sprites article](https://www.nomisoft.co.uk/articles/audio-sprites-with-howler-js)

### 4.6 Audio Sprite Generation Tool

```bash
# Install globally
npm install -g audiosprite

# Generate sprite from individual WAV/MP3 files
audiosprite \
  --output sounds/game-sfx \
  --format howler2 \
  --export mp3,m4a \
  correct-chime.wav encouragement.wav tile-pop.wav fanfare.wav tick.wav

# Outputs: game-sfx.mp3, game-sfx.m4a, game-sfx.json (Howler config)
```

The JSON output can be spread directly into the `Howl` constructor.

Source: [audiosprite GitHub](https://github.com/tonistiigi/audiosprite)

### 4.7 iOS Audio Latency

Web Audio API on iOS has ~20-50ms latency from `play()` call to audible output. This is acceptable for game feedback. Do not use `speechSynthesis` — confirmed unreliable (`docs/research.md:63-64`).

**Preloading:** Set `preload: true` (default). Sounds are downloaded at construction time. The `onload` callback fires when ready. Do not call `play()` before `onload` fires; queue it.

---

## 5. Confetti Implementation — Options and Recommendation

### Option A: `canvas-confetti` library

- **Package:** `canvas-confetti` v1.9.4
- **Bundle size:** ~7KB minified+gzipped (canvas-based, no DOM overhead)
- **TypeScript:** `@types/canvas-confetti` on DefinitelyTyped
- **iOS Safari:** Works on iOS Safari 11+ (uses `canvas` element + `Path2D`). No known issues on modern iOS.
- **`disableForReducedMotion` option:** Built in — pass this flag; it auto-respects `prefers-reduced-motion`.

```typescript
import confetti from 'canvas-confetti';

// Correct answer celebration
function triggerCorrectConfetti(): void {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
    disableForReducedMotion: true,
  });
}

// Session end — double cannon
function triggerSessionEndConfetti(): void {
  confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } });
  confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } });
}
```

**Custom canvas for camera overlay:** Use `confetti.create(canvasEl)` to render on a specific transparent canvas element overlaid on the camera feed:

```typescript
const canvas = document.getElementById('confetti-canvas') as HTMLCanvasElement;
const myConfetti = confetti.create(canvas, { resize: true });
// canvas: position: absolute, top: 0, left: 0, pointer-events: none, z-index: 10
myConfetti({ particleCount: 100, spread: 90, disableForReducedMotion: true });
```

**Performance concern:** Running canvas-confetti simultaneously with the camera-to-canvas pipeline (CV) is risky. The camera feed reads pixel data from one canvas; confetti renders to a separate canvas. As long as they are separate canvas elements, there is no cross-contamination. However, during active CV inference, confetti adds GPU/CPU load. **Recommendation:** Pause CV inference during confetti celebration (1.5s window after correct answer — the game waits for next problem anyway).

Source: [canvas-confetti GitHub](https://github.com/catdad/canvas-confetti), [canvas-confetti npm](https://www.npmjs.com/package/canvas-confetti)

### Option B: Motion-based particle animation

Implement `n` `<m.div>` elements with staggered keyframes — falling stars, emoji, geometric shapes.

- **Pro:** No extra dependency; fully type-safe; integrates with `reducedMotion`.
- **Con:** 20+ simultaneously animated DOM elements stresses the reconciler; no physics-based spread.
- **Best for:** Structured "star rain" (5-10 large star elements falling from top) rather than 80+ random particles.

### Option C: CSS-only animation

Pure CSS `@keyframes` with JS class toggling.

- **Pro:** Zero JS overhead; runs on compositor thread.
- **Con:** No `disableForReducedMotion` built-in; no dynamic origin/spread; hard to randomize.
- **Best for:** Shimmer/glow effects on the answer zone, not confetti.

### Recommendation

Use **both**:

| Effect | Library | Reason |
|---|---|---|
| Confetti burst (correct answer) | `canvas-confetti` | Best particle physics, tiny, iOS-safe |
| Star rain (session end) | Motion stagger variants | 5-8 large stars; DOM control; integrates with game state |
| Wobble / bounce / pop | Motion spring | Already in stack |
| Shimmer on answer zone | CSS keyframes | Zero cost, pure GPU |

---

## 6. Sound Effect Sourcing

### Free Sources (No Attribution Required)

**Pixabay** (`pixabay.com/sound-effects/`) — Royalty-free, no attribution required, commercial use permitted, MP3 download.
- Search: "correct answer", "celebration", "chime", "pop", "tick"
- URL: `pixabay.com/sound-effects/search/correct-answer/`

**Mixkit** (`mixkit.co/free-sound-effects/game/`) — 36 free game sounds under Mixkit License, commercial use included, no attribution required.
- Has: coin collection, level complete, bonus achieved, arcade clicks, positive notifications

**Freesound.org** — CC0 (no attribution) and CC-BY (attribution in credits). API available for programmatic access.
- Only use CC0-licensed sounds to avoid attribution complexity in a children's app.
- Search: `freesound.org/search/?q=correct+chime&license=Creative+Commons+0`

### Needed Sounds (5 core)

| Sound | Description | Search Term |
|---|---|---|
| `correctChime` | Ascending 3-note chime, warm, ~1.2s | "correct chime ascending" |
| `encouragement` | Upward tone, gentle, non-punitive, ~0.8s | "positive tone", "encouragement" |
| `tileDetectedPop` | Brief bubble pop, ~0.3s | "pop soft", "bubble pop" |
| `sessionEndFanfare` | Short fanfare/fanfare jingle, ~3s | "fanfare short", "win jingle" |
| `countdownTick` | Soft tick, ~0.2s | "soft tick", "clock tick soft" |

**Audio format:** Download as WAV for quality, export to MP3 (128kbps) and M4A (AAC, 128kbps) via `audiosprite`. Do not ship WAV files — too large.

---

## 7. Child-Appropriate Visual Design (Research-Backed)

### Color Scheme

For ages 5-8: bright primary + secondary colors with neutral white/cream base. Key principle: if everything is bright, nothing reads as interactive. Reserve the highest-chroma colors for interactive elements and celebrations.

**Recommended palette structure:**
- **Primary action / question display:** Saturated blue (#2563EB or similar) — associated with trustworthiness; calming
- **Correct / success:** Saturated green (#16A34A) or gold (#F59E0B) — joyful
- **Numbers (large display):** Near-black (#1E1B4B) on white/cream — maximum contrast
- **Background:** Off-white (#FFFBEB) or cream — not stark white (reduces eye fatigue)
- **Celebration accent:** Bright red (#EF4444), yellow (#FBBF24), teal (#06B6D4) — confetti colors

**WCAG contrast requirements:**
- Body text: 4.5:1 minimum (AA)
- Large text (≥24px / ≥18pt): 3:1 minimum (AA)
- Number displays at 48pt+: must meet 3:1 at minimum; target 4.5:1 for robustness
- Interactive elements (buttons): 3:1 against adjacent background

Source: [WCAG 2.1 SC 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html), [UXmatters children design](https://www.uxmatters.com/mt/archives/2011/10/effective-use-of-color-and-graphics-in-applications-for-children-part-i-toddlers-and-preschoolers.php)

### Font Choice

| Font | Verdict | Notes |
|---|---|---|
| **Lexend** | **Best choice** | Research-backed: statistically significant improvement in reading speed (p=0.014 in RCT with 2nd-graders). Designed by Dr. Bonnie Shaver-Troup specifically for early readers. Single-storey 'a', wide letter spacing. Available on Google Fonts. |
| **Fredoka One** | Good for display | Rounded, bold — excellent for large number display and headers. Not designed for body text. |
| **Nunito** | Good fallback | Soft rounded letterforms, high readability. Less research support than Lexend but widely used in children's apps. |

**Recommendation:** Lexend for problem text and instructions. Fredoka One for large number display (48pt+). Both from Google Fonts.

```typescript
// In index.html or CSS
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600&family=Fredoka+One&display=swap');
```

Source: [Google Design on Lexend](https://design.google/library/lexend-readability), [Colour My Learning children fonts](https://www.colourmylearning.com/2025/08/best-child-friendly-print-fonts-from-google-fonts-for-early-readers/)

### Animation Timing for Ages 5-8

Research on visual processing in children:
- Visual attention: 60-80ms
- Conscious awareness: 100-150ms
- Feedback must appear: < 200ms (causality perception — existing constraint from docs/research.md)

For animations that children need to *notice and enjoy* (not just register):
- **Micro feedback** (tile pop, button tap): 200-300ms total
- **Correct answer celebration**: 1.0-1.5s (long enough to be rewarding; short enough to keep pace)
- **Wrong answer wobble**: 400-600ms (quick, gentle, moves on)
- **Session end**: 3s full celebration

**Do not** make celebration animations longer than 3s — children lose attention and the next problem is delayed.

Source: [Animation timing research — Medium/Dominic Nguyen](https://medium.com/@domyen/guidelines-for-animation-timing-88b0b1ad3602)

### Number Display

- Minimum 48pt for the answer number
- Minimum 36pt for operator (+, -, =)
- Minimum 24pt for any instructional text
- High-contrast: dark on light, not reversed (white on colored backgrounds are harder for early readers)
- Fredoka One or similar rounded display font

---

## 8. Progressive Loading UX

### Loading Sequence (Three-Phase)

Following the established architecture (`docs/research.md:430-435`):

**Phase 1 — Instant (0ms):** React app shell renders with game UI skeleton. No spinner needed for this phase.

**Phase 2 — Tap to Start (user-triggered):**
Single button unlocks: AudioContext + camera permission.
Design: Large, centered, full-color button. Friendly copy: "Let's Play!" or "Tap to Begin". Include a visual of the physical tiles so child knows what to do. Background: animated but not distracting (subtle pulse, not spinning).

**Phase 3 — Background loading (after tap):**
Camera preview appears immediately (most important — shows something is happening).
Model downloads and compiles (1-3s cold, instant if cached). Show a friendly progress indicator *behind* the camera preview, not blocking it.

```typescript
// Progress indicator tied to fetch + compile
const [modelState, setModelState] = useState<'idle' | 'downloading' | 'compiling' | 'ready'>('idle');

// fetch() with ReadableStream gives download progress
const response = await fetch('/models/digit-classifier.onnx');
const total = Number(response.headers.get('content-length'));
let loaded = 0;
const reader = response.body!.getReader();
const chunks: Uint8Array[] = [];

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);
  loaded += value.length;
  setProgress(loaded / total);
}
```

**Visual design:** A row of 3 animated dots or a child-friendly "camera waking up" illustration. NOT a technical progress bar with percentages — children can't interpret those. Use friendly metaphors: "Getting ready..." → "Almost there..." → "Let's go!"

Service Worker caches the model `CacheFirst` — second launch is instant.

---

## 9. Stars / Rewards System

### Core Principles (Research-Backed)

- **Immediate feedback:** Reward appears within 1.5s of correct answer; delayed rewards lose effectiveness for ages 5-8.
- **Positive-only metric:** Stars show what was achieved. Never show wrong-answer count. Never show a "missed" or empty star. Session summary shows only stars earned.
- **Consistency:** Same reward for same effort level builds trust and predictability.
- **Visible progress:** Children need to see cumulative progress. A "star collection" that grows over sessions is more motivating than a per-session score.

Source: [Edutopia rewards design](https://www.edutopia.org/blog/effective-rewards-game-based-learning-vicki-davis), [MDPI educational game rewards study](https://www.mdpi.com/2227-7102/13/7/668)

### Star Earning Logic

```typescript
// Stars per problem (consistent, positive-only)
function starsForAnswer(attemptNumber: 1 | 2 | 3): 0 | 1 | 2 | 3 {
  if (attemptNumber === 1) return 3;   // First try: 3 stars
  if (attemptNumber === 2) return 2;   // Second try: 2 stars
  return 1;                            // Third try: 1 star (never 0 — never punitive)
}
// After 3 attempts with hint, auto-advance: still award 1 star
```

### localStorage Persistence

```typescript
interface SessionData {
  totalStars: number;
  problemsAttempted: number;
  starsHistory: number[];  // per-problem star counts
  mutedAudio: boolean;
}

const STORAGE_KEY = 'superbuilders-session';

function loadSession(): SessionData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultSession();
  } catch {
    return defaultSession();
  }
}

function saveSession(data: SessionData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
```

**What to persist:** `totalStars`, `mutedAudio` preference. Do not persist CV calibration state, model state, or game phase.

### Session Summary Screen

- Show stars earned this session as large animated stars filling in one by one (Motion stagger)
- Show total cumulative stars as a running tally ("You have 47 stars!")
- Copy: "Amazing work!" / "You're a math star!" — no performance comparison
- One large button: "Play Again" or "Keep Going"
- Duration: 3s celebration then button appears (do not auto-advance — child may not be ready)
- Never show: wrong answers, attempts, "you missed X", percentages

---

## 10. Constraints

These cannot change without re-researching platform compatibility:

| Constraint | Reason |
|---|---|
| `LazyMotion + domAnimation` only | `domMax` adds 10KB for layout/drag which are not used |
| No OGG or WebM audio | No iOS Safari support (`docs/research.md:403`) |
| AudioContext unlock inside synchronous user gesture handler | iOS enforces this; a `setTimeout` chain breaks it |
| Separate canvas for confetti overlay | Cannot share canvas with CV pipeline |
| Pause CV inference during celebration | Camera-to-canvas + confetti canvas = too much concurrent GPU load |
| `whileTap` not `whileHover` for interactive states | `:hover` is unreliable on touch (`docs/research.md:419`) |
| Animations > 3s for celebrations | Children's attention span; tested convention |
| `prefers-reduced-motion` must disable spring/bounce | Replace with opacity-only (immutable rule `docs/.claude/rules/immutable.md:7`) |

---

## 11. Options Summary

### Option Set A: Confetti approach

| Option | Trade-off |
|---|---|
| A1: `canvas-confetti` (recommended) | Tiny, physics-correct, iOS-safe, built-in reduced-motion flag |
| A2: Motion DOM particles | No extra dep, but struggles at > 10 elements; worse physics |
| A3: CSS keyframes only | Zero JS cost but no dynamic randomness |

**Recommendation: A1** for correct-answer confetti, A2 for session-end star rain.

### Option Set B: Audio approach

| Option | Trade-off |
|---|---|
| B1: Howler.js + sprites (recommended) | Proven iOS handling, single HTTP request, direct Howler.ctx access for unlock |
| B2: `use-sound` hook wrapper | Lighter API surface, but wraps Howler; less direct ctx control needed for iOS quirks |
| B3: Web Audio API directly | Maximum control, most code to write; sprite management from scratch |

**Recommendation: B1** — direct Howler.js. The iOS `ctx.state === 'interrupted'` handling requires direct `Howler.ctx` access that `use-sound` may not expose cleanly.

### Option Set C: Font

| Option | Trade-off |
|---|---|
| C1: Lexend (recommended) | RCT-backed for early readers, Google Fonts, covers body + labels |
| C2: Nunito | Widely used, no published RCT, rounded and readable |
| C3: Fredoka One | Great display font but not suitable for body text |

**Recommendation: C1 (Lexend) + Fredoka One for large number display.** Two fonts from one Google Fonts request.

---

## 12. Recommendation Summary

| Area | Recommendation | Version / Source |
|---|---|---|
| Animation library | `motion` with `LazyMotion + domAnimation` | v12.35.2 |
| Confetti | `canvas-confetti` with `disableForReducedMotion: true` | v1.9.4 |
| Star rain | Motion stagger variants (5-8 DOM stars) | Same |
| Audio | Howler.js with sprite, `autoSuspend = false` | v2.2.3 |
| Audio format | MP3 + M4A (no OGG/WebM) | iOS constraint |
| Sprite tool | `audiosprite` CLI + FFmpeg | npm latest |
| Sound source | Pixabay (no attribution) + Mixkit | Free |
| Font (body) | Lexend | Google Fonts |
| Font (numbers) | Fredoka One | Google Fonts |
| `prefers-reduced-motion` | `<MotionConfig reducedMotion="user">` site-wide | Motion API |
| iOS AudioContext unlock | Single user gesture — `Howler.ctx.resume()` + `getUserMedia` together | iOS constraint |
| Star reward | 3/2/1 stars per attempt; never 0; never wrong count | Research-backed |
| Session persist | `localStorage` — stars + mute only | React pattern |

---

## 13. Sources

- [Motion npm package](https://www.npmjs.com/package/motion) — v12.35.2
- [Motion LazyMotion docs](https://motion.dev/docs/react-lazy-motion)
- [Motion reduce bundle docs](https://motion.dev/docs/react-reduce-bundle-size)
- [Motion gestures docs](https://motion.dev/docs/react-gestures)
- [Motion accessibility / useReducedMotion](https://motion.dev/docs/react-accessibility)
- [Motion GitHub](https://github.com/motiondivision/motion)
- [canvas-confetti GitHub](https://github.com/catdad/canvas-confetti)
- [canvas-confetti npm](https://www.npmjs.com/package/canvas-confetti)
- [Howler.js website](https://howlerjs.com/) — v2.2.3
- [Howler.js GitHub](https://github.com/goldfire/howler.js)
- [Howler iOS interrupted issue #1702](https://github.com/goldfire/howler.js/issues/1702)
- [Howler iOS interrupted issue #1559](https://github.com/goldfire/howler.js/issues/1559)
- [Howler autoSuspend issue #1234](https://github.com/goldfire/howler.js/issues/1234)
- [audiosprite GitHub](https://github.com/tonistiigi/audiosprite)
- [Pixabay sound effects](https://pixabay.com/sound-effects/search/correct-answer/)
- [Mixkit free game sounds](https://mixkit.co/free-sound-effects/game/)
- [Freesound.org](https://freesound.org/)
- [Google Design — Lexend readability](https://design.google/library/lexend-readability)
- [Colour My Learning — children fonts](https://www.colourmylearning.com/2025/08/best-child-friendly-print-fonts-from-google-fonts-for-early-readers/)
- [WCAG 2.1 SC 1.4.3 — Contrast Minimum](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Animation timing guidelines](https://medium.com/@domyen/guidelines-for-animation-timing-88b0b1ad3602)
- [UXmatters — color for children](https://www.uxmatters.com/mt/archives/2011/10/effective-use-of-color-and-graphics-in-applications-for-children-part-i-toddlers-and-preschoolers.php)
- [Edutopia — effective rewards in game-based learning](https://www.edutopia.org/blog/effective-rewards-game-based-learning-vicki-davis)
- [MDPI educational game incentive design](https://www.mdpi.com/2227-7102/13/7/668)
- [Matt Montag — iOS Web Audio unlock](https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos)
