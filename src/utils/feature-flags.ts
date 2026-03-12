export type RecognitionMode = "mock" | "onnx";
export type OverlayMode = "none" | "boxes";

export interface FeatureFlags {
	readonly recognition: RecognitionMode;
	readonly debug: boolean;
	readonly overlay: OverlayMode;
}

const DEFAULTS: FeatureFlags = {
	recognition: "onnx",
	debug: false,
	overlay: "none",
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
	};
}

/** Read feature flags from the current page URL. */
export function getFeatureFlags(): FeatureFlags {
	if (typeof window === "undefined") return DEFAULTS;
	return parseFeatureFlags(new URLSearchParams(window.location.search));
}
