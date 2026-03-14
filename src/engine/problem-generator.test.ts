import { describe, expect, it } from "vitest";
import type { DifficultyLevel } from "../types/game";
import {
	AdditionMode,
	MAX_ANSWER,
	MissingAddendMode,
	SubtractionMode,
} from "./problem-generator";

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

describe("MissingAddendMode", () => {
	it("has correct metadata", () => {
		expect(MissingAddendMode.name).toBe("Missing Part");
		expect(MissingAddendMode.operator).toBe("+");
	});

	it.each(
		ALL_LEVELS,
	)("generates valid missing-addend problems at difficulty %i", (level) => {
		for (let i = 0; i < 50; i++) {
			const problem = MissingAddendMode.generate(level);
			expect(problem.operator).toBe("+");
			expect(problem.unknownPosition).toBe("right");
			expect(problem.target).toBeDefined();
			expect(problem.answer).toBe(problem.right);
			expect(problem.target).toBe(problem.left + problem.right);
			expect(problem.answer).toBeGreaterThanOrEqual(1);
			expect(problem.answer).toBeLessThanOrEqual(MAX_ANSWER);
			expect(problem.target).toBeLessThanOrEqual(MAX_ANSWER);
			expect(problem.displayAnswer).toBe(problem.answer.toString());
		}
	});

	it("never generates right === 0 (trivial missing part)", () => {
		for (let i = 0; i < 200; i++) {
			const problem = MissingAddendMode.generate(1);
			expect(problem.right).toBeGreaterThan(0);
		}
	});

	it("validates against answer (hidden operand), not target (sum)", () => {
		const problem = MissingAddendMode.generate(1);
		expect(MissingAddendMode.validate([problem.answer], problem)).toBe(true);
		expect(MissingAddendMode.validate([problem.target ?? -1], problem)).toBe(
			problem.answer === problem.target,
		);
		expect(MissingAddendMode.validate([], problem)).toBe(false);
	});

	it("validates rejects wrong values", () => {
		// Create a problem where answer !== target to avoid ambiguity
		let problem = MissingAddendMode.generate(3);
		while (problem.answer === problem.target) {
			problem = MissingAddendMode.generate(3);
		}
		expect(MissingAddendMode.validate([problem.target ?? -1], problem)).toBe(
			false,
		);
	});
});
