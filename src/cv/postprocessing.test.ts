import { describe, expect, it } from "vitest";
import {
	createSyntheticTensor,
	DIGIT_1_LEFT_FIXTURE,
	DIGIT_3_FIXTURE,
	DIGIT_3_RIGHT_FIXTURE,
	DIGIT_7_DUPLICATE_FIXTURE,
	DIGIT_7_FIXTURE,
	LOW_CONFIDENCE_FIXTURE,
} from "./fixtures/synthetic-tensor";
import {
	computeIoU,
	DEFAULT_CONF_THRESHOLD,
	DEFAULT_IOU_THRESHOLD,
	nms,
	postProcess,
} from "./postprocessing";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Identity letterbox params (no padding, scale=1) for simple testing. */
const IDENTITY_LETTERBOX = {
	scale: 1,
	padX: 0,
	padY: 0,
	origW: 640,
	origH: 640,
} as const;

// ─── computeIoU ──────────────────────────────────────────────────────────────

describe("computeIoU", () => {
	it("returns 1 for identical boxes", () => {
		expect(computeIoU(10, 10, 50, 50, 10, 10, 50, 50)).toBe(1);
	});

	it("returns 0 for non-overlapping boxes", () => {
		expect(computeIoU(0, 0, 10, 10, 20, 20, 30, 30)).toBe(0);
	});

	it("returns 0 for boxes touching at edge (no area overlap)", () => {
		expect(computeIoU(0, 0, 10, 10, 10, 0, 20, 10)).toBe(0);
	});

	it("computes correct IoU for partial overlap", () => {
		// Box A: (0,0)-(10,10) area=100
		// Box B: (5,5)-(15,15) area=100
		// Intersection: (5,5)-(10,10) area=25
		// Union: 100 + 100 - 25 = 175
		// IoU = 25/175 ≈ 0.1429
		expect(computeIoU(0, 0, 10, 10, 5, 5, 15, 15)).toBeCloseTo(25 / 175, 4);
	});

	it("computes correct IoU when one box is inside the other", () => {
		// Box A: (0,0)-(100,100) area=10000
		// Box B: (25,25)-(75,75) area=2500
		// Intersection: (25,25)-(75,75) area=2500
		// Union: 10000 + 2500 - 2500 = 10000
		// IoU = 2500/10000 = 0.25
		expect(computeIoU(0, 0, 100, 100, 25, 25, 75, 75)).toBeCloseTo(0.25, 4);
	});

	it("handles zero-area boxes", () => {
		expect(computeIoU(5, 5, 5, 5, 0, 0, 10, 10)).toBe(0);
	});
});

// ─── nms ─────────────────────────────────────────────────────────────────────

describe("nms", () => {
	it("returns empty array for empty input", () => {
		expect(nms([], 0.45)).toEqual([]);
	});

	it("keeps a single detection unchanged", () => {
		const detections = [
			{ x1: 0, y1: 0, x2: 10, y2: 10, score: 0.9, classId: 7 },
		];
		expect(nms(detections, 0.45)).toEqual(detections);
	});

	it("suppresses overlapping lower-confidence duplicate", () => {
		const detections = [
			{ x1: 10, y1: 10, x2: 50, y2: 50, score: 0.95, classId: 7 },
			{ x1: 12, y1: 12, x2: 52, y2: 52, score: 0.85, classId: 7 },
		];
		const result = nms(detections, 0.45);
		expect(result).toHaveLength(1);
		expect(result[0]?.score).toBe(0.95);
	});

	it("keeps non-overlapping detections", () => {
		const detections = [
			{ x1: 0, y1: 0, x2: 50, y2: 50, score: 0.95, classId: 7 },
			{ x1: 200, y1: 200, x2: 250, y2: 250, score: 0.9, classId: 3 },
		];
		const result = nms(detections, 0.45);
		expect(result).toHaveLength(2);
	});

	it("is class-agnostic (suppresses across different classes)", () => {
		const detections = [
			{ x1: 10, y1: 10, x2: 50, y2: 50, score: 0.95, classId: 7 },
			{ x1: 12, y1: 12, x2: 52, y2: 52, score: 0.85, classId: 3 }, // different class
		];
		const result = nms(detections, 0.45);
		expect(result).toHaveLength(1);
		expect(result[0]?.classId).toBe(7); // higher confidence wins
	});
});

