// ─── Motion Gate ──────────────────────────────────────────────────────────────
// Confidence-drop proxy (research-auto-check.md §9):
// If average confidence across all detections in a frame drops below threshold,
// the frame is considered unstable (hand occlusion, motion blur, etc.)
// and should be skipped by the temporal buffer.

import type { DetectedDigit } from "../types/cv";

/** Average confidence below this → frame is unstable (hand occlusion, motion blur). Lower to 0.30 if too sensitive. */
const MOTION_GATE_THRESHOLD = 0.4;

/**
 * Returns true if the frame is considered stable enough for the temporal buffer.
 *
 * Empty detection arrays are treated as stable — no detections means nothing
 * to evaluate, and the temporal buffer handles the "no match" case separately.
 */
export function isFrameStable(detections: readonly DetectedDigit[]): boolean {
	if (detections.length === 0) return true;

	const avgConfidence =
		detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length;

	return avgConfidence >= MOTION_GATE_THRESHOLD;
}
