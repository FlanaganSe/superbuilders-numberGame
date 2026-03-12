import type { FeatureFlags } from "../utils/feature-flags";
import type { MockRecognitionControl } from "./mock-recognition";
import { createMockRecognitionService } from "./mock-recognition";
import {
	createOnnxRecognitionService,
	type OnnxRecognitionService,
} from "./onnx-recognition";

// ─── Factory ────────────────────────────────────────────────────────────────

export type RecognitionBackend =
	| { readonly type: "mock"; readonly control: MockRecognitionControl }
	| { readonly type: "onnx"; readonly service: OnnxRecognitionService };

export function createRecognitionBackend(
	flags: FeatureFlags,
): RecognitionBackend {
	if (flags.recognition === "mock") {
		return { type: "mock", control: createMockRecognitionService() };
	}
	return { type: "onnx", service: createOnnxRecognitionService() };
}
