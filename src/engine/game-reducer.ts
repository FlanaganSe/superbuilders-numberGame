import type {
	GameAction,
	GameState,
	Problem,
	RoundResult,
} from "../types/game";
import { recordCorrect, recordWrong } from "./difficulty";
import { DEFAULT_PROBLEM_COUNT } from "./session";

// ─── Initial state ──────────────────────────────────────────────────────────

export function initialGameState(): GameState {
	return {
		phase: { phase: "idle" },
		difficulty: 1,
		consecutiveCorrect: 0,
		consecutiveWrong: 0,
		rounds: [],
		currentRoundStartedAt: null,
		sessionStartedAt: null,
		maxProblems: DEFAULT_PROBLEM_COUNT,
		modeName: "Addition",
	};
}

// ─── Config ─────────────────────────────────────────────────────────────────

export const COUNTDOWN_SECONDS = 3;
export const MAX_PROBLEMS = DEFAULT_PROBLEM_COUNT;

// ─── Reducer ────────────────────────────────────────────────────────────────

export function gameReducer(state: GameState, action: GameAction): GameState {
	switch (action.type) {
		case "START_SESSION":
			return handleStartSession(state, action);

		case "COUNTDOWN_TICK":
			return handleCountdownTick(state, action.secondsLeft);

		case "COUNTDOWN_COMPLETE":
			return handleCountdownComplete(state, action.problem);

		case "ANSWER_CORRECT":
			return handleAnswerCorrect(state, action.stars);

		case "ROUND_TIMEOUT":
			return handleRoundTimeout(state);

		case "NEXT_ROUND":
			return handleNextRound(state);

		case "END_SESSION":
			return handleEndSession(state);

		case "RESET":
			return initialGameState();
	}
}

// ─── Transition handlers ────────────────────────────────────────────────────

function handleStartSession(
	state: GameState,
	action: Extract<GameAction, { type: "START_SESSION" }>,
): GameState {
	if (state.phase.phase !== "idle" && state.phase.phase !== "session-end") {
		return state;
	}
	return {
		...initialGameState(),
		phase: { phase: "countdown", secondsLeft: COUNTDOWN_SECONDS },
		sessionStartedAt: Date.now(),
		maxProblems: action.maxProblems ?? DEFAULT_PROBLEM_COUNT,
		modeName: action.modeName ?? "Addition",
	};
}

function handleCountdownTick(state: GameState, secondsLeft: number): GameState {
	if (state.phase.phase !== "countdown") return state;
	return {
		...state,
		phase: { phase: "countdown", secondsLeft },
	};
}

function handleCountdownComplete(
	state: GameState,
	problem: Problem,
): GameState {
	if (state.phase.phase !== "countdown") return state;
	return {
		...state,
		phase: { phase: "scanning", problem, attemptNumber: 1 },
		currentRoundStartedAt: Date.now(),
	};
}

function handleAnswerCorrect(state: GameState, stars: 1 | 2 | 3): GameState {
	if (state.phase.phase !== "scanning") return state;

	const { problem } = state.phase;
	const durationMs = state.currentRoundStartedAt
		? Date.now() - state.currentRoundStartedAt
		: 0;
	const round: RoundResult = { problem, stars, durationMs };
	const rounds = [...state.rounds, round];

	const diffState = recordCorrect({
		level: state.difficulty,
		consecutiveCorrect: state.consecutiveCorrect,
		consecutiveWrong: state.consecutiveWrong,
	});

	return {
		...state,
		phase: { phase: "success", problem, stars },
		rounds,
		difficulty: diffState.level,
		consecutiveCorrect: diffState.consecutiveCorrect,
		consecutiveWrong: diffState.consecutiveWrong,
		currentRoundStartedAt: null,
	};
}

function handleRoundTimeout(state: GameState): GameState {
	if (state.phase.phase !== "scanning") return state;
	const { problem, attemptNumber } = state.phase;

	const diffState = recordWrong({
		level: state.difficulty,
		consecutiveCorrect: state.consecutiveCorrect,
		consecutiveWrong: state.consecutiveWrong,
	});

	return {
		...state,
		phase: { phase: "timeout", problem, attemptNumber },
		difficulty: diffState.level,
		consecutiveCorrect: diffState.consecutiveCorrect,
		consecutiveWrong: diffState.consecutiveWrong,
	};
}

function handleNextRound(state: GameState): GameState {
	if (state.phase.phase !== "success" && state.phase.phase !== "timeout") {
		return state;
	}

	// Check if session should end
	if (state.rounds.length >= state.maxProblems) {
		return handleEndSession(state);
	}

	// For timeout: spelling skips to a new word (countdown), math retries same problem
	if (state.phase.phase === "timeout") {
		if (state.modeName === "Spelling") {
			// Spelling: move to countdown so CountdownTimer generates a new word
			return {
				...state,
				phase: { phase: "countdown", secondsLeft: COUNTDOWN_SECONDS },
			};
		}
		// Math: retry same problem with incremented attempt
		return {
			...state,
			phase: {
				phase: "scanning",
				problem: state.phase.problem,
				attemptNumber: state.phase.attemptNumber + 1,
			},
			currentRoundStartedAt: Date.now(),
		};
	}

	// After success, go to countdown for the next problem
	return {
		...state,
		phase: { phase: "countdown", secondsLeft: COUNTDOWN_SECONDS },
	};
}

function handleEndSession(state: GameState): GameState {
	if (
		state.phase.phase !== "success" &&
		state.phase.phase !== "timeout" &&
		state.phase.phase !== "scanning"
	) {
		return state;
	}

	const totalStars = state.rounds.reduce((sum, r) => sum + r.stars, 0);

	return {
		...state,
		phase: {
			phase: "session-end",
			session: {
				rounds: state.rounds,
				totalStars,
				difficulty: state.difficulty,
				mode: state.modeName,
				startedAt: state.sessionStartedAt ?? Date.now(),
				endedAt: Date.now(),
			},
		},
	};
}
