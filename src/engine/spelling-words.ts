// ─── Spelling Word List ─────────────────────────────────────────────────────
//
// Age-appropriate words (5-8) for the spelling game.
// All uppercase — matches YOLO class labels (classId 10=A through 35=Z).
// Pool is intentionally small for physical-tile games: children need to own
// the tiles and place them in front of the camera.

import type { SpellingProblem } from "../types/game";

// ─── Word pools ─────────────────────────────────────────────────────────────

/** 2-letter sight words — easiest tier, only two tiles to place. */
export const TWO_LETTER_WORDS: readonly string[] = [
	"AT",
	"GO",
	"IN",
	"IT",
	"NO",
	"ON",
	"UP",
	"WE",
] as const;

/** 3-letter CVC words — high-frequency, concrete nouns kids can picture. */
export const THREE_LETTER_WORDS: readonly string[] = [
	"CAT",
	"DOG",
	"SUN",
	"FOX",
	"HAT",
	"CUP",
	"BUS",
	"PIG",
	"HEN",
	"LOG",
	"MOP",
	"NUT",
	"RUG",
	"VAN",
	"BED",
	"BAT",
	"FAN",
	"PEN",
	"MUG",
	"BUG",
] as const;

/** Combined pool for random selection (2-3 letter words only). */
const ALL_WORDS: readonly string[] = [
	...TWO_LETTER_WORDS,
	...THREE_LETTER_WORDS,
];

// ─── Session constants ──────────────────────────────────────────────────────

/** Maximum words per spelling session. */
export const MAX_SPELLING_WORDS = 3;

// ─── Problem generation ─────────────────────────────────────────────────────

/**
 * Generates a spelling problem, avoiding words already used in this session.
 * Falls back to any word if the pool is exhausted (unlikely with 28 words
 * and 3-word sessions).
 */
export function generateSpellingProblem(
	usedWords: readonly string[],
): SpellingProblem {
	const available = ALL_WORDS.filter((w) => !usedWords.includes(w));
	const pool = available.length > 0 ? available : ALL_WORDS;
	const word = pool[Math.floor(Math.random() * pool.length)] as string;
	return {
		word,
		letters: word.split(""),
	};
}
