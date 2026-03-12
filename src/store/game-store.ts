import { create } from "zustand";
import { groupDetections, matchAnswer } from "../cv/interpretation";
import { createTemporalBuffer } from "../cv/temporal-buffer";
import { gameReducer, initialGameState } from "../engine/game-reducer";
import { AdditionMode } from "../engine/problem-generator";
import { loadMute, saveMute, starsForAttempt } from "../engine/session";
import type { GameAction, GameMode, GameState } from "../types/game";

// ─── Store shape ────────────────────────────────────────────────────────────

interface GameStore {
	// Game state (owned by reducer)
	readonly gameState: GameState;
	readonly dispatch: (action: GameAction) => void;

	// Active mode
	readonly mode: GameMode;

	// Audio preference
	readonly muted: boolean;
	readonly toggleMute: () => void;

	// CV integration (interpretation + temporal buffer)
	readonly tileSeen: number | null;
	readonly processDetections: (
		detections: readonly import("../types/cv").DetectedDigit[],
	) => void;
	readonly resetCvState: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

const temporalBuffer = createTemporalBuffer();

export const useGameStore = create<GameStore>((set, get) => ({
	gameState: initialGameState(),

	dispatch(action: GameAction): void {
		set((state) => ({
			gameState: gameReducer(state.gameState, action),
		}));
	},

	mode: AdditionMode,

	muted: loadMute(),
	toggleMute(): void {
		set((state) => {
			const next = !state.muted;
			saveMute(next);
			return { muted: next };
		});
	},

	tileSeen: null,

	processDetections(detections): void {
		const { gameState, dispatch } = get();
		if (gameState.phase.phase !== "scanning") return;

		const { problem, attemptNumber } = gameState.phase;

		// Run interpretation
		const candidates = groupDetections(detections);
		const matched = matchAnswer(candidates, problem.answer);

		// Feed temporal buffer
		const event = temporalBuffer.update(matched ? matched.value : null);

		switch (event.type) {
			case "TILE_SEEN":
				set({ tileSeen: event.answer });
				break;
			case "ANSWER_COMMITTED":
				dispatch({
					type: "ANSWER_CORRECT",
					stars: starsForAttempt(attemptNumber),
				});
				temporalBuffer.reset();
				set({ tileSeen: null });
				break;
			case "NONE":
				break;
		}
	},

	resetCvState(): void {
		temporalBuffer.reset();
		set({ tileSeen: null });
	},
}));

// ─── Temporal buffer accessors ──────────────────────────────────────────────
// Exposed for cv-store to read temporal state without coupling stores.

export function getTemporalCount(): number {
	return temporalBuffer.consecutiveCount();
}

export function getLastMatchedAnswer(): number | null {
	return temporalBuffer.lastAnswer();
}

// ─── Selectors ──────────────────────────────────────────────────────────────

export const selectPhase = (s: GameStore): string => s.gameState.phase.phase;
export const selectGamePhase = (s: GameStore): GameState["phase"] =>
	s.gameState.phase;
export const selectDifficulty = (s: GameStore): number =>
	s.gameState.difficulty;
export const selectRounds = (s: GameStore): GameState["rounds"] =>
	s.gameState.rounds;
export const selectMuted = (s: GameStore): boolean => s.muted;
export const selectTileSeen = (s: GameStore): number | null => s.tileSeen;
