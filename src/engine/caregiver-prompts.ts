// ─── Caregiver Coaching Tips ────────────────────────────────────────────────
//
// Process-oriented tips shown on session summary (Berkowitz et al. 2015).
// Autonomy-supportive, never controlling. Mode-agnostic.

const CAREGIVER_TIPS = [
	"Ask your child: How did you figure that out?",
	"Try asking: Can you show me with your fingers?",
	"Say: You worked really hard on that one!",
	"Ask: What number would make ten?",
	"Try: Can you find another way to solve it?",
	"Say: I like how you kept trying!",
] as const;

/**
 * Returns a process-oriented caregiver tip.
 * Deterministic by sessionCount to avoid flicker on re-render.
 */
export function getCaregiverTip(sessionCount: number): string {
	return CAREGIVER_TIPS[sessionCount % CAREGIVER_TIPS.length] as string;
}
