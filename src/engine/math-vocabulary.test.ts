import { describe, expect, it } from "vitest";
import { getMathPrompt } from "./math-vocabulary";

describe("getMathPrompt", () => {
	it("returns addition prompts for + operator", () => {
		const prompt = getMathPrompt("+", "answer", undefined, 0);
		expect(prompt).toBe("How many altogether?");
	});

	it("rotates through addition prompts by round index", () => {
		const prompts = new Set<string>();
		for (let i = 0; i < 4; i++) {
			prompts.add(getMathPrompt("+", "answer", undefined, i));
		}
		expect(prompts.size).toBe(4);
	});

	it("returns subtraction prompts for - operator", () => {
		const prompt = getMathPrompt("-", "answer", undefined, 0);
		expect(prompt).toBe("How many are left?");
	});

	it("returns make-ten prompts for missing-addend with target 10", () => {
		const prompt = getMathPrompt("+", "right", 10, 0);
		expect(prompt).toBe("How many more to make ten?");
	});

	it("returns missing-part prompts for missing-addend with non-10 target", () => {
		const prompt = getMathPrompt("+", "right", 7, 0);
		expect(prompt).toBe("What's the missing part?");
	});

	it("wraps around when roundIndex exceeds array length", () => {
		const prompt0 = getMathPrompt("+", "answer", undefined, 0);
		const prompt4 = getMathPrompt("+", "answer", undefined, 4);
		expect(prompt0).toBe(prompt4);
	});

	it("is deterministic for the same roundIndex", () => {
		const a = getMathPrompt("+", "answer", undefined, 3);
		const b = getMathPrompt("+", "answer", undefined, 3);
		expect(a).toBe(b);
	});
});
