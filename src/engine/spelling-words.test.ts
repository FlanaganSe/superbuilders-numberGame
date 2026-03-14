import { describe, expect, it } from "vitest";
import {
	generateSpellingProblem,
	MAX_SPELLING_WORDS,
	THREE_LETTER_WORDS,
	TWO_LETTER_WORDS,
} from "./spelling-words";

describe("spelling word pools", () => {
	it("has at least 5 two-letter words", () => {
		expect(TWO_LETTER_WORDS.length).toBeGreaterThanOrEqual(5);
	});

	it("has at least 15 three-letter words", () => {
		expect(THREE_LETTER_WORDS.length).toBeGreaterThanOrEqual(15);
	});

	it("all words are uppercase A-Z only", () => {
		const allWords = [...TWO_LETTER_WORDS, ...THREE_LETTER_WORDS];
		for (const word of allWords) {
			expect(word).toMatch(/^[A-Z]+$/);
		}
	});

	it("all two-letter words have length 2", () => {
		for (const word of TWO_LETTER_WORDS) {
			expect(word).toHaveLength(2);
		}
	});

	it("all three-letter words have length 3", () => {
		for (const word of THREE_LETTER_WORDS) {
			expect(word).toHaveLength(3);
		}
	});

	it("all words are 2-3 letters (no 4+ letter words)", () => {
		const allWords = [...TWO_LETTER_WORDS, ...THREE_LETTER_WORDS];
		for (const word of allWords) {
			expect(word.length).toBeGreaterThanOrEqual(2);
			expect(word.length).toBeLessThanOrEqual(3);
		}
	});

	it("no duplicate words across pools", () => {
		const allWords = [...TWO_LETTER_WORDS, ...THREE_LETTER_WORDS];
		const unique = new Set(allWords);
		expect(unique.size).toBe(allWords.length);
	});
});

describe("generateSpellingProblem", () => {
	it("returns a word from the pool", () => {
		const allWords = [...TWO_LETTER_WORDS, ...THREE_LETTER_WORDS];
		const problem = generateSpellingProblem([]);
		expect(allWords).toContain(problem.word);
	});

	it("splits word into letters array", () => {
		const problem = generateSpellingProblem([]);
		expect(problem.letters).toEqual(problem.word.split(""));
	});

	it("avoids used words", () => {
		// Use all two-letter words, should return a three-letter word
		const problem = generateSpellingProblem([...TWO_LETTER_WORDS]);
		expect(THREE_LETTER_WORDS).toContain(problem.word);
	});

	it("generates non-duplicate words for a full session", () => {
		const used: string[] = [];
		for (let i = 0; i < MAX_SPELLING_WORDS; i++) {
			const problem = generateSpellingProblem(used);
			expect(used).not.toContain(problem.word);
			used.push(problem.word);
		}
		expect(new Set(used).size).toBe(MAX_SPELLING_WORDS);
	});

	it("falls back gracefully if all words are used", () => {
		const allWords = [...TWO_LETTER_WORDS, ...THREE_LETTER_WORDS];
		// Using all words should still return a valid word (fallback)
		const problem = generateSpellingProblem(allWords);
		expect(allWords).toContain(problem.word);
	});
});

describe("MAX_SPELLING_WORDS", () => {
	it("is 3 (user requirement)", () => {
		expect(MAX_SPELLING_WORDS).toBe(3);
	});
});
