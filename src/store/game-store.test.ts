import { beforeEach, describe, expect, it } from "vitest";
import { MAX_CONSECUTIVE_MISSES } from "../cv/temporal-buffer";
import { MAX_SPELLING_WORDS } from "../engine/spelling-words";
import type { DetectedDigit } from "../types/cv";
import type { Problem, SpellingProblem } from "../types/game";
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
