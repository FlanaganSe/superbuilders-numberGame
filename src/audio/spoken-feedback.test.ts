import { describe, expect, it, vi } from "vitest";
import type { Problem } from "../types/game";
import {
	buildCorrectSequence,
	buildTimeoutSequence,
	playSentence,
} from "./spoken-feedback";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeProblem(overrides: Partial<Problem> = {}): Problem {
	return {
		left: 3,
		right: 5,
		operator: "+",
		answer: 8,
		displayAnswer: "8",
		...overrides,
	};
}

// ─── buildCorrectSequence ───────────────────────────────────────────────────

describe("buildCorrectSequence", () => {
	it("returns addition sequence: left and right make answer", () => {
		const p = makeProblem({ left: 3, right: 5, answer: 8, operator: "+" });
		expect(buildCorrectSequence(p, 1, 3)).toEqual([
			"number3",
			"phraseAnd",
			"number5",
			"phraseMake",
			"number8",
		]);
	});

	it("returns subtraction sequence: left take-away right is answer", () => {
		const p = makeProblem({ left: 7, right: 3, answer: 4, operator: "-" });
		expect(buildCorrectSequence(p, 2, 3)).toEqual([
			"number7",
			"phraseTakeAway",
			"number3",
			"phraseIs",
			"number4",
		]);
	});

	it("returns missing-addend sequence: left and answer make target", () => {
		const p = makeProblem({
			left: 3,
			right: 5,
			answer: 5,
			operator: "+",
			unknownPosition: "right",
			target: 8,
		});
		expect(buildCorrectSequence(p, 1, 3)).toEqual([
			"number3",
			"phraseAnd",
			"number5",
			"phraseMake",
			"number8",
		]);
	});

	it("returns Make-10 sequence using phraseMakeTen clip", () => {
		const p = makeProblem({
			left: 6,
			right: 4,
			answer: 4,
			operator: "+",
			unknownPosition: "right",
			target: 10,
		});
		expect(buildCorrectSequence(p, 1, 3)).toEqual([
			"number6",
			"phraseAnd",
			"number4",
			"phraseMakeTen",
		]);
	});

	it("returns [] for subtraction with left > 9", () => {
		const p = makeProblem({ left: 12, right: 5, answer: 7, operator: "-" });
		expect(buildCorrectSequence(p, 3, 3)).toEqual([]);
	});

	it("returns [] for difficulty > 3 (expertise reversal)", () => {
		const p = makeProblem({ left: 3, right: 5, answer: 8, operator: "+" });
		expect(buildCorrectSequence(p, 4, 3)).toEqual([]);
	});

	it("returns [] for spelling (answer < 0)", () => {
		const p = makeProblem({ answer: -1 });
		expect(buildCorrectSequence(p, 1, 3)).toEqual([]);
	});

	it("returns [] for unknownPosition 'left' (unsupported)", () => {
		const p = makeProblem({
			left: 3,
			right: 5,
			answer: 3,
			operator: "+",
			unknownPosition: "left",
			target: 8,
		});
		expect(buildCorrectSequence(p, 1, 3)).toEqual([]);
	});

	it("returns [] for subtraction with answer > 9", () => {
		const p = makeProblem({ left: 5, right: 3, answer: 12, operator: "-" });
		expect(buildCorrectSequence(p, 1, 3)).toEqual([]);
	});

	it("handles addition with right === 0", () => {
		const p = makeProblem({ left: 5, right: 0, answer: 5, operator: "+" });
		expect(buildCorrectSequence(p, 1, 3)).toEqual([
			"number5",
			"phraseAnd",
			"number0",
			"phraseMake",
			"number5",
		]);
	});
});

// ─── buildTimeoutSequence ───────────────────────────────────────────────────

describe("buildTimeoutSequence", () => {
	it("returns 'the answer is N' for attempt >= 2", () => {
		const p = makeProblem({ answer: 8 });
		expect(buildTimeoutSequence(p, 2, 2)).toEqual([
			"phraseTheAnswerIs",
			"number8",
		]);
	});

	it("returns [] for attempt 1 (no worked example)", () => {
		const p = makeProblem({ answer: 8 });
		expect(buildTimeoutSequence(p, 2, 1)).toEqual([]);
	});

	it("returns [] for difficulty > 3", () => {
		const p = makeProblem({ answer: 8 });
		expect(buildTimeoutSequence(p, 4, 2)).toEqual([]);
	});

	it("returns [] for spelling (answer < 0)", () => {
		const p = makeProblem({ answer: -1 });
		expect(buildTimeoutSequence(p, 1, 2)).toEqual([]);
	});

	it("works with answer === 0 (e.g., 5 - 5)", () => {
		const p = makeProblem({ left: 5, right: 5, answer: 0, operator: "-" });
		expect(buildTimeoutSequence(p, 2, 2)).toEqual([
			"phraseTheAnswerIs",
			"number0",
		]);
	});

	it("works for Make-10 (answer is 1-9)", () => {
		const p = makeProblem({
			left: 6,
			answer: 4,
			operator: "+",
			unknownPosition: "right",
			target: 10,
		});
		expect(buildTimeoutSequence(p, 1, 2)).toEqual([
			"phraseTheAnswerIs",
			"number4",
		]);
	});
});

// ─── playSentence ───────────────────────────────────────────────────────────

describe("playSentence", () => {
	it("plays each clip sequentially via onEnd chaining", () => {
		// Mock play that immediately fires onEnd (simulates instant clip completion)
		const calls: string[] = [];
		const play = vi.fn((name: string, onEnd?: () => void) => {
			calls.push(name);
			onEnd?.();
		});

		playSentence(["number3", "phraseAnd", "number5"], play);

		expect(calls).toEqual(["number3", "phraseAnd", "number5"]);
		expect(play).toHaveBeenCalledTimes(3);
	});

	it("cancel function prevents remaining clips from playing", () => {
		// Mock play that captures onEnd without calling it (simulates clip in progress)
		let capturedOnEnd: (() => void) | undefined;
		const play = vi.fn((_name: string, onEnd?: () => void) => {
			capturedOnEnd = onEnd;
		});

		const cancel = playSentence(["number3", "phraseAnd", "number5"], play);

		// Only first clip started (waiting for onEnd)
		expect(play).toHaveBeenCalledTimes(1);
		expect(play).toHaveBeenCalledWith("number3", expect.any(Function));

		// Cancel while first clip is still playing
		cancel();

		// Simulate first clip finishing after cancel
		capturedOnEnd?.();

		// No further clips should play
		expect(play).toHaveBeenCalledTimes(1);
	});

	it("calls onComplete after the last clip finishes", () => {
		const play = vi.fn((_name: string, onEnd?: () => void) => {
			onEnd?.();
		});
		const onComplete = vi.fn();

		playSentence(["number3", "phraseAnd"], play, onComplete);

		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it("does not call onComplete when cancelled", () => {
		let capturedOnEnd: (() => void) | undefined;
		const play = vi.fn((_name: string, onEnd?: () => void) => {
			capturedOnEnd = onEnd;
		});
		const onComplete = vi.fn();

		const cancel = playSentence(["number3"], play, onComplete);
		cancel();
		capturedOnEnd?.();

		expect(onComplete).not.toHaveBeenCalled();
	});

	it("handles empty sequence", () => {
		const play = vi.fn();
		const onComplete = vi.fn();
		const cancel = playSentence([], play, onComplete);

		expect(play).not.toHaveBeenCalled();
		expect(onComplete).toHaveBeenCalledTimes(1);
		cancel(); // should not throw
	});
});
