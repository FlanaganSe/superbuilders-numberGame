import { describe, expect, it } from "vitest";
import type { DetectedDigit, Digit } from "../types/cv";
import {
	createInterpretationLayer,
	groupDetections,
	matchAnswer,
} from "./interpretation";

function makeDetection(
	digit: Digit,
	x: number,
	y: number,
	width = 0.1,
	height = 0.15,
): DetectedDigit {
	return {
		digit,
		confidence: 0.95,
		bbox: { x, y, width, height },
	};
}

describe("groupDetections", () => {
	it("returns empty for empty input", () => {
		expect(groupDetections([])).toEqual([]);
	});

	it("returns single-digit candidates for isolated tiles", () => {
		const detections = [makeDetection(7, 0.1, 0.4), makeDetection(3, 0.8, 0.4)];
		const candidates = groupDetections(detections);
		expect(candidates).toHaveLength(2);
		expect(candidates.map((c) => c.value)).toContain(7);
		expect(candidates.map((c) => c.value)).toContain(3);
	});

	it("groups adjacent tiles into two-digit numbers", () => {
		// Two tiles close together, same y
		const detections = [
			makeDetection(1, 0.3, 0.4, 0.1, 0.15),
			makeDetection(5, 0.42, 0.4, 0.1, 0.15),
		];
		const candidates = groupDetections(detections);
		const twoDigit = candidates.find((c) => c.digits.length === 2);
		expect(twoDigit).toBeDefined();
		expect(twoDigit?.value).toBe(15);
		expect(twoDigit?.digits).toBe("15");
	});

	it("does not group vertically misaligned tiles", () => {
		// Tiles at different heights
		const detections = [
			makeDetection(1, 0.3, 0.1, 0.1, 0.15),
			makeDetection(5, 0.42, 0.5, 0.1, 0.15),
		];
		const candidates = groupDetections(detections);
		// Should only have single-digit candidates
		expect(candidates.every((c) => c.digits.length === 1)).toBe(true);
		expect(candidates).toHaveLength(2);
	});

	it("does not group distant tiles", () => {
		// Tiles far apart horizontally
		const detections = [
			makeDetection(1, 0.1, 0.4, 0.1, 0.15),
			makeDetection(5, 0.8, 0.4, 0.1, 0.15),
		];
		const candidates = groupDetections(detections);
		expect(candidates.every((c) => c.digits.length === 1)).toBe(true);
	});

	it("does not group overlapping same-digit detections (duplicate anchors)", () => {
		// Model produces two overlapping boxes for the same "5" tile
		const detections = [
			makeDetection(5, 0.3, 0.4, 0.12, 0.15),
			makeDetection(5, 0.35, 0.4, 0.12, 0.15),
		];
		// gap = 0.35 - (0.30 + 0.12) = -0.07 → overlapping
		const candidates = groupDetections(detections);
		expect(candidates.every((c) => c.digits === "5")).toBe(true);
		expect(candidates.find((c) => c.digits === "55")).toBeUndefined();
	});

	it("groups same-digit detections when not overlapping (e.g. answer 11)", () => {
		// Two separate "1" tiles with physical gap
		const detections = [
			makeDetection(1, 0.3, 0.4, 0.1, 0.15),
			makeDetection(1, 0.42, 0.4, 0.1, 0.15),
		];
		// gap = 0.42 - (0.30 + 0.10) = 0.02 → not overlapping
		const candidates = groupDetections(detections);
		expect(candidates.find((c) => c.digits === "11")).toBeDefined();
	});

	it("handles duplicate + legitimate same-digit for multi-digit answer", () => {
		// Two "1" tiles, but first tile has a duplicate detection
		const detections = [
			makeDetection(1, 0.3, 0.4, 0.1, 0.15), // tile A
			makeDetection(1, 0.33, 0.4, 0.1, 0.15), // duplicate of tile A (overlapping)
			makeDetection(1, 0.45, 0.4, 0.1, 0.15), // tile B (separate)
		];
		const candidates = groupDetections(detections);
		// The non-overlapping pair should group as "11"
		expect(candidates.find((c) => c.digits === "11")).toBeDefined();
	});

	it("groups real tile pair even when a tiny spurious detection is present", () => {
		// Real tiles (width=0.10) with gap=0.08 (just under 1.0× pairAvgWidth=0.10).
		// Add two tiny spurious detections (width=0.01 each) that drag scene-wide
		// avgWidth down to 0.055, making gap(0.08) > avgWidth(0.055) → grouping
		// fails with scene-wide averages. Pair-local averages (0.10) keep grouping.
		const detections = [
			makeDetection(1, 0.3, 0.4, 0.1, 0.15), // real tile
			makeDetection(5, 0.48, 0.4, 0.1, 0.15), // real tile (gap = 0.48 - 0.40 = 0.08)
			makeDetection(3, 0.01, 0.1, 0.01, 0.02), // tiny spurious
			makeDetection(7, 0.95, 0.1, 0.01, 0.02), // tiny spurious
		];
		const candidates = groupDetections(detections);
		expect(candidates.find((c) => c.digits === "15")).toBeDefined();
	});

	it("does not group overlapping different-digit detections", () => {
		// Two different-digit detections that overlap (gap < 0, but IoU < NMS threshold
		// so both survived NMS). These represent duplicate anchors on one physical tile.
		const detections = [
			makeDetection(3, 0.3, 0.4, 0.12, 0.15),
			makeDetection(7, 0.35, 0.4, 0.12, 0.15),
		];
		// gap = 0.35 - (0.30 + 0.12) = -0.07 → overlapping
		const candidates = groupDetections(detections);
		// Should NOT group into "37" — overlapping means same physical tile
		expect(candidates.find((c) => c.digits === "37")).toBeUndefined();
	});

	it("handles mixed grouped and ungrouped tiles", () => {
		const detections = [
			makeDetection(1, 0.3, 0.4, 0.1, 0.15),
			makeDetection(2, 0.42, 0.4, 0.1, 0.15),
			makeDetection(7, 0.8, 0.4, 0.1, 0.15),
		];
		const candidates = groupDetections(detections);
		const twoDigit = candidates.find((c) => c.digits === "12");
		const singleDigit = candidates.find((c) => c.digits === "7");
		expect(twoDigit).toBeDefined();
		expect(singleDigit).toBeDefined();
	});
});

