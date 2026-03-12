import { expect, test } from "@playwright/test";

/**
 * Parse the math problem from the DOM.
 * ProblemDisplay renders: "{left} {operator} {right} = ?"
 * Returns the correct answer.
 */
async function readAnswer(
	page: import("@playwright/test").Page,
): Promise<number> {
	// The problem display renders operands and operator as separate spans.
	// The overall structure is: [left] [operator] [right] [=] [?]
	// We can extract the text content and parse it.
	const text = await page
		.locator(".font-display.text-7xl")
		.first()
		.textContent();
	if (!text) throw new Error("Could not read problem text");

	// Text looks like "3 + 5 = ?" or "7 - 2 = ?"
	const match = text.match(/(\d+)\s*([+-])\s*(\d+)/);
	if (!match) throw new Error(`Could not parse problem from: "${text}"`);

	const left = Number(match[1]);
	const op = match[2];
	const right = Number(match[3]);

	return op === "+" ? left + right : left - right;
}

/**
 * Answer a problem correctly using keyboard input.
 * Presses the correct key 3 times to satisfy the temporal buffer.
 */
async function answerCorrectly(
	page: import("@playwright/test").Page,
): Promise<void> {
	const answer = await readAnswer(page);
	const answerStr = answer.toString();

	// For single-digit: press the digit. For two-digit: press the tens digit
	// (mock recognition auto-pairs tens+ones when tens digit matches)
	const keyToPress = answerStr[0];

	// Temporal buffer requires 3 consecutive frames
	for (let i = 0; i < 3; i++) {
		await page.keyboard.press(`Digit${keyToPress}`);
	}
}

/** Wait for the scanning phase (problem with "?" visible) */
async function waitForScanning(
	page: import("@playwright/test").Page,
): Promise<void> {
	await expect(page.getByText("?")).toBeVisible({ timeout: 10_000 });
}

const CELEBRATION_PATTERN =
	/Great job!|You got it!|Amazing!|Awesome!|Way to go!|Super!/;

test.describe("Game loop (mock recognition)", () => {
	test("plays through start, countdown, answer, and celebration", async ({
		page,
	}) => {
		test.setTimeout(30_000);

		await page.goto("/?recognition=mock");

		// ── Start screen ─────────────────────────────────────────────────────
		const startButton = page.getByRole("button", { name: "Let's Play!" });
		await expect(startButton).toBeVisible();
		await startButton.click();

		// ── Countdown ────────────────────────────────────────────────────────
		await expect(page.getByText("Get ready!")).toBeVisible();

		// ── Round 1: answer correctly ────────────────────────────────────────
		await waitForScanning(page);
		await answerCorrectly(page);
		await expect(page.getByText(CELEBRATION_PATTERN)).toBeVisible({
			timeout: 5_000,
		});

		// ── Round 2: answer correctly ────────────────────────────────────────
		await expect(page.getByText("Get ready!")).toBeVisible({ timeout: 5_000 });
		await waitForScanning(page);
		await answerCorrectly(page);
		await expect(page.getByText(CELEBRATION_PATTERN)).toBeVisible({
			timeout: 5_000,
		});
	});
});
