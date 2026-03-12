import { beforeEach, describe, expect, it } from "vitest";
import {
	type CameraSettings,
	type PipelineStageInfo,
	useCvStore,
} from "./cv-store";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeStage(
	overrides: Partial<PipelineStageInfo> = {},
): PipelineStageInfo {
	return {
		detectionCount: 0,
		candidateCount: 0,
		matchFound: false,
		temporalEvent: "NONE",
		...overrides,
	};
}

const testCameraSettings: CameraSettings = {
	width: 1280,
	height: 720,
	frameRate: 30,
	facingMode: "environment",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("cv-store pipeline stats", () => {
	beforeEach(() => {
		useCvStore.getState().reset();
	});

	it("starts with zero pipeline stats", () => {
		const { pipelineStats } = useCvStore.getState();
		expect(pipelineStats).toEqual({
			totalFrames: 0,
			withDetections: 0,
			withCandidates: 0,
			withMatch: 0,
		});
	});

	it("increments totalFrames on every updatePipelineStage call", () => {
		const { updatePipelineStage } = useCvStore.getState();
		updatePipelineStage(makeStage());
		updatePipelineStage(makeStage());
		updatePipelineStage(makeStage());

		expect(useCvStore.getState().pipelineStats.totalFrames).toBe(3);
	});

	it("increments withDetections only when detectionCount > 0", () => {
		const { updatePipelineStage } = useCvStore.getState();
		updatePipelineStage(makeStage({ detectionCount: 0 }));
		updatePipelineStage(makeStage({ detectionCount: 2 }));
		updatePipelineStage(makeStage({ detectionCount: 1 }));

		const { pipelineStats } = useCvStore.getState();
		expect(pipelineStats.totalFrames).toBe(3);
		expect(pipelineStats.withDetections).toBe(2);
	});

	it("increments withCandidates only when candidateCount > 0", () => {
		const { updatePipelineStage } = useCvStore.getState();
		updatePipelineStage(makeStage({ candidateCount: 0 }));
		updatePipelineStage(makeStage({ candidateCount: 1 }));

		const { pipelineStats } = useCvStore.getState();
		expect(pipelineStats.withCandidates).toBe(1);
	});

	it("increments withMatch only when matchFound is true", () => {
		const { updatePipelineStage } = useCvStore.getState();
		updatePipelineStage(makeStage({ matchFound: false }));
		updatePipelineStage(makeStage({ matchFound: true }));
		updatePipelineStage(makeStage({ matchFound: false }));

		const { pipelineStats } = useCvStore.getState();
		expect(pipelineStats.withMatch).toBe(1);
	});

	it("stores the latest pipeline stage info", () => {
		const { updatePipelineStage } = useCvStore.getState();
		const stage = makeStage({
			detectionCount: 3,
			candidateCount: 2,
			matchFound: true,
			temporalEvent: "TILE_SEEN",
		});
		updatePipelineStage(stage);

		expect(useCvStore.getState().pipelineStage).toEqual(stage);
	});

	it("reset clears pipeline stats and stage", () => {
		const { updatePipelineStage, reset } = useCvStore.getState();
		updatePipelineStage(makeStage({ detectionCount: 1, matchFound: true }));

		reset();

		const state = useCvStore.getState();
		expect(state.pipelineStage).toBeNull();
		expect(state.pipelineStats.totalFrames).toBe(0);
	});
});

describe("cv-store camera settings", () => {
	beforeEach(() => {
		useCvStore.getState().reset();
	});

	it("starts with null camera settings", () => {
		expect(useCvStore.getState().cameraSettings).toBeNull();
	});

	it("stores camera settings via updateCameraSettings", () => {
		useCvStore.getState().updateCameraSettings(testCameraSettings);
		expect(useCvStore.getState().cameraSettings).toEqual(testCameraSettings);
	});

	it("reset clears camera settings", () => {
		useCvStore.getState().updateCameraSettings(testCameraSettings);
		useCvStore.getState().reset();
		expect(useCvStore.getState().cameraSettings).toBeNull();
	});
});
