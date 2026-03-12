import { describe, expect, it } from "vitest";
import { computeLetterbox, rgbaToPlanarRgb } from "./preprocessing";

// ─── computeLetterbox ────────────────────────────────────────────────────────

describe("computeLetterbox", () => {
	it("returns identity scale and zero padding for square input", () => {
		const result = computeLetterbox(640, 640, 640);
		expect(result.scale).toBe(1);
		expect(result.padX).toBe(0);
		expect(result.padY).toBe(0);
	});

	it("computes correct letterbox for landscape input (wider than tall)", () => {
		// 1280×720 → 640×640
		// scale = min(640/1280, 640/720) = min(0.5, 0.889) = 0.5
		// scaledW = round(1280 * 0.5) = 640
		// scaledH = round(720 * 0.5) = 360
		// padX = floor((640 - 640) / 2) = 0
		// padY = floor((640 - 360) / 2) = 140
		const result = computeLetterbox(1280, 720, 640);
		expect(result.scale).toBe(0.5);
		expect(result.padX).toBe(0);
		expect(result.padY).toBe(140);
	});

	it("computes correct letterbox for portrait input (taller than wide)", () => {
		// 480×640 → 640×640
		// scale = min(640/480, 640/640) = min(1.333, 1.0) = 1.0
		// scaledW = round(480 * 1.0) = 480
		// scaledH = round(640 * 1.0) = 640
		// padX = floor((640 - 480) / 2) = 80
		// padY = floor((640 - 640) / 2) = 0
		const result = computeLetterbox(480, 640, 640);
		expect(result.scale).toBe(1);
		expect(result.padX).toBe(80);
		expect(result.padY).toBe(0);
	});

	it("works with 320 target size", () => {
		// 1280×720 → 320×320
		// scale = min(320/1280, 320/720) = min(0.25, 0.444) = 0.25
		// scaledW = round(1280 * 0.25) = 320
		// scaledH = round(720 * 0.25) = 180
		// padX = 0, padY = floor((320 - 180) / 2) = 70
		const result = computeLetterbox(1280, 720, 320);
		expect(result.scale).toBe(0.25);
		expect(result.padX).toBe(0);
		expect(result.padY).toBe(70);
	});

	it("preserves aspect ratio (scaledW and scaledH fit within target)", () => {
		const src = { w: 1920, h: 1080 };
		const target = 640;
		const { scale } = computeLetterbox(src.w, src.h, target);
		const scaledW = Math.round(src.w * scale);
		const scaledH = Math.round(src.h * scale);
		expect(scaledW).toBeLessThanOrEqual(target);
		expect(scaledH).toBeLessThanOrEqual(target);
		// At least one dimension should fill the target
		expect(Math.max(scaledW, scaledH)).toBe(target);
	});

	it("handles non-standard aspect ratio (iPad landscape: 4032×3024)", () => {
		// 4032×3024 → 640×640
		// scale = min(640/4032, 640/3024) = min(0.1587, 0.2116) = 0.1587
		const result = computeLetterbox(4032, 3024, 640);
		expect(result.scale).toBeCloseTo(640 / 4032, 5);
		const scaledW = Math.round(4032 * result.scale);
		const scaledH = Math.round(3024 * result.scale);
		expect(scaledW).toBe(640);
		expect(scaledH).toBeLessThanOrEqual(640);
		expect(result.padX).toBe(0);
		expect(result.padY).toBeGreaterThan(0);
	});
});

// ─── rgbaToPlanarRgb ─────────────────────────────────────────────────────────

describe("rgbaToPlanarRgb", () => {
	it("converts a single pixel correctly", () => {
		// RGBA: R=255, G=128, B=0, A=255
		const rgba = new Uint8ClampedArray([255, 128, 0, 255]);
		const output = new Float32Array(3);
		rgbaToPlanarRgb(rgba, 1, output);

		expect(output[0]).toBeCloseTo(1.0); // R
		expect(output[1]).toBeCloseTo(128 / 255); // G
		expect(output[2]).toBeCloseTo(0.0); // B
	});

	it("produces planar layout [R...G...B...] not interleaved", () => {
		// 2 pixels: (255, 0, 0, 255) and (0, 255, 0, 255)
		const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
		const output = new Float32Array(6);
		rgbaToPlanarRgb(rgba, 2, output);

		// R plane: [1.0, 0.0]
		expect(output[0]).toBeCloseTo(1.0); // R₀
		expect(output[1]).toBeCloseTo(0.0); // R₁
		// G plane: [0.0, 1.0]
		expect(output[2]).toBeCloseTo(0.0); // G₀
		expect(output[3]).toBeCloseTo(1.0); // G₁
		// B plane: [0.0, 0.0]
		expect(output[4]).toBeCloseTo(0.0); // B₀
		expect(output[5]).toBeCloseTo(0.0); // B₁
	});

	it("normalizes values to [0, 1] range", () => {
		// All channels at 114 (letterbox gray)
		const rgba = new Uint8ClampedArray([114, 114, 114, 255]);
		const output = new Float32Array(3);
		rgbaToPlanarRgb(rgba, 1, output);

		const expected = 114 / 255;
		expect(output[0]).toBeCloseTo(expected);
		expect(output[1]).toBeCloseTo(expected);
		expect(output[2]).toBeCloseTo(expected);
	});

	it("ignores the alpha channel", () => {
		// Same RGB with different alpha values should produce identical output
		const rgba1 = new Uint8ClampedArray([100, 150, 200, 255]);
		const rgba2 = new Uint8ClampedArray([100, 150, 200, 0]);
		const out1 = new Float32Array(3);
		const out2 = new Float32Array(3);

		rgbaToPlanarRgb(rgba1, 1, out1);
		rgbaToPlanarRgb(rgba2, 1, out2);

		expect(out1[0]).toBe(out2[0]);
		expect(out1[1]).toBe(out2[1]);
		expect(out1[2]).toBe(out2[2]);
	});

	it("handles a 4-pixel grid (2×2)", () => {
		// 4 pixels in RGBA order
		const rgba = new Uint8ClampedArray([
			255,
			0,
			0,
			255, // pixel 0: red
			0,
			255,
			0,
			255, // pixel 1: green
			0,
			0,
			255,
			255, // pixel 2: blue
			255,
			255,
			255,
			255, // pixel 3: white
		]);
		const output = new Float32Array(12);
		rgbaToPlanarRgb(rgba, 4, output);

		// R plane: [1, 0, 0, 1]
		expect(output[0]).toBeCloseTo(1.0);
		expect(output[1]).toBeCloseTo(0.0);
		expect(output[2]).toBeCloseTo(0.0);
		expect(output[3]).toBeCloseTo(1.0);

		// G plane: [0, 1, 0, 1]
		expect(output[4]).toBeCloseTo(0.0);
		expect(output[5]).toBeCloseTo(1.0);
		expect(output[6]).toBeCloseTo(0.0);
		expect(output[7]).toBeCloseTo(1.0);

		// B plane: [0, 0, 1, 1]
		expect(output[8]).toBeCloseTo(0.0);
		expect(output[9]).toBeCloseTo(0.0);
		expect(output[10]).toBeCloseTo(1.0);
		expect(output[11]).toBeCloseTo(1.0);
	});

	it("output size is 3 × numPixels", () => {
		const numPixels = 16;
		const rgba = new Uint8ClampedArray(numPixels * 4);
		const output = new Float32Array(3 * numPixels);
		rgbaToPlanarRgb(rgba, numPixels, output);
		expect(output.length).toBe(3 * numPixels);
	});
});
