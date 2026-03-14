import { describe, expect, it } from "vitest";
import {
	FOUR_LETTER_WORDS,
	generateSpellingProblem,
	MAX_SPELLING_WORDS,
	THREE_LETTER_WORDS,
} from "./spelling-words";

describe("spelling word pools", () => {
	it("has at least 15 three-letter words", () => {
		expect(THREE_LETTER_WORDS.length).toBeGreaterThanOrEqual(15);
	});

	it("has at least 5 four-letter words", () => {
		expect(FOUR_LETTER_WORDS.length).toBeGreaterThanOrEqual(5);
	});

	it("all words are uppercase A-Z only", () => {
		const allWords = [...THREE_LETTER_WORDS, ...FOUR_LETTER_WORDS];
		for (const word of allWords) {
			expect(word).toMatch(/^[A-Z]+$/);
		}
	});

	it("all three-letter words have length 3", () => {
		for (const word of THREE_LETTER_WORDS) {
			expect(word).toHaveLength(3);
		}
	});

	it("all four-letter words have length 4", () => {
		for (const word of FOUR_LETTER_WORDS) {
			expect(word).toHaveLength(4);
		}
	});

	it("no duplicate words across pools", () => {
		const allWords = [...THREE_LETTER_WORDS, ...FOUR_LETTER_WORDS];
		const unique = new Set(allWords);
		expect(unique.size).toBe(allWords.length);
	});
});

describe("generateSpellingProblem", () => {
	it("returns a word from the pool", () => {
		const allWords = [...THREE_LETTER_WORDS, ...FOUR_LETTER_WORDS];
		const problem = generateSpellingProblem([]);
		expect(allWords).toContain(problem.word);
	});

	it("splits word into letters array", () => {
		const problem = generateSpellingProblem([]);
		expect(problem.letters).toEqual(problem.word.split(""));
	});

	it("avoids used words", () => {
		// Use all three-letter words, should return a four-letter word
		const problem = generateSpellingProblem([...THREE_LETTER_WORDS]);
		expect(FOUR_LETTER_WORDS).toContain(problem.word);
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
		const allWords = [...THREE_LETTER_WORDS, ...FOUR_LETTER_WORDS];
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
