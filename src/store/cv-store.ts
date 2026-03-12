// ─── CV Store ────────────────────────────────────────────────────────────────
// Transient CV detection state. Updated at inference rate (4–10 fps).
//
// Components that need detection data (DebugHUD, bounding box overlay)
// subscribe directly. This avoids re-rendering the entire UI at inference rate.
// Use useCvStore.subscribe() for non-React consumers, or useCvStore(selector)
// only in debug/overlay components that are OK re-rendering frequently.

import { create } from "zustand";
import type { DetectedDigit } from "../types/cv";

export type WorkerStatus = "loading" | "ready" | "error";

export interface CameraSettings {
	readonly width: number;
	readonly height: number;
	readonly frameRate: number;
	readonly facingMode: string;
}

export interface PipelineStageInfo {
	readonly detectionCount: number;
	readonly candidateCount: number;
	readonly matchFound: boolean;
	readonly temporalEvent: "TILE_SEEN" | "ANSWER_COMMITTED" | "NONE";
}

export interface PipelineStats {
	readonly totalFrames: number;
	readonly withDetections: number;
	readonly withCandidates: number;
	readonly withMatch: number;
}

interface CvState {
	readonly detections: readonly DetectedDigit[];
	readonly latencyMs: number;
	readonly workerStatus: WorkerStatus;
	readonly errorMessage: string | null;
	readonly temporalCount: number;
	readonly lastMatchedAnswer: number | null;
	readonly cameraSettings: CameraSettings | null;
	readonly pipelineStage: PipelineStageInfo | null;
	readonly pipelineStats: PipelineStats;
}

interface CvStore extends CvState {
	readonly updateDetections: (
		detections: readonly DetectedDigit[],
		latencyMs: number,
	) => void;
	readonly updateWorkerStatus: (status: WorkerStatus, error?: string) => void;
	readonly updateTemporalState: (
		count: number,
		lastAnswer: number | null,
	) => void;
	readonly updateCameraSettings: (settings: CameraSettings) => void;
	readonly updatePipelineStage: (stage: PipelineStageInfo) => void;
	readonly reset: () => void;
}

const INITIAL_PIPELINE_STATS: PipelineStats = {
	totalFrames: 0,
	withDetections: 0,
	withCandidates: 0,
	withMatch: 0,
};

const INITIAL_STATE: CvState = {
	detections: [],
	latencyMs: 0,
	workerStatus: "loading",
	errorMessage: null,
	temporalCount: 0,
	lastMatchedAnswer: null,
	cameraSettings: null,
	pipelineStage: null,
	pipelineStats: INITIAL_PIPELINE_STATS,
};

export const useCvStore = create<CvStore>((set) => ({
	...INITIAL_STATE,

	updateDetections(detections, latencyMs): void {
		set({ detections, latencyMs });
	},

	updateWorkerStatus(status, error): void {
		set({ workerStatus: status, errorMessage: error ?? null });
	},

	updateTemporalState(count, lastAnswer): void {
		set({ temporalCount: count, lastMatchedAnswer: lastAnswer });
	},

	updateCameraSettings(settings): void {
		set({ cameraSettings: settings });
	},

	updatePipelineStage(stage): void {
		set((state) => ({
			pipelineStage: stage,
			pipelineStats: {
				totalFrames: state.pipelineStats.totalFrames + 1,
				withDetections:
					state.pipelineStats.withDetections +
					(stage.detectionCount > 0 ? 1 : 0),
				withCandidates:
					state.pipelineStats.withCandidates +
					(stage.candidateCount > 0 ? 1 : 0),
				withMatch: state.pipelineStats.withMatch + (stage.matchFound ? 1 : 0),
			},
		}));
	},

	reset(): void {
		set(INITIAL_STATE);
	},
}));

// ─── Selectors ──────────────────────────────────────────────────────────────

export const selectDetections = (s: CvStore): readonly DetectedDigit[] =>
	s.detections;
export const selectLatencyMs = (s: CvStore): number => s.latencyMs;
export const selectWorkerStatus = (s: CvStore): WorkerStatus => s.workerStatus;
export const selectTemporalCount = (s: CvStore): number => s.temporalCount;
export const selectLastMatchedAnswer = (s: CvStore): number | null =>
	s.lastMatchedAnswer;
export const selectCameraSettings = (s: CvStore): CameraSettings | null =>
	s.cameraSettings;
export const selectPipelineStats = (s: CvStore): PipelineStats =>
	s.pipelineStats;
