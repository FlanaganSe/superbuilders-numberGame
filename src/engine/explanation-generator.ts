import type { DifficultyLevel, Problem } from "../types/game";

// ─── Number words ────────────────────────────────────────────────────────────

const NUMBER_WORDS = [
	"zero",
	"one",
	"two",
	"three",
	"four",
	"five",
	"six",
	"seven",
	"eight",
	"nine",
] as const;

function numberWord(n: number): string {
	return NUMBER_WORDS[n] ?? String(n);
}

// ─── Counting helpers ────────────────────────────────────────────────────────

/** countOnFrom(3, 4) → "4, 5, 6, 7" */
export function countOnFrom(start: number, steps: number): string {
	return Array.from({ length: steps }, (_, i) => start + i + 1).join(", ");
}

/** countBackFrom(7, 3) → "6, 5, 4" */
export function countBackFrom(start: number, steps: number): string {
	return Array.from({ length: steps }, (_, i) => start - i - 1).join(", ");
}

// ─── Count sequence (structured) ────────────────────────────────────────────

export interface CountSequence {
	readonly type: "count-on" | "count-back";
	readonly start: number;
	readonly steps: readonly number[];
}

/**
 * Returns the count sequence for a problem, if applicable.
 * Used by FeedbackOverlay to animate each step with staggered entrance.
 */
export function getCountSequence(problem: Problem): CountSequence | null {
	if (problem.answer < 0) return null;

	// Missing-addend: count on from known part
	if (problem.unknownPosition === "right" && problem.target !== undefined) {
		if (problem.answer === 0) return null;
		return {
			type: "count-on",
			start: problem.left,
			steps: Array.from(
				{ length: problem.answer },
				(_, i) => problem.left + i + 1,
			),
		};
	}

	if (problem.operator === "+") {
		if (problem.right === 0) return null;
		return {
			type: "count-on",
			start: problem.left,
			steps: Array.from(
				{ length: problem.right },
				(_, i) => problem.left + i + 1,
			),
		};
	}

	// Subtraction
	if (problem.right === 0) return null;
	return {
		type: "count-back",
		start: problem.left,
		steps: Array.from(
			{ length: problem.right },
			(_, i) => problem.left - i - 1,
		),
	};
}

// ─── Correct explanation ─────────────────────────────────────────────────────

/**
 * Returns explanation text to show below the celebration on correct answer.
 * Returns null if difficulty is too high (Sweller's expertise reversal)
 * or for spelling problems (answer < 0).
 */
export function getCorrectExplanation(
	problem: Problem,
	difficulty: DifficultyLevel,
	stars: 1 | 2 | 3,
): string | null {
	// Spelling sentinel — no math explanation
	if (problem.answer < 0) return null;

	// Missing-addend: part-whole language
	if (problem.unknownPosition === "right" && problem.target !== undefined) {
		const isMake10 = problem.target === 10;
		if (stars === 3 && difficulty <= 3) {
			return isMake10
				? `${problem.left} and ${problem.answer} make ten!`
				: `The missing part is ${problem.answer}! ${problem.left} and ${problem.answer} make ${problem.target}!`;
		}
		if (stars === 3) {
			return `${capitalize(numberWord(problem.answer))}!`;
		}
		if (difficulty <= 3) {
			return isMake10
				? `You figured it out! ${problem.left} and ${problem.answer} make ten.`
				: `You figured it out! The missing part is ${problem.answer}.`;
		}
		return null;
	}

	if (stars === 3) {
		// First attempt
		if (difficulty <= 3) {
			return getFullExplanation(problem);
		}
		// Difficulty 4-5: brief acknowledgment
		return `${capitalize(numberWord(problem.answer))}!`;
	}

	// Retry (stars 1-2)
	if (difficulty <= 3) {
		return `You figured it out! ${problem.left} ${problem.operator} ${problem.right} = ${problem.answer}.`;
	}

	// High difficulty retry — no explanation
	return null;
}

// ─── Timeout hint ────────────────────────────────────────────────────────────

/**
 * Returns the hint/support text for timeout feedback.
 * Ranges from strategy hint (first timeout) to worked support (repeated)
 * to just the answer (high difficulty, repeated).
 */
export function getTimeoutHint(
	problem: Problem,
	difficulty: DifficultyLevel,
	attemptNumber: number,
): string {
	// Spelling sentinel — word-based fallback
	if (problem.answer < 0) {
		return `The word is ${problem.displayAnswer}.`;
	}

	// Missing-addend: part-whole hints
	if (problem.unknownPosition === "right" && problem.target !== undefined) {
		const isMake10 = problem.target === 10;
		if (attemptNumber === 1) {
			return isMake10
				? `${problem.left} and what make ten? Try counting on from ${problem.left}.`
				: `${problem.left} and what make ${problem.target}? Try counting on from ${problem.left}.`;
		}
		if (difficulty <= 3) {
			return isMake10
				? `Let's make ten: ${numberWord(problem.left)}, then count to ten: ${countOnFrom(problem.left, problem.answer)}. The missing part is ${problem.answer}.`
				: `Let's find the missing part: ${numberWord(problem.left)}, then count to ${problem.target}: ${countOnFrom(problem.left, problem.answer)}. The missing part is ${problem.answer}.`;
		}
		return `The missing part is ${problem.answer}.`;
	}

	if (attemptNumber === 1) {
		// First timeout: strategy hint (all difficulty levels)
		if (problem.operator === "+") {
			return `Try counting on from ${problem.left}.`;
		}
		return `Try counting back from ${problem.left}.`;
	}

	// Repeated timeout (attemptNumber >= 2)
	if (difficulty <= 3) {
		return getWorkedSupport(problem);
	}

	// High difficulty: just the answer
	return `The answer is ${problem.answer}.`;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function getFullExplanation(problem: Problem): string {
	const { left, right, operator, answer } = problem;

	if (operator === "+") {
		if (right === 0) {
			return `${left} + 0 = ${answer}. Add nothing — still ${numberWord(answer)}!`;
		}
		return `${left} + ${right} = ${answer}. ${capitalize(numberWord(left))}, then ${numberWord(right)} more: ${countOnFrom(left, right)}!`;
	}

	// Subtraction
	if (right === 0) {
		return `${left} - 0 = ${answer}. Take away nothing — still ${numberWord(answer)}!`;
	}
	return `${left} - ${right} = ${answer}. ${capitalize(numberWord(left))}, take away ${numberWord(right)}: ${countBackFrom(left, right)}!`;
}

function getWorkedSupport(problem: Problem): string {
	const { left, right, operator, answer } = problem;

	if (operator === "+") {
		if (right === 0) {
			return `Let's do it: ${numberWord(left)}, add nothing. The answer is ${answer}.`;
		}
		return `Let's do it: ${numberWord(left)}, then ${numberWord(right)} more: ${countOnFrom(left, right)}. The answer is ${answer}.`;
	}

	// Subtraction
	if (right === 0) {
		return `Let's do it: ${numberWord(left)}, take away nothing. The answer is ${answer}.`;
	}
	return `Let's do it: ${numberWord(left)}, take away ${numberWord(right)}: ${countBackFrom(left, right)}. The answer is ${answer}.`;
}
