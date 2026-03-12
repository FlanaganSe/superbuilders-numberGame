import { describe, expect, it } from "vitest";
import type { GameAction, GameState, Problem } from "../types/game";
import {
	COUNTDOWN_SECONDS,
	gameReducer,
	initialGameState,
	MAX_PROBLEMS,
} from "./game-reducer";

const SAMPLE_PROBLEM: Problem = {
	left: 3,
	right: 4,
	operator: "+",
	answer: 7,
	displayAnswer: "7",
};

function dispatch(state: GameState, action: GameAction): GameState {
	return gameReducer(state, action);
}

function startSession(state: GameState): GameState {
	return dispatch(state, { type: "START_SESSION" });
}

function toScanning(state: GameState): GameState {
	let s = startSession(state);
	s = dispatch(s, {
		type: "COUNTDOWN_COMPLETE",
		problem: SAMPLE_PROBLEM,
	});
	return s;
}

describe("gameReducer", () => {
	describe("idle → countdown", () => {
		it("transitions from idle to countdown on START_SESSION", () => {
			const state = initialGameState();
			const next = startSession(state);
			expect(next.phase.phase).toBe("countdown");
			if (next.phase.phase === "countdown") {
				expect(next.phase.secondsLeft).toBe(COUNTDOWN_SECONDS);
			}
		});

		it("resets state on START_SESSION from session-end", () => {
			// Build a session-end state
			let state = toScanning(initialGameState());
			state = dispatch(state, { type: "ANSWER_CORRECT", stars: 3 });
			state = dispatch(state, { type: "END_SESSION" });
			expect(state.phase.phase).toBe("session-end");

			const next = startSession(state);
			expect(next.phase.phase).toBe("countdown");
			expect(next.rounds).toEqual([]);
		});
	});

	describe("countdown → scanning", () => {
		it("transitions on COUNTDOWN_COMPLETE", () => {
			let state = startSession(initialGameState());
			state = dispatch(state, {
				type: "COUNTDOWN_COMPLETE",
				problem: SAMPLE_PROBLEM,
			});
			expect(state.phase.phase).toBe("scanning");
			if (state.phase.phase === "scanning") {
				expect(state.phase.problem).toEqual(SAMPLE_PROBLEM);
				expect(state.phase.attemptNumber).toBe(1);
			}
		});

		it("updates seconds on COUNTDOWN_TICK", () => {
			let state = startSession(initialGameState());
			state = dispatch(state, {
				type: "COUNTDOWN_TICK",
				secondsLeft: 3,
			});
			expect(state.phase.phase).toBe("countdown");
			if (state.phase.phase === "countdown") {
				expect(state.phase.secondsLeft).toBe(3);
			}
		});
	});

	describe("scanning → success", () => {
		it("transitions on ANSWER_CORRECT", () => {
			let state = toScanning(initialGameState());
			state = dispatch(state, { type: "ANSWER_CORRECT", stars: 3 });
			expect(state.phase.phase).toBe("success");
			if (state.phase.phase === "success") {
				expect(state.phase.stars).toBe(3);
				expect(state.phase.problem).toEqual(SAMPLE_PROBLEM);
			}
		});

		it("records round result", () => {
			let state = toScanning(initialGameState());
			state = dispatch(state, { type: "ANSWER_CORRECT", stars: 2 });
			expect(state.rounds).toHaveLength(1);
			expect(state.rounds[0]?.stars).toBe(2);
		});
	});

	describe("scanning → timeout", () => {
		it("transitions on ROUND_TIMEOUT", () => {
			let state = toScanning(initialGameState());
			state = dispatch(state, { type: "ROUND_TIMEOUT" });
			expect(state.phase.phase).toBe("timeout");
			if (state.phase.phase === "timeout") {
				expect(state.phase.problem).toEqual(SAMPLE_PROBLEM);
				expect(state.phase.attemptNumber).toBe(1);
			}
		});
	});

	describe("success → countdown (next round)", () => {
		it("transitions to countdown on NEXT_ROUND after success", () => {
			let state = toScanning(initialGameState());
			state = dispatch(state, { type: "ANSWER_CORRECT", stars: 3 });
			state = dispatch(state, {
				type: "NEXT_ROUND",
			});
			expect(state.phase.phase).toBe("countdown");
		});
	});

	describe("timeout → scanning (retry)", () => {
		it("retries same problem with incremented attempt", () => {
			let state = toScanning(initialGameState());
			state = dispatch(state, { type: "ROUND_TIMEOUT" });
			state = dispatch(state, {
				type: "NEXT_ROUND",
			});
			expect(state.phase.phase).toBe("scanning");
			if (state.phase.phase === "scanning") {
				expect(state.phase.problem).toEqual(SAMPLE_PROBLEM);
				expect(state.phase.attemptNumber).toBe(2);
			}
		});
	});

	describe("session end", () => {
		it("transitions to session-end on END_SESSION from success", () => {
			let state = toScanning(initialGameState());
			state = dispatch(state, { type: "ANSWER_CORRECT", stars: 3 });
			state = dispatch(state, { type: "END_SESSION" });
			expect(state.phase.phase).toBe("session-end");
			if (state.phase.phase === "session-end") {
				expect(state.phase.session.totalStars).toBe(3);
				expect(state.phase.session.rounds).toHaveLength(1);
			}
		});

		it("auto-ends when MAX_PROBLEMS reached via NEXT_ROUND", () => {
			// Build a state with MAX_PROBLEMS rounds already completed
			let state = toScanning(initialGameState());
			state = dispatch(state, { type: "ANSWER_CORRECT", stars: 3 });

			// Manually set rounds to MAX_PROBLEMS
			const filledState: GameState = {
				...state,
				rounds: Array.from({ length: MAX_PROBLEMS }, () => ({
					problem: SAMPLE_PROBLEM,
					stars: 3 as const,
					durationMs: 1000,
				})),
			};

			const next = dispatch(filledState, {
				type: "NEXT_ROUND",
			});
			expect(next.phase.phase).toBe("session-end");
		});
	});

	describe("invalid transitions (no-ops)", () => {
		it("ignores START_SESSION from scanning", () => {
			const state = toScanning(initialGameState());
			const next = startSession(state);
			expect(next.phase.phase).toBe("scanning");
		});

		it("ignores ANSWER_CORRECT from idle", () => {
			const state = initialGameState();
			const next = dispatch(state, {
				type: "ANSWER_CORRECT",
				stars: 3,
			});
			expect(next.phase.phase).toBe("idle");
		});

		it("ignores COUNTDOWN_COMPLETE from idle", () => {
			const state = initialGameState();
			const next = dispatch(state, {
				type: "COUNTDOWN_COMPLETE",
				problem: SAMPLE_PROBLEM,
			});
			expect(next.phase.phase).toBe("idle");
		});

		it("ignores ROUND_TIMEOUT from countdown", () => {
			const state = startSession(initialGameState());
			const next = dispatch(state, { type: "ROUND_TIMEOUT" });
			expect(next.phase.phase).toBe("countdown");
		});

		it("ignores NEXT_ROUND from idle", () => {
			const state = initialGameState();
			const next = dispatch(state, {
				type: "NEXT_ROUND",
			});
			expect(next.phase.phase).toBe("idle");
		});

		it("ignores END_SESSION from idle", () => {
			const state = initialGameState();
			const next = dispatch(state, { type: "END_SESSION" });
			expect(next.phase.phase).toBe("idle");
		});
	});

	describe("RESET", () => {
		it("returns to initial state from any phase", () => {
			const state = toScanning(initialGameState());
			const next = dispatch(state, { type: "RESET" });
			expect(next).toEqual(initialGameState());
		});
	});

	describe("difficulty integration", () => {
		it("difficulty increases after 3 consecutive correct answers", () => {
			let state = toScanning(initialGameState());
			expect(state.difficulty).toBe(1);

			// Round 1: correct
			state = dispatch(state, { type: "ANSWER_CORRECT", stars: 3 });
			state = dispatch(state, {
				type: "NEXT_ROUND",
			});
			// Now in countdown — complete it
			state = dispatch(state, {
				type: "COUNTDOWN_COMPLETE",
				problem: SAMPLE_PROBLEM,
			});

			// Round 2: correct
			state = dispatch(state, { type: "ANSWER_CORRECT", stars: 3 });
			state = dispatch(state, {
				type: "NEXT_ROUND",
			});
			state = dispatch(state, {
				type: "COUNTDOWN_COMPLETE",
				problem: SAMPLE_PROBLEM,
			});

			// Round 3: correct — should promote
			state = dispatch(state, { type: "ANSWER_CORRECT", stars: 3 });

			expect(state.difficulty).toBe(2);
		});

		it("difficulty decreases after 2 consecutive wrong at same level", () => {
			// Start at difficulty 3 by directly setting state
			let state: GameState = {
				...initialGameState(),
				difficulty: 3,
				phase: {
					phase: "scanning",
					problem: SAMPLE_PROBLEM,
					attemptNumber: 1,
				},
				currentRoundStartedAt: Date.now(),
			};

			// Timeout 1
			state = dispatch(state, { type: "ROUND_TIMEOUT" });
			expect(state.difficulty).toBe(3); // Not yet demoted
			// Retry goes back to scanning with same problem
			state = dispatch(state, {
				type: "NEXT_ROUND",
			});
			// Timeout 2 — should demote
			state = dispatch(state, { type: "ROUND_TIMEOUT" });

			expect(state.difficulty).toBe(2);
		});
	});
});
