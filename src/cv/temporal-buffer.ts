// ─── Temporal buffer ────────────────────────────────────────────────────────
// 3-frame consecutive counter (research-auto-check.md §5–7)
//
// Phase 1 — TILE_SEEN: first frame a matching candidate appears (< 200ms)
// Phase 2 — ANSWER_COMMITTED: 3 consecutive frames with same answer

export type TemporalEvent =
	| { readonly type: "TILE_SEEN"; readonly answer: number }
	| { readonly type: "ANSWER_COMMITTED"; readonly answer: number }
	| { readonly type: "NONE" };

const REQUIRED_CONSECUTIVE_FRAMES = 3;

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

	return {
		update(matchedAnswer: number | null): TemporalEvent {
			if (matchedAnswer === null) {
				count = 0;
				currentAnswer = null;
				tileSeen = false;
				return { type: "NONE" };
			}

			if (matchedAnswer !== currentAnswer) {
				// New answer — reset counter, emit TILE_SEEN
				count = 1;
				currentAnswer = matchedAnswer;
				tileSeen = true;
				return { type: "TILE_SEEN", answer: matchedAnswer };
			}

			// Same answer as before
			count++;

			if (!tileSeen) {
				tileSeen = true;
				// First time seeing this answer at all
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
		},

		consecutiveCount(): number {
			return count;
		},

		lastAnswer(): number | null {
			return currentAnswer;
		},
	};
}
