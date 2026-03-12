import * as m from "motion/react-m";
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
			<h1 className="font-display text-7xl text-primary-600 drop-shadow-sm">
				Superbuilders
			</h1>

			{cameraError && (
				<p className="max-w-sm text-center font-body text-2xl text-amber-600">
					{cameraError.message}
				</p>
			)}

			<m.button
				type="button"
				onClick={handleStart}
				whileTap={{ scale: 0.95 }}
				transition={{ type: "spring", stiffness: 400, damping: 17 }}
				className="min-h-20 rounded-3xl bg-primary-500 px-14 py-6 font-display text-4xl text-white shadow-xl"
			>
				Let's Play!
			</m.button>
		</div>
	);
}
