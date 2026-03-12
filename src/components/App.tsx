import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { setupVisibilityResume } from "../audio/sound-manager";
import { CameraOverlay } from "../camera/camera-overlay";
import {
	createFrameCapture,
	type FrameCapture,
	type FrameCaptureStats,
} from "../camera/frame-capture";
import { useCamera } from "../camera/use-camera";
import { isFrameStable } from "../cv/motion-gate";
import {
	createRecognitionBackend,
	type RecognitionBackend,
} from "../cv/recognition-service";
import { selectWorkerStatus, useCvStore } from "../store/cv-store";
import {
	getLastMatchedAnswer,
	getTemporalCount,
	selectGamePhase,
	useGameStore,
} from "../store/game-store";
import { getFeatureFlags } from "../utils/feature-flags";
import { CalibrationGuide } from "./CalibrationGuide";
import { CountdownTimer } from "./CountdownTimer";
import { DebugHUD } from "./DebugHUD";
import { GameScreen } from "./GameScreen";
import { MuteButton } from "./MuteButton";
import { ProgressiveLoader } from "./ProgressiveLoader";
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
	const backendRef = useRef<RecognitionBackend | null>(null);
	const [captureStats, setCaptureStats] =
		useState<FrameCaptureStats>(EMPTY_STATS);

	// CV worker status for ProgressiveLoader
	const workerStatus = useCvStore(selectWorkerStatus);
	const workerError = useCvStore((s) => s.errorMessage);

	// Create frame capture instance once
	if (!frameCaptureRef.current) {
		frameCaptureRef.current = createFrameCapture();
	}

	// Create recognition backend once
	if (!backendRef.current) {
		backendRef.current = createRecognitionBackend(flags);
	}

	// Set up audio visibilitychange resume (iOS backgrounding — research §4.4)
	useEffect(() => setupVisibilityResume(), []);

	// Init ONNX service (load model in background)
	useEffect(() => {
		const backend = backendRef.current;
		if (!backend || backend.type !== "onnx") return;

		const { service } = backend;
		useCvStore.getState().updateWorkerStatus("loading");

		service
			.init()
			.then(() => {
				useCvStore.getState().updateWorkerStatus("ready");
			})
			.catch((err: unknown) => {
				useCvStore.getState().updateWorkerStatus("error", String(err));
			});

		return () => {
			service.dispose();
			useCvStore.getState().reset();
		};
	}, []);

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

	// Wire CV pipeline: frame capture → ONNX worker → motion gate → game store
	useEffect(() => {
		if (isMockMode) return;

		const backend = backendRef.current;
		const fc = frameCaptureRef.current;
		if (!backend || backend.type !== "onnx" || !fc) return;

		const { service } = backend;

		const unsubscribe = fc.onFrame(async (bitmap: ImageBitmap) => {
			// CV only active during scanning phase (PRD §3.5, §3.15)
			const gamePhase = useGameStore.getState().gameState.phase;
			if (gamePhase.phase !== "scanning") {
				bitmap.close();
				return;
			}

			const result = await service.recognize(bitmap);
			// bitmap ownership transferred to worker (or closed if busy/not ready)

			// Guard: if service was disposed while recognize was inflight, skip
			if (!service.ready) return;

			// Update cv-store with raw detections + latency (fresh getState per frame)
			useCvStore
				.getState()
				.updateDetections(result.detections, result.latencyMs);

			// Motion gate: skip processing for unstable frames
			// (don't reset temporal buffer — just ignore the frame)
			// isFrameStable returns true for empty arrays, so empty frames pass through
			// and correctly reset the temporal buffer via processDetections(null match)
			if (!isFrameStable(result.detections)) return;

			// Process through interpretation → temporal buffer → game store
			useGameStore.getState().processDetections(result.detections);

			// Update temporal state in cv-store
			useCvStore
				.getState()
				.updateTemporalState(getTemporalCount(), getLastMatchedAnswer());
		});

		return unsubscribe;
	}, [isMockMode]);

	// Poll capture stats for DebugHUD
	useEffect(() => {
		const fc = frameCaptureRef.current;
		if (!fc) return;

		const id = setInterval(() => {
			setCaptureStats(fc.stats);
		}, STATS_POLL_MS);

		return () => clearInterval(id);
	}, []);

	// ─── Progressive loader gate ──────────────────────────────────────────
	// Show ProgressiveLoader when the model isn't ready and the user has
	// tapped start. In mock mode, no model loading occurs.
	const showLoader =
		!isMockMode && workerStatus !== "ready" && phase.phase !== "idle";

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
					{!isMockMode && camera.status === "active" && (
						<CalibrationGuide
							captureStats={captureStats}
							onComplete={() => {}}
						/>
					)}
					{camera.status === "interrupted" && (
						<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
							<button
								type="button"
								onClick={() => camera.requestCamera()}
								className="min-h-20 rounded-3xl bg-primary-500 px-10 py-6 font-display text-2xl text-white shadow-xl active:scale-95"
							>
								Tap to restart camera
							</button>
						</div>
					)}
					<div className="relative z-10">
						{showLoader ? (
							<ProgressiveLoader
								status={workerStatus === "error" ? "error" : "loading"}
								errorMessage={workerError}
								onRetry={handleRetry}
								onFallbackMock={handleFallbackMock}
							/>
						) : (
							<PhaseRouter
								phase={phase}
								requestCamera={camera.requestCamera}
								cameraError={camera.error}
							/>
						)}
					</div>

					{/* Mute button — visible in all phases except idle */}
					{phase.phase !== "idle" && (
						<div className="fixed bottom-6 right-6 z-30">
							<MuteButton />
						</div>
					)}

					<DebugHUD
						captureStats={captureStats}
						videoRef={isMockMode ? undefined : camera.videoRef}
					/>
				</div>
			</MotionConfig>
		</LazyMotion>
	);
}

// ─── Retry / fallback handlers ──────────────────────────────────────────────

function handleRetry(): void {
	window.location.reload();
}

function handleFallbackMock(): void {
	const url = new URL(window.location.href);
	url.searchParams.set("recognition", "mock");
	window.location.href = url.toString();
}

// ─── Phase router ───────────────────────────────────────────────────────────

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
