import { describe, expect, it } from "vitest";
import {
	initialDifficultyState,
	recordCorrect,
	recordWrong,
} from "./difficulty";

describe("difficulty", () => {
	describe("recordCorrect", () => {
		it("increments consecutive correct count", () => {
			const state = initialDifficultyState(1);
			const next = recordCorrect(state);
			expect(next.consecutiveCorrect).toBe(1);
			expect(next.consecutiveWrong).toBe(0);
		});

		it("promotes after 3 consecutive correct", () => {
			let state = initialDifficultyState(1);
			state = recordCorrect(state);
			state = recordCorrect(state);
			state = recordCorrect(state);
			expect(state.level).toBe(2);
			expect(state.consecutiveCorrect).toBe(0);
		});

		it("does not promote beyond level 5", () => {
			let state = initialDifficultyState(5);
			state = recordCorrect(state);
			state = recordCorrect(state);
			state = recordCorrect(state);
			expect(state.level).toBe(5);
			expect(state.consecutiveCorrect).toBe(3);
		});

		it("resets consecutive wrong on correct", () => {
			const state = {
				level: 2 as const,
				consecutiveCorrect: 0,
				consecutiveWrong: 1,
			};
			const next = recordCorrect(state);
			expect(next.consecutiveWrong).toBe(0);
		});
	});

	describe("recordCorrect with responseTimeMs", () => {
		it("promotes normally when no responseTimeMs is provided", () => {
			let state = initialDifficultyState(1);
			state = recordCorrect(state);
			state = recordCorrect(state);
			state = recordCorrect(state);
			expect(state.level).toBe(2);
		});

		it("promotes normally for fast responses", () => {
			let state = initialDifficultyState(1);
			state = recordCorrect(state, 5000);
			state = recordCorrect(state, 3000);
			state = recordCorrect(state, 8000);
			expect(state.level).toBe(2);
		});

		it("resets consecutive count for slow correct (>25s)", () => {
			let state = initialDifficultyState(1);
			state = recordCorrect(state, 1000);
			state = recordCorrect(state, 1000);
			// Third answer is slow — should reset streak, not promote
			state = recordCorrect(state, 26000);
			expect(state.level).toBe(1);
			expect(state.consecutiveCorrect).toBe(0);
			expect(state.consecutiveWrong).toBe(0);
		});

		it("does not demote on slow correct", () => {
			const state = {
				level: 3 as const,
				consecutiveCorrect: 2,
				consecutiveWrong: 0,
			};
			const next = recordCorrect(state, 30000);
			expect(next.level).toBe(3);
			expect(next.consecutiveCorrect).toBe(0);
		});

		it("treats exactly 25000ms as fast (boundary: >25000, not >=25000)", () => {
			let state = initialDifficultyState(1);
			state = recordCorrect(state, 24000);
			state = recordCorrect(state, 24000);
			// Exactly 25000ms should count as normal, promoting to level 2
			state = recordCorrect(state, 25000);
			expect(state.level).toBe(2);
		});

		it("resets streak at 25001ms (just over boundary)", () => {
			let state = initialDifficultyState(1);
			state = recordCorrect(state, 1000);
			state = recordCorrect(state, 1000);
			state = recordCorrect(state, 25001);
			expect(state.level).toBe(1);
			expect(state.consecutiveCorrect).toBe(0);
		});
	});

	describe("recordWrong", () => {
		it("increments consecutive wrong count", () => {
			const state = initialDifficultyState(2);
			const next = recordWrong(state);
			expect(next.consecutiveWrong).toBe(1);
			expect(next.consecutiveCorrect).toBe(0);
		});

		it("demotes after 2 consecutive wrong", () => {
			let state = initialDifficultyState(3);
			state = recordWrong(state);
			state = recordWrong(state);
			expect(state.level).toBe(2);
			expect(state.consecutiveWrong).toBe(0);
		});

		it("never goes below level 1", () => {
			let state = initialDifficultyState(1);
			state = recordWrong(state);
			state = recordWrong(state);
			expect(state.level).toBe(1);
			expect(state.consecutiveWrong).toBe(2);
		});

		it("resets consecutive correct on wrong", () => {
			const state = {
				level: 3 as const,
				consecutiveCorrect: 2,
				consecutiveWrong: 0,
			};
			const next = recordWrong(state);
			expect(next.consecutiveCorrect).toBe(0);
		});
	});

	describe("mixed sequences", () => {
		it("correct streak resets on a single wrong", () => {
			let state = initialDifficultyState(1);
			state = recordCorrect(state);
			state = recordCorrect(state);
			state = recordWrong(state);
			expect(state.level).toBe(1);
			expect(state.consecutiveCorrect).toBe(0);
			expect(state.consecutiveWrong).toBe(1);
		});

		it("wrong streak resets on a single correct", () => {
			let state = initialDifficultyState(2);
			state = recordWrong(state);
			state = recordCorrect(state);
			expect(state.consecutiveWrong).toBe(0);
			expect(state.consecutiveCorrect).toBe(1);
		});
	});
});
