import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CameraStatus =
	| "idle"
	| "requesting"
	| "active"
	| "interrupted"
	| "error"
	| "denied";

export interface CameraError {
	readonly status: CameraStatus;
	readonly message: string;
}

export interface CameraHandle {
	readonly status: CameraStatus;
	readonly error: CameraError | null;
	readonly videoRef: React.RefObject<HTMLVideoElement | null>;
	readonly requestCamera: () => Promise<void>;
	readonly stopCamera: () => void;
}

// ─── Error messages (child-friendly, PRD §5.3) ──────────────────────────────

function friendlyErrorMessage(err: unknown): CameraError {
	if (err instanceof DOMException) {
		switch (err.name) {
			case "NotAllowedError":
				return {
					status: "denied",
					message:
						"We need camera permission to see your tiles! Tap to try again.",
				};
			case "OverconstrainedError":
				return {
					status: "error",
					message: "Hmm, the camera isn't quite right. Let's try again!",
				};
			case "NotReadableError":
				return {
					status: "error",
					message:
						"The camera is busy with another app. Close other apps and try again!",
				};
			case "NotFoundError":
				return {
					status: "error",
					message: "No camera found! Make sure your device has a camera.",
				};
		}
	}
	return {
		status: "error",
		message: "Something went wrong with the camera. Let's try again!",
	};
}

// ─── Constraints ─────────────────────────────────────────────────────────────

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
	video: {
		facingMode: { ideal: "environment" },
		width: { ideal: 1280 },
		height: { ideal: 720 },
		frameRate: { ideal: 30, max: 30 },
	},
	audio: false,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Camera access hook. Call `requestCamera()` inside a user gesture handler.
 * Stream is held in a ref to avoid re-render teardown (PRD §5.6).
 */
export function useCamera(): CameraHandle {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const [status, setStatus] = useState<CameraStatus>("idle");
	const [error, setError] = useState<CameraError | null>(null);

	const stopAllTracks = useCallback((): void => {
		const stream = streamRef.current;
		if (!stream) return;
		for (const track of stream.getTracks()) {
			track.stop();
		}
		streamRef.current = null;
	}, []);

	const attachStream = useCallback((stream: MediaStream): void => {
		streamRef.current = stream;
		if (videoRef.current) {
			videoRef.current.srcObject = stream;
		}
	}, []);

	const requestCamera = useCallback(async (): Promise<void> => {
		setStatus("requesting");
		setError(null);

		try {
			const stream =
				await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
			attachStream(stream);
			setStatus("active");

			const startTime = performance.now();
			if (videoRef.current) {
				await videoRef.current.play();
			}
			const elapsed = performance.now() - startTime;
			console.log(`[camera] tap-to-preview: ${elapsed.toFixed(0)}ms`);
		} catch (err) {
			const cameraError = friendlyErrorMessage(err);
			setError(cameraError);
			setStatus(cameraError.status);
		}
	}, [attachStream]);

	const stopCamera = useCallback((): void => {
		stopAllTracks();
		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}
		setStatus("idle");
		setError(null);
	}, [stopAllTracks]);

	// Recovery on visibilitychange (PRD §5.9)
	// iOS Safari kills the camera stream when the app goes to background.
	// getUserMedia requires a user gesture — we can't call it from visibilitychange.
	// Instead, set status to "interrupted" so the UI can show a recovery button.
	useEffect(() => {
		function handleVisibilityChange(): void {
			if (document.visibilityState !== "visible") return;
			if (status !== "active") return;

			const stream = streamRef.current;
			if (!stream) return;

			const tracks = stream.getVideoTracks();
			const anyEnded = tracks.some((t) => t.readyState === "ended");

			if (anyEnded) {
				console.log(
					"[camera] stream ended after background — needs user gesture to recover",
				);
				stopAllTracks();
				setStatus("interrupted");
			}
		}

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () =>
			document.removeEventListener("visibilitychange", handleVisibilityChange);
	}, [status, stopAllTracks]);

	// Cleanup on unmount — stop all tracks (PRD §5.4)
	useEffect(() => {
		return () => {
			stopAllTracks();
		};
	}, [stopAllTracks]);

	return {
		status,
		error,
		videoRef,
		requestCamera,
		stopCamera,
	};
}
