// ─── Preprocessing: ImageBitmap → planar RGB Float32Array ───────────────────
//
// Pure function (no ORT dependency). Letterbox-resizes the source image to
// fit inside targetSize×targetSize, pads with gray (114/255), and converts
// RGBA interleaved → planar RGB [R...G...B...] normalized to [0, 1].
//
// The pre-allocated buffer and OffscreenCanvas are module-level singletons
// so we avoid GC pressure on every frame.

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LetterboxInfo {
	readonly scale: number;
	readonly padX: number;
	readonly padY: number;
}

export interface PreprocessResult {
	readonly tensor: Float32Array;
	readonly scale: number;
	readonly padX: number;
	readonly padY: number;
}

// ─── Letterbox math (pure, no canvas) ────────────────────────────────────────

export function computeLetterbox(
	srcW: number,
	srcH: number,
	targetSize: number,
): LetterboxInfo {
	const scale = Math.min(targetSize / srcW, targetSize / srcH);
	const scaledW = Math.round(srcW * scale);
	const scaledH = Math.round(srcH * scale);
	const padX = Math.floor((targetSize - scaledW) / 2);
	const padY = Math.floor((targetSize - scaledH) / 2);
	return { scale, padX, padY };
}

// ─── Pre-allocated buffers ───────────────────────────────────────────────────

const GRAY_VALUE = 114;

let allocatedSize = 0;
let inputBuffer: Float32Array | null = null;
let offscreen: OffscreenCanvas | null = null;
let offCtx: OffscreenCanvasRenderingContext2D | null = null;

function ensureBuffers(targetSize: number): {
	buffer: Float32Array;
	canvas: OffscreenCanvas;
	ctx: OffscreenCanvasRenderingContext2D;
} {
	if (allocatedSize !== targetSize || !inputBuffer || !offscreen || !offCtx) {
		const numPixels = targetSize * targetSize;
		inputBuffer = new Float32Array(3 * numPixels);
		offscreen = new OffscreenCanvas(targetSize, targetSize);
		offCtx = offscreen.getContext("2d");
		if (!offCtx)
			throw new Error("Failed to get 2D context from OffscreenCanvas");
		allocatedSize = targetSize;
	}
	return { buffer: inputBuffer, canvas: offscreen, ctx: offCtx };
}

// ─── Main preprocessing function ─────────────────────────────────────────────

/**
 * Preprocesses an ImageBitmap into a planar RGB Float32Array for YOLO inference.
 *
 * - Letterbox resizes to targetSize×targetSize (preserving aspect ratio)
 * - Pads remaining area with gray (114/255)
 * - Converts RGBA interleaved → planar RGB [R₀…Rₙ, G₀…Gₙ, B₀…Bₙ]
 * - Normalizes pixel values to [0, 1]
 *
 * The returned tensor is a reference to a pre-allocated buffer — it is valid
 * only until the next call to `preprocess`. Callers must consume or copy the
 * data before calling again.
 */
export function preprocess(
	bitmap: ImageBitmap,
	targetSize: number,
): PreprocessResult {
	const { scale, padX, padY } = computeLetterbox(
		bitmap.width,
		bitmap.height,
		targetSize,
	);

	const { buffer, ctx } = ensureBuffers(targetSize);

	// Fill with letterbox gray
	ctx.fillStyle = `rgb(${GRAY_VALUE},${GRAY_VALUE},${GRAY_VALUE})`;
	ctx.fillRect(0, 0, targetSize, targetSize);

	// Draw image scaled and padded
	const scaledW = Math.round(bitmap.width * scale);
	const scaledH = Math.round(bitmap.height * scale);
	ctx.drawImage(bitmap, padX, padY, scaledW, scaledH);

	// Extract pixel data
	const { data } = ctx.getImageData(0, 0, targetSize, targetSize);

	// Convert RGBA interleaved → planar RGB, normalized to [0, 1]
	const numPixels = targetSize * targetSize;
	for (let i = 0; i < numPixels; i++) {
		const rgbaIdx = i * 4;
		buffer[i] = (data[rgbaIdx] ?? 0) / 255; // R
		buffer[numPixels + i] = (data[rgbaIdx + 1] ?? 0) / 255; // G
		buffer[2 * numPixels + i] = (data[rgbaIdx + 2] ?? 0) / 255; // B
	}

	return { tensor: buffer, scale, padX, padY };
}

// ─── Convert raw RGBA Uint8ClampedArray → planar RGB Float32Array ────────────
//
// Exposed separately for unit testing without OffscreenCanvas dependency.

export function rgbaToPlanarRgb(
	rgba: Uint8ClampedArray,
	numPixels: number,
	output: Float32Array,
): void {
	for (let i = 0; i < numPixels; i++) {
		const rgbaIdx = i * 4;
		output[i] = (rgba[rgbaIdx] ?? 0) / 255;
		output[numPixels + i] = (rgba[rgbaIdx + 1] ?? 0) / 255;
		output[2 * numPixels + i] = (rgba[rgbaIdx + 2] ?? 0) / 255;
	}
}

/** Reset pre-allocated buffers (for testing or cleanup). */
export function resetBuffers(): void {
	allocatedSize = 0;
	inputBuffer = null;
	offscreen = null;
	offCtx = null;
}
