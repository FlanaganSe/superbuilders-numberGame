---
description: Technology choices and constraints.
---
# Stack

- **Runtime**: Node.js 22+ with TypeScript 5.9
- **Frontend**: React 19.2 + Vite 7.3 (SPA, no SSR)
- **Computer Vision**: ONNX Runtime Web 1.24.3 (WASM EP, dedicated Web Worker)
- **State**: Zustand 5.x (game reducer + transient CV subscribe)
- **Animation**: Motion 12.35 (LazyMotion + domAnimation)
- **Confetti**: canvas-confetti 1.9.4
- **Audio**: Howler.js 2.2.4 (sprites, autoSuspend=false, MP3+M4A)
- **Styling**: Tailwind CSS 4.2 via @tailwindcss/vite
- **Fonts**: Lexend (body, ≥24pt) + Fredoka One (numbers, ≥48pt)
- **Database**: N/A — localStorage only
- **Tests**: Vitest 4.x (unit) + Playwright WebKit (E2E)
- **Linter/Formatter**: Biome 2.x (domains.react: "all")
- **Package manager**: pnpm
- **Target device**: iPad (Safari mobile web, landscape)
- **Camera API**: MediaDevices.getUserMedia (WebRTC)
- **Dev HTTPS**: vite-plugin-mkcert + cloudflared tunnel
- **Hosting**: Cloudflare Pages (static, CacheFirst via Workbox)