// ─── postProcess ─────────────────────────────────────────────────────────────

describe("postProcess", () => {
	it("detects a single digit 7 from synthetic tensor", () => {
		const tensor = createSyntheticTensor(10, 8400, [DIGIT_7_FIXTURE]);
		const results = postProcess({
			output: tensor,
			numAnchors: 8400,
			numClasses: 10,
			...IDENTITY_LETTERBOX,
		});

		expect(results).toHaveLength(1);
		expect(results[0]?.digit).toBe(7);
		expect(results[0]?.confidence).toBeCloseTo(0.95, 2);
	});

	it("detects multiple digits and sorts left-to-right", () => {
		// digit 3 at x=400 (right), digit 7 at x=100 (left)
		const tensor = createSyntheticTensor(10, 8400, [
			DIGIT_3_FIXTURE, // cx=400
			DIGIT_7_FIXTURE, // cx=100
		]);
		const results = postProcess({
			output: tensor,
			numAnchors: 8400,
			numClasses: 10,
			...IDENTITY_LETTERBOX,
		});

		expect(results).toHaveLength(2);
		expect(results[0]?.digit).toBe(7); // left (x=100)
		expect(results[1]?.digit).toBe(3); // right (x=400)
	});

	it("filters out low-confidence detections", () => {
		const tensor = createSyntheticTensor(10, 8400, [
			DIGIT_7_FIXTURE,
			LOW_CONFIDENCE_FIXTURE, // score=0.30, below threshold
		]);
		const results = postProcess({
			output: tensor,
			numAnchors: 8400,
			numClasses: 10,
			...IDENTITY_LETTERBOX,
		});

		expect(results).toHaveLength(1);
		expect(results[0]?.digit).toBe(7);
	});

	it("suppresses NMS duplicates", () => {
		const tensor = createSyntheticTensor(10, 8400, [
			DIGIT_7_FIXTURE, // score=0.95
			DIGIT_7_DUPLICATE_FIXTURE, // score=0.85, overlapping
		]);
		const results = postProcess({
			output: tensor,
			numAnchors: 8400,
			numClasses: 10,
			...IDENTITY_LETTERBOX,
		});

		expect(results).toHaveLength(1);
		expect(results[0]?.confidence).toBeCloseTo(0.95, 2);
	});

	it("produces normalized bounding boxes (0–1 range)", () => {
		const tensor = createSyntheticTensor(10, 8400, [DIGIT_7_FIXTURE]);
		const results = postProcess({
			output: tensor,
			numAnchors: 8400,
			numClasses: 10,
			...IDENTITY_LETTERBOX,
		});

		expect(results[0]?.bbox.x).toBeGreaterThanOrEqual(0);
		expect(results[0]?.bbox.x).toBeLessThanOrEqual(1);
		expect(results[0]?.bbox.y).toBeGreaterThanOrEqual(0);
		expect(results[0]?.bbox.y).toBeLessThanOrEqual(1);
		expect(results[0]?.bbox.width).toBeGreaterThan(0);
		expect(results[0]?.bbox.width).toBeLessThanOrEqual(1);
		expect(results[0]?.bbox.height).toBeGreaterThan(0);
		expect(results[0]?.bbox.height).toBeLessThanOrEqual(1);
	});

	it("correctly unletterboxes with landscape padding", () => {
		// Simulating 1280×720 → 640×640 letterbox
		// scale=0.5, padX=0, padY=140
		// Digit at cx=100, cy=200 in model space
		// Unletterbox: origX = (100 - 0) / 0.5 = 200, origY = (200 - 140) / 0.5 = 120
		const tensor = createSyntheticTensor(10, 8400, [DIGIT_7_FIXTURE]);
		const results = postProcess({
			output: tensor,
			numAnchors: 8400,
			numClasses: 10,
			scale: 0.5,
			padX: 0,
			padY: 140,
			origW: 1280,
			origH: 720,
		});

		expect(results).toHaveLength(1);
		// Expected center: (200, 120) in original coords
		// Box: w=50, h=70 → unletterboxed: w=100, h=140
		// x1 = (100 - 25 - 0) / 0.5 = 150, x2 = (100 + 25 - 0) / 0.5 = 250
		// y1 = (200 - 35 - 140) / 0.5 = 50, y2 = (200 + 35 - 140) / 0.5 = 190
		// Normalized: x=150/1280, y=50/720, w=100/1280, h=140/720
		expect(results[0]?.bbox.x).toBeCloseTo(150 / 1280, 2);
		expect(results[0]?.bbox.y).toBeCloseTo(50 / 720, 2);
		expect(results[0]?.bbox.width).toBeCloseTo(100 / 1280, 2);
		expect(results[0]?.bbox.height).toBeCloseTo(140 / 720, 2);
	});

	it("handles multi-digit detections (1 and 3 side by side)", () => {
		const tensor = createSyntheticTensor(10, 8400, [
			DIGIT_1_LEFT_FIXTURE, // cx=150
			DIGIT_3_RIGHT_FIXTURE, // cx=220
		]);
		const results = postProcess({
			output: tensor,
			numAnchors: 8400,
			numClasses: 10,
			...IDENTITY_LETTERBOX,
		});

		expect(results).toHaveLength(2);
		expect(results[0]?.digit).toBe(1); // left
		expect(results[1]?.digit).toBe(3); // right
	});

	it("returns empty array when no detections pass confidence threshold", () => {
		const tensor = createSyntheticTensor(10, 8400, [LOW_CONFIDENCE_FIXTURE]);
		const results = postProcess({
			output: tensor,
			numAnchors: 8400,
			numClasses: 10,
			...IDENTITY_LETTERBOX,
		});

		expect(results).toEqual([]);
	});

	it("returns empty array for empty tensor (all zeros)", () => {
		const tensor = createSyntheticTensor(10, 8400, []);
		const results = postProcess({
			output: tensor,
			numAnchors: 8400,
			numClasses: 10,
			...IDENTITY_LETTERBOX,
		});

		expect(results).toEqual([]);
	});

	it("works with 320×320 input (2100 anchors)", () => {
		const fixture = { ...DIGIT_7_FIXTURE, anchorIdx: 500 };
		const tensor = createSyntheticTensor(10, 2100, [fixture]);
		const results = postProcess({
			output: tensor,
			numAnchors: 2100,
			numClasses: 10,
			...IDENTITY_LETTERBOX,
		});

		expect(results).toHaveLength(1);
		expect(results[0]?.digit).toBe(7);
	});

	it("works with COCO 80-class model (numClasses=80)", () => {
		const cocoFixture = {
			anchorIdx: 1000,
			cx: 320,
			cy: 320,
			w: 100,
			h: 100,
			classId: 42,
			score: 0.9,
		};
		const tensor = createSyntheticTensor(80, 8400, [cocoFixture]);
		const results = postProcess({
			output: tensor,
			numAnchors: 8400,
			numClasses: 80,
			...IDENTITY_LETTERBOX,
		});

		expect(results).toHaveLength(1);
		expect(results[0]?.digit).toBe(42);
	});

	it("respects custom confidence threshold", () => {
		const tensor = createSyntheticTensor(10, 8400, [DIGIT_7_FIXTURE]);
		// Raise threshold above the fixture's score
		const results = postProcess({
			output: tensor,
			numAnchors: 8400,
			numClasses: 10,
			...IDENTITY_LETTERBOX,
			confThreshold: 0.99,
		});

		expect(results).toEqual([]);
	});

	it("clamps box coordinates to original image bounds", () => {
		// Detection near edge — after unletterbox some coords might go negative
		const edgeFixture = {
			anchorIdx: 100,
			cx: 5, // very close to left edge
			cy: 5,
			w: 50,
			h: 50,
			classId: 0,
			score: 0.9,
		};
		const tensor = createSyntheticTensor(10, 8400, [edgeFixture]);
		const results = postProcess({
			output: tensor,
			numAnchors: 8400,
			numClasses: 10,
			...IDENTITY_LETTERBOX,
		});

		expect(results).toHaveLength(1);
		expect(results[0]?.bbox.x).toBeGreaterThanOrEqual(0);
		expect(results[0]?.bbox.y).toBeGreaterThanOrEqual(0);
	});

	it("exports default thresholds", () => {
		expect(DEFAULT_CONF_THRESHOLD).toBe(0.65);
		expect(DEFAULT_IOU_THRESHOLD).toBe(0.45);
	});
});
