import type { DifficultyLevel, GameMode, Problem } from "../types/game";

// ─── Answer constraint ──────────────────────────────────────────────────────
// Answers must be a single digit (0-9) because the child places one physical
// tile in front of the camera and the CV system recognises individual digits.

export const MAX_ANSWER = 9;

// ─── Difficulty Ranges ──────────────────────────────────────────────────────

interface OperandRange {
	readonly minLeft: number;
	readonly maxLeft: number;
	readonly minRight: number;
	readonly maxRight: number;
}

// Difficulty progression: larger minimum operands → fewer "trivial" sums.
const ADDITION_RANGES: Record<DifficultyLevel, OperandRange> = {
	1: { minLeft: 0, maxLeft: 4, minRight: 0, maxRight: 4 },
	2: { minLeft: 0, maxLeft: 5, minRight: 0, maxRight: 5 },
	3: { minLeft: 1, maxLeft: 6, minRight: 1, maxRight: 6 },
	4: { minLeft: 2, maxLeft: 7, minRight: 2, maxRight: 7 },
	5: { minLeft: 3, maxLeft: 7, minRight: 3, maxRight: 6 },
};

// Subtraction left operand is displayed on screen (can exceed 9).
// Only the answer (left − right) must be 0-9.
const SUBTRACTION_RANGES: Record<DifficultyLevel, OperandRange> = {
	1: { minLeft: 1, maxLeft: 5, minRight: 0, maxRight: 3 },
	2: { minLeft: 3, maxLeft: 9, minRight: 1, maxRight: 5 },
	3: { minLeft: 5, maxLeft: 12, minRight: 2, maxRight: 7 },
	4: { minLeft: 7, maxLeft: 15, minRight: 3, maxRight: 9 },
	5: { minLeft: 10, maxLeft: 18, minRight: 5, maxRight: 9 },
};

// ─── Random helper ──────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Problem generation ─────────────────────────────────────────────────────

function generateAddition(difficulty: DifficultyLevel): Problem {
	const range = ADDITION_RANGES[difficulty];
	let left: number;
	let right: number;

	do {
		left = randomInt(range.minLeft, range.maxLeft);
		right = randomInt(range.minRight, range.maxRight);
	} while (left + right > MAX_ANSWER);

	const answer = left + right;
	return {
		left,
		right,
		operator: "+",
		answer,
		displayAnswer: answer.toString(),
	};
}

function generateSubtraction(difficulty: DifficultyLevel): Problem {
	const range = SUBTRACTION_RANGES[difficulty];
	let left: number;
	let right: number;

	do {
		left = randomInt(range.minLeft, range.maxLeft);
		right = randomInt(range.minRight, range.maxRight);
	} while (left - right < 0 || left - right > MAX_ANSWER);

	const answer = left - right;
	return {
		left,
		right,
		operator: "-",
		answer,
		displayAnswer: answer.toString(),
	};
}

function generateMissingAddend(difficulty: DifficultyLevel): Problem {
	const range = ADDITION_RANGES[difficulty];
	let left: number;
	let right: number;

	do {
		left = randomInt(range.minLeft, range.maxLeft);
		right = randomInt(range.minRight, range.maxRight);
	} while (left + right > MAX_ANSWER || right === 0);

	const sum = left + right;

	return {
		left,
		right,
		operator: "+",
		answer: right,
		displayAnswer: right.toString(),
		unknownPosition: "right",
		target: sum,
	};
}

// ─── GameMode implementations ───────────────────────────────────────────────

export const AdditionMode: GameMode = {
	name: "Addition",
	operator: "+",
	generate: generateAddition,
	validate: (detected, problem) => detected.includes(problem.answer),
};

export const SubtractionMode: GameMode = {
	name: "Subtraction",
	operator: "-",
	generate: generateSubtraction,
	validate: (detected, problem) => detected.includes(problem.answer),
};

export const MissingAddendMode: GameMode = {
	name: "Missing Part",
	operator: "+",
	generate: generateMissingAddend,
	validate: (detected, problem) => detected.includes(problem.answer),
};

function generateMake10(_difficulty: DifficultyLevel): Problem {
	// Make-10 problem space is small (9 problems) and all appropriate.
	// Difficulty does not change the operand range — the streak-based
	// difficulty system still runs but all problems are the same type.
	const left = randomInt(1, 9);
	const right = 10 - left;

	return {
		left,
		right,
		operator: "+",
		answer: right,
		displayAnswer: right.toString(),
		unknownPosition: "right",
		target: 10,
	};
}

export const Make10Mode: GameMode = {
	name: "Make 10",
	operator: "+",
	generate: generateMake10,
	validate: (detected, problem) => detected.includes(problem.answer),
};
