import { create } from "zustand";
import { createInterpretationLayer } from "../cv/interpretation";
import { createTemporalBuffer } from "../cv/temporal-buffer";
import { gameReducer, initialGameState } from "../engine/game-reducer";
import { AdditionMode } from "../engine/problem-generator";
import { loadMute, saveMute, starsForAttempt } from "../engine/session";
import type { PipelineStageInfo } from "../store/cv-store";
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
	) => PipelineStageInfo | null;
	readonly resetCvState: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

const temporalBuffer = createTemporalBuffer();
const interpretationLayer = createInterpretationLayer();

/** Track the current problem to reset temporal buffer on problem change. */
let lastProblemRef: object | null = null;

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

	processDetections(detections): PipelineStageInfo | null {
		const { gameState, dispatch } = get();
		if (gameState.phase.phase !== "scanning") return null;

		const { problem, attemptNumber } = gameState.phase;

		// Reset temporal buffer when the problem changes (new round)
		if (problem !== lastProblemRef) {
			temporalBuffer.reset();
			lastProblemRef = problem;
			set({ tileSeen: null });
		}

		// Run interpretation with digit-count gate
		const expectedDigitCount = problem.answer.toString().length;
		const values = interpretationLayer.interpret(
			detections,
			expectedDigitCount,
		);
		const matched = values.includes(problem.answer);

		// Feed temporal buffer
		const event = temporalBuffer.update(matched ? problem.answer : null);

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
				if (
					temporalBuffer.consecutiveCount() === 0 &&
					get().tileSeen !== null
				) {
					set({ tileSeen: null });
				}
				break;
		}

		return {
			detectionCount: detections.length,
			candidateCount: values.length,
			matchFound: matched,
			temporalEvent: event.type,
		};
	},

	resetCvState(): void {
		lastProblemRef = null;
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
