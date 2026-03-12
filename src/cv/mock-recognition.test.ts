import { describe, expect, it } from "vitest";
import {
	createMockDetection,
	createMockDetectionPair,
	createMockRecognitionService,
} from "./mock-recognition";

describe("createMockDetection", () => {
	it("creates a DetectedDigit with correct shape", () => {
		const detection = createMockDetection(7);
		expect(detection.digit).toBe(7);
		expect(detection.confidence).toBeGreaterThan(0);
		expect(detection.confidence).toBeLessThanOrEqual(1);
		expect(detection.bbox).toHaveProperty("x");
		expect(detection.bbox).toHaveProperty("y");
		expect(detection.bbox).toHaveProperty("width");
		expect(detection.bbox).toHaveProperty("height");
	});

	it("creates detections for all digits 0-9", () => {
		for (let d = 0; d <= 9; d++) {
			const detection = createMockDetection(d);
			expect(detection.digit).toBe(d);
		}
	});
});

describe("createMockDetectionPair", () => {
	it("creates two adjacent detections", () => {
		const pair = createMockDetectionPair(1, 5);
		expect(pair).toHaveLength(2);
		expect(pair[0]?.digit).toBe(1);
		expect(pair[1]?.digit).toBe(5);
		// Left should be to the left of right
		expect(pair[0]?.bbox.x).toBeLessThan(pair[1]?.bbox.x ?? 0);
	});
});

describe("MockRecognitionService", () => {
	it("initializes and becomes ready", async () => {
		const { service } = createMockRecognitionService();
		expect(service.ready).toBe(false);
		await service.init();
		expect(service.ready).toBe(true);
	});

	it("emits detections to listeners", async () => {
		const { service, emitDigit, onDetection } = createMockRecognitionService();
		await service.init();

		const received: number[] = [];
		onDetection((detections) => {
			for (const d of detections) {
				received.push(d.digit);
			}
		});

		emitDigit(7);
		expect(received).toEqual([7]);
	});

	it("unsubscribes correctly", async () => {
		const { service, emitDigit, onDetection } = createMockRecognitionService();
		await service.init();

		const received: number[] = [];
		const unsub = onDetection((detections) => {
			for (const d of detections) {
				received.push(d.digit);
			}
		});

		emitDigit(3);
		unsub();
		emitDigit(5);
		expect(received).toEqual([3]);
	});

	it("disposes cleanly", async () => {
		const { service } = createMockRecognitionService();
		await service.init();
		service.dispose();
		expect(service.ready).toBe(false);
	});
});
