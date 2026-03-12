import type { CameraError } from "../camera/use-camera";
import { AdditionMode } from "../engine/problem-generator";
import { useGameStore } from "../store/game-store";
import { getFeatureFlags } from "../utils/feature-flags";

interface TapToStartProps {
	readonly requestCamera: () => Promise<void>;
	readonly cameraError: CameraError | null;
}

export function TapToStart({
	requestCamera,
	cameraError,
}: TapToStartProps): React.JSX.Element {
	const dispatch = useGameStore((s) => s.dispatch);
	const flags = getFeatureFlags();

	function handleStart(): void {
		// Camera unlock MUST happen in the same user gesture handler (PRD §5.5).
		// In mock mode, skip camera setup entirely.
		if (flags.recognition !== "mock") {
			requestCamera();
		}
		dispatch({ type: "START_SESSION", mode: AdditionMode });
	}

	return (
		<div className="flex flex-col items-center gap-8">
			<h1 className="font-display text-6xl text-primary-600">Superbuilders</h1>

			{cameraError && (
				<p className="max-w-sm text-center font-body text-lg text-amber-600">
					{cameraError.message}
				</p>
			)}

			<button
				type="button"
				onClick={handleStart}
				className="rounded-2xl bg-primary-500 px-12 py-6 font-display text-4xl text-white shadow-lg active:scale-95"
			>
				Let's Play!
			</button>
		</div>
	);
}
