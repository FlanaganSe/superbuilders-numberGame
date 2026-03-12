---
description: Non-negotiable project rules. Violations must be flagged immediately.
---
# Immutable Rules

1. **Camera access requires HTTPS or localhost** — WebRTC getUserMedia will fail on plain HTTP
2. **CV processing must not block the UI thread** — use Web Workers or requestAnimationFrame scheduling
3. **All game feedback must be child-friendly** — no negative/punitive language, only encouraging prompts

<!-- Add new invariants as discovered, with one-line justification. -->
