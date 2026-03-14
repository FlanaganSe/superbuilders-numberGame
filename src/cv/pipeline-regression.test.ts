// ─── Pipeline Regression Tests ──────────────────────────────────────────────
//
// End-to-end tests of the CV pipeline: synthetic tensor → postProcess →
// groupDetections → matchAnswer → temporal buffer.
//
// These cover the scenarios M9 requires for fixture-based regression:
// - All 10 digits individually (0–9)
// - Two-tile answers (e.g., "15")
// - Empty play surface (no detections)
// - Low-confidence filtering
// - 6 vs 9 distinction
// - NMS deduplication
// - Temporal buffer commit behavior

import { describe, expect, it } from "vitest";
import {
	createSyntheticTensor,
	type SyntheticDetection,
} from "./fixtures/synthetic-tensor";
import { groupDetections, matchAnswer } from "./interpretation";
import { postProcess } from "./postprocessing";
import { createTemporalBuffer } from "./temporal-buffer";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Identity letterbox params (no padding, scale=1) for 640×640 */
const ID_LETTERBOX = {
	scale: 1,
	padX: 0,
	padY: 0,
	origW: 640,
	origH: 640,
} as const;

const NUM_CLASSES = 10;
const NUM_ANCHORS = 8400;

/** Create a synthetic detection for a digit at a given position. */
function digit(
	classId: number,
	cx: number,
	anchorIdx: number,
	opts?: { cy?: number; score?: number; w?: number; h?: number },
): SyntheticDetection {
	return {
		anchorIdx,
		cx,
		cy: opts?.cy ?? 300,
		w: opts?.w ?? 60,
		h: opts?.h ?? 80,
		classId,
		score: opts?.score ?? 0.92,
	};
}

/** Run full pipeline: tensor → postProcess → groupDetections → matchAnswer */
function runPipeline(
	detections: readonly SyntheticDetection[],
	answer: number,
): { matched: boolean; detectedDigits: readonly number[] } {
	const tensor = createSyntheticTensor(NUM_CLASSES, NUM_ANCHORS, detections);
	const results = postProcess({
		output: tensor,
		numAnchors: NUM_ANCHORS,
		numClasses: NUM_CLASSES,
		...ID_LETTERBOX,
	});
	const candidates = groupDetections(results);
	const match = matchAnswer(candidates, answer);
	return {
		matched: match !== null,
		detectedDigits: results.map((r) => r.digit),
	};
}

// ─── Individual digit recognition (0–9) ────────────────────────────────────

describe("pipeline: single digit recognition", () => {
	for (let d = 0; d <= 9; d++) {
		it(`recognizes digit ${d}`, () => {
			const result = runPipeline([digit(d, 320, 1000 + d * 100)], d);
			expect(result.matched).toBe(true);
			expect(result.detectedDigits).toEqual([d]);
		});
	}

	it("does not match wrong digit", () => {
		const result = runPipeline([digit(3, 320, 1000)], 7);
		expect(result.matched).toBe(false);
	});
});

// ─── Two-tile answers ──────────────────────────────────────────────────────

describe("pipeline: two-tile answers", () => {
	it("groups adjacent tiles into two-digit number 15", () => {
		// Tiles touching: "1" at cx=280, "5" at cx=350 (gap = 350-60/2 - (280+60/2) = 320-310 = 10)
		const result = runPipeline([digit(1, 280, 2000), digit(5, 350, 2100)], 15);
		expect(result.matched).toBe(true);
	});

	it("groups adjacent tiles into 10", () => {
		const result = runPipeline([digit(1, 280, 2000), digit(0, 350, 2100)], 10);
		expect(result.matched).toBe(true);
	});

	it("groups adjacent tiles into 19", () => {
		const result = runPipeline([digit(1, 280, 2000), digit(9, 350, 2100)], 19);
		expect(result.matched).toBe(true);
	});

	it("does not group far-apart tiles into a multi-digit number", () => {
		// Tiles far apart: "1" at cx=100, "5" at cx=500 (gap >> avg width)
		const result = runPipeline([digit(1, 100, 3000), digit(5, 500, 3100)], 15);
		expect(result.matched).toBe(false);
	});

	it("matches individual digits from far-apart tiles", () => {
		// "1" at left, "5" at right — each is a single-digit candidate
		const result = runPipeline([digit(1, 100, 3000), digit(5, 500, 3100)], 5);
		expect(result.matched).toBe(true);
	});
});

// ─── Empty play surface ────────────────────────────────────────────────────

