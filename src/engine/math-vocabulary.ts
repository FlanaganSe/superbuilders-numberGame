/**
 * Mathematical language synonym rotation.
 *
 * Research: Purpura et al. (2020) — math language predicts math development.
 * NCTM: children need exposure to synonym breadth across 400+ math terms.
 *
 * Deterministic selection by round index to prevent re-render instability.
 */

const ADDITION_PROMPTS = [
	"How many altogether?",
	"How many in all?",
	"What is the total?",
	"What do they make together?",
] as const;

const SUBTRACTION_PROMPTS = [
	"How many are left?",
	"What's the difference?",
	"How many remain?",
	"What do you have left?",
] as const;

const MAKE_TEN_PROMPTS = [
	"How many more to make ten?",
	"What do you add to make ten?",
	"What's missing to reach ten?",
	"How far to ten?",
] as const;

const MISSING_PART_PROMPTS = [
	"What's the missing part?",
	"What number is hiding?",
	"What goes in the gap?",
	"Find the missing number!",
] as const;

export type MathOperator = "+" | "-";

/**
 * Returns a math language prompt for the given problem context.
 * Selection is deterministic by roundIndex to prevent flickering on re-render.
 */
export function getMathPrompt(
	operator: MathOperator,
	unknownPosition: "answer" | "left" | "right" | undefined,
	target: number | undefined,
	roundIndex: number,
): string {
	const prompts = getPromptArray(operator, unknownPosition, target);
	return prompts[roundIndex % prompts.length] as string;
}

function getPromptArray(
	operator: MathOperator,
	unknownPosition: "answer" | "left" | "right" | undefined,
	target: number | undefined,
): readonly string[] {
	if (unknownPosition === "right") {
		return target === 10 ? MAKE_TEN_PROMPTS : MISSING_PART_PROMPTS;
	}
	return operator === "+" ? ADDITION_PROMPTS : SUBTRACTION_PROMPTS;
}
