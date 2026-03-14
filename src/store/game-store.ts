import { create } from "zustand";
import { createInterpretationLayer } from "../cv/interpretation";
import { createTemporalBuffer } from "../cv/temporal-buffer";
import { gameReducer, initialGameState } from "../engine/game-reducer";
import { AdditionMode } from "../engine/problem-generator";
import { loadMute, saveMute, starsForAttempt } from "../engine/session";
import type { PipelineStageInfo } from "../store/cv-store";
import type {
	GameAction,
	GameKind,
	GameMode,
	GameState,
	SpellingProblem,
} from "../types/game";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maps a YOLO classId (10-35) to a letter (A-Z). */
function classIdToLetter(classId: number): string {
	return String.fromCharCode(65 + (classId - 10));
}

// ─── Store shape ────────────────────────────────────────────────────────────

interface GameStore {
	// Game state (owned by reducer)
	readonly gameState: GameState;
	readonly dispatch: (action: GameAction) => void;

	// Active mode
	readonly mode: GameMode;
	readonly setMode: (mode: GameMode) => void;
	readonly gameKind: GameKind;
	readonly setGameKind: (kind: GameKind) => void;

	// Spelling state
	readonly spellingProblem: SpellingProblem | null;
	readonly setSpellingProblem: (problem: SpellingProblem | null) => void;
	readonly detectedLetters: readonly string[];
	readonly spellingWordsUsed: readonly string[];

	// Audio preference
	readonly muted: boolean;
	readonly toggleMute: () => void;

	// CV integration (interpretation + temporal buffer)
	readonly tileSeen: number | string | null;
	readonly cameraUncertain: boolean;
	readonly cameraMissStreak: number;
	readonly hadTileThisRound: boolean;
	readonly processDetections: (
		detections: readonly import("../types/cv").DetectedDigit[],
	) => PipelineStageInfo | null;
	readonly resetCvState: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

const temporalBuffer = createTemporalBuffer<number>();
const spellingTemporalBuffer = createTemporalBuffer<string>();
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
	setMode(mode: GameMode): void {
		set({ mode });
	},
	gameKind: "math",

	setGameKind(kind: GameKind): void {
		// Reset session-level spelling state when switching modes
		set({
			gameKind: kind,
			spellingWordsUsed: [],
			spellingProblem: null,
		});
	},

	spellingProblem: null,
	detectedLetters: [],
	spellingWordsUsed: [],

	setSpellingProblem(problem: SpellingProblem | null): void {
		set({ spellingProblem: problem });
	},

	muted: loadMute(),
	toggleMute(): void {
		set((state) => {
			const next = !state.muted;
			saveMute(next);
			return { muted: next };
		});
	},

	tileSeen: null,
	cameraUncertain: false,
	cameraMissStreak: 0,
	hadTileThisRound: false,

	processDetections(detections): PipelineStageInfo | null {
		const { gameState, gameKind } = get();
		if (gameState.phase.phase !== "scanning") return null;

		if (gameKind === "spelling") {
			return processSpellingDetections(detections, get, set);
		}
		return processMathDetections(detections, get, set);
	},

	resetCvState(): void {
		lastProblemRef = null;
		temporalBuffer.reset();
		spellingTemporalBuffer.reset();
		// Only clear CV-transient state between rounds — NOT spellingWordsUsed
		// or spellingProblem, which persist across rounds within a session.
		set({
			tileSeen: null,
			detectedLetters: [],
			cameraUncertain: false,
			cameraMissStreak: 0,
			hadTileThisRound: false,
		});
	},
}));

// ─── Math detection processing ──────────────────────────────────────────────

