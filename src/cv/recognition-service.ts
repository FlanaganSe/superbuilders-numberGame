import type { FeatureFlags } from "../utils/feature-flags";
import type { MockRecognitionControl } from "./mock-recognition";
import { createMockRecognitionService } from "./mock-recognition";

// ─── Factory ────────────────────────────────────────────────────────────────

export type RecognitionBackend =
	| { readonly type: "mock"; readonly control: MockRecognitionControl }
	| { readonly type: "onnx" };

export function createRecognitionBackend(
	flags: FeatureFlags,
): RecognitionBackend {
	if (flags.recognition === "mock") {
		return { type: "mock", control: createMockRecognitionService() };
	}
	// ONNX backend will be implemented in M5
	return { type: "onnx" };
}
