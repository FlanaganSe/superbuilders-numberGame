import { describe, expect, it } from "vitest";
import type { DifficultyLevel } from "../types/game";
import { AdditionMode, MAX_ANSWER, SubtractionMode } from "./problem-generator";

const ALL_LEVELS: readonly DifficultyLevel[] = [1, 2, 3, 4, 5];

describe("AdditionMode", () => {
	it("has correct metadata", () => {
		expect(AdditionMode.name).toBe("Addition");
		expect(AdditionMode.operator).toBe("+");
	});

	it.each(ALL_LEVELS)("generates valid problems at difficulty %i", (level) => {
		for (let i = 0; i < 50; i++) {
			const problem = AdditionMode.generate(level);
			expect(problem.operator).toBe("+");
			expect(problem.answer).toBe(problem.left + problem.right);
			expect(problem.answer).toBeGreaterThanOrEqual(0);
			expect(problem.answer).toBeLessThanOrEqual(MAX_ANSWER);
			expect(problem.left).toBeGreaterThanOrEqual(0);
			expect(problem.right).toBeGreaterThanOrEqual(0);
			expect(problem.displayAnswer).toBe(problem.answer.toString());
		}
	});

	it("validates correctly", () => {
		const problem = AdditionMode.generate(1);
		expect(AdditionMode.validate([problem.answer], problem)).toBe(true);
		expect(AdditionMode.validate([problem.answer + 1], problem)).toBe(false);
		expect(AdditionMode.validate([], problem)).toBe(false);
	});
});

describe("SubtractionMode", () => {
	it("has correct metadata", () => {
		expect(SubtractionMode.name).toBe("Subtraction");
		expect(SubtractionMode.operator).toBe("-");
	});

	it.each(
		ALL_LEVELS,
	)("generates valid problems at difficulty %i with no negative results", (level) => {
		for (let i = 0; i < 50; i++) {
			const problem = SubtractionMode.generate(level);
			expect(problem.operator).toBe("-");
			expect(problem.answer).toBe(problem.left - problem.right);
			expect(problem.answer).toBeGreaterThanOrEqual(0);
			expect(problem.answer).toBeLessThanOrEqual(MAX_ANSWER);
			expect(problem.left).toBeGreaterThanOrEqual(problem.right);
			expect(problem.displayAnswer).toBe(problem.answer.toString());
		}
	});

	it("validates correctly", () => {
		const problem = SubtractionMode.generate(1);
		expect(SubtractionMode.validate([problem.answer], problem)).toBe(true);
		expect(SubtractionMode.validate([problem.answer + 1], problem)).toBe(false);
	});
});
