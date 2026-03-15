export type RecognitionMode = "mock" | "onnx";
export type OverlayMode = "none" | "boxes";

export interface FeatureFlags {
	readonly recognition: RecognitionMode;
	readonly debug: boolean;
	readonly overlay: OverlayMode;
	readonly cvConfidence: boolean;
}

const DEFAULTS: FeatureFlags = {
	recognition: "onnx",
	debug: false,
	overlay: "none",
	cvConfidence: false,
} as const;

function parseRecognitionMode(value: string | null): RecognitionMode {
	return value === "mock" ? "mock" : "onnx";
}

function parseOverlayMode(value: string | null): OverlayMode {
	return value === "boxes" ? "boxes" : "none";
}

function parseBool(value: string | null): boolean {
	return value === "true" || value === "1" || value === "";
}

/** Parse feature flags from URL search params. Pure function for testability. */
export function parseFeatureFlags(params: URLSearchParams): FeatureFlags {
	return {
		recognition: parseRecognitionMode(params.get("recognition")),
		debug: parseBool(params.get("debug")),
		overlay: parseOverlayMode(params.get("overlay")),
		cvConfidence: parseBool(params.get("cv-confidence")),
	};
}

/** Read feature flags from the current page URL. Cached — flags can't change without a reload. */
let cached: FeatureFlags | null = null;
export function getFeatureFlags(): FeatureFlags {
	if (cached) return cached;
	if (typeof window === "undefined") return DEFAULTS;
	cached = parseFeatureFlags(new URLSearchParams(window.location.search));
	return cached;
}
