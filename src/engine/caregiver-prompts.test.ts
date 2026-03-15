import { describe, expect, it } from "vitest";
import { getCaregiverTip } from "./caregiver-prompts";

describe("getCaregiverTip", () => {
	it("returns a string for any sessionCount", () => {
		expect(typeof getCaregiverTip(0)).toBe("string");
		expect(typeof getCaregiverTip(1)).toBe("string");
		expect(typeof getCaregiverTip(100)).toBe("string");
	});

	it("is deterministic (same sessionCount → same tip)", () => {
		expect(getCaregiverTip(3)).toBe(getCaregiverTip(3));
		expect(getCaregiverTip(42)).toBe(getCaregiverTip(42));
	});

	it("cycles through the full pool", () => {
		const tips = new Set<string>();
		for (let i = 0; i < 6; i++) {
			tips.add(getCaregiverTip(i));
		}
		expect(tips.size).toBe(6);
	});

	it("wraps around after the pool is exhausted", () => {
		expect(getCaregiverTip(0)).toBe(getCaregiverTip(6));
		expect(getCaregiverTip(1)).toBe(getCaregiverTip(7));
	});

	it("all tips are process-oriented (no controlling language)", () => {
		const controllingPatterns = [
			/make them/i,
			/they should/i,
			/you must/i,
			/force/i,
			/have to/i,
		];
		for (let i = 0; i < 6; i++) {
			const tip = getCaregiverTip(i);
			for (const pattern of controllingPatterns) {
				expect(tip).not.toMatch(pattern);
			}
		}
	});

	it("all tips start with an action verb (Ask, Try, Say)", () => {
		for (let i = 0; i < 6; i++) {
			const tip = getCaregiverTip(i);
			expect(tip).toMatch(/^(Ask|Try|Say)/);
		}
	});
});
