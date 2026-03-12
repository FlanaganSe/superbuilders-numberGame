// ─── Synthetic YOLO output tensors for testing ──────────────────────────────
//
// These create Float32Array tensors matching the YOLO11n output format:
//   shape: [1, 4 + numClasses, numAnchors]
//   layout: channel-major — all values for channel 0 first, then channel 1, etc.
//   indexing: output[channel * numAnchors + anchorIdx]
//
// For 10 digit classes at 640×640: [1, 14, 8400]
// For 10 digit classes at 320×320: [1, 14, 2100]
//
// Usage: embed known detections at specific anchor indices, leave the rest
// as low-confidence noise. Then run postProcess() and verify expected output.

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SyntheticDetection {
	/** Anchor index to place this detection at. */
	readonly anchorIdx: number;
	/** Center x in model input pixel space (0–inputSize). */
	readonly cx: number;
	/** Center y in model input pixel space (0–inputSize). */
	readonly cy: number;
	/** Box width in model input pixel space. */
	readonly w: number;
	/** Box height in model input pixel space. */
	readonly h: number;
	/** Class index (0–9 for digits). */
	readonly classId: number;
	/** Confidence score for this class. */
	readonly score: number;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Creates a synthetic YOLO output tensor with the given detections embedded.
 *
 * All non-specified anchors have zero-valued class scores (below any
 * reasonable confidence threshold), so they will be filtered out by postProcess.
 *
 * @param numClasses Number of classes (e.g. 10 for digits, 80 for COCO)
 * @param numAnchors Number of anchors (8400 for 640×640, 2100 for 320×320)
 * @param detections Array of known detections to embed
 * @returns Float32Array matching [1, 4+numClasses, numAnchors] channel-major layout
 */
export function createSyntheticTensor(
	numClasses: number,
	numAnchors: number,
	detections: readonly SyntheticDetection[],
): Float32Array {
	const numChannels = 4 + numClasses;
	const tensor = new Float32Array(numChannels * numAnchors);

	for (const det of detections) {
		// Box coordinates: channels 0–3
		tensor[0 * numAnchors + det.anchorIdx] = det.cx;
		tensor[1 * numAnchors + det.anchorIdx] = det.cy;
		tensor[2 * numAnchors + det.anchorIdx] = det.w;
		tensor[3 * numAnchors + det.anchorIdx] = det.h;

		// Class score: channel 4 + classId
		tensor[(4 + det.classId) * numAnchors + det.anchorIdx] = det.score;
	}

	return tensor;
}

// ─── Pre-built fixtures ──────────────────────────────────────────────────────

/** Single "7" at position (100, 200) with 50×70 box, confidence 0.95. */
export const DIGIT_7_FIXTURE: SyntheticDetection = {
	anchorIdx: 1000,
	cx: 100,
	cy: 200,
	w: 50,
	h: 70,
	classId: 7,
	score: 0.95,
};

/** Single "3" at position (400, 200) with 50×70 box, confidence 0.88. */
export const DIGIT_3_FIXTURE: SyntheticDetection = {
	anchorIdx: 2000,
	cx: 400,
	cy: 200,
	w: 50,
	h: 70,
	classId: 3,
	score: 0.88,
};

/** "1" at left position, for multi-digit "13" testing. */
export const DIGIT_1_LEFT_FIXTURE: SyntheticDetection = {
	anchorIdx: 3000,
	cx: 150,
	cy: 300,
	w: 50,
	h: 70,
	classId: 1,
	score: 0.92,
};

/** "3" at right position, for multi-digit "13" testing. */
export const DIGIT_3_RIGHT_FIXTURE: SyntheticDetection = {
	anchorIdx: 3500,
	cx: 220,
	cy: 300,
	w: 50,
	h: 70,
	classId: 3,
	score: 0.9,
};

/** Low-confidence detection that should be filtered out (below 0.65 threshold). */
export const LOW_CONFIDENCE_FIXTURE: SyntheticDetection = {
	anchorIdx: 5000,
	cx: 500,
	cy: 400,
	w: 40,
	h: 60,
	classId: 9,
	score: 0.3,
};

/**
 * Overlapping duplicate of DIGIT_7 — should be suppressed by NMS.
 * Same location, slightly offset, lower confidence.
 */
export const DIGIT_7_DUPLICATE_FIXTURE: SyntheticDetection = {
	anchorIdx: 1001,
	cx: 105,
	cy: 205,
	w: 48,
	h: 68,
	classId: 7,
	score: 0.85,
};
