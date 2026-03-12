import { describe, expect, it } from "vitest";
import type { CameraError, CameraStatus } from "./use-camera";

describe("camera types", () => {
	it("CameraStatus type covers all expected states", () => {
		const statuses: CameraStatus[] = [
			"idle",
			"requesting",
			"active",
			"interrupted",
			"error",
			"denied",
		];
		expect(statuses).toHaveLength(6);
	});

	it("CameraError has expected shape", () => {
		const err: CameraError = {
			status: "denied",
			message: "Test error message",
		};
		expect(err.status).toBe("denied");
		expect(err.message).toBe("Test error message");
	});
});
