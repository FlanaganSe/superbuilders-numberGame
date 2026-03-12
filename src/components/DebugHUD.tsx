import { useEffect, useState } from "react";
import type { FrameCaptureStats } from "../camera/frame-capture";
import { getFeatureFlags } from "../utils/feature-flags";

interface DebugHUDProps {
	readonly captureStats: FrameCaptureStats;
}

/**
 * Dev-only debug overlay. Gated by `?debug=true` feature flag.
 *
 * Shows frame count, FPS, and capture status. Placeholder slots for
 * inference latency and detection overlays (M4/M5 will fill these).
 *
 * Positioned in the bottom-left corner so it doesn't obstruct gameplay.
 *
 * Real-device testing:
 * ```
 * # Terminal 1: run dev server
 * pnpm dev
 *
 * # Terminal 2: expose via tunnel
 * cloudflared tunnel --url https://localhost:5173
 * ```
 */
export function DebugHUD({
	captureStats,
}: DebugHUDProps): React.JSX.Element | null {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		setVisible(getFeatureFlags().debug);
	}, []);

	if (!visible) return null;

	const { frameCount, fps, capturing } = captureStats;

	return (
		<div className="pointer-events-none fixed bottom-4 left-4 z-50 rounded-lg bg-black/70 px-3 py-2 font-mono text-xs text-green-400">
			<div className="flex flex-col gap-0.5">
				<span>capture: {capturing ? "ON" : "OFF"}</span>
				<span>frames: {frameCount}</span>
				<span>fps: {fps}</span>
				{/* M4: inference latency */}
				<span className="text-gray-500">latency: —</span>
				{/* M5: detection count */}
				<span className="text-gray-500">detections: —</span>
			</div>
		</div>
	);
}
