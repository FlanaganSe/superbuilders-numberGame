import { describe, expect, it } from "vitest";
import {
	createTemporalBuffer,
	MAX_CONSECUTIVE_MISSES,
} from "./temporal-buffer";

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

	it("hard-resets counter after exceeding miss tolerance", () => {
		const buffer = createTemporalBuffer();
		buffer.update(7);
		buffer.update(7);
		expect(buffer.consecutiveCount()).toBe(2);

		// Exceed tolerance: N+1 consecutive nulls
		for (let i = 0; i <= MAX_CONSECUTIVE_MISSES; i++) {
			buffer.update(null);
		}
		expect(buffer.consecutiveCount()).toBe(0);
		expect(buffer.lastAnswer()).toBeNull();

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
		expect(event.type).toBe("TILE_SEEN");
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

	it("tracks lastAnswer correctly through tolerance and reset", () => {
		const buffer = createTemporalBuffer();
		expect(buffer.lastAnswer()).toBeNull();
		buffer.update(5);
		expect(buffer.lastAnswer()).toBe(5);

		// Within tolerance — lastAnswer retained
		buffer.update(null);
		expect(buffer.lastAnswer()).toBe(5);

		// Exceed tolerance — lastAnswer cleared
		for (let i = 1; i <= MAX_CONSECUTIVE_MISSES; i++) {
			buffer.update(null);
		}
		expect(buffer.lastAnswer()).toBeNull();
	});

	it("reset clears all state including missStreak", () => {
		const buffer = createTemporalBuffer();
		buffer.update(7);
		buffer.update(7);
		buffer.update(null); // missStreak=1
		buffer.reset();
		expect(buffer.consecutiveCount()).toBe(0);
		expect(buffer.lastAnswer()).toBeNull();

		// After reset, miss tolerance starts fresh
		buffer.update(5);
		buffer.update(null); // missStreak=1 (not carried from before reset)
		expect(buffer.consecutiveCount()).toBe(1);
		expect(buffer.lastAnswer()).toBe(5);
	});

	// ─── Miss-streak tolerance contract tests ───────────────────────────

	it("preserves consecutiveCount within miss tolerance", () => {
		const buffer = createTemporalBuffer();
		buffer.update(7); // count=1
		buffer.update(7); // count=2

		// N nulls within tolerance — count stays at 2
		for (let i = 0; i < MAX_CONSECUTIVE_MISSES; i++) {
			buffer.update(null);
			expect(buffer.consecutiveCount()).toBe(2);
		}
	});

	it("resets consecutiveCount to 0 after N+1 consecutive nulls", () => {
		const buffer = createTemporalBuffer();
		buffer.update(7); // count=1
		buffer.update(7); // count=2

		// N+1 nulls — exceeds tolerance
		for (let i = 0; i <= MAX_CONSECUTIVE_MISSES; i++) {
			buffer.update(null);
		}
		expect(buffer.consecutiveCount()).toBe(0);
	});

	it("consecutiveCount excludes tolerated null frames", () => {
		const buffer = createTemporalBuffer();
		buffer.update(7); // count=1
		buffer.update(null); // within tolerance — count still 1
		buffer.update(7); // count=2 (not 3)
		buffer.update(null); // within tolerance — count still 2
		buffer.update(7); // count=3 → ANSWER_COMMITTED
		expect(buffer.consecutiveCount()).toBe(3);

		buffer.update(7);
		// count is now 4 — already committed on previous call
		expect(buffer.consecutiveCount()).toBe(4);
	});

	it("commits answer through tolerated null gaps", () => {
		const buffer = createTemporalBuffer();
		buffer.update(7); // count=1, TILE_SEEN
		buffer.update(null); // tolerated miss
		buffer.update(7); // count=2
		buffer.update(null); // tolerated miss
		const event = buffer.update(7); // count=3, ANSWER_COMMITTED
		expect(event.type).toBe("ANSWER_COMMITTED");
		if (event.type === "ANSWER_COMMITTED") {
			expect(event.answer).toBe(7);
		}
	});

	it("emits TILE_SEEN for different answer after tolerance-exceeded reset", () => {
		const buffer = createTemporalBuffer();
		buffer.update(7); // count=1
		buffer.update(7); // count=2
		// Exceed tolerance
		for (let i = 0; i <= MAX_CONSECUTIVE_MISSES; i++) {
			buffer.update(null);
		}
		// New tile placed after reset
		const event = buffer.update(5);
		expect(event.type).toBe("TILE_SEEN");
		if (event.type === "TILE_SEEN") {
			expect(event.answer).toBe(5);
		}
		expect(buffer.consecutiveCount()).toBe(1);
		expect(buffer.lastAnswer()).toBe(5);
	});

	it("resets miss streak on any valid detection", () => {
		const buffer = createTemporalBuffer();
		buffer.update(7);
		buffer.update(null); // missStreak=1
		buffer.update(null); // missStreak=2 (at tolerance limit)
		buffer.update(7); // missStreak resets to 0, count=2
		buffer.update(null); // missStreak=1 (fresh streak)
		buffer.update(null); // missStreak=2 (still within tolerance)
		expect(buffer.consecutiveCount()).toBe(2);
		expect(buffer.lastAnswer()).toBe(7);
	});
});

// ─── Generic temporal buffer (string) ───────────────────────────────────────

describe("TemporalBuffer<string>", () => {
	it("works with string answers (spelling mode)", () => {
		const buffer = createTemporalBuffer<string>();
		const e1 = buffer.update("CAT");
		expect(e1.type).toBe("TILE_SEEN");
		if (e1.type === "TILE_SEEN") {
			expect(e1.answer).toBe("CAT");
		}

		buffer.update("CAT");
		const e3 = buffer.update("CAT");
		expect(e3.type).toBe("ANSWER_COMMITTED");
		if (e3.type === "ANSWER_COMMITTED") {
			expect(e3.answer).toBe("CAT");
		}
	});

	it("resets on different string answer", () => {
		const buffer = createTemporalBuffer<string>();
		buffer.update("CAT");
		buffer.update("CAT");
		const event = buffer.update("DOG");
		expect(event.type).toBe("TILE_SEEN");
		if (event.type === "TILE_SEEN") {
			expect(event.answer).toBe("DOG");
		}
		expect(buffer.consecutiveCount()).toBe(1);
	});

	it("tracks lastAnswer as string", () => {
		const buffer = createTemporalBuffer<string>();
		expect(buffer.lastAnswer()).toBeNull();
		buffer.update("FISH");
		expect(buffer.lastAnswer()).toBe("FISH");
	});
});
