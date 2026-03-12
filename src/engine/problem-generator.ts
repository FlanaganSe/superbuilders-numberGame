import type { DifficultyLevel, GameMode, Problem } from "../types/game";

// ─── Difficulty Ranges ──────────────────────────────────────────────────────

interface OperandRange {
	readonly minLeft: number;
	readonly maxLeft: number;
	readonly minRight: number;
	readonly maxRight: number;
}

const ADDITION_RANGES: Record<DifficultyLevel, OperandRange> = {
	1: { minLeft: 0, maxLeft: 5, minRight: 0, maxRight: 4 },
	2: { minLeft: 1, maxLeft: 7, minRight: 1, maxRight: 5 },
	3: { minLeft: 2, maxLeft: 9, minRight: 2, maxRight: 8 },
	4: { minLeft: 3, maxLeft: 9, minRight: 3, maxRight: 9 },
	5: { minLeft: 5, maxLeft: 9, minRight: 5, maxRight: 9 },
};

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

	// Ensure sum is in 0–19 range (appropriate for ages 5–8)
	do {
		left = randomInt(range.minLeft, range.maxLeft);
		right = randomInt(range.minRight, range.maxRight);
	} while (left + right > 19);

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

	// Ensure no negative results
	do {
		left = randomInt(range.minLeft, range.maxLeft);
		right = randomInt(range.minRight, range.maxRight);
	} while (left - right < 0);

	const answer = left - right;
	return {
		left,
		right,
		operator: "-",
		answer,
		displayAnswer: answer.toString(),
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
