---
name: ui_readability
description: TileSight camera-overlay readability audit — no scrim exists between video and game text; solid card (NOT backdrop-blur) is the correct fix
type: project
---

All game UI (equations, feedback, prompts) renders inside `relative z-10` in App.tsx with NO dark overlay between the camera video and the text. The video is `absolute inset-0` with no z-index, so it fills the viewport and all text floats directly over the live camera feed.

**Why:** This was never explicitly designed — the camera overlay just renders behind the game content by DOM order. No readability pass has been done.

**How to apply:** When planning any UI work involving text over the camera, assume all text needs an opaque or semi-opaque background. The only existing exceptions are: CalibrationGuide (bg-black/60 scrim + bg-white card), ProgressPips (bg-black/20 pill), and Spelling scaffold revealed-letter boxes (bg-primary-50). Everything else — equations, feedback phrases, prompts, countdown numbers, session summary — has zero background protection.

**Critical constraint — DO NOT use `backdrop-filter: blur` over the video element.** Applying blur over a live `<video>` forces an additional GPU compositing pass on every video frame (every 33ms at 30fps). This causes documented choppiness on Safari/WebKit mobile. The fix is a semi-transparent SOLID background, not a frosted-glass blur. `bg-black/55` or `bg-white/90` achieves the same visual goal with zero performance cost.

The recommended fix (per research.md External Research Appendix §A–E) is:
- A solid dark card `bg-black/55 rounded-2xl` on the game content panel (sized narrower than viewport to keep camera edges visible)
- A scrim gradient strip at the top for status row elements
- text-stroke + text-shadow on large display numbers (equation digits) since they are at 72px+ where this technique is reliable
- The CalibrationGuide card (CalibrationGuide.tsx:47: bg-black/60 + bg-white) is the proof-of-concept for the solid card pattern

AR readability research consensus (2024 multivocal review, 50+ studies): the "billboard" (solid panel behind text) is the most effective technique for text over dynamic backgrounds. NNG says the same thing for AR apps.
