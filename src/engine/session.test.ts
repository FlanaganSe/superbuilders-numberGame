import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoundResult } from "../types/game";
import {
	loadCumulative,
	loadMute,
	recordSession,
	saveCumulative,
	saveMute,
	starsForAttempt,
	totalStarsFromRounds,
} from "./session";

describe("starsForAttempt", () => {
	it("returns 3 for first attempt", () => {
		expect(starsForAttempt(1)).toBe(3);
	});

	it("returns 2 for second attempt", () => {
		expect(starsForAttempt(2)).toBe(2);
	});

	it("returns 1 for third attempt", () => {
		expect(starsForAttempt(3)).toBe(1);
	});

	it("returns 1 for any attempt beyond third", () => {
		expect(starsForAttempt(4)).toBe(1);
		expect(starsForAttempt(10)).toBe(1);
	});

	it("returns 3 for attempt 0 or negative (edge case)", () => {
		expect(starsForAttempt(0)).toBe(3);
		expect(starsForAttempt(-1)).toBe(3);
	});
});

describe("totalStarsFromRounds", () => {
	it("sums stars from all rounds", () => {
		const rounds: readonly RoundResult[] = [
			makeMockRound(3),
			makeMockRound(2),
			makeMockRound(1),
		];
		expect(totalStarsFromRounds(rounds)).toBe(6);
	});

	it("returns 0 for empty rounds", () => {
		expect(totalStarsFromRounds([])).toBe(0);
	});
});

describe("localStorage persistence", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	describe("cumulative data", () => {
		it("returns defaults when no data exists", () => {
			const data = loadCumulative();
			expect(data.totalStars).toBe(0);
			expect(data.sessionsPlayed).toBe(0);
		});

		it("saves and loads round-trip", () => {
			saveCumulative({ totalStars: 42, sessionsPlayed: 3 });
			const data = loadCumulative();
			expect(data.totalStars).toBe(42);
			expect(data.sessionsPlayed).toBe(3);
		});

		it("handles corrupt data gracefully", () => {
			localStorage.setItem("superbuilders-cumulative", "not-json");
			const data = loadCumulative();
			expect(data.totalStars).toBe(0);
			expect(data.sessionsPlayed).toBe(0);
		});

		it("handles malformed JSON gracefully", () => {
			localStorage.setItem(
				"superbuilders-cumulative",
				JSON.stringify({ garbage: true }),
			);
			const data = loadCumulative();
			expect(data.totalStars).toBe(0);
		});

		it("handles localStorage exceptions gracefully", () => {
			vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
				throw new Error("quota exceeded");
			});
			const data = loadCumulative();
			expect(data.totalStars).toBe(0);
			vi.restoreAllMocks();
		});
	});

	describe("recordSession", () => {
		it("accumulates stars across sessions", () => {
			const session1 = recordSession(makeMockSession(10));
			expect(session1.totalStars).toBe(10);
			expect(session1.sessionsPlayed).toBe(1);

			const session2 = recordSession(makeMockSession(15));
			expect(session2.totalStars).toBe(25);
			expect(session2.sessionsPlayed).toBe(2);
		});
	});

	describe("mute preference", () => {
		it("defaults to false", () => {
			expect(loadMute()).toBe(false);
		});

		it("persists true", () => {
			saveMute(true);
			expect(loadMute()).toBe(true);
		});

		it("persists false", () => {
			saveMute(true);
			saveMute(false);
			expect(loadMute()).toBe(false);
		});
	});
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMockRound(stars: 1 | 2 | 3): RoundResult {
	return {
		problem: {
			left: 1,
			right: 2,
			operator: "+",
			answer: 3,
			displayAnswer: "3",
		},
		stars,
		durationMs: 1000,
	};
}

function makeMockSession(totalStars: number) {
	return {
		rounds: [],
		totalStars,
		difficulty: 1 as const,
		mode: "Addition" as const,
		startedAt: 0,
		endedAt: 0,
	};
}
