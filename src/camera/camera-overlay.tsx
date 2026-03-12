import { useEffect, useRef } from "react";

interface CameraOverlayProps {
	readonly videoRef: React.RefObject<HTMLVideoElement | null>;
	readonly active: boolean;
}

/**
 * Camera preview with transparent canvas overlay for debug bounding boxes.
 *
 * Video element uses `playsinline autoplay muted` — all three are mandatory.
 * Without `playsinline`, Safari goes fullscreen (PRD §5.8).
 *
 * The canvas overlay is positioned identically on top of the video for
 * future debug bounding box drawing (M4/M5).
 */
export function CameraOverlay({
	videoRef,
	active,
}: CameraOverlayProps): React.JSX.Element | null {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	// Sync canvas size to video dimensions
	useEffect(() => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas) return;

		function syncSize(): void {
			if (!video || !canvas) return;
			const { clientWidth, clientHeight } = video;
			if (clientWidth > 0 && clientHeight > 0) {
				canvas.width = clientWidth;
				canvas.height = clientHeight;
			}
		}

		// Sync once video has loaded metadata
		video.addEventListener("loadedmetadata", syncSize);
		// Also sync on resize
		const observer = new ResizeObserver(syncSize);
		observer.observe(video);

		return () => {
			video.removeEventListener("loadedmetadata", syncSize);
			observer.disconnect();
		};
	}, [videoRef]);

	if (!active) return null;

	return (
		<div className="absolute inset-0 overflow-hidden rounded-2xl">
			<video
				ref={videoRef}
				autoPlay
				playsInline
				muted
				className="h-full w-full object-cover"
			/>
			<canvas
				ref={canvasRef}
				className="pointer-events-none absolute inset-0 h-full w-full"
			/>
		</div>
	);
}
