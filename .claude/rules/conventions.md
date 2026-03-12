---
description: Code style and established patterns.
---
# Conventions

- Co-located tests: `foo.ts` → `foo.test.ts`
- Named exports over default exports
- Explicit return types on public functions
- Formatter handles formatting — don't bikeshed

## Established Patterns

- **Zustand selectors**: Fine-grained `useGameStore((s) => s.field)` subscriptions — never subscribe to the whole store. See `src/store/game-store.ts`.
- **Worker protocol `satisfies`**: All `postMessage` calls use `satisfies MainToWorker` / `satisfies WorkerToMain` for type-safe worker communication. See `src/cv/onnx-recognition.ts`.
- **Phase narrowing**: Game logic switches on `phase.phase` discriminant, then accesses phase-specific fields. See `src/engine/game-reducer.ts`.
- **Frame ownership**: Consumer of `ImageBitmap` must call `.close()`. Single consumer owns directly; multi-consumer path clones. See `src/camera/frame-capture.ts`.
- **Feature flags**: `getFeatureFlags()` reads URL params once (cached at module level). Use `?debug=true`, `?recognition=mock`, `?overlay=boxes`. See `src/utils/feature-flags.ts`.
