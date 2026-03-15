import { describe, expect, it } from "vitest";
import {
	getScaffoldReveal,
	getSpellingProcessPraise,
} from "./spelling-scaffold";

describe("getScaffoldReveal", () => {
	describe("attemptNumber 1 (all hidden)", () => {
		it("hides all letters of a 3-letter word", () => {
			const cells = getScaffoldReveal("CAT", 1);
			expect(cells).toEqual([
				{ letter: "C", revealed: false },
				{ letter: "A", revealed: false },
				{ letter: "T", revealed: false },
			]);
		});

		it("hides all letters of a 2-letter word", () => {
			const cells = getScaffoldReveal("AT", 1);
			expect(cells).toEqual([
				{ letter: "A", revealed: false },
				{ letter: "T", revealed: false },
			]);
		});

		it("hides a 1-letter word", () => {
			const cells = getScaffoldReveal("A", 1);
			expect(cells).toEqual([{ letter: "A", revealed: false }]);
		});
	});

	describe("attemptNumber 2 (first letter revealed)", () => {
		it("reveals first letter, hides rest for 3-letter word", () => {
			const cells = getScaffoldReveal("CAT", 2);
			expect(cells).toEqual([
				{ letter: "C", revealed: true },
				{ letter: "A", revealed: false },
				{ letter: "T", revealed: false },
			]);
		});

		it("reveals first letter, hides second for 2-letter word", () => {
			const cells = getScaffoldReveal("AT", 2);
			expect(cells).toEqual([
				{ letter: "A", revealed: true },
				{ letter: "T", revealed: false },
			]);
		});

		it("reveals the only letter of a 1-letter word", () => {
			const cells = getScaffoldReveal("A", 2);
			expect(cells).toEqual([{ letter: "A", revealed: true }]);
		});
	});

	describe("attemptNumber 3+ (all revealed)", () => {
		it("reveals all letters at attemptNumber 3", () => {
			const cells = getScaffoldReveal("CAT", 3);
			expect(cells).toEqual([
				{ letter: "C", revealed: true },
				{ letter: "A", revealed: true },
				{ letter: "T", revealed: true },
			]);
		});

		it("reveals all letters at attemptNumber > 3", () => {
			const cells = getScaffoldReveal("DOG", 4);
			expect(cells).toEqual([
				{ letter: "D", revealed: true },
				{ letter: "O", revealed: true },
				{ letter: "G", revealed: true },
			]);
		});

		it("reveals all letters of a 2-letter word at attemptNumber 3", () => {
			const cells = getScaffoldReveal("GO", 3);
			expect(cells).toEqual([
				{ letter: "G", revealed: true },
				{ letter: "O", revealed: true },
			]);
		});
	});

	describe("edge cases", () => {
		it("handles empty string", () => {
			expect(getScaffoldReveal("", 1)).toEqual([]);
		});
	});
});

describe("getSpellingProcessPraise", () => {
	it("returns scaffold 1 praise for attemptNumber 1", () => {
		expect(getSpellingProcessPraise(1)).toBe("You spelled it from memory!");
	});

	it("returns scaffold 2 praise for attemptNumber 2", () => {
		expect(getSpellingProcessPraise(2)).toBe("The first letter helped!");
	});

	it("returns scaffold 3 praise for attemptNumber 3", () => {
		expect(getSpellingProcessPraise(3)).toBe("You matched all the letters!");
	});

	it("returns scaffold 3 praise for attemptNumber > 3", () => {
		expect(getSpellingProcessPraise(4)).toBe("You matched all the letters!");
	});
});
