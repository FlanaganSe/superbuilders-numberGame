// ─── Bounding Box ────────────────────────────────────────────────────────────

/** Normalized coordinates (0–1 range, relative to frame dimensions). */
export interface BoundingBox {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

// ─── Digit ───────────────────────────────────────────────────────────────────

export type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// ─── Letter ──────────────────────────────────────────────────────────────────

export type Letter =
	| "A"
	| "B"
	| "C"
	| "D"
	| "E"
	| "F"
	| "G"
	| "H"
	| "I"
	| "J"
	| "K"
	| "L"
	| "M"
	| "N"
	| "O"
	| "P"
	| "Q"
	| "R"
	| "S"
	| "T"
	| "U"
	| "V"
	| "W"
	| "X"
	| "Y"
	| "Z";

// ─── Detection ───────────────────────────────────────────────────────────────

/**
 * A detection from the YOLO model. `digit` is the raw classId (0-9 for digits,
 * 10-35 for letters A-Z). Widened from `Digit` to `number` to support the
 * 36-class model — callers constrain the range via `classRange` in postProcess.
 */
export interface DetectedDigit {
	readonly digit: number;
	readonly confidence: number;
	readonly bbox: BoundingBox;
}

// ─── Recognition Result ─────────────────────────────────────────────────────

export interface RecognitionResult {
	readonly detections: readonly DetectedDigit[];
	readonly latencyMs: number;
	readonly frameTimestamp: number;
	readonly numClasses?: number;
}

// ─── PRD Seam Interfaces (§3.25) ────────────────────────────────────────────
//
// These six interfaces define the architectural boundaries of the CV pipeline.
// Each can start thin but must exist as explicit interfaces so future expansion
// (handwriting, operators, alternative detectors) doesn't require rewriting
// core logic.

/** Decouples recognition from the live camera — enables fixture replay and prerecorded playback. */
export interface FrameSource {
	start(): Promise<void>;
	stop(): void;
	readonly active: boolean;
	onFrame(callback: (frame: ImageBitmap) => void): () => void;
}

/** Normalizes, resizes, and adjusts contrast before inference. */
export interface PreprocessingStrategy {
	process(frame: ImageBitmap, targetSize: number): Promise<Float32Array>;
}

/** Model init, inference, and dispose — every backend (ORT, mock, cloud, fixture) implements this. */
export interface RecognitionService {
	init(modelUrl?: string): Promise<void>;
	/** Returns null when the frame was skipped (e.g. worker busy). Callers must not treat null as "no detections". */
	recognize(frame: ImageBitmap): Promise<RecognitionResult | null>;
	dispose(): void;
	readonly ready: boolean;
}

/** Converts raw detections into semantic answer candidates with ordering and grouping. */
export interface InterpretationLayer {
	interpret(
		detections: readonly DetectedDigit[],
		expectedDigitCount: number,
	): readonly number[];
}

/** Problem generation, round lifecycle, auto-check logic, progression. */
export interface GameEngine {
	generateProblem(): import("./game").Problem;
	checkAnswer(detected: readonly number[]): boolean;
	readonly currentProblem: import("./game").Problem | null;
}

/** Symbol definitions, label IDs, and ambiguity policy. Digits today, expandable tomorrow. */
export interface VocabularyRegistry {
	readonly labels: readonly string[];
	readonly size: number;
	resolveAmbiguity(
		detections: readonly DetectedDigit[],
	): readonly DetectedDigit[];
}
