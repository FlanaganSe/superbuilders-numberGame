import { useCallback, useEffect, useRef, useState } from "react";
import type { FrameCaptureStats } from "../camera/frame-capture";
import {
	type CameraSettings,
	selectCameraSettings,
	selectDetections,
	selectDroppedFrames,
	selectLastMatchedAnswer,
	selectLatencyMs,
	selectModelNumClasses,
	selectPipelineStats,
	selectTemporalCount,
	selectWorkerStatus,
	useCvStore,
	type WorkerStatus,
} from "../store/cv-store";
import type { DetectedDigit } from "../types/cv";
import { getFeatureFlags } from "../utils/feature-flags";

interface DebugHUDProps {
	readonly captureStats: FrameCaptureStats;
	readonly videoRef?: React.RefObject<HTMLVideoElement | null> | undefined;
}

/**
 * Dev-only debug overlay. Gated by `?debug=true` feature flag.
 *
 * Shows frame capture stats, inference latency, detection count,
 * confidence scores, temporal buffer state, and worker status.
 *
 * Includes fixture capture button (saves current frame + detections).
 */
export function DebugHUD({
	captureStats,
	videoRef,
}: DebugHUDProps): React.JSX.Element | null {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		setVisible(getFeatureFlags().debug);
	}, []);

	if (!visible) return null;

	return <DebugHUDInner captureStats={captureStats} videoRef={videoRef} />;
}

// Separate inner component so cv-store subscriptions only activate when visible
function pct(count: number, total: number): string {
	if (total === 0) return "—";
	return `${Math.round((count / total) * 100)}%`;
}

function formatCameraSettings(settings: CameraSettings): string {
	return `${settings.width}×${settings.height} @${Math.round(settings.frameRate)}fps ${settings.facingMode}`;
}

function DebugHUDInner({
	captureStats,
	videoRef,
}: DebugHUDProps): React.JSX.Element {
	const { frameCount, fps, capturing } = captureStats;

	// CV store subscriptions (OK to re-render at inference rate — debug only)
	const detections = useCvStore(selectDetections);
	const latencyMs = useCvStore(selectLatencyMs);
	const workerStatus = useCvStore(selectWorkerStatus);
	const temporalCount = useCvStore(selectTemporalCount);
	const lastMatchedAnswer = useCvStore(selectLastMatchedAnswer);
	const cameraSettings = useCvStore(selectCameraSettings);
	const pipelineStats = useCvStore(selectPipelineStats);
	const droppedFrames = useCvStore(selectDroppedFrames);
	const modelNumClasses = useCvStore(selectModelNumClasses);

	const avgConfidence =
		detections.length > 0
			? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
			: 0;

	return (
		<div className="pointer-events-auto fixed bottom-4 left-4 z-50 rounded-lg bg-black/70 px-3 py-2 font-mono text-xs text-green-400">
			<div className="flex flex-col gap-0.5">
				<span>capture: {capturing ? "ON" : "OFF"}</span>
				<span>frames: {frameCount}</span>
				<span>fps: {fps}</span>
				<span>
					worker: <WorkerStatusBadge status={workerStatus} />
				</span>
				<span>
					latency: {latencyMs > 0 ? `${latencyMs.toFixed(0)}ms` : "—"}
				</span>
				<span>detections: {detections.length}</span>
				<span>
					confidence: {avgConfidence > 0 ? avgConfidence.toFixed(2) : "—"}
				</span>
				<span>temporal: {temporalCount}/3</span>
				<span>
					match:{" "}
					{lastMatchedAnswer !== null ? (
						<span className="text-green-300">{lastMatchedAnswer} YES</span>
					) : (
						"null"
					)}
				</span>
				<span>dropped: {droppedFrames}</span>
				{modelNumClasses !== null && (
					<span>model: {modelNumClasses} classes</span>
				)}
				{cameraSettings && (
					<span>cam: {formatCameraSettings(cameraSettings)}</span>
				)}
				{pipelineStats.totalFrames > 0 && (
					<>
						<span className="mt-1 text-green-600">─ pipeline ─</span>
						<span>
							det:{" "}
							{pct(pipelineStats.withDetections, pipelineStats.totalFrames)}{" "}
							cand:{" "}
							{pct(pipelineStats.withCandidates, pipelineStats.totalFrames)}{" "}
							match: {pct(pipelineStats.withMatch, pipelineStats.totalFrames)}
						</span>
						<span>n={pipelineStats.totalFrames}</span>
					</>
				)}
			</div>
			{videoRef && (
				<FixtureCaptureButton videoRef={videoRef} detections={detections} />
			)}
		</div>
	);
}

function WorkerStatusBadge({
	status,
}: {
	readonly status: WorkerStatus;
}): React.JSX.Element {
	const color =
		status === "ready"
			? "text-green-400"
			: status === "error"
				? "text-red-400"
				: "text-yellow-400";

	return <span className={color}>{status}</span>;
}

// ─── Fixture Capture Button ─────────────────────────────────────────────────
// Saves current video frame + detection results as a downloadable fixture.
// Dev-only tool for building the M9 regression test set (PRD §3.31).

function FixtureCaptureButton({
	videoRef,
	detections,
}: {
	readonly videoRef: React.RefObject<HTMLVideoElement | null>;
	readonly detections: readonly DetectedDigit[];
}): React.JSX.Element {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	const handleCapture = useCallback(() => {
		const video = videoRef.current;
		if (!video || video.videoWidth === 0) return;

		// Draw current video frame to a temporary canvas
		if (!canvasRef.current) {
			canvasRef.current = document.createElement("canvas");
		}
		const canvas = canvasRef.current;
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.drawImage(video, 0, 0);

		// Create fixture payload
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const fixture = {
			timestamp,
			detections: [...detections],
		};

		// Download image
		canvas.toBlob((blob) => {
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `fixture-${timestamp}.jpg`;
			a.click();
			URL.revokeObjectURL(url);
		}, "image/jpeg");

		// Download JSON
		const jsonBlob = new Blob([JSON.stringify(fixture, null, 2)], {
			type: "application/json",
		});
		const jsonUrl = URL.createObjectURL(jsonBlob);
		const jsonLink = document.createElement("a");
		jsonLink.href = jsonUrl;
		jsonLink.download = `fixture-${timestamp}.json`;
		jsonLink.click();
		URL.revokeObjectURL(jsonUrl);
	}, [videoRef, detections]);

	return (
		<button
			type="button"
			onClick={handleCapture}
			className="mt-2 rounded bg-yellow-600 px-2 py-1 text-xs text-white active:bg-yellow-700"
		>
			Capture Fixture
		</button>
	);
}
