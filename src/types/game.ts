// ─── Difficulty ──────────────────────────────────────────────────────────────

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

// ─── Problem ─────────────────────────────────────────────────────────────────

export type Operator = "+" | "-";

export interface Problem {
	readonly left: number;
	readonly right: number;
	readonly operator: Operator;
	readonly answer: number;
	readonly displayAnswer: string;
}

// ─── Game Mode ───────────────────────────────────────────────────────────────

export interface GameMode {
	readonly name: string;
	readonly operator: Operator;
	readonly generate: (difficulty: DifficultyLevel) => Problem;
	readonly validate: (detected: readonly number[], problem: Problem) => boolean;
}

// ─── Game Phase (discriminated union) ────────────────────────────────────────

export type GamePhase =
	| { readonly phase: "idle" }
	| { readonly phase: "countdown"; readonly secondsLeft: number }
	| {
			readonly phase: "scanning";
			readonly problem: Problem;
			readonly attemptNumber: number;
	  }
	| {
			readonly phase: "success";
			readonly problem: Problem;
			readonly stars: 1 | 2 | 3;
	  }
	| {
			readonly phase: "timeout";
			readonly problem: Problem;
			readonly attemptNumber: number;
	  }
	| { readonly phase: "session-end"; readonly session: SessionData };

// ─── Game Action (discriminated union) ───────────────────────────────────────

export type GameAction =
	| { readonly type: "START_SESSION"; readonly mode: GameMode }
	| { readonly type: "COUNTDOWN_TICK"; readonly secondsLeft: number }
	| { readonly type: "COUNTDOWN_COMPLETE"; readonly problem: Problem }
	| { readonly type: "ANSWER_CORRECT"; readonly stars: 1 | 2 | 3 }
	| { readonly type: "ROUND_TIMEOUT" }
	| { readonly type: "NEXT_ROUND"; readonly problem: Problem }
	| { readonly type: "END_SESSION" }
	| { readonly type: "RESET" };

// ─── Session ─────────────────────────────────────────────────────────────────

export interface RoundResult {
	readonly problem: Problem;
	readonly stars: 1 | 2 | 3;
	readonly durationMs: number;
}

export interface SessionData {
	readonly rounds: readonly RoundResult[];
	readonly totalStars: number;
	readonly difficulty: DifficultyLevel;
	readonly mode: string;
	readonly startedAt: number;
	readonly endedAt: number;
}

// ─── Game State ──────────────────────────────────────────────────────────────

export interface GameState {
	readonly phase: GamePhase;
	readonly difficulty: DifficultyLevel;
	readonly consecutiveCorrect: number;
	readonly consecutiveWrong: number;
	readonly rounds: readonly RoundResult[];
	readonly currentRoundStartedAt: number | null;
}
