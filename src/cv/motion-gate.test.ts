import { describe, expect, it } from "vitest";
import type { DetectedDigit } from "../types/cv";
import { isFrameStable } from "./motion-gate";

function detection(confidence: number, digit = 7): DetectedDigit {
	return {
		digit,
		confidence,
		bbox: { x: 0.3, y: 0.3, width: 0.1, height: 0.15 },
	};
}

describe("isFrameStable", () => {
	it("returns true for empty detections", () => {
		expect(isFrameStable([])).toBe(true);
	});

	it("returns true when all detections are high confidence", () => {
		expect(isFrameStable([detection(0.95), detection(0.88)])).toBe(true);
	});

	it("returns true at exactly the threshold (0.40)", () => {
		expect(isFrameStable([detection(0.4)])).toBe(true);
	});

	it("returns false when average confidence is below threshold", () => {
		expect(isFrameStable([detection(0.2), detection(0.3)])).toBe(false);
	});

	it("returns false for a single low-confidence detection", () => {
		expect(isFrameStable([detection(0.15)])).toBe(false);
	});

	it("handles mixed confidence — average above threshold", () => {
		// avg = (0.8 + 0.1) / 2 = 0.45 → stable
		expect(isFrameStable([detection(0.8), detection(0.1)])).toBe(true);
	});

	it("handles mixed confidence — average below threshold", () => {
		// avg = (0.5 + 0.2 + 0.1) / 3 = 0.267 → unstable
		expect(
			isFrameStable([detection(0.5), detection(0.2), detection(0.1)]),
		).toBe(false);
	});

	it("returns true for high confidence single detection", () => {
		expect(isFrameStable([detection(0.99)])).toBe(true);
	});
});
