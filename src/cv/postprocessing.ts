// ─── Post-processing: raw YOLO output → DetectedDigit[] ─────────────────────
//
// Pure function (no ORT dependency). Decodes the channel-major output tensor
// from YOLO11, applies confidence filtering, NMS, unletterboxing, and returns
// detections sorted left-to-right.
//
// All parameters (numAnchors, numClasses) are read from output tensor dims,
// not hardcoded — works for both 640×640 (8400 anchors) and 320×320 (2100).

import type { BoundingBox, DetectedDigit } from "../types/cv";

// ─── Tuning Constants ────────────────────────────────────────────────────────
// Tune on real iPad with physical tiles via ?debug=true HUD.
// If tiles are missed → lower CONF. If false positives appear → raise CONF.
// If duplicate detections leak through → lower IOU.

/** Minimum confidence score to keep a detection. Start 0.65; lower to 0.50 if tiles missed, raise to 0.75 if false positives. */
export const DEFAULT_CONF_THRESHOLD = 0.65;

/** NMS IoU threshold. Physical tiles don't overlap, so this mainly filters duplicate detections. Lower to 0.35 if duplicates leak. */
export const DEFAULT_IOU_THRESHOLD = 0.45;

// ─── Internal types ──────────────────────────────────────────────────────────

interface RawDetection {
	readonly x1: number;
	readonly y1: number;
	readonly x2: number;
	readonly y2: number;
	readonly score: number;
	readonly classId: number;
}

// ─── IoU ─────────────────────────────────────────────────────────────────────

export function computeIoU(
	ax1: number,
	ay1: number,
	ax2: number,
	ay2: number,
	bx1: number,
	by1: number,
	bx2: number,
	by2: number,
): number {
	const interX1 = Math.max(ax1, bx1);
	const interY1 = Math.max(ay1, by1);
	const interX2 = Math.min(ax2, bx2);
	const interY2 = Math.min(ay2, by2);

	const interW = Math.max(0, interX2 - interX1);
	const interH = Math.max(0, interY2 - interY1);
	const interArea = interW * interH;

	if (interArea === 0) return 0;

	const areaA = (ax2 - ax1) * (ay2 - ay1);
	const areaB = (bx2 - bx1) * (by2 - by1);
	return interArea / (areaA + areaB - interArea);
}

// ─── NMS ─────────────────────────────────────────────────────────────────────

export function nms(
	detections: readonly RawDetection[],
	iouThreshold: number,
): readonly RawDetection[] {
	// Assume already sorted by score descending
	const kept: RawDetection[] = [];
	const suppressed = new Uint8Array(detections.length);

	for (let i = 0; i < detections.length; i++) {
		if (suppressed[i]) continue;
		const a = detections[i];
		if (!a) continue;
		kept.push(a);
		for (let j = i + 1; j < detections.length; j++) {
			if (suppressed[j]) continue;
			const b = detections[j];
			if (!b) continue;
			const iou = computeIoU(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1, b.x2, b.y2);
			if (iou > iouThreshold) suppressed[j] = 1;
		}
	}

	return kept;
}

// ─── Post-process ────────────────────────────────────────────────────────────

export interface PostProcessParams {
	/** Raw output tensor data from ORT session. */
	readonly output: Float32Array;
	/** Number of anchor boxes (e.g. 8400 for 640×640, 2100 for 320×320). Read from output dims[2]. */
	readonly numAnchors: number;
	/** Number of classes (e.g. 10 for digits). Read from output dims[1] - 4. */
	readonly numClasses: number;
	/** Letterbox scale factor from preprocessing. */
	readonly scale: number;
	/** Letterbox horizontal padding (pixels in model input space). */
	readonly padX: number;
	/** Letterbox vertical padding (pixels in model input space). */
	readonly padY: number;
	/** Original frame width before letterboxing. */
	readonly origW: number;
	/** Original frame height before letterboxing. */
	readonly origH: number;
	/** Minimum confidence score to keep a detection. */
	readonly confThreshold?: number;
	/** IoU threshold for NMS suppression. */
	readonly iouThreshold?: number;
}

/**
 * Post-processes raw YOLO output tensor into DetectedDigit[].
 *
 * Steps:
 * 1. For each anchor, find max class score → filter by confidence threshold
 * 2. Decode box: cx,cy,w,h → x1,y1,x2,y2 in model input space
 * 3. Unletterbox: reverse padding/scale → original frame coordinates
 * 4. NMS: class-agnostic, IoU threshold
 * 5. Sort left-to-right by x position
 * 6. Convert to DetectedDigit[] with normalized bounding boxes
 */
export function postProcess(
	params: PostProcessParams,
): readonly DetectedDigit[] {
	const {
		output,
		numAnchors,
		numClasses,
		scale,
		padX,
		padY,
		origW,
		origH,
		confThreshold = DEFAULT_CONF_THRESHOLD,
		iouThreshold = DEFAULT_IOU_THRESHOLD,
	} = params;

	// Step 1 & 2: Filter by confidence, decode boxes
	const candidates: RawDetection[] = [];

	for (let i = 0; i < numAnchors; i++) {
		// Find max class score (channels 4..4+numClasses-1)
		// Channel-major indexing: output[channel * numAnchors + anchorIdx]
		let maxScore = 0;
		let classId = 0;
		for (let c = 0; c < numClasses; c++) {
			const s = output[(4 + c) * numAnchors + i] ?? 0;
			if (s > maxScore) {
				maxScore = s;
				classId = c;
			}
		}

		if (maxScore < confThreshold) continue;

		// Decode box coordinates (already in pixel space, no sigmoid needed)
		const cx = output[0 * numAnchors + i] ?? 0;
		const cy = output[1 * numAnchors + i] ?? 0;
		const w = output[2 * numAnchors + i] ?? 0;
		const h = output[3 * numAnchors + i] ?? 0;

		// Center → corner format (model input pixel space)
		const mx1 = cx - w / 2;
		const my1 = cy - h / 2;
		const mx2 = cx + w / 2;
		const my2 = cy + h / 2;

		// Unletterbox: remove padding and reverse scale → original image coords
		const x1 = Math.max(0, Math.min(origW, (mx1 - padX) / scale));
		const y1 = Math.max(0, Math.min(origH, (my1 - padY) / scale));
		const x2 = Math.max(0, Math.min(origW, (mx2 - padX) / scale));
		const y2 = Math.max(0, Math.min(origH, (my2 - padY) / scale));

		candidates.push({ x1, y1, x2, y2, score: maxScore, classId });
	}

	// Step 3: Sort by score descending (for NMS)
	candidates.sort((a, b) => b.score - a.score);

	// Step 4: Class-agnostic NMS
	const kept = nms(candidates, iouThreshold);

	// Step 5: Sort left-to-right by x1
	const sorted = [...kept].sort((a, b) => a.x1 - b.x1);

	// Step 6: Convert to DetectedDigit[] with normalized bounding boxes
	return sorted.map((d): DetectedDigit => {
		const bbox: BoundingBox = {
			x: d.x1 / origW,
			y: d.y1 / origH,
			width: (d.x2 - d.x1) / origW,
			height: (d.y2 - d.y1) / origH,
		};
		return {
			digit: d.classId,
			confidence: d.score,
			bbox,
		};
	});
}
