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

/** Threshold in ms — responses slower than this reset the streak without demoting. */
const SLOW_CORRECT_THRESHOLD_MS = 25000;

export function initialDifficultyState(
	level: DifficultyLevel = 1,
): DifficultyState {
	return { level, consecutiveCorrect: 0, consecutiveWrong: 0 };
}

export function recordCorrect(
	state: DifficultyState,
	responseTimeMs?: number,
): DifficultyState {
	// Slow-correct (>25s): reset consecutive count without demoting.
	// Child got it right — don't punish slow thinking, but don't promote yet.
	if (
		responseTimeMs !== undefined &&
		responseTimeMs > SLOW_CORRECT_THRESHOLD_MS
	) {
		return { ...state, consecutiveCorrect: 0, consecutiveWrong: 0 };
	}

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
