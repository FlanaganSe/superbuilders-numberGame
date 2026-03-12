import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFixtureFrameSource } from "./fixture-frame-source";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockBitmap = {
	width: 640,
	height: 480,
	close: vi.fn(),
};

beforeEach(() => {
	mockBitmap.close.mockReset();

	// Mock fetch → blob → createImageBitmap chain
	globalThis.fetch = vi.fn().mockResolvedValue({
		blob: () =>
			Promise.resolve(new Blob(["fake-image"], { type: "image/jpeg" })),
	});

	globalThis.createImageBitmap = vi
		.fn()
		.mockResolvedValue(mockBitmap as unknown as ImageBitmap);
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("createFixtureFrameSource", () => {
	it("starts inactive", () => {
		const source = createFixtureFrameSource([
			{ imageUrl: "/fixtures/digit-7.jpg" },
		]);
		expect(source.active).toBe(false);
	});

	it("loads an image and emits as ImageBitmap", async () => {
		const source = createFixtureFrameSource([
			{ imageUrl: "/fixtures/digit-7.jpg" },
		]);

		const frames: ImageBitmap[] = [];
		source.onFrame((bitmap) => frames.push(bitmap));

		await source.start();

		expect(frames).toHaveLength(1);
		expect(frames[0]).toBe(mockBitmap);
		expect(globalThis.fetch).toHaveBeenCalledWith("/fixtures/digit-7.jpg");
		expect(globalThis.createImageBitmap).toHaveBeenCalled();
	});

	it("emits multiple frames sequentially", async () => {
		vi.useFakeTimers();

		const source = createFixtureFrameSource([
			{ imageUrl: "/fixtures/digit-7.jpg" },
			{ imageUrl: "/fixtures/digit-3.jpg" },
		]);

		const frames: ImageBitmap[] = [];
		source.onFrame((bitmap) => frames.push(bitmap));

		await source.start();
		expect(frames).toHaveLength(1); // First frame emitted immediately

		// Advance timer for the second frame
		await vi.advanceTimersByTimeAsync(150);
		expect(frames).toHaveLength(2);

		vi.useRealTimers();
	});

	it("becomes inactive after all frames are emitted", async () => {
		const source = createFixtureFrameSource([
			{ imageUrl: "/fixtures/digit-7.jpg" },
		]);

		source.onFrame(() => {});
		await source.start();

		expect(source.active).toBe(false);
	});

	it("closes bitmap if no listeners are subscribed", async () => {
		const source = createFixtureFrameSource([
			{ imageUrl: "/fixtures/digit-7.jpg" },
		]);

		await source.start();

		expect(mockBitmap.close).toHaveBeenCalled();
	});

	it("unsubscribes a listener", async () => {
		const source = createFixtureFrameSource([
			{ imageUrl: "/fixtures/digit-7.jpg" },
		]);

		const frames: ImageBitmap[] = [];
		const unsub = source.onFrame((bitmap) => frames.push(bitmap));
		unsub();

		await source.start();

		expect(frames).toHaveLength(0);
		expect(mockBitmap.close).toHaveBeenCalled(); // No listeners → closed
	});

	it("stop cancels pending frames", async () => {
		vi.useFakeTimers();

		const source = createFixtureFrameSource([
			{ imageUrl: "/fixtures/digit-7.jpg" },
			{ imageUrl: "/fixtures/digit-3.jpg" },
		]);

		const frames: ImageBitmap[] = [];
		source.onFrame((bitmap) => frames.push(bitmap));

		await source.start();
		expect(frames).toHaveLength(1);

		source.stop();
		await vi.advanceTimersByTimeAsync(200);
		expect(frames).toHaveLength(1); // Second frame never emitted

		vi.useRealTimers();
	});

	it("handles empty fixture list", async () => {
		const source = createFixtureFrameSource([]);

		const frames: ImageBitmap[] = [];
		source.onFrame((bitmap) => frames.push(bitmap));

		await source.start();
		expect(frames).toHaveLength(0);
		expect(source.active).toBe(false);
	});
});
