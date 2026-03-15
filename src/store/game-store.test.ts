import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_CONSECUTIVE_MISSES } from "../cv/temporal-buffer";
import { MAX_SPELLING_WORDS } from "../engine/spelling-words";
import type { DetectedDigit } from "../types/cv";
import type { Problem, SpellingProblem } from "../types/game";
import * as featureFlagsModule from "../utils/feature-flags";
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
	confidence = 0.9,
): readonly DetectedDigit[] {
	return [
		{
			digit,
			confidence,
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

// ─── Camera uncertainty tests ───────────────────────────────────────────────

describe("game-store camera uncertainty", () => {
	beforeEach(() => {
		const { dispatch, resetCvState } = useGameStore.getState();
		dispatch({ type: "RESET" });
		resetCvState();
	});

	it("cameraUncertain is false initially", () => {
		expect(useGameStore.getState().cameraUncertain).toBe(false);
		expect(useGameStore.getState().hadTileThisRound).toBe(false);
	});

	it("sets hadTileThisRound when TILE_SEEN fires", () => {
		enterScanningPhase();
		const { processDetections } = useGameStore.getState();

		processDetections(makeDetection(7)); // TILE_SEEN
		expect(useGameStore.getState().hadTileThisRound).toBe(true);
	});

	it("sets cameraUncertain after tileSeen clears (hard reset)", () => {
		enterScanningPhase();
		const { processDetections } = useGameStore.getState();

		processDetections(makeDetection(7)); // TILE_SEEN → hadTileThisRound=true, tileSeen=7
		expect(useGameStore.getState().cameraUncertain).toBe(false);

		// Within miss tolerance — tileSeen stays, so uncertain stays false
		for (let i = 0; i < MAX_CONSECUTIVE_MISSES; i++) {
			processDetections([]);
			expect(useGameStore.getState().cameraUncertain).toBe(false);
		}

		// Exceed tolerance → hard reset clears tileSeen → uncertain fires
		processDetections([]);
		expect(useGameStore.getState().tileSeen).toBeNull();
		expect(useGameStore.getState().cameraUncertain).toBe(true);
	});

	it("does NOT set cameraUncertain when no tile was ever seen this round", () => {
		enterScanningPhase();
		const { processDetections } = useGameStore.getState();

		processDetections([]); // no prior tile
		expect(useGameStore.getState().cameraUncertain).toBe(false);
		expect(useGameStore.getState().hadTileThisRound).toBe(false);
	});

	it("clears cameraUncertain when detection returns", () => {
		enterScanningPhase();
		const { processDetections } = useGameStore.getState();

		processDetections(makeDetection(7)); // TILE_SEEN

		// Exceed tolerance to trigger uncertainty
		for (let i = 0; i <= MAX_CONSECUTIVE_MISSES; i++) {
			processDetections([]);
		}
		expect(useGameStore.getState().cameraUncertain).toBe(true);

		processDetections(makeDetection(7)); // detection returns
		expect(useGameStore.getState().cameraUncertain).toBe(false);
	});

	it("resets both flags on resetCvState", () => {
		enterScanningPhase();
		const { processDetections, resetCvState } = useGameStore.getState();

		processDetections(makeDetection(7)); // hadTileThisRound=true
		// Exceed tolerance to trigger uncertainty
		for (let i = 0; i <= MAX_CONSECUTIVE_MISSES; i++) {
			processDetections([]);
		}
		expect(useGameStore.getState().cameraUncertain).toBe(true);
		resetCvState();

		expect(useGameStore.getState().cameraUncertain).toBe(false);
		expect(useGameStore.getState().hadTileThisRound).toBe(false);
	});

	it("does NOT set cameraUncertain while tileSeen is still set (avoids contradicting tile-seen feedback)", () => {
		enterScanningPhase();
		const { processDetections } = useGameStore.getState();

		processDetections(makeDetection(7)); // TILE_SEEN → tileSeen=7
		expect(useGameStore.getState().tileSeen).toBe(7);

		// 1 empty frame — within tolerance, tileSeen still set
		processDetections([]);
		expect(useGameStore.getState().tileSeen).toBe(7);
		expect(useGameStore.getState().cameraUncertain).toBe(false);
	});

	it("does NOT set cameraUncertain for wrong tile (TILE_SEEN only fires for correct match)", () => {
		enterScanningPhase();
		const { processDetections } = useGameStore.getState();

		// Problem answer is 7, place wrong tile 5
		processDetections(makeDetection(5));
		expect(useGameStore.getState().hadTileThisRound).toBe(false);

		processDetections([]);
		expect(useGameStore.getState().cameraUncertain).toBe(false);
	});
});

// ─── Spelling mode tests ────────────────────────────────────────────────────

const spellingProblem: SpellingProblem = {
	word: "CAT",
	letters: ["C", "A", "T"],
};

/** Create a letter detection. classId 10=A, 11=B, ..., 35=Z. */
function makeLetterDetection(
	letter: string,
	x: number,
): readonly DetectedDigit[] {
	const classId = letter.charCodeAt(0) - 65 + 10;
	return [
		{
			digit: classId,
			confidence: 0.9,
			bbox: { x, y: 0.5, width: 0.1, height: 0.1 },
		},
	];
}

function enterSpellingScanningPhase(): void {
	const { dispatch, setGameKind, setSpellingProblem } = useGameStore.getState();
	setGameKind("spelling");
	dispatch({
		type: "START_SESSION",
		maxProblems: MAX_SPELLING_WORDS,
		modeName: "Spelling",
	});
	setSpellingProblem(spellingProblem);
	dispatch({
		type: "COUNTDOWN_COMPLETE",
		problem: {
			left: 0,
			right: 0,
			operator: "+",
			answer: -1,
			displayAnswer: "CAT",
		},
	});
}

describe("game-store spelling processDetections", () => {
	beforeEach(() => {
		const { dispatch, resetCvState, setGameKind } = useGameStore.getState();
		dispatch({ type: "RESET" });
		resetCvState();
		setGameKind("math"); // reset to default
	});

	it("returns null when not in scanning phase", () => {
		useGameStore.getState().setGameKind("spelling");
		const result = useGameStore.getState().processDetections([]);
		expect(result).toBeNull();
	});

	it("detects correct spelling word", () => {
		enterSpellingScanningPhase();

		// Simulate detections for C, A, T sorted left-to-right
		const detections: DetectedDigit[] = [
			...makeLetterDetection("C", 0.1),
			...makeLetterDetection("A", 0.3),
			...makeLetterDetection("T", 0.5),
		];

		const result = useGameStore.getState().processDetections(detections);

		expect(result).toEqual({
			detectionCount: 3,
			candidateCount: 3,
			matchFound: true,
			temporalEvent: "TILE_SEEN",
		});
		expect(useGameStore.getState().tileSeen).toBe("CAT");
	});

	it("does not match wrong word", () => {
		enterSpellingScanningPhase();

		// Simulate detections for D, O, G
		const detections: DetectedDigit[] = [
			...makeLetterDetection("D", 0.1),
			...makeLetterDetection("O", 0.3),
			...makeLetterDetection("G", 0.5),
		];

		const result = useGameStore.getState().processDetections(detections);

		expect(result?.matchFound).toBe(false);
		expect(useGameStore.getState().tileSeen).toBeNull();
	});

	it("commits spelling answer after 3 consecutive frames", () => {
		enterSpellingScanningPhase();

		const detections: DetectedDigit[] = [
			...makeLetterDetection("C", 0.1),
			...makeLetterDetection("A", 0.3),
			...makeLetterDetection("T", 0.5),
		];

		const { processDetections } = useGameStore.getState();
		processDetections(detections); // Frame 1: TILE_SEEN
		processDetections(detections); // Frame 2: NONE
		processDetections(detections); // Frame 3: ANSWER_COMMITTED

		// Should have dispatched ANSWER_CORRECT → phase is now "success"
		expect(useGameStore.getState().gameState.phase.phase).toBe("success");
	});

	it("tracks detected letters in store", () => {
		enterSpellingScanningPhase();

		const detections: DetectedDigit[] = [
			...makeLetterDetection("C", 0.1),
			...makeLetterDetection("A", 0.3),
		];

		useGameStore.getState().processDetections(detections);

		expect(useGameStore.getState().detectedLetters).toEqual(["C", "A"]);
	});

	it("returns no match when no spelling problem is set", () => {
		const { dispatch, setGameKind } = useGameStore.getState();
		setGameKind("spelling");
		dispatch({ type: "START_SESSION", maxProblems: 3, modeName: "Spelling" });
		// Don't set spelling problem
		dispatch({
			type: "COUNTDOWN_COMPLETE",
			problem: {
				left: 0,
				right: 0,
				operator: "+",
				answer: -1,
				displayAnswer: "",
			},
		});

		const result = useGameStore.getState().processDetections([]);
		expect(result?.matchFound).toBe(false);
		expect(result?.candidateCount).toBe(0);
	});
});

// ─── Wrong-answer detection tests ───────────────────────────────────────────

describe("game-store wrong-answer detection", () => {
	beforeEach(() => {
		const { dispatch, resetCvState, setGameKind } = useGameStore.getState();
		dispatch({ type: "RESET" });
		resetCvState();
		setGameKind("math");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	function enterScanningAndAdvanceTime(): void {
		enterScanningPhase();
		// Mock Date.now to be 3.1s after round started
		const roundStart =
			useGameStore.getState().gameState.currentRoundStartedAt ?? 0;
		vi.spyOn(Date, "now").mockReturnValue(roundStart + 3100);
	}

	it("wrongTileSeen is null initially", () => {
		expect(useGameStore.getState().wrongTileSeen).toBeNull();
	});

	it("sets wrongTileSeen after 2 consecutive frames of same wrong value (>3s)", () => {
		enterScanningAndAdvanceTime();
		const { processDetections } = useGameStore.getState();

		processDetections(makeDetection(8)); // Frame 1: wrongConsecutive=1
		expect(useGameStore.getState().wrongTileSeen).toBeNull();

		processDetections(makeDetection(8)); // Frame 2: wrongConsecutive=2 → wrongTileSeen=8
		expect(useGameStore.getState().wrongTileSeen).toBe(8);
	});

	it("clears wrongTileSeen when detections become empty", () => {
		enterScanningAndAdvanceTime();
		const { processDetections } = useGameStore.getState();

		processDetections(makeDetection(8));
		processDetections(makeDetection(8));
		expect(useGameStore.getState().wrongTileSeen).toBe(8);

		processDetections([]); // No detections → reset
		expect(useGameStore.getState().wrongTileSeen).toBeNull();
	});

	it("clears wrongTileSeen when correct answer is detected", () => {
		enterScanningAndAdvanceTime();
		const { processDetections } = useGameStore.getState();

		processDetections(makeDetection(8));
		processDetections(makeDetection(8));
		expect(useGameStore.getState().wrongTileSeen).toBe(8);

		processDetections(makeDetection(7)); // Correct answer (problem.answer = 7)
		expect(useGameStore.getState().wrongTileSeen).toBeNull();
	});

	it("does NOT activate within the first 3 seconds", () => {
		enterScanningPhase();
		// Do NOT advance past 3s
		const { processDetections } = useGameStore.getState();

		processDetections(makeDetection(8));
		processDetections(makeDetection(8));
		expect(useGameStore.getState().wrongTileSeen).toBeNull();
	});

	it("resets wrongTileSeen on resetCvState", () => {
		enterScanningAndAdvanceTime();
		const { processDetections, resetCvState } = useGameStore.getState();

		processDetections(makeDetection(8));
		processDetections(makeDetection(8));
		expect(useGameStore.getState().wrongTileSeen).toBe(8);

		resetCvState();
		expect(useGameStore.getState().wrongTileSeen).toBeNull();
	});

	it("resets tracker when wrong value changes", () => {
		enterScanningAndAdvanceTime();
		const { processDetections } = useGameStore.getState();

		processDetections(makeDetection(8)); // Frame 1: tracking 8
		processDetections(makeDetection(5)); // Frame 2: different value → restart at 1
		expect(useGameStore.getState().wrongTileSeen).toBeNull();

		processDetections(makeDetection(5)); // Frame 3: consecutive=2 for 5
		expect(useGameStore.getState().wrongTileSeen).toBe(5);
	});
});

// ─── Confidence-aware wrong-tile tests ───────────────────────────────────

describe("game-store confidence-aware wrong-tile", () => {
	beforeEach(() => {
		const { dispatch, resetCvState, setGameKind } = useGameStore.getState();
		dispatch({ type: "RESET" });
		resetCvState();
		setGameKind("math");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	function enterScanningAndAdvanceTime(): void {
		enterScanningPhase();
		const roundStart =
			useGameStore.getState().gameState.currentRoundStartedAt ?? 0;
		vi.spyOn(Date, "now").mockReturnValue(roundStart + 3100);
	}

	it("with cvConfidence OFF: wrong-tile fires regardless of confidence", () => {
		vi.spyOn(featureFlagsModule, "getFeatureFlags").mockReturnValue({
			recognition: "mock",
			debug: false,
			overlay: "none",
			cvConfidence: false,
		});
		enterScanningAndAdvanceTime();
		const { processDetections } = useGameStore.getState();

		// Low confidence detection
		processDetections(makeDetection(8, 0.55));
		processDetections(makeDetection(8, 0.55));
		expect(useGameStore.getState().wrongTileSeen).toBe(8);
		expect(useGameStore.getState().cameraUncertain).toBe(false);
	});

	it("with cvConfidence ON + high confidence: wrong-tile fires normally", () => {
		vi.spyOn(featureFlagsModule, "getFeatureFlags").mockReturnValue({
			recognition: "mock",
			debug: false,
			overlay: "none",
			cvConfidence: true,
		});
		enterScanningAndAdvanceTime();
		const { processDetections } = useGameStore.getState();

		processDetections(makeDetection(8, 0.85));
		processDetections(makeDetection(8, 0.85));
		expect(useGameStore.getState().wrongTileSeen).toBe(8);
		expect(useGameStore.getState().cameraUncertain).toBe(false);
	});

	it("with cvConfidence ON + low confidence: cameraUncertain instead of wrongTileSeen", () => {
		vi.spyOn(featureFlagsModule, "getFeatureFlags").mockReturnValue({
			recognition: "mock",
			debug: false,
			overlay: "none",
			cvConfidence: true,
		});
		enterScanningAndAdvanceTime();
		const { processDetections } = useGameStore.getState();

		processDetections(makeDetection(8, 0.55));
		processDetections(makeDetection(8, 0.55));
		expect(useGameStore.getState().wrongTileSeen).toBeNull();
		expect(useGameStore.getState().cameraUncertain).toBe(true);

		// Third frame — cameraUncertain must remain stable (no oscillation)
		processDetections(makeDetection(8, 0.55));
		expect(useGameStore.getState().cameraUncertain).toBe(true);
		expect(useGameStore.getState().wrongTileSeen).toBeNull();
	});

	it("with cvConfidence ON + borderline confidence (exactly 0.65): fires wrong-tile", () => {
		vi.spyOn(featureFlagsModule, "getFeatureFlags").mockReturnValue({
			recognition: "mock",
			debug: false,
			overlay: "none",
			cvConfidence: true,
		});
		enterScanningAndAdvanceTime();
		const { processDetections } = useGameStore.getState();

		processDetections(makeDetection(8, 0.65));
		processDetections(makeDetection(8, 0.65));
		expect(useGameStore.getState().wrongTileSeen).toBe(8);
	});
});
