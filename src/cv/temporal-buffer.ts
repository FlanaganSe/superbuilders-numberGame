// ─── Temporal buffer ────────────────────────────────────────────────────────
// 3-frame consecutive counter (research-auto-check.md §5–7)
//
// Phase 1 — TILE_SEEN: first frame a matching candidate appears (< 200ms)
// Phase 2 — ANSWER_COMMITTED: 3 consecutive frames with same answer

export type TemporalEvent =
	| { readonly type: "TILE_SEEN"; readonly answer: number }
	| { readonly type: "ANSWER_COMMITTED"; readonly answer: number }
	| { readonly type: "NONE" };

/** Consecutive matching frames required before committing an answer. At 4fps → ~750ms. Reduce to 2 if fps < 3. */
const REQUIRED_CONSECUTIVE_FRAMES = 3;

/** Max consecutive null frames tolerated before hard-resetting the buffer. */
export const MAX_CONSECUTIVE_MISSES = 2;

export interface TemporalBuffer {
	readonly update: (matchedAnswer: number | null) => TemporalEvent;
	readonly reset: () => void;
	readonly consecutiveCount: () => number;
	readonly lastAnswer: () => number | null;
}

export function createTemporalBuffer(): TemporalBuffer {
	let count = 0;
	let currentAnswer: number | null = null;
	let tileSeen = false;
	let missStreak = 0;

	return {
		update(matchedAnswer: number | null): TemporalEvent {
			if (matchedAnswer === null) {
				missStreak++;
				if (missStreak > MAX_CONSECUTIVE_MISSES) {
					count = 0;
					currentAnswer = null;
					tileSeen = false;
				}
				return { type: "NONE" };
			}

			missStreak = 0;

			if (matchedAnswer !== currentAnswer) {
				count = 1;
				currentAnswer = matchedAnswer;
				tileSeen = true;
				return { type: "TILE_SEEN", answer: matchedAnswer };
			}

			// Same answer as before
			count++;

			if (!tileSeen) {
				tileSeen = true;
				if (count >= REQUIRED_CONSECUTIVE_FRAMES) {
					return { type: "ANSWER_COMMITTED", answer: matchedAnswer };
				}
				return { type: "TILE_SEEN", answer: matchedAnswer };
			}

			if (count >= REQUIRED_CONSECUTIVE_FRAMES) {
				return { type: "ANSWER_COMMITTED", answer: matchedAnswer };
			}

			return { type: "NONE" };
		},

		reset(): void {
			count = 0;
			currentAnswer = null;
			tileSeen = false;
			missStreak = 0;
		},

		consecutiveCount(): number {
			return count;
		},

		lastAnswer(): number | null {
			return currentAnswer;
		},
	};
}
