import type {
	DetectedDigit,
	Digit,
	RecognitionResult,
	RecognitionService,
} from "../types/cv";

// ─── Mock detection factory ─────────────────────────────────────────────────

export function createMockDetection(digit: Digit): DetectedDigit {
	return {
		digit,
		confidence: 0.99,
		bbox: {
			x: 0.4,
			y: 0.4,
			width: 0.1,
			height: 0.15,
		},
	};
}

export function createMockDetectionPair(
	tens: Digit,
	ones: Digit,
): readonly DetectedDigit[] {
	return [
		{
			digit: tens,
			confidence: 0.99,
			bbox: { x: 0.3, y: 0.4, width: 0.1, height: 0.15 },
		},
		{
			digit: ones,
			confidence: 0.99,
			bbox: { x: 0.42, y: 0.4, width: 0.1, height: 0.15 },
		},
	];
}

// ─── MockRecognitionService ─────────────────────────────────────────────────

export type DigitCallback = (detections: readonly DetectedDigit[]) => void;

export interface MockRecognitionControl {
	readonly service: RecognitionService;
	readonly emitDigit: (digit: Digit) => void;
	readonly emitDigits: (digits: readonly DetectedDigit[]) => void;
	readonly onDetection: (cb: DigitCallback) => () => void;
}

export function createMockRecognitionService(): MockRecognitionControl {
	let isReady = false;
	const listeners = new Set<DigitCallback>();

	const service: RecognitionService = {
		async init(): Promise<void> {
			isReady = true;
		},

		async recognize(_frame: ImageBitmap): Promise<RecognitionResult | null> {
			_frame.close();
			return {
				detections: [],
				latencyMs: 0,
				frameTimestamp: Date.now(),
			};
		},

		dispose(): void {
			isReady = false;
			listeners.clear();
		},

		get ready(): boolean {
			return isReady;
		},
	};

	return {
		service,

		emitDigit(digit: Digit): void {
			const detections = [createMockDetection(digit)];
			for (const cb of listeners) {
				cb(detections);
			}
		},

		emitDigits(digits: readonly DetectedDigit[]): void {
			for (const cb of listeners) {
				cb(digits);
			}
		},

		onDetection(cb: DigitCallback): () => void {
			listeners.add(cb);
			return () => {
				listeners.delete(cb);
			};
		},
	};
}