describe("matchAnswer", () => {
	it("matches single-digit answer", () => {
		const candidates = [{ digits: "7", value: 7 }];
		const result = matchAnswer(candidates, 7);
		expect(result?.value).toBe(7);
	});

	it("matches two-digit answer", () => {
		const candidates = [
			{ digits: "1", value: 1 },
			{ digits: "15", value: 15 },
		];
		const result = matchAnswer(candidates, 15);
		expect(result?.value).toBe(15);
	});

	it("returns null when no match", () => {
		const candidates = [{ digits: "7", value: 7 }];
		expect(matchAnswer(candidates, 8)).toBeNull();
	});

	it("returns null for empty candidates", () => {
		expect(matchAnswer([], 7)).toBeNull();
	});

	it("digit-count gate: single-digit answer does not match two-digit candidate", () => {
		const candidates = [{ digits: "17", value: 17 }];
		expect(matchAnswer(candidates, 7)).toBeNull();
	});
});

describe("createInterpretationLayer", () => {
	const layer = createInterpretationLayer();

	it("interprets single-digit detections", () => {
		const detections = [makeDetection(7, 0.4, 0.4)];
		const result = layer.interpret(detections, 1);
		expect(result).toContain(7);
	});

	it("interprets two-digit detections", () => {
		const detections = [
			makeDetection(1, 0.3, 0.4, 0.1, 0.15),
			makeDetection(5, 0.42, 0.4, 0.1, 0.15),
		];
		const result = layer.interpret(detections, 2);
		expect(result).toContain(15);
	});

	it("filters by expected digit count", () => {
		const detections = [
			makeDetection(1, 0.3, 0.4, 0.1, 0.15),
			makeDetection(5, 0.42, 0.4, 0.1, 0.15),
		];
		// Expecting single-digit — two-digit group should be filtered out
		const result = layer.interpret(detections, 1);
		expect(result).not.toContain(15);
	});

	it("returns empty for empty detections", () => {
		expect(layer.interpret([], 1)).toEqual([]);
	});
});