describe("pipeline: empty surface", () => {
	it("produces zero detections for empty tensor", () => {
		const tensor = createSyntheticTensor(NUM_CLASSES, NUM_ANCHORS, []);
		const results = postProcess({
			output: tensor,
			numAnchors: NUM_ANCHORS,
			numClasses: NUM_CLASSES,
			...ID_LETTERBOX,
		});
		expect(results).toHaveLength(0);
	});

	it("does not match any answer with empty surface", () => {
		const result = runPipeline([], 7);
		expect(result.matched).toBe(false);
	});
});

// ─── Low-confidence filtering ──────────────────────────────────────────────

describe("pipeline: confidence filtering", () => {
	it("filters out detections below confidence threshold", () => {
		const result = runPipeline([digit(7, 320, 1000, { score: 0.3 })], 7);
		expect(result.matched).toBe(false);
		expect(result.detectedDigits).toEqual([]);
	});

	it("keeps detections just above confidence threshold", () => {
		// Threshold is 0.50; use 0.51 to test just above
		const result = runPipeline([digit(7, 320, 1000, { score: 0.51 })], 7);
		expect(result.matched).toBe(true);
	});

	it("filters low-confidence while keeping high-confidence", () => {
		const result = runPipeline(
			[
				digit(7, 320, 1000, { score: 0.95 }),
				digit(3, 500, 2000, { score: 0.2 }),
			],
			7,
		);
		expect(result.matched).toBe(true);
		expect(result.detectedDigits).toEqual([7]);
	});
});

// ─── 6 vs 9 distinction ───────────────────────────────────────────────────

describe("pipeline: 6 vs 9 distinction", () => {
	it("correctly identifies 6 and does not confuse with 9", () => {
		const result = runPipeline([digit(6, 320, 1000)], 6);
		expect(result.matched).toBe(true);
		expect(result.detectedDigits).toEqual([6]);
	});

	it("correctly identifies 9 and does not confuse with 6", () => {
		const result = runPipeline([digit(9, 320, 1000)], 9);
		expect(result.matched).toBe(true);
		expect(result.detectedDigits).toEqual([9]);
	});

	it("6 does not match when answer is 9", () => {
		const result = runPipeline([digit(6, 320, 1000)], 9);
		expect(result.matched).toBe(false);
	});

	it("9 does not match when answer is 6", () => {
		const result = runPipeline([digit(9, 320, 1000)], 6);
		expect(result.matched).toBe(false);
	});
});

// ─── NMS deduplication ─────────────────────────────────────────────────────

describe("pipeline: NMS deduplication", () => {
	it("suppresses overlapping duplicate detections of same tile", () => {
		const result = runPipeline(
			[
				digit(7, 320, 1000, { score: 0.95 }),
				digit(7, 325, 1001, { score: 0.85 }), // overlapping duplicate
			],
			7,
		);
		expect(result.matched).toBe(true);
		expect(result.detectedDigits).toEqual([7]); // only one survives NMS
	});

	it("keeps non-overlapping detections of same digit", () => {
		// Two "7" tiles at different positions (both valid)
		const result = runPipeline([digit(7, 100, 1000), digit(7, 500, 2000)], 7);
		expect(result.matched).toBe(true);
		expect(result.detectedDigits).toEqual([7, 7]);
	});
});

// ─── Temporal buffer integration ───────────────────────────────────────────

