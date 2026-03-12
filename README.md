# Superbuilders

An OSMO-style math game that uses real-time computer vision to recognize physical number tiles via an iPad camera, powering an interactive arithmetic game for ages 5-8. The entire CV pipeline runs on-device using ONNX Runtime Web (WASM backend) in a dedicated Web Worker -- no cloud inference, no frames leave the device.

## Prerequisites

- Node.js 22+
- pnpm

## Setup

```bash
pnpm install
pnpm dev
```

The dev server uses mkcert for HTTPS (required for camera access). Open `https://localhost:5173` on your iPad or use `cloudflared` for remote device testing.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Local dev server (HTTPS via mkcert) |
| `pnpm build` | Production build (typecheck + vite build) |
| `pnpm preview` | Preview production build |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:watch` | Unit tests in watch mode |
| `pnpm test:e2e` | E2E tests (Playwright WebKit) |
| `pnpm lint` | Lint + format check (Biome) |
| `pnpm lint:fix` | Auto-fix lint + format |
| `pnpm typecheck` | TypeScript type checking |

## Feature Flags

Pass as URL query parameters:

| Flag | Values | Description |
|---|---|---|
| `recognition` | `mock` | Use keyboard/numpad input instead of camera CV |
| `debug` | `true` | Show debug HUD (FPS, inference latency, detections) |
| `overlay` | `boxes` | Draw bounding boxes on camera feed |

Example: `https://localhost:5173/?recognition=mock&debug=true`

## CV Pipeline

```
Camera → Frame Capture (rVFC) → Web Worker → ONNX Runtime (YOLO) → Postprocessing (NMS) → Interpretation (grouping) → Temporal Buffer → Game Engine
```

1. **Frame Capture**: `requestVideoFrameCallback` captures frames at display rate, drops under pressure
2. **Web Worker**: ONNX Runtime Web (WASM, single-threaded SIMD) runs inference off the main thread
3. **Postprocessing**: Confidence filter, NMS (IoU 0.45), unletterbox, left-to-right sort
4. **Interpretation**: Groups nearby detections into multi-digit numbers
5. **Temporal Buffer**: Requires 3 consecutive matching frames before committing an answer
6. **Motion Gate**: Suppresses inference during scene instability

## Deployment

Deployed to Cloudflare Pages. Auto-deploys from `main` via GitHub Actions.

The Service Worker (via Workbox) caches the WASM runtime on first load and uses CacheFirst for the ONNX model file, so repeat loads are instant.
