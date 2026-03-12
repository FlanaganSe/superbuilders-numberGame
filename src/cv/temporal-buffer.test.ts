import { describe, expect, it } from "vitest";
import { createTemporalBuffer } from "./temporal-buffer";

describe("TemporalBuffer", () => {
	it("emits TILE_SEEN on first matching frame", () => {
		const buffer = createTemporalBuffer();
		const event = buffer.update(7);
		expect(event.type).toBe("TILE_SEEN");
		if (event.type === "TILE_SEEN") {
			expect(event.answer).toBe(7);
		}
	});

	it("emits ANSWER_COMMITTED after 3 consecutive matching frames", () => {
		const buffer = createTemporalBuffer();
		buffer.update(7); // Frame 1: TILE_SEEN
		buffer.update(7); // Frame 2: NONE (already seen)
		const event = buffer.update(7); // Frame 3: ANSWER_COMMITTED
		expect(event.type).toBe("ANSWER_COMMITTED");
		if (event.type === "ANSWER_COMMITTED") {
			expect(event.answer).toBe(7);
		}
	});

	it("resets counter on mismatch", () => {
		const buffer = createTemporalBuffer();
		buffer.update(7);
		buffer.update(7);
		buffer.update(null); // Mismatch resets
		expect(buffer.consecutiveCount()).toBe(0);

		// Need 3 more to commit
		buffer.update(7); // 1 - TILE_SEEN
		buffer.update(7); // 2
		const event = buffer.update(7); // 3 - ANSWER_COMMITTED
		expect(event.type).toBe("ANSWER_COMMITTED");
	});

	it("resets counter when answer changes", () => {
		const buffer = createTemporalBuffer();
		buffer.update(7);
		buffer.update(7);
		const event = buffer.update(8); // Different answer resets
		expect(event.type).toBe("TILE_SEEN"); // New tile seen
		expect(buffer.consecutiveCount()).toBe(1);
	});

	it("handles interleaved answers", () => {
		const buffer = createTemporalBuffer();
		buffer.update(7); // TILE_SEEN
		buffer.update(8); // TILE_SEEN (different)
		buffer.update(7); // TILE_SEEN (switched back)
		buffer.update(7); // NONE
		const event = buffer.update(7); // ANSWER_COMMITTED
		expect(event.type).toBe("ANSWER_COMMITTED");
		if (event.type === "ANSWER_COMMITTED") {
			expect(event.answer).toBe(7);
		}
	});

	it("emits NONE for null input", () => {
		const buffer = createTemporalBuffer();
		const event = buffer.update(null);
		expect(event.type).toBe("NONE");
	});

	it("emits NONE between TILE_SEEN and ANSWER_COMMITTED", () => {
		const buffer = createTemporalBuffer();
		buffer.update(7); // TILE_SEEN
		const event = buffer.update(7); // Already seen, not yet committed
		expect(event.type).toBe("NONE");
	});

	it("tracks lastAnswer correctly", () => {
		const buffer = createTemporalBuffer();
		expect(buffer.lastAnswer()).toBeNull();
		buffer.update(5);
		expect(buffer.lastAnswer()).toBe(5);
		buffer.update(null);
		expect(buffer.lastAnswer()).toBeNull();
	});

	it("reset clears all state", () => {
		const buffer = createTemporalBuffer();
		buffer.update(7);
		buffer.update(7);
		buffer.reset();
		expect(buffer.consecutiveCount()).toBe(0);
		expect(buffer.lastAnswer()).toBeNull();
	});
});
