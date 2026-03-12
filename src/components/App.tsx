import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CameraOverlay } from "../camera/camera-overlay";
import {
	createFrameCapture,
	type FrameCapture,
	type FrameCaptureStats,
} from "../camera/frame-capture";
import { useCamera } from "../camera/use-camera";
import { selectGamePhase, useGameStore } from "../store/game-store";
import { getFeatureFlags } from "../utils/feature-flags";
import { CountdownTimer } from "./CountdownTimer";
import { DebugHUD } from "./DebugHUD";
import { GameScreen } from "./GameScreen";
import { SessionSummary } from "./SessionSummary";
import { TapToStart } from "./TapToStart";

const STATS_POLL_MS = 500;
const EMPTY_STATS: FrameCaptureStats = {
	frameCount: 0,
	fps: 0,
	capturing: false,
};

export function App(): React.JSX.Element {
	const phase = useGameStore(selectGamePhase);
	const flags = getFeatureFlags();
	const isMockMode = flags.recognition === "mock";

	const camera = useCamera();
	const frameCaptureRef = useRef<FrameCapture | null>(null);
	const [captureStats, setCaptureStats] =
		useState<FrameCaptureStats>(EMPTY_STATS);

	// Create frame capture instance once
	if (!frameCaptureRef.current) {
		frameCaptureRef.current = createFrameCapture();
	}

	// Start/stop frame capture based on camera status
	useEffect(() => {
		if (isMockMode) return;
		if (camera.status !== "active") return;

		const video = camera.videoRef.current;
		const fc = frameCaptureRef.current;
		if (!video || !fc) return;

		let started = false;

		function onMetadata(): void {
			if (!fc || !video) return;
			started = true;
			fc.start(video);
		}

		// Start immediately if video already has dimensions, otherwise wait
		if (video.videoWidth > 0 && video.videoHeight > 0) {
			started = true;
			fc.start(video);
		} else {
			video.addEventListener("loadedmetadata", onMetadata, { once: true });
		}

		return () => {
			if (!started) {
				video.removeEventListener("loadedmetadata", onMetadata);
			}
			fc.stop();
		};
	}, [camera.status, camera.videoRef, isMockMode]);

	// Poll capture stats for DebugHUD
	useEffect(() => {
		const fc = frameCaptureRef.current;
		if (!fc) return;

		const id = setInterval(() => {
			setCaptureStats(fc.stats);
		}, STATS_POLL_MS);

		return () => clearInterval(id);
	}, []);

	return (
		<LazyMotion features={domAnimation}>
			<MotionConfig reducedMotion="user">
				<div className="relative flex min-h-dvh items-center justify-center">
					{!isMockMode && (
						<CameraOverlay
							videoRef={camera.videoRef}
							active={camera.status === "active"}
						/>
					)}
					{camera.status === "interrupted" && (
						<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
							<button
								type="button"
								onClick={() => camera.requestCamera()}
								className="rounded-2xl bg-primary-500 px-8 py-4 font-display text-2xl text-white shadow-lg active:scale-95"
							>
								Tap to restart camera
							</button>
						</div>
					)}
					<div className="relative z-10">
						<PhaseRouter
							phase={phase}
							requestCamera={camera.requestCamera}
							cameraError={camera.error}
						/>
					</div>
					<DebugHUD captureStats={captureStats} />
				</div>
			</MotionConfig>
		</LazyMotion>
	);
}

function PhaseRouter({
	phase,
	requestCamera,
	cameraError,
}: {
	readonly phase: ReturnType<typeof selectGamePhase>;
	readonly requestCamera: () => Promise<void>;
	readonly cameraError: import("../camera/use-camera").CameraError | null;
}): React.JSX.Element {
	switch (phase.phase) {
		case "idle":
			return (
				<TapToStart requestCamera={requestCamera} cameraError={cameraError} />
			);
		case "countdown":
			return <CountdownTimer secondsLeft={phase.secondsLeft} />;
		case "scanning":
			return (
				<GameScreen
					problem={phase.problem}
					attemptNumber={phase.attemptNumber}
				/>
			);
		case "success":
			return (
				<GameScreen
					problem={phase.problem}
					attemptNumber={1}
					stars={phase.stars}
				/>
			);
		case "timeout":
			return (
				<GameScreen
					problem={phase.problem}
					attemptNumber={phase.attemptNumber}
					timedOut
				/>
			);
		case "session-end":
			return <SessionSummary session={phase.session} />;
	}
}
