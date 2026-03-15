import { describe, expect, it } from "vitest";
import type { DifficultyLevel, Problem } from "../types/game";
import {
	getCorrectExplanation,
	getCountSequence,
	getTimeoutHint,
} from "./explanation-generator";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addProblem(left: number, right: number): Problem {
	return {
		left,
		right,
		operator: "+",
		answer: left + right,
		displayAnswer: String(left + right),
	};
}

function subProblem(left: number, right: number): Problem {
	return {
		left,
		right,
		operator: "-",
		answer: left - right,
		displayAnswer: String(left - right),
	};
}

function missingAddendProblem(left: number, right: number): Problem {
	return {
		left,
		right,
		operator: "+",
		answer: right,
		displayAnswer: String(right),
		unknownPosition: "right" as const,
		target: left + right,
	};
}

function make10Problem(left: number): Problem {
	const right = 10 - left;
	return {
		left,
		right,
		operator: "+",
		answer: right,
		displayAnswer: String(right),
		unknownPosition: "right" as const,
		target: 10,
	};
}

const spellingProblem: Problem = {
	left: 0,
	right: 0,
	operator: "+",
	answer: -1,
	displayAnswer: "CAT",
};

// ─── getCorrectExplanation ───────────────────────────────────────────────────

describe("getCorrectExplanation", () => {
	describe("addition, first attempt (stars=3)", () => {
		it("difficulty 1-3: full explanation with counting", () => {
			const p = addProblem(3, 4);
			for (const d of [1, 2, 3] as DifficultyLevel[]) {
				expect(getCorrectExplanation(p, d, 3)).toBe(
					"3 + 4 = 7. Three, then four more: 4, 5, 6, 7!",
				);
			}
		});

		it("difficulty 4-5: brief acknowledgment", () => {
			const p = addProblem(3, 4);
			expect(getCorrectExplanation(p, 4, 3)).toBe("Seven!");
			expect(getCorrectExplanation(p, 5, 3)).toBe("Seven!");
		});
	});

	describe("subtraction, first attempt (stars=3)", () => {
		it("difficulty 1-3: full explanation with counting back", () => {
			const p = subProblem(7, 3);
			expect(getCorrectExplanation(p, 1, 3)).toBe(
				"7 - 3 = 4. Seven, take away three: 6, 5, 4!",
			);
		});

		it("difficulty 4-5: brief acknowledgment", () => {
			const p = subProblem(7, 3);
			expect(getCorrectExplanation(p, 4, 3)).toBe("Four!");
		});
	});

	describe("retry (stars=1 or 2)", () => {
		it("difficulty 1-3: process praise", () => {
			const p = addProblem(3, 4);
			expect(getCorrectExplanation(p, 1, 2)).toBe(
				"You figured it out! 3 + 4 = 7.",
			);
			expect(getCorrectExplanation(p, 2, 1)).toBe(
				"You figured it out! 3 + 4 = 7.",
			);
		});

		it("difficulty 4-5: returns null", () => {
			const p = addProblem(3, 4);
			expect(getCorrectExplanation(p, 4, 2)).toBeNull();
			expect(getCorrectExplanation(p, 5, 1)).toBeNull();
		});

		it("subtraction retry at low difficulty", () => {
			const p = subProblem(7, 3);
			expect(getCorrectExplanation(p, 2, 2)).toBe(
				"You figured it out! 7 - 3 = 4.",
			);
		});
	});

	describe("missing-addend, first attempt (stars=3)", () => {
		it("difficulty 1-3: part-whole explanation", () => {
			const p = missingAddendProblem(3, 4);
			expect(getCorrectExplanation(p, 1, 3)).toBe(
				"The missing part is 4! 3 and 4 make 7!",
			);
			expect(getCorrectExplanation(p, 3, 3)).toBe(
				"The missing part is 4! 3 and 4 make 7!",
			);
		});

		it("difficulty 4-5: brief acknowledgment", () => {
			const p = missingAddendProblem(3, 4);
			expect(getCorrectExplanation(p, 4, 3)).toBe("Four!");
			expect(getCorrectExplanation(p, 5, 3)).toBe("Four!");
		});
	});

	describe("missing-addend, retry (stars=1 or 2)", () => {
		it("difficulty 1-3: process praise", () => {
			const p = missingAddendProblem(3, 4);
			expect(getCorrectExplanation(p, 1, 2)).toBe(
				"You figured it out! The missing part is 4.",
			);
		});

		it("difficulty 4-5: returns null", () => {
			const p = missingAddendProblem(3, 4);
			expect(getCorrectExplanation(p, 4, 2)).toBeNull();
		});
	});

	describe("make-10, first attempt (stars=3)", () => {
		it("difficulty 1-3: concise make-ten explanation", () => {
			const p = make10Problem(7);
			expect(getCorrectExplanation(p, 1, 3)).toBe("7 and 3 make ten!");
			expect(getCorrectExplanation(p, 3, 3)).toBe("7 and 3 make ten!");
		});

		it("difficulty 4-5: brief acknowledgment", () => {
			const p = make10Problem(7);
			expect(getCorrectExplanation(p, 4, 3)).toBe("Three!");
			expect(getCorrectExplanation(p, 5, 3)).toBe("Three!");
		});
	});

	describe("make-10, retry (stars=1 or 2)", () => {
		it("difficulty 1-3: process praise with make-ten language", () => {
			const p = make10Problem(7);
			expect(getCorrectExplanation(p, 1, 2)).toBe(
				"You figured it out! 7 and 3 make ten.",
			);
		});

		it("difficulty 4-5: returns null", () => {
			const p = make10Problem(7);
			expect(getCorrectExplanation(p, 4, 2)).toBeNull();
		});
	});

	describe("edge cases", () => {
		it("0 + 5 = 5: counting from zero", () => {
			const p = addProblem(0, 5);
			expect(getCorrectExplanation(p, 1, 3)).toBe(
				"0 + 5 = 5. Zero, then five more: 1, 2, 3, 4, 5!",
			);
		});

		it("9 - 0 = 9: take away nothing", () => {
			const p = subProblem(9, 0);
			expect(getCorrectExplanation(p, 1, 3)).toBe(
				"9 - 0 = 9. Take away nothing — still nine!",
			);
		});

		it("5 + 0 = 5: add nothing", () => {
			const p = addProblem(5, 0);
			expect(getCorrectExplanation(p, 1, 3)).toBe(
				"5 + 0 = 5. Add nothing — still five!",
			);
		});

		it("5 - 5 = 0: counting down to zero", () => {
			const p = subProblem(5, 5);
			expect(getCorrectExplanation(p, 1, 3)).toBe(
				"5 - 5 = 0. Five, take away five: 4, 3, 2, 1, 0!",
			);
		});

		it("spelling sentinel returns null", () => {
			expect(getCorrectExplanation(spellingProblem, 1, 3)).toBeNull();
		});
	});
});

