import type { DetectedDigit } from "./cv";

// ─── Main Thread → Worker ────────────────────────────────────────────────────

export type MainToWorker =
	| { readonly type: "init"; readonly modelUrl: string }
	| {
			readonly type: "infer";
			readonly bitmap: ImageBitmap;
			readonly width: number;
			readonly height: number;
	  }
	| { readonly type: "terminate" };

// ─── Worker → Main Thread ────────────────────────────────────────────────────

export type WorkerToMain =
	| { readonly type: "ready" }
	| {
			readonly type: "detections";
			readonly results: readonly DetectedDigit[];
			readonly latencyMs: number;
	  }
	| {
			readonly type: "error";
			readonly message: string;
			readonly fatal: boolean;
	  };

// ─── Usage pattern ───────────────────────────────────────────────────────────
//
// Compile-time safety via `satisfies` at postMessage call sites:
//
// In worker:
//   self.postMessage({ type: 'ready' } satisfies WorkerToMain);
//
// In main thread:
//   worker.postMessage({ type: 'init', modelUrl } satisfies MainToWorker);
//
// Runtime type guards are intentionally omitted — `satisfies` provides
// compile-time safety without the false safety of guards that can't
// actually distinguish between the two union types.
