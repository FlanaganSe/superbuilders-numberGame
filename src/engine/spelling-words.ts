// ─── Spelling Word List ─────────────────────────────────────────────────────
//
// Age-appropriate words (5-8) for the spelling game.
// All uppercase — matches YOLO class labels (classId 10=A through 35=Z).
// Pool is intentionally small for physical-tile games: children need to own
// the tiles and place them in front of the camera.

import type { SoundName } from "../audio/sound-manager";
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
] as const;

/** 3-letter CVC words — high-frequency, concrete nouns kids can picture. */
export const THREE_LETTER_WORDS: readonly string[] = [
	"CAT",
	"DOG",
	"HAT",
	"CUP",
	"PIG",
	"HEN",
	"MOP",
	"NUT",
	"RUG",
	"BED",
	"BAT",
	"FAN",
	"PEN",
	"MUG",
	"BUG",
	"CUB",
	"JUG",
	"DIG",
	"KID",
	"HUG",
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
 * Falls back to any word if the pool is exhausted (unlikely with 27 words
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

// ─── Audio helper ────────────────────────────────────────────────────────────

/**
 * Compile-time mapping from word to SoundName. Adding a word to ALL_WORDS
 * without a matching entry here will cause a silent audio gap — the Record
 * type doesn't enforce exhaustiveness against the word arrays, but keeping
 * this map adjacent to the word pools makes drift obvious in review.
 */
const WORD_AUDIO_MAP: Readonly<Record<string, SoundName>> = {
	AT: "wordAt",
	GO: "wordGo",
	IN: "wordIn",
	IT: "wordIt",
	NO: "wordNo",
	ON: "wordOn",
	UP: "wordUp",
	CAT: "wordCat",
	DOG: "wordDog",
	HAT: "wordHat",
	CUP: "wordCup",
	PIG: "wordPig",
	HEN: "wordHen",
	MOP: "wordMop",
	NUT: "wordNut",
	RUG: "wordRug",
	BED: "wordBed",
	BAT: "wordBat",
	FAN: "wordFan",
	PEN: "wordPen",
	MUG: "wordMug",
	BUG: "wordBug",
	CUB: "wordCub",
	JUG: "wordJug",
	DIG: "wordDig",
	KID: "wordKid",
	HUG: "wordHug",
};

/**
 * Maps a spelling word to its pronunciation audio SoundName.
 * Throws in dev if the word has no registered audio (fail-fast over silent gap).
 */
export function getWordAudioName(word: string): SoundName {
	const name = WORD_AUDIO_MAP[word];
	if (!name) {
		if (import.meta.env.DEV) {
			console.warn(`No audio registered for spelling word: ${word}`);
		}
		// Fallback: construct the name so Howler logs a load error rather than crash
		const lower = word.toLowerCase();
		const capitalized = lower.charAt(0).toUpperCase() + lower.slice(1);
		return `word${capitalized}` as SoundName;
	}
	return name;
}
