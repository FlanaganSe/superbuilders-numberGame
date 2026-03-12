# Research: Exact npm Package Versions for package.json

Verified against registry.npmjs.org on 2026-03-11.

---

## Current State

No `package.json` exists yet in this repo — this research supports initial project scaffolding.

---

## Constraints

- Target runtime: Node.js 22+, TypeScript 5.x (stack.md)
- Target device: iPad / Safari mobile web (stack.md)
- Camera API requires HTTPS or localhost (immutable.md:1)
- CV processing must not block UI thread (immutable.md:2)
- Package manager: pnpm (stack.md)

---

## Verified Latest Versions

### Production Dependencies

| Package | Latest Version |
|---|---|
| `react` | `19.2.4` |
| `react-dom` | `19.2.4` |
| `onnxruntime-web` | `1.24.3` |
| `zustand` | `5.0.11` |
| `motion` | `12.35.2` |
| `canvas-confetti` | `1.9.4` |
| `howler` | `2.2.4` |

### Dev Dependencies

| Package | Latest Version |
|---|---|
| `typescript` | `5.9.3` |
| `vite` | `7.3.1` |
| `@vitejs/plugin-react` | `5.1.4` |
| `@tailwindcss/vite` | `4.2.1` |
| `tailwindcss` | `4.2.1` |
| `@biomejs/biome` | `2.4.6` |
| `vitest` | `4.0.18` |
| `@testing-library/react` | `16.3.2` |
| `happy-dom` | `20.8.3` |
| `vite-plugin-static-copy` | `3.2.0` |
| `vite-plugin-mkcert` | `1.17.10` |
| `vite-plugin-pwa` | `1.2.0` |
| `@types/howler` | `2.2.12` |
| `@types/canvas-confetti` | `1.9.0` |

---

## Peer Dependency Analysis: Vite 7 Compatibility

**All plugins support vite 7.** No conflicts.

| Plugin | Vite peer dep range | Vite 7 OK? |
|---|---|---|
| `@vitejs/plugin-react@5.1.4` | `^4.2.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` | Yes |
| `@tailwindcss/vite@4.2.1` | `^5.2.0 \|\| ^6 \|\| ^7` | Yes |
| `vite-plugin-mkcert@1.17.10` | `>=3` | Yes |
| `vite-plugin-pwa@1.2.0` | `^3.1.0 \|\| ^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` | Yes |
| `vitest@4.0.18` | Bundles vite internally as `^6.0.0 \|\| ^7.0.0` (not a peer dep) | Yes |

---

## Does `tailwindcss` need to be a direct dependency alongside `@tailwindcss/vite`?

Yes. As of Tailwind v4, `tailwindcss` is the engine and `@tailwindcss/vite` is the Vite integration — both must be listed. They share the same version (`4.2.1`). Install both in devDependencies.

---

## Options for pinning strategy

**Option A: Exact pins (no ranges)**
Pin every package as `"1.2.3"` (no caret). Guarantees reproducibility beyond what the lockfile alone provides; makes intentional upgrades explicit.
Trade-off: `pnpm update` does nothing until you manually edit `package.json`.

**Option B: Caret ranges at current latest**
Use `"^x.y.z"` at current latest. Standard pnpm/npm convention; lockfile still pins exact installs, but `pnpm update` can pull non-breaking updates.
Trade-off: Minor risk of unexpected updates if lockfile is missing (e.g., fresh CI without cache).

**Option C: Caret with conservative upper bounds**
Use `"^x.y.z"` but add `engines` field to lock Node version. Same as B with extra Node constraint.

---

## Recommendation

**Option B — caret ranges at current latest.** This is standard for application repos using pnpm: the lockfile (`pnpm-lock.yaml`) provides the true reproducibility guarantee, not the range string in `package.json`. Exact pins add friction for security patches with no real additional safety given the lockfile. Use the versions above as the floor for each caret range.

Proposed `package.json` excerpt:

```json
{
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "onnxruntime-web": "^1.24.3",
    "zustand": "^5.0.11",
    "motion": "^12.35.2",
    "canvas-confetti": "^1.9.4",
    "howler": "^2.2.4"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "@vitejs/plugin-react": "^5.1.4",
    "@tailwindcss/vite": "^4.2.1",
    "tailwindcss": "^4.2.1",
    "@biomejs/biome": "^2.4.6",
    "vitest": "^4.0.18",
    "@testing-library/react": "^16.3.2",
    "happy-dom": "^20.8.3",
    "vite-plugin-static-copy": "^3.2.0",
    "vite-plugin-mkcert": "^1.17.10",
    "vite-plugin-pwa": "^1.2.0",
    "@types/howler": "^2.2.12",
    "@types/canvas-confetti": "^1.9.0"
  }
}
```