describe("pipeline: temporal buffer", () => {
	it("commits answer after 3 consecutive matching frames", () => {
		const buffer = createTemporalBuffer();
		const events = [];

		for (let i = 0; i < 3; i++) {
			events.push(buffer.update(7));
		}

		expect(events[0]?.type).toBe("TILE_SEEN");
		expect(events[1]?.type).toBe("NONE");
		expect(events[2]?.type).toBe("ANSWER_COMMITTED");
	});

	it("resets on mismatch and requires 3 new consecutive frames", () => {
		const buffer = createTemporalBuffer();

		buffer.update(7); // frame 1: TILE_SEEN
		buffer.update(7); // frame 2: NONE
		// Exceed miss-streak tolerance to force hard reset
		buffer.update(null); // missStreak=1
		buffer.update(null); // missStreak=2
		buffer.update(null); // missStreak=3 > MAX_CONSECUTIVE_MISSES → reset

		const restart1 = buffer.update(7); // frame 1 again
		expect(restart1.type).toBe("TILE_SEEN");

		buffer.update(7); // frame 2
		const commit = buffer.update(7); // frame 3
		expect(commit.type).toBe("ANSWER_COMMITTED");
	});

	it("resets when answer changes", () => {
		const buffer = createTemporalBuffer();

		buffer.update(7); // 7 seen
		buffer.update(7); // 7 count=2

		const switchEvent = buffer.update(5); // switch to 5
		expect(switchEvent.type).toBe("TILE_SEEN");
		expect(buffer.consecutiveCount()).toBe(1);
	});

	it("full pipeline: 3 frames of same detection → commit", () => {
		const buffer = createTemporalBuffer();
		const dets = [digit(7, 320, 1000)];

		for (let frame = 0; frame < 3; frame++) {
			const tensor = createSyntheticTensor(NUM_CLASSES, NUM_ANCHORS, dets);
			const results = postProcess({
				output: tensor,
				numAnchors: NUM_ANCHORS,
				numClasses: NUM_CLASSES,
				...ID_LETTERBOX,
			});

			const candidates = groupDetections(results);
			const match = matchAnswer(candidates, 7);
			const event = buffer.update(match ? match.value : null);

			if (frame === 0) expect(event.type).toBe("TILE_SEEN");
			if (frame === 2) expect(event.type).toBe("ANSWER_COMMITTED");
		}
	});
});

// ─── Stray tile handling (digit-count gate) ────────────────────────────────

describe("pipeline: stray tile handling", () => {
	it("matches correct single digit even with stray tiles present", () => {
		// Answer is 7, tiles visible: 7, 3, 5 (all far apart)
		const result = runPipeline(
			[digit(7, 100, 1000), digit(3, 300, 2000), digit(5, 500, 3000)],
			7,
		);
		expect(result.matched).toBe(true);
	});

	it("does not match two-digit answer when tiles are far apart", () => {
		// Answer is 13, but "1" and "3" are not adjacent
		const result = runPipeline([digit(1, 100, 1000), digit(3, 500, 2000)], 13);
		expect(result.matched).toBe(false);
	});

	it("matches two-digit answer from adjacent tiles among scattered strays", () => {
		// Answer is 15, tiles: 1+5 adjacent, plus stray 3 far away
		const result = runPipeline(
			[digit(1, 280, 1000), digit(5, 350, 1100), digit(3, 550, 2000)],
			15,
		);
		expect(result.matched).toBe(true);
	});
});

// ─── Letterbox / resolution agnostic ───────────────────────────────────────

describe("pipeline: resolution agnostic", () => {
	it("works with 320×320 anchors (2100)", () => {
		const tensor = createSyntheticTensor(NUM_CLASSES, 2100, [
			{
				anchorIdx: 500,
				cx: 160,
				cy: 160,
				w: 40,
				h: 55,
				classId: 7,
				score: 0.9,
			},
		]);
		const results = postProcess({
			output: tensor,
			numAnchors: 2100,
			numClasses: NUM_CLASSES,
			scale: 1,
			padX: 0,
			padY: 0,
			origW: 320,
			origH: 320,
		});
		expect(results).toHaveLength(1);
		expect(results[0]?.digit).toBe(7);
	});

	it("correctly unletterboxes landscape frame", () => {
		// 1280×720 → 640×640 letterbox: scale=0.5, padX=0, padY=140
		// Digit at cx=320, cy=320, w=60, h=80 in model space
		// Unletterbox: origX = (320-0)/0.5 = 640, origY = (320-140)/0.5 = 360
		// x1 = (320-30-0)/0.5 = 580, x2 = (320+30-0)/0.5 = 700
		// y1 = (320-40-140)/0.5 = 280, y2 = (320+40-140)/0.5 = 440
		// Normalized: x=580/1280, y=280/720, w=120/1280, h=160/720
		const tensor = createSyntheticTensor(NUM_CLASSES, NUM_ANCHORS, [
			digit(5, 320, 1000, { cy: 320 }),
		]);
		const results = postProcess({
			output: tensor,
			numAnchors: NUM_ANCHORS,
			numClasses: NUM_CLASSES,
			scale: 0.5,
			padX: 0,
			padY: 140,
			origW: 1280,
			origH: 720,
		});
		expect(results).toHaveLength(1);
		const bbox = results[0]?.bbox;
		expect(bbox?.x).toBeCloseTo(580 / 1280, 2);
		expect(bbox?.y).toBeCloseTo(280 / 720, 2);
		expect(bbox?.width).toBeCloseTo(120 / 1280, 2);
		expect(bbox?.height).toBeCloseTo(160 / 720, 2);
	});
});
