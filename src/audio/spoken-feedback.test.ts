import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("calls play for each sound in sequence", () => {
		const play = vi.fn();
		playSentence(["number3", "phraseAnd", "number5"], play, 300);

		// t=0: first sound
		vi.advanceTimersByTime(0);
		expect(play).toHaveBeenCalledWith("number3");

		// t=300: second sound
		vi.advanceTimersByTime(300);
		expect(play).toHaveBeenCalledWith("phraseAnd");

		// t=600: third sound
		vi.advanceTimersByTime(300);
		expect(play).toHaveBeenCalledWith("number5");

		expect(play).toHaveBeenCalledTimes(3);
	});

	it("cancel function prevents remaining calls", () => {
		const play = vi.fn();
		const cancel = playSentence(["number3", "phraseAnd", "number5"], play, 300);

		// t=0: first sound fires
		vi.advanceTimersByTime(0);
		expect(play).toHaveBeenCalledTimes(1);

		// Cancel before remaining sounds
		cancel();

		// Advance past all remaining timers
		vi.advanceTimersByTime(1000);
		expect(play).toHaveBeenCalledTimes(1);
	});

	it("handles empty sequence", () => {
		const play = vi.fn();
		const cancel = playSentence([], play);
		vi.advanceTimersByTime(1000);
		expect(play).not.toHaveBeenCalled();
		cancel(); // should not throw
	});
});
