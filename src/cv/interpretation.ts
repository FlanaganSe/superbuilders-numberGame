import type { DetectedDigit, InterpretationLayer } from "../types/cv";

// ─── Candidate ──────────────────────────────────────────────────────────────

export interface AnswerCandidate {
	readonly digits: string;
	readonly value: number;
}

// ─── Tuning Constants ────────────────────────────────────────────────────────
// Tune with physical tiles: place "1"+"5" adjacent → should group as "15".
// Place them apart → should NOT group. Adjust multiplier if needed.

/** Two tiles must be within 0.5× avg height vertically to be considered on the same line. */
const VERTICAL_ALIGNMENT_FACTOR = 0.5;

/** Two tiles must have gap < 1.0× avg width to form a multi-digit number. Raise to 1.5 if adjacent tiles aren't grouping. */
const HORIZONTAL_PROXIMITY_FACTOR = 1.0;

// ─── Grouping algorithm ─────────────────────────────────────────────────────
// See research-auto-check.md §4 and §12

function centerX(d: DetectedDigit): number {
	return d.bbox.x + d.bbox.width / 2;
}

function centerY(d: DetectedDigit): number {
	return d.bbox.y + d.bbox.height / 2;
}

function rightEdge(d: DetectedDigit): number {
	return d.bbox.x + d.bbox.width;
}

function areVerticallyAligned(
	a: DetectedDigit,
	b: DetectedDigit,
	avgHeight: number,
): boolean {
	return (
		Math.abs(centerY(a) - centerY(b)) < VERTICAL_ALIGNMENT_FACTOR * avgHeight
	);
}

function areHorizontallyProximate(
	left: DetectedDigit,
	right: DetectedDigit,
	avgWidth: number,
): boolean {
	const gap = right.bbox.x - rightEdge(left);
	return gap < HORIZONTAL_PROXIMITY_FACTOR * avgWidth;
}

export function groupDetections(
	detections: readonly DetectedDigit[],
): readonly AnswerCandidate[] {
	if (detections.length === 0) return [];

	// Sort left-to-right by center x
	const sorted = [...detections].sort((a, b) => centerX(a) - centerX(b));

	const candidates: AnswerCandidate[] = [];
	const grouped = new Set<number>();

	// Check adjacent pairs for two-digit grouping (skip already-grouped indices)
	for (let i = 0; i < sorted.length - 1; i++) {
		if (grouped.has(i)) continue;
		const left = sorted[i];
		const right = sorted[i + 1];
		if (!left || !right) continue;

		// Overlapping detections (gap < 0) are duplicate anchors for one
		// physical tile — don't group as multi-digit. This applies regardless
		// of digit class: different-class overlapping boxes that survive NMS
		// (IoU < threshold) still represent the same physical tile.
		const gap = right.bbox.x - rightEdge(left);
		if (gap < 0) continue;

		const pairAvgHeight = (left.bbox.height + right.bbox.height) / 2;
		const pairAvgWidth = (left.bbox.width + right.bbox.width) / 2;
		if (
			areVerticallyAligned(left, right, pairAvgHeight) &&
			areHorizontallyProximate(left, right, pairAvgWidth)
		) {
			const digits = `${left.digit}${right.digit}`;
			candidates.push({ digits, value: Number.parseInt(digits, 10) });
			grouped.add(i);
			grouped.add(i + 1);
			i++; // Skip the right element since it's now grouped
		}
	}

	// Single-digit candidates for ungrouped detections
	for (let i = 0; i < sorted.length; i++) {
		const d = sorted[i];
		if (!grouped.has(i) && d) {
			candidates.push({
				digits: d.digit.toString(),
				value: d.digit,
			});
		}
	}

	return candidates;
}

// ─── Answer matching with digit-count gate ──────────────────────────────────

export function matchAnswer(
	candidates: readonly AnswerCandidate[],
	answer: number,
): AnswerCandidate | null {
	const answerStr = answer.toString();
	return candidates.find((c) => c.digits === answerStr) ?? null;
}

// ─── InterpretationLayer implementation ─────────────────────────────────────

export function createInterpretationLayer(): InterpretationLayer {
	return {
		interpret(
			detections: readonly DetectedDigit[],
			expectedDigitCount: number,
		): readonly number[] {
			const candidates = groupDetections(detections);
			// Filter by expected digit count (digit-count gate)
			const matching = candidates.filter(
				(c) => c.digits.length === expectedDigitCount,
			);
			return matching.map((c) => c.value);
		},
	};
}
