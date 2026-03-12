import { useEffect, useRef } from "react";
import { useCvStore } from "../store/cv-store";
import type { DetectedDigit } from "../types/cv";
import { getFeatureFlags } from "../utils/feature-flags";

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
 * When `?overlay=boxes` is set, draws detection bounding boxes with
 * digit label + confidence on the canvas overlay.
 */
export function CameraOverlay({
	videoRef,
	active,
}: CameraOverlayProps): React.JSX.Element | null {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const showBoxes = getFeatureFlags().overlay === "boxes";

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

		video.addEventListener("loadedmetadata", syncSize);
		const observer = new ResizeObserver(syncSize);
		observer.observe(video);

		return () => {
			video.removeEventListener("loadedmetadata", syncSize);
			observer.disconnect();
		};
	}, [videoRef]);

	// Draw bounding boxes when overlay=boxes
	useEffect(() => {
		if (!showBoxes) return;

		const unsubscribe = useCvStore.subscribe((state) => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			drawDetections(ctx, canvas.width, canvas.height, state.detections);
		});

		return unsubscribe;
	}, [showBoxes]);

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

// ─── Bounding box drawing ───────────────────────────────────────────────────

const BOX_COLOR = "#00ff88";
const LABEL_BG = "rgba(0, 0, 0, 0.7)";
const LABEL_FONT = "bold 14px monospace";

function drawDetections(
	ctx: CanvasRenderingContext2D,
	canvasW: number,
	canvasH: number,
	detections: readonly DetectedDigit[],
): void {
	ctx.clearRect(0, 0, canvasW, canvasH);

	for (const d of detections) {
		const x = d.bbox.x * canvasW;
		const y = d.bbox.y * canvasH;
		const w = d.bbox.width * canvasW;
		const h = d.bbox.height * canvasH;

		// Draw bounding box
		ctx.strokeStyle = BOX_COLOR;
		ctx.lineWidth = 2;
		ctx.strokeRect(x, y, w, h);

		// Draw label background
		const label = `${d.digit} ${(d.confidence * 100).toFixed(0)}%`;
		ctx.font = LABEL_FONT;
		const textMetrics = ctx.measureText(label);
		const labelH = 18;
		const labelW = textMetrics.width + 8;
		const labelY = Math.max(y - labelH, 0);

		ctx.fillStyle = LABEL_BG;
		ctx.fillRect(x, labelY, labelW, labelH);

		// Draw label text
		ctx.fillStyle = BOX_COLOR;
		ctx.fillText(label, x + 4, labelY + 14);
	}
}
