// ─── Camera uncertainty prompts ──────────────────────────────────────────────
// System-attribution language: blame the camera, never the child.
// Research: math anxiety at kindergarten (Frontiers 2024, DOI:10.3389/fpsyg.2024.1335952)

const UNCERTAINTY_PROMPTS = [
	"Hold your tile flat so I can see it",
	"Move your tile into the box",
	"Let me look again...",
	"I can't quite see — try moving your tile",
	"Hold it steady!",
] as const;

/**
 * Returns a deterministic system-attribution prompt based on missStreak.
 * Uses modulo so the prompt is stable while the child holds the same tile
 * (no flickering between messages on each frame).
 */
export function getUncertaintyPrompt(missStreak: number): string {
	return UNCERTAINTY_PROMPTS[missStreak % UNCERTAINTY_PROMPTS.length] as string;
}

export { UNCERTAINTY_PROMPTS };