// ─── getTimeoutHint ──────────────────────────────────────────────────────────

describe("getTimeoutHint", () => {
	describe("first timeout (attemptNumber=1)", () => {
		it("addition: counting on strategy", () => {
			const p = addProblem(3, 4);
			for (const d of [1, 2, 3, 4, 5] as DifficultyLevel[]) {
				expect(getTimeoutHint(p, d, 1)).toBe("Try counting on from 3.");
			}
		});

		it("subtraction: counting back strategy", () => {
			const p = subProblem(7, 3);
			expect(getTimeoutHint(p, 1, 1)).toBe("Try counting back from 7.");
		});
	});

	describe("repeated timeout (attemptNumber>=2)", () => {
		it("addition, difficulty 1-3: worked support", () => {
			const p = addProblem(3, 4);
			expect(getTimeoutHint(p, 1, 2)).toBe(
				"Let's do it: three, then four more: 4, 5, 6, 7. The answer is 7.",
			);
			expect(getTimeoutHint(p, 3, 3)).toBe(
				"Let's do it: three, then four more: 4, 5, 6, 7. The answer is 7.",
			);
		});

		it("subtraction, difficulty 1-3: worked support", () => {
			const p = subProblem(7, 3);
			expect(getTimeoutHint(p, 2, 2)).toBe(
				"Let's do it: seven, take away three: 6, 5, 4. The answer is 4.",
			);
		});

		it("difficulty 4-5: just the answer", () => {
			const p = addProblem(3, 4);
			expect(getTimeoutHint(p, 4, 2)).toBe("The answer is 7.");
			expect(getTimeoutHint(p, 5, 3)).toBe("The answer is 7.");
		});
	});

	describe("missing-addend timeout", () => {
		it("first timeout: counting on strategy", () => {
			const p = missingAddendProblem(3, 4);
			expect(getTimeoutHint(p, 1, 1)).toBe(
				"3 and what make 7? Try counting on from 3.",
			);
		});

		it("repeated timeout, difficulty 1-3: worked support", () => {
			const p = missingAddendProblem(3, 4);
			expect(getTimeoutHint(p, 1, 2)).toBe(
				"Let's find the missing part: three, then count to 7: 4, 5, 6, 7. The missing part is 4.",
			);
		});

		it("repeated timeout, difficulty 4-5: just the answer", () => {
			const p = missingAddendProblem(3, 4);
			expect(getTimeoutHint(p, 4, 2)).toBe("The missing part is 4.");
		});
	});

	describe("make-10 timeout", () => {
		it("first timeout: make-ten strategy hint", () => {
			const p = make10Problem(7);
			expect(getTimeoutHint(p, 1, 1)).toBe(
				"7 and what make ten? Try counting on from 7.",
			);
		});

		it("repeated timeout, difficulty 1-3: make-ten worked support", () => {
			const p = make10Problem(7);
			expect(getTimeoutHint(p, 1, 2)).toBe(
				"Let's make ten: seven, then count to ten: 8, 9, 10. The missing part is 3.",
			);
		});

		it("repeated timeout, difficulty 4-5: just the answer", () => {
			const p = make10Problem(7);
			expect(getTimeoutHint(p, 4, 2)).toBe("The missing part is 3.");
		});
	});

	describe("edge cases", () => {
		it("0 + 5: worked support from zero", () => {
			const p = addProblem(0, 5);
			expect(getTimeoutHint(p, 1, 2)).toBe(
				"Let's do it: zero, then five more: 1, 2, 3, 4, 5. The answer is 5.",
			);
		});

		it("9 - 0: take away nothing", () => {
			const p = subProblem(9, 0);
			expect(getTimeoutHint(p, 1, 2)).toBe(
				"Let's do it: nine, take away nothing. The answer is 9.",
			);
		});

		it("5 + 0: add nothing", () => {
			const p = addProblem(5, 0);
			expect(getTimeoutHint(p, 1, 2)).toBe(
				"Let's do it: five, add nothing. The answer is 5.",
			);
		});

		it("spelling sentinel returns word", () => {
			expect(getTimeoutHint(spellingProblem, 1, 1)).toBe("The word is CAT.");
			expect(getTimeoutHint(spellingProblem, 1, 2)).toBe("The word is CAT.");
		});
	});
});

