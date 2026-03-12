import { beforeEach, describe, expect, it } from "vitest";
import { MAX_CONSECUTIVE_MISSES } from "../cv/temporal-buffer";
import type { DetectedDigit } from "../types/cv";
import type { Problem } from "../types/game";
import { useGameStore } from "./game-store";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const testProblem: Problem = {
	left: 3,
	right: 4,
	operator: "+",
	answer: 7,
	displayAnswer: "7",
};

function makeDetection(
	digit: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
): readonly DetectedDigit[] {
	return [
		{
			digit,
			confidence: 0.9,
			bbox: { x: 0.5, y: 0.5, width: 0.1, height: 0.1 },
		},
	];
}

function enterScanningPhase(): void {
	const { dispatch } = useGameStore.getState();
	dispatch({ type: "START_SESSION" });
	dispatch({ type: "COUNTDOWN_COMPLETE", problem: testProblem });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("game-store tileSeen clearing", () => {
	beforeEach(() => {
		const { dispatch, resetCvState } = useGameStore.getState();
		dispatch({ type: "RESET" });
		resetCvState();
	});

	it("clears tileSeen after temporal buffer exceeds miss tolerance", () => {
		enterScanningPhase();
		const { processDetections } = useGameStore.getState();

		// Matching detection sets tileSeen
		processDetections(makeDetection(7));
		expect(useGameStore.getState().tileSeen).toBe(7);

		// Exceed miss tolerance: N+1 consecutive empty frames
		for (let i = 0; i <= MAX_CONSECUTIVE_MISSES; i++) {
			processDetections([]);
		}

		expect(useGameStore.getState().tileSeen).toBeNull();
	});

	it("preserves tileSeen within miss tolerance", () => {
		enterScanningPhase();
		const { processDetections } = useGameStore.getState();

		// Matching detection sets tileSeen
		processDetections(makeDetection(7));
		expect(useGameStore.getState().tileSeen).toBe(7);

		// Within tolerance: N consecutive empty frames
		for (let i = 0; i < MAX_CONSECUTIVE_MISSES; i++) {
			processDetections([]);
		}

		expect(useGameStore.getState().tileSeen).toBe(7);
	});

	it("tileSeen stays null when no detection ever matched", () => {
		enterScanningPhase();
		const { processDetections } = useGameStore.getState();

		// Empty frames when tileSeen is already null — should remain null
		for (let i = 0; i <= MAX_CONSECUTIVE_MISSES; i++) {
			processDetections([]);
		}

		expect(useGameStore.getState().tileSeen).toBeNull();
	});
});

describe("game-store processDetections pipeline result", () => {
	beforeEach(() => {
		const { dispatch, resetCvState } = useGameStore.getState();
		dispatch({ type: "RESET" });
		resetCvState();
	});

	it("returns null when not in scanning phase", () => {
		const result = useGameStore.getState().processDetections([]);
		expect(result).toBeNull();
	});

	it("returns pipeline stage info with detection counts", () => {
		enterScanningPhase();
		const result = useGameStore.getState().processDetections(makeDetection(7));

		expect(result).toEqual({
			detectionCount: 1,
			candidateCount: 1,
			matchFound: true,
			temporalEvent: "TILE_SEEN",
		});
	});

	it("returns matchFound false for wrong answer", () => {
		enterScanningPhase();
		const result = useGameStore.getState().processDetections(makeDetection(5));

		expect(result).toEqual({
			detectionCount: 1,
			candidateCount: 1,
			matchFound: false,
			temporalEvent: "NONE",
		});
	});

	it("returns zero counts for empty detections", () => {
		enterScanningPhase();
		const result = useGameStore.getState().processDetections([]);

		expect(result).toEqual({
			detectionCount: 0,
			candidateCount: 0,
			matchFound: false,
			temporalEvent: "NONE",
		});
	});
});
