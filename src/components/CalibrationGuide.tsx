// ─── Calibration Guide ──────────────────────────────────────────────────────
// First-run check: is the camera seeing the play surface?
// Shows a simple overlay with guidance for camera positioning and lighting.
// One-time flow — not shown after first successful setup.
// Completion stored in localStorage.

import { useCallback, useState } from "react";
import type { FrameCaptureStats } from "../camera/frame-capture";

const CALIBRATION_KEY = "superbuilders_calibrated";

function isCalibrated(): boolean {
	try {
		return localStorage.getItem(CALIBRATION_KEY) === "true";
	} catch {
		return false;
	}
}

function markCalibrated(): void {
	try {
		localStorage.setItem(CALIBRATION_KEY, "true");
	} catch {
		// localStorage not available — proceed without persisting
	}
}

interface CalibrationGuideProps {
	readonly captureStats: FrameCaptureStats;
}

export function CalibrationGuide({
	captureStats,
}: CalibrationGuideProps): React.JSX.Element | null {
	const [dismissed, setDismissed] = useState(isCalibrated);

	const handleComplete = useCallback(() => {
		markCalibrated();
		setDismissed(true);
	}, []);

	if (dismissed) return null;

	const cameraReady = captureStats.capturing && captureStats.frameCount > 0;

	return (
		<div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
			<div className="mx-4 max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl">
				<h2 className="mb-4 font-display text-4xl text-primary-600">
					Set Up Your Camera
				</h2>

				<div className="mb-6 flex flex-col gap-3 text-left font-body text-2xl text-gray-700">
					<div className="flex items-center gap-3">
						<span
							className={`text-2xl ${cameraReady ? "text-success-600" : "text-gray-400"}`}
						>
							{cameraReady ? "\u2713" : "\u25CB"}
						</span>
						<span>Point your camera at the play area</span>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-2xl text-gray-400">{"\u25CB"}</span>
						<span>Make sure the area is well-lit</span>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-2xl text-gray-400">{"\u25CB"}</span>
						<span>Place tiles on a flat, contrasting surface</span>
					</div>
				</div>

				{cameraReady ? (
					<button
						type="button"
						onClick={handleComplete}
						className="min-h-20 rounded-3xl bg-success-500 px-10 py-6 font-display text-2xl text-white shadow-lg active:scale-95"
					>
						Looks good!
					</button>
				) : (
					<p className="font-body text-2xl text-gray-500">
						Waiting for camera...
					</p>
				)}
			</div>
		</div>
	);
}
