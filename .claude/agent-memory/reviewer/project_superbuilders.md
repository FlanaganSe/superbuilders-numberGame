---
name: superbuilders_project
description: Superbuilders project context — OSMO-style math game with iPad camera + ONNX Runtime Web for digit recognition, targeting children ages 5-8
type: project
---

OSMO-style math game scaffold: Vite 7 + React 19 + TypeScript strict + Tailwind v4 + Biome v2 + ONNX Runtime Web 1.24 (WASM backend).

Target device: iPad Safari. Camera via MediaDevices.getUserMedia. ONNX inference must run off the main thread (Web Worker). M1 = scaffolding only, no implementation logic yet.

Stack confirmed installed versions:
- onnxruntime-web 1.24.3
- vitest 4.0.18
- biome 2.4.6

**Why:** M1 is scaffolding/types only. M2+ will implement CV pipeline, game logic, and UI.

**How to apply:** Don't suggest implementation code during reviews of M1. Flag anything that would break M2 work (type contracts, architectural seams, WASM loading).
