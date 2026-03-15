// ─── Spoken Feedback ────────────────────────────────────────────────────────
//
// Pure functions that compose audible sentences from number-word clips +
// connecting-phrase clips. No Howler dependency — takes `play` callback
// via dependency injection for testability.
//
// Gated on difficulty ≤ 3 (Sweller expertise reversal — PRD req #15).

import type { DifficultyLevel, Problem } from "../types/game";
import type { SoundName } from "./sound-manager";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Only number0–number9 clips exist. */
function hasClip(n: number): boolean {
	return n >= 0 && n <= 9;
}

function numberSound(n: number): SoundName {
	return `number${n}` as SoundName;
}

// ─── Build sequences ────────────────────────────────────────────────────────

/**
 * Build the audio clip sequence for a correct-answer spoken explanation.
 * Returns [] when spoken feedback should be skipped.
 */
export function buildCorrectSequence(
	problem: Problem,
	difficulty: DifficultyLevel,
	_stars: 1 | 2 | 3,
): readonly SoundName[] {
	if (problem.answer < 0) return []; // spelling
	if (difficulty > 3) return []; // expertise reversal

	// Subtraction: "left take-away right is answer"
	if (problem.operator === "-") {
		if (
			!hasClip(problem.left) ||
			!hasClip(problem.right) ||
			!hasClip(problem.answer)
		)
			return [];
		return [
			numberSound(problem.left),
			"phraseTakeAway",
			numberSound(problem.right),
			"phraseIs",
			numberSound(problem.answer),
		];
	}

	// Missing-addend: "left and answer make target"
	if (problem.unknownPosition === "right") {
		if (problem.target == null) return [];
		if (!hasClip(problem.left) || !hasClip(problem.answer)) return [];

		// Make-10: use single "make ten" clip (no number10 clip exists)
		if (problem.target === 10) {
			return [
				numberSound(problem.left),
				"phraseAnd",
				numberSound(problem.answer),
				"phraseMakeTen",
			];
		}

		if (!hasClip(problem.target)) return [];
		return [
			numberSound(problem.left),
			"phraseAnd",
			numberSound(problem.answer),
			"phraseMake",
			numberSound(problem.target),
		];
	}

	// Addition: "left and right make answer"
	if (
		!hasClip(problem.left) ||
		!hasClip(problem.right) ||
		!hasClip(problem.answer)
	)
		return [];
	return [
		numberSound(problem.left),
		"phraseAnd",
		numberSound(problem.right),
		"phraseMake",
		numberSound(problem.answer),
	];
}

/**
 * Build the audio clip sequence for a timeout worked-example explanation.
 * Returns [] when spoken feedback should be skipped.
 */
export function buildTimeoutSequence(
	problem: Problem,
	difficulty: DifficultyLevel,
	attemptNumber: number,
): readonly SoundName[] {
	if (problem.answer < 0) return []; // spelling
	if (difficulty > 3) return []; // expertise reversal
	if (attemptNumber < 2) return []; // first timeout — no worked example
	if (!hasClip(problem.answer)) return [];

	return ["phraseTheAnswerIs", numberSound(problem.answer)];
}

// ─── Playback ───────────────────────────────────────────────────────────────

/**
 * Schedule a chain of play() calls with `gapMs` between each.
 * Returns a cancel function that clears all pending timeouts.
 */
export function playSentence(
	sequence: readonly SoundName[],
	play: (name: SoundName) => void,
	gapMs = 300,
): () => void {
	const timers: ReturnType<typeof setTimeout>[] = [];
	for (let i = 0; i < sequence.length; i++) {
		const name = sequence[i] as SoundName; // safe: i < sequence.length
		timers.push(setTimeout(() => play(name), i * gapMs));
	}
	return () => {
		for (const t of timers) clearTimeout(t);
	};
}
