// ─── Spelling Scaffold ──────────────────────────────────────────────────────
//
// Progressive encoding: scaffold level determines how much of the target word
// is revealed. Maps directly to attemptNumber (1/2/3).
//
// Research: Ehri (2014) — orthographic mapping requires memory retrieval.
// Weiser & Mathes (2011) — encoding instruction improves phonemic awareness.

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ScaffoldCell {
	readonly letter: string;
	readonly revealed: boolean;
}

// ─── Scaffold reveal ────────────────────────────────────────────────────────

/**
 * Returns per-letter visibility based on scaffold level (attemptNumber).
 *
 * - attemptNumber 1: all hidden (encode from memory)
 * - attemptNumber 2: first letter revealed, rest hidden
 * - attemptNumber 3+: all revealed (current behavior / fallback)
 */
export function getScaffoldReveal(
	word: string,
	attemptNumber: number,
): readonly ScaffoldCell[] {
	return word.split("").map((letter, index) => ({
		letter,
		revealed:
			attemptNumber >= 3 ? true : attemptNumber === 2 ? index === 0 : false,
	}));
}

// ─── Process praise ─────────────────────────────────────────────────────────

const SCAFFOLD_1_PRAISE = [
	"You spelled it from memory!",
	"You knew all the letters!",
	"Amazing memory!",
] as const;

const SCAFFOLD_2_PRAISE = [
	"The first letter helped!",
	"Good thinking!",
	"Nice problem solving!",
] as const;

const SCAFFOLD_3_PRAISE = [
	"You matched all the letters!",
	"You did it!",
	"Way to go!",
] as const;

/**
 * Returns process praise text keyed on scaffold level (attemptNumber).
 * Deterministic by attemptNumber for stable rendering.
 */
export function getSpellingProcessPraise(attemptNumber: number): string {
	if (attemptNumber <= 1) {
		return SCAFFOLD_1_PRAISE[0];
	}
	if (attemptNumber === 2) {
		return SCAFFOLD_2_PRAISE[0];
	}
	return SCAFFOLD_3_PRAISE[0];
}
