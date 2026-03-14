import { describe, expect, it } from "vitest";
import {
	getUncertaintyPrompt,
	UNCERTAINTY_PROMPTS,
} from "./camera-uncertainty";

describe("getUncertaintyPrompt", () => {
	it("returns a string for any non-negative missStreak", () => {
		for (let i = 0; i < 20; i++) {
			expect(typeof getUncertaintyPrompt(i)).toBe("string");
		}
	});

	it("returns deterministic result for same missStreak", () => {
		const first = getUncertaintyPrompt(3);
		const second = getUncertaintyPrompt(3);
		expect(first).toBe(second);
	});

	it("cycles through all prompts via modulo", () => {
		const seen = new Set<string>();
		for (let i = 0; i < UNCERTAINTY_PROMPTS.length; i++) {
			seen.add(getUncertaintyPrompt(i));
		}
		expect(seen.size).toBe(UNCERTAINTY_PROMPTS.length);
	});

	it("wraps around after exhausting the pool", () => {
		const first = getUncertaintyPrompt(0);
		const wrapped = getUncertaintyPrompt(UNCERTAINTY_PROMPTS.length);
		expect(first).toBe(wrapped);
	});

	it("prompt pool is non-empty", () => {
		expect(UNCERTAINTY_PROMPTS.length).toBeGreaterThan(0);
	});

	it("all prompts are child-friendly (no negative language)", () => {
		const negativeWords = ["wrong", "bad", "fail", "error", "no", "don't"];
		for (const prompt of UNCERTAINTY_PROMPTS) {
			for (const word of negativeWords) {
				expect(prompt.toLowerCase()).not.toContain(word);
			}
		}
	});
});
