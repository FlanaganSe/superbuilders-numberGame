import { describe, expect, it } from "vitest";
import type { FeatureFlags } from "./feature-flags";
import { parseFeatureFlags } from "./feature-flags";

describe("parseFeatureFlags", () => {
	it("returns defaults for empty params", () => {
		const flags = parseFeatureFlags(new URLSearchParams(""));
		expect(flags).toEqual({
			recognition: "onnx",
			debug: false,
			overlay: "none",
		} satisfies FeatureFlags);
	});

	it("parses recognition=mock", () => {
		const flags = parseFeatureFlags(new URLSearchParams("?recognition=mock"));
		expect(flags.recognition).toBe("mock");
	});

	it("defaults recognition to onnx for unknown values", () => {
		const flags = parseFeatureFlags(
			new URLSearchParams("?recognition=unknown"),
		);
		expect(flags.recognition).toBe("onnx");
	});

	it("parses debug=true", () => {
		const flags = parseFeatureFlags(new URLSearchParams("?debug=true"));
		expect(flags.debug).toBe(true);
	});

	it("parses debug=1 as truthy", () => {
		const flags = parseFeatureFlags(new URLSearchParams("?debug=1"));
		expect(flags.debug).toBe(true);
	});

	it("parses bare debug flag (no value) as truthy", () => {
		const flags = parseFeatureFlags(new URLSearchParams("?debug"));
		expect(flags.debug).toBe(true);
	});

	it("parses debug=false as falsy", () => {
		const flags = parseFeatureFlags(new URLSearchParams("?debug=false"));
		expect(flags.debug).toBe(false);
	});

	it("parses overlay=boxes", () => {
		const flags = parseFeatureFlags(new URLSearchParams("?overlay=boxes"));
		expect(flags.overlay).toBe("boxes");
	});

	it("defaults overlay to none for unknown values", () => {
		const flags = parseFeatureFlags(new URLSearchParams("?overlay=dots"));
		expect(flags.overlay).toBe("none");
	});

	it("parses all flags together", () => {
		const flags = parseFeatureFlags(
			new URLSearchParams("?recognition=mock&debug=true&overlay=boxes"),
		);
		expect(flags).toEqual({
			recognition: "mock",
			debug: true,
			overlay: "boxes",
		} satisfies FeatureFlags);
	});
});
