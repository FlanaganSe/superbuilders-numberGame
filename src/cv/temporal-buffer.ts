// ─── Temporal buffer ────────────────────────────────────────────────────────
// 3-frame consecutive counter (research-auto-check.md §5–7)
//
// Phase 1 — TILE_SEEN: first frame a matching candidate appears (< 200ms)
// Phase 2 — ANSWER_COMMITTED: 3 consecutive frames with same answer
//
// Generic over T: use number for math, string for spelling.
// Internal comparison uses === which works for both.

export type TemporalEvent<T = number> =
	| { readonly type: "TILE_SEEN"; readonly answer: T }
	| { readonly type: "ANSWER_COMMITTED"; readonly answer: T }
	| { readonly type: "NONE" };

/** Consecutive matching frames required before committing an answer. At 4fps → ~750ms. Reduce to 2 if fps < 3. */
const REQUIRED_CONSECUTIVE_FRAMES = 3;

/** Max consecutive null frames tolerated before hard-resetting the buffer. */
export const MAX_CONSECUTIVE_MISSES = 2;

export interface TemporalBuffer<T = number> {
	readonly update: (matchedAnswer: T | null) => TemporalEvent<T>;
	readonly reset: () => void;
	readonly consecutiveCount: () => number;
	readonly lastAnswer: () => T | null;
}

export function createTemporalBuffer<T = number>(): TemporalBuffer<T> {
	let count = 0;
	let currentAnswer: T | null = null;
	let missStreak = 0;

	return {
		update(matchedAnswer: T | null): TemporalEvent<T> {
			if (matchedAnswer === null) {
				missStreak++;
				if (missStreak > MAX_CONSECUTIVE_MISSES) {
					count = 0;
					currentAnswer = null;
				}
				return { type: "NONE" };
			}

			missStreak = 0;

			if (matchedAnswer !== currentAnswer) {
				count = 1;
				currentAnswer = matchedAnswer;
				return { type: "TILE_SEEN", answer: matchedAnswer };
			}

			// Same answer as before
			count++;

			if (count >= REQUIRED_CONSECUTIVE_FRAMES) {
				return { type: "ANSWER_COMMITTED", answer: matchedAnswer };
			}

			return { type: "NONE" };
		},

		reset(): void {
			count = 0;
			currentAnswer = null;
			missStreak = 0;
		},

		consecutiveCount(): number {
			return count;
		},

		lastAnswer(): T | null {
			return currentAnswer;
		},
	};
}