// ─── getCountSequence ───────────────────────────────────────────────────────

describe("getCountSequence", () => {
	describe("addition", () => {
		it("returns count-on sequence", () => {
			const p = addProblem(3, 4);
			expect(getCountSequence(p)).toEqual({
				type: "count-on",
				start: 3,
				steps: [4, 5, 6, 7],
			});
		});

		it("returns null when right operand is 0", () => {
			const p = addProblem(5, 0);
			expect(getCountSequence(p)).toBeNull();
		});
	});

	describe("subtraction", () => {
		it("returns count-back sequence", () => {
			const p = subProblem(7, 3);
			expect(getCountSequence(p)).toEqual({
				type: "count-back",
				start: 7,
				steps: [6, 5, 4],
			});
		});

		it("returns null when right operand is 0", () => {
			const p = subProblem(9, 0);
			expect(getCountSequence(p)).toBeNull();
		});
	});

	describe("missing-addend", () => {
		it("returns count-on from known part", () => {
			const p = missingAddendProblem(3, 4);
			expect(getCountSequence(p)).toEqual({
				type: "count-on",
				start: 3,
				steps: [4, 5, 6, 7],
			});
		});

		it("returns null when answer is 0", () => {
			const p = missingAddendProblem(7, 0);
			expect(getCountSequence(p)).toBeNull();
		});
	});

	describe("make-10", () => {
		it("returns count-on from left to 10", () => {
			const p = make10Problem(7);
			expect(getCountSequence(p)).toEqual({
				type: "count-on",
				start: 7,
				steps: [8, 9, 10],
			});
		});
	});

	describe("edge cases", () => {
		it("spelling problem returns null", () => {
			expect(getCountSequence(spellingProblem)).toBeNull();
		});

		it("0 + 5: counts from 0", () => {
			const p = addProblem(0, 5);
			expect(getCountSequence(p)).toEqual({
				type: "count-on",
				start: 0,
				steps: [1, 2, 3, 4, 5],
			});
		});

		it("5 - 5 = 0: counts down to 0", () => {
			const p = subProblem(5, 5);
			expect(getCountSequence(p)).toEqual({
				type: "count-back",
				start: 5,
				steps: [4, 3, 2, 1, 0],
			});
		});
	});
});
