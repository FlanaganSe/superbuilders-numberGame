import { describe, expect, it } from "vitest";
import { createFrameCapture } from "./frame-capture";

describe("createFrameCapture", () => {
	it("returns initial stats with zero frame count and not capturing", () => {
		const fc = createFrameCapture();
		const stats = fc.stats;

		expect(stats.frameCount).toBe(0);
		expect(stats.fps).toBe(0);
		expect(stats.capturing).toBe(false);
	});

	it("allows subscribing and unsubscribing frame listeners", () => {
		const fc = createFrameCapture();
		const cb = (): void => {};
		const unsub = fc.onFrame(cb);

		expect(typeof unsub).toBe("function");
		unsub();
	});

	it("stop cleans up canvas and resets capturing state", () => {
		const fc = createFrameCapture();
		// stop() should be safe to call even without start()
		fc.stop();

		expect(fc.stats.capturing).toBe(false);
	});

	it("returns a new stats snapshot on each access", () => {
		const fc = createFrameCapture();
		const a = fc.stats;
		const b = fc.stats;

		// Stats are snapshots (not shared references)
		expect(a).toEqual(b);
		expect(a).not.toBe(b);
	});
});
