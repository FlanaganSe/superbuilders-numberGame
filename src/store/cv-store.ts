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

interface CvState {
	readonly detections: readonly DetectedDigit[];
	readonly latencyMs: number;
	readonly workerStatus: WorkerStatus;
	readonly errorMessage: string | null;
	readonly temporalCount: number;
	readonly lastMatchedAnswer: number | null;
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
	readonly reset: () => void;
}

const INITIAL_STATE: CvState = {
	detections: [],
	latencyMs: 0,
	workerStatus: "loading",
	errorMessage: null,
	temporalCount: 0,
	lastMatchedAnswer: null,
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
