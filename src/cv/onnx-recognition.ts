// ─── ONNX Recognition Service ───────────────────────────────────────────────
//
// Implements RecognitionService by managing a Web Worker that runs ONNX Runtime
// inference. Wraps the typed MainToWorker / WorkerToMain protocol.
//
// Status lifecycle: loading → ready | error
// Busy flag: prevents frame queuing (drop frames, never queue).

import type { RecognitionResult, RecognitionService } from "../types/cv";
import type { MainToWorker, WorkerToMain } from "../types/worker-protocol";

export type OnnxServiceStatus = "loading" | "ready" | "error";

export interface OnnxRecognitionService extends RecognitionService {
	readonly status: OnnxServiceStatus;
	readonly busy: boolean;
	readonly errorMessage: string | null;
}

export function createOnnxRecognitionService(): OnnxRecognitionService {
	let worker: Worker | null = null;
	let currentStatus: OnnxServiceStatus = "loading";
	let currentBusy = false;
	let currentError: string | null = null;

	let pendingInit: {
		resolve: () => void;
		reject: (err: Error) => void;
	} | null = null;
	let pendingInfer: ((result: RecognitionResult) => void) | null = null;

	function handleMessage(e: MessageEvent<WorkerToMain>): void {
		const msg = e.data;
		switch (msg.type) {
			case "ready": {
				currentStatus = "ready";
				pendingInit?.resolve();
				pendingInit = null;
				break;
			}

			case "detections": {
				currentBusy = false;
				const result: RecognitionResult = {
					detections: [...msg.results],
					latencyMs: msg.latencyMs,
					frameTimestamp: Date.now(),
				};
				pendingInfer?.(result);
				pendingInfer = null;
				break;
			}

			case "error": {
				if (msg.fatal) {
					currentStatus = "error";
					currentError = msg.message;
					pendingInit?.reject(new Error(msg.message));
					pendingInit = null;
				} else {
					// Non-fatal error (inference failure) — clear busy, resolve empty
					currentBusy = false;
					pendingInfer?.({
						detections: [],
						latencyMs: 0,
						frameTimestamp: Date.now(),
					});
					pendingInfer = null;
				}
				break;
			}
		}
	}

	const EMPTY_RESULT: RecognitionResult = {
		detections: [],
		latencyMs: 0,
		frameTimestamp: 0,
	};

	return {
		async init(modelUrl?: string): Promise<void> {
			worker = new Worker(new URL("./inference.worker.ts", import.meta.url), {
				type: "module",
			});
			worker.onmessage = handleMessage;

			return new Promise<void>((resolve, reject) => {
				pendingInit = { resolve, reject };
				const url = modelUrl ?? "/models/yolo11n-coco.onnx";
				worker?.postMessage({
					type: "init",
					modelUrl: url,
				} satisfies MainToWorker);
			});
		},

		async recognize(frame: ImageBitmap): Promise<RecognitionResult> {
			if (!worker || currentStatus !== "ready" || currentBusy) {
				frame.close();
				return { ...EMPTY_RESULT, frameTimestamp: Date.now() };
			}

			currentBusy = true;
			worker.postMessage(
				{ type: "infer", bitmap: frame } satisfies MainToWorker,
				[frame],
			);

			return new Promise((resolve) => {
				pendingInfer = resolve;
			});
		},

		dispose(): void {
			// Reject pending init so callers don't see false "ready" after dispose
			pendingInit?.reject(new Error("Service disposed"));
			pendingInit = null;

			// Resolve pending inference with empty result so the frame callback unblocks
			pendingInfer?.({ ...EMPTY_RESULT, frameTimestamp: Date.now() });
			pendingInfer = null;

			// Set status to loading BEFORE terminating so ready === false
			currentStatus = "loading";
			currentBusy = false;
			currentError = null;

			if (worker) {
				worker.postMessage({
					type: "terminate",
				} satisfies MainToWorker);
				worker.terminate();
				worker = null;
			}
		},

		get ready(): boolean {
			return currentStatus === "ready";
		},

		get status(): OnnxServiceStatus {
			return currentStatus;
		},

		get busy(): boolean {
			return currentBusy;
		},

		get errorMessage(): string | null {
			return currentError;
		},
	};
}
