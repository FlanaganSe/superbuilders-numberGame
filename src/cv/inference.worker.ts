// ─── Inference Worker ────────────────────────────────────────────────────────
//
// Module worker that bootstraps ONNX Runtime Web (WASM backend), preprocesses
// frames, runs inference, and post-processes results. Communicates with the
// main thread via the MainToWorker / WorkerToMain discriminated union protocol.
//
// Key invariants:
// - Import from 'onnxruntime-web/wasm' only (JSEP/WebGPU crashes Safari)
// - numThreads = 1 (no SharedArrayBuffer / COOP/COEP requirement)
// - wasmPaths = '/' (absolute — worker URL resolution breaks relative paths)
// - Busy-flag frame dropping: if inference is running, incoming frames are
//   silently dropped (never queued)
// - bitmap.close() is always called (even on skip/error) to prevent GPU leaks

import * as ort from "onnxruntime-web/wasm";
import type { MainToWorker, WorkerToMain } from "../types/worker-protocol";
import { postProcess } from "./postprocessing";
import { computeLetterbox } from "./preprocessing";

// ─── ORT bootstrap (must be set before InferenceSession.create) ──────────────

ort.env.wasm.wasmPaths = "/";
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;
ort.env.wasm.proxy = false;

// ─── Pre-allocated buffers ───────────────────────────────────────────────────

const INPUT_SIZE = 640;
const NUM_PIXELS = INPUT_SIZE * INPUT_SIZE;
const inputBuffer = new Float32Array(3 * NUM_PIXELS);
const offscreen = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
const offCtx = offscreen.getContext("2d");

if (!offCtx) {
	throw new Error("Failed to get 2D context from OffscreenCanvas in worker");
}

const GRAY_VALUE = 114;

// ─── Worker state ────────────────────────────────────────────────────────────

let session: ort.InferenceSession | null = null;
let isInferring = false;

// ─── Preprocessing (inline — uses pre-allocated buffers) ─────────────────────

function preprocessInPlace(
	bitmap: ImageBitmap,
	ctx: OffscreenCanvasRenderingContext2D,
): { scale: number; padX: number; padY: number } {
	const { scale, padX, padY } = computeLetterbox(
		bitmap.width,
		bitmap.height,
		INPUT_SIZE,
	);

	const scaledW = Math.round(bitmap.width * scale);
	const scaledH = Math.round(bitmap.height * scale);

	// Fill with letterbox gray
	ctx.fillStyle = `rgb(${GRAY_VALUE},${GRAY_VALUE},${GRAY_VALUE})`;
	ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);

	// Draw image scaled and padded
	ctx.drawImage(bitmap, padX, padY, scaledW, scaledH);

	// Extract pixel data and convert to planar RGB
	const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
	for (let i = 0; i < NUM_PIXELS; i++) {
		const rgbaIdx = i * 4;
		inputBuffer[i] = (data[rgbaIdx] ?? 0) / 255;
		inputBuffer[NUM_PIXELS + i] = (data[rgbaIdx + 1] ?? 0) / 255;
		inputBuffer[2 * NUM_PIXELS + i] = (data[rgbaIdx + 2] ?? 0) / 255;
	}

	return { scale, padX, padY };
}

// ─── Message handler ─────────────────────────────────────────────────────────

function post(msg: WorkerToMain): void {
	self.postMessage(msg);
}

self.onmessage = async (e: MessageEvent<MainToWorker>): Promise<void> => {
	const msg = e.data;

	switch (msg.type) {
		case "init": {
			try {
				session = await ort.InferenceSession.create(msg.modelUrl, {
					executionProviders: ["wasm"],
					graphOptimizationLevel: "all",
					enableCpuMemArena: true,
					enableMemPattern: true,
				});
				post({ type: "ready" } satisfies WorkerToMain);
			} catch (err) {
				post({
					type: "error",
					message: `Model init failed: ${String(err)}`,
					fatal: true,
				} satisfies WorkerToMain);
			}
			return;
		}

		case "infer": {
			// Busy-flag frame dropping: never queue, just drop
			if (!session || isInferring) {
				msg.bitmap.close();
				return;
			}

			isInferring = true;
			const t0 = performance.now();
			const { bitmap, classRange: msgClassRange } = msg;

			try {
				const origW = bitmap.width;
				const origH = bitmap.height;

				// 1. Preprocess (writes into pre-allocated inputBuffer)
				const { scale, padX, padY } = preprocessInPlace(bitmap, offCtx);

				// Release GPU memory immediately after pixel extraction
				// (also called in finally as safety net — close() is idempotent)
				bitmap.close();

				// 2. Run inference
				const inputTensor = new ort.Tensor("float32", inputBuffer, [
					1,
					3,
					INPUT_SIZE,
					INPUT_SIZE,
				]);
				const results = await session.run({ images: inputTensor });
				const output0 = results.output0;

				if (!output0) {
					throw new Error("Model output 'output0' not found");
				}

				const rawOutput = output0.data as Float32Array;
				const dims = output0.dims;
				const numChannels = dims[1] ?? 0;
				const numAnchors = dims[2] ?? 0;
				const numClasses = numChannels - 4;

				if (numClasses <= 0) {
					throw new Error(
						`Unexpected model output dims: [${dims.join(", ")}] — expected [1, 4+numClasses, numAnchors]`,
					);
				}

				// 3. Post-process — class range restricts the argmax so only the
				//    active game mode's classes are considered. Default: digit
				//    classes (0-9). Spelling mode sends {min:10, max:35}.
				const classMin = msgClassRange?.min ?? 0;
				const classMax = msgClassRange?.max ?? Math.min(9, numClasses - 1);
				const detections = postProcess({
					output: rawOutput,
					numAnchors,
					numClasses,
					scale,
					padX,
					padY,
					origW,
					origH,
					classRange: {
						min: classMin,
						max: Math.min(classMax, numClasses - 1),
					},
				});

				const latencyMs = performance.now() - t0;
				post({
					type: "detections",
					results: detections,
					latencyMs,
				} satisfies WorkerToMain);
			} catch (err) {
				// Critical: clear busy flag even on error, or worker deadlocks
				post({
					type: "error",
					message: `Inference failed: ${String(err)}`,
					fatal: false,
				} satisfies WorkerToMain);
			} finally {
				// Safety net: close bitmap on any path (idempotent if already closed)
				bitmap.close();
				isInferring = false;
			}
			return;
		}

		case "terminate": {
			if (session) {
				await session.release();
				session = null;
			}
			self.close();
			return;
		}

		default: {
			// Exhaustive check — TypeScript will error if a case is missing
			const _exhaustive: never = msg;
			post({
				type: "error",
				message: `Unknown message type: ${JSON.stringify(_exhaustive)}`,
				fatal: false,
			} satisfies WorkerToMain);
		}
	}
};
