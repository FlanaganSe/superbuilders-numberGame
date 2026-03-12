import type { DifficultyLevel } from "../types/game";

interface DifficultyState {
	readonly level: DifficultyLevel;
	readonly consecutiveCorrect: number;
	readonly consecutiveWrong: number;
}

const PROMOTE_THRESHOLD = 3;
const DEMOTE_THRESHOLD = 2;
const MIN_LEVEL: DifficultyLevel = 1;
const MAX_LEVEL: DifficultyLevel = 5;

export function initialDifficultyState(
	level: DifficultyLevel = 1,
): DifficultyState {
	return { level, consecutiveCorrect: 0, consecutiveWrong: 0 };
}

export function recordCorrect(state: DifficultyState): DifficultyState {
	const consecutiveCorrect = state.consecutiveCorrect + 1;

	if (consecutiveCorrect >= PROMOTE_THRESHOLD && state.level < MAX_LEVEL) {
		return {
			level: (state.level + 1) as DifficultyLevel,
			consecutiveCorrect: 0,
			consecutiveWrong: 0,
		};
	}

	return { ...state, consecutiveCorrect, consecutiveWrong: 0 };
}

export function recordWrong(state: DifficultyState): DifficultyState {
	const consecutiveWrong = state.consecutiveWrong + 1;

	if (consecutiveWrong >= DEMOTE_THRESHOLD && state.level > MIN_LEVEL) {
		return {
			level: (state.level - 1) as DifficultyLevel,
			consecutiveCorrect: 0,
			consecutiveWrong: 0,
		};
	}

	return { ...state, consecutiveWrong, consecutiveCorrect: 0 };
}