function processMathDetections(
	detections: readonly import("../types/cv").DetectedDigit[],
	get: () => GameStore,
	set: (partial: Partial<GameStore>) => void,
): PipelineStageInfo {
	const { gameState, dispatch } = get();
	const { problem, attemptNumber } = gameState.phase as {
		problem: import("../types/game").Problem;
		attemptNumber: number;
	};

	// Reset temporal buffer when the problem changes (new round)
	if (problem !== lastProblemRef) {
		temporalBuffer.reset();
		lastProblemRef = problem;
		set({ tileSeen: null });
	}

	// Run interpretation with digit-count gate
	const expectedDigitCount = problem.answer.toString().length;
	const values = interpretationLayer.interpret(detections, expectedDigitCount);
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
			if (temporalBuffer.consecutiveCount() === 0 && get().tileSeen !== null) {
				set({ tileSeen: null });
			}
			break;
	}

	// Camera uncertainty: we saw a tile before, but raw detections dropped to zero.
	// Gate on tileSeen === null to avoid contradicting the "I see X!" feedback
	// (tileSeen clears after hard reset at missStreak > MAX_CONSECUTIVE_MISSES).
	const hadTile = get().hadTileThisRound || event.type === "TILE_SEEN";
	const missStreak = temporalBuffer.getMissStreak();
	const uncertain =
		hadTile &&
		detections.length === 0 &&
		get().tileSeen === null &&
		missStreak >= 1;
	set({
		cameraUncertain: uncertain,
		cameraMissStreak: missStreak,
		hadTileThisRound: hadTile,
	});

	return {
		detectionCount: detections.length,
		candidateCount: values.length,
		matchFound: matched,
		temporalEvent: event.type,
	};
}

// ─── Spelling detection processing ──────────────────────────────────────────

function processSpellingDetections(
	detections: readonly import("../types/cv").DetectedDigit[],
	get: () => GameStore,
	set: (partial: Partial<GameStore>) => void,
): PipelineStageInfo {
	const { gameState, dispatch, spellingProblem } = get();
	const { attemptNumber } = gameState.phase as { attemptNumber: number };

	if (!spellingProblem) {
		return {
			detectionCount: detections.length,
			candidateCount: 0,
			matchFound: false,
			temporalEvent: "NONE",
		};
	}

	// Reset spelling temporal buffer when the problem changes
	if (spellingProblem !== lastProblemRef) {
		spellingTemporalBuffer.reset();
		lastProblemRef = spellingProblem;
		set({ tileSeen: null, detectedLetters: [] });
	}

	// Map classId (10-35) to letters, already sorted L→R by postProcess
	const letters = detections
		.filter((d) => d.digit >= 10 && d.digit <= 35)
		.map((d) => classIdToLetter(d.digit));

	set({ detectedLetters: letters });

	// Full word match
	const detectedWord = letters.join("");
	const matched = detectedWord === spellingProblem.word;

	// Feed spelling temporal buffer
	const event = spellingTemporalBuffer.update(
		matched ? spellingProblem.word : null,
	);

	switch (event.type) {
		case "TILE_SEEN":
			set({ tileSeen: event.answer });
			break;
		case "ANSWER_COMMITTED":
			dispatch({
				type: "ANSWER_CORRECT",
				stars: starsForAttempt(attemptNumber),
			});
			spellingTemporalBuffer.reset();
			set({
				tileSeen: null,
				detectedLetters: [],
				spellingWordsUsed: [...get().spellingWordsUsed, spellingProblem.word],
			});
			break;
		case "NONE":
			if (
				spellingTemporalBuffer.consecutiveCount() === 0 &&
				get().tileSeen !== null
			) {
				set({ tileSeen: null });
			}
			break;
	}

	return {
		detectionCount: detections.length,
		candidateCount: letters.length,
		matchFound: matched,
		temporalEvent: event.type,
	};
}

// ─── Temporal buffer accessors ──────────────────────────────────────────────
// Exposed for cv-store to read temporal state without coupling stores.

export function getTemporalCount(): number {
	const kind = useGameStore.getState().gameKind;
	return kind === "spelling"
		? spellingTemporalBuffer.consecutiveCount()
		: temporalBuffer.consecutiveCount();
}

export function getLastMatchedAnswer(): number | string | null {
	const kind = useGameStore.getState().gameKind;
	return kind === "spelling"
		? spellingTemporalBuffer.lastAnswer()
		: temporalBuffer.lastAnswer();
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
export const selectTileSeen = (s: GameStore): number | string | null =>
	s.tileSeen;
export const selectMode = (s: GameStore): GameMode => s.mode;
export const selectGameKind = (s: GameStore): GameKind => s.gameKind;
export const selectSpellingProblem = (s: GameStore): SpellingProblem | null =>
	s.spellingProblem;
export const selectDetectedLetters = (s: GameStore): readonly string[] =>
	s.detectedLetters;
export const selectCameraUncertain = (s: GameStore): boolean =>
	s.cameraUncertain;
export const selectCameraMissStreak = (s: GameStore): number =>
	s.cameraMissStreak;
export const selectHadTileThisRound = (s: GameStore): boolean =>
	s.hadTileThisRound;
