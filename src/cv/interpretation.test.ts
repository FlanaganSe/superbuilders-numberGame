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
