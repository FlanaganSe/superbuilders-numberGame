// ─── Types ───────────────────────────────────────────────────────────────────

export interface FrameCaptureStats {
	readonly frameCount: number;
	readonly fps: number;
	readonly capturing: boolean;
}

export type FrameCallback = (bitmap: ImageBitmap) => void;

export interface FrameCapture {
	start(video: HTMLVideoElement): void;
	stop(): void;
	onFrame(callback: FrameCallback): () => void;
	readonly stats: FrameCaptureStats;
}

// ─── Implementation ──────────────────────────────────────────────────────────

/**
 * Frame capture using requestVideoFrameCallback (rVFC).
 *
 * Produces ImageBitmap objects ready for transfer to a Worker (M4).
 * For now, if no consumer is subscribed, frames are captured and immediately closed.
 *
 * Canvas is created once per session and cleaned up on stop (PRD §5.13).
 * Uses drawImage(video) → createImageBitmap(canvas) — never createImageBitmap(video)
 * directly (WebKit bug #234920, PRD §5.7).
 */
export function createFrameCapture(): FrameCapture {
	let active = false;
	let frameCount = 0;
	let fps = 0;
	let lastFpsTime = 0;
	let framesInWindow = 0;
	let canvas: OffscreenCanvas | null = null;
	let ctx: OffscreenCanvasRenderingContext2D | null = null;
	const listeners = new Set<FrameCallback>();

	function ensureCanvas(
		width: number,
		height: number,
	): OffscreenCanvasRenderingContext2D {
		// Never recreate canvas mid-session (PRD §5.13).
		// Only create if we don't have one yet.
		if (!canvas || !ctx) {
			canvas = new OffscreenCanvas(width, height);
			ctx = canvas.getContext("2d");
			if (!ctx)
				throw new Error("Failed to get 2D context from OffscreenCanvas");
		}

		// Resize if video dimensions changed (without recreating)
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}

		return ctx;
	}

	function updateFps(now: number): void {
		framesInWindow++;
		if (lastFpsTime === 0) {
			lastFpsTime = now;
			return;
		}
		const elapsed = now - lastFpsTime;
		if (elapsed >= 1000) {
			fps = Math.round((framesInWindow * 1000) / elapsed);
			framesInWindow = 0;
			lastFpsTime = now;
		}
	}

	async function onVideoFrame(
		video: HTMLVideoElement,
		now: DOMHighResTimeStamp,
	): Promise<void> {
		if (!active) return;

		updateFps(now);

		const { videoWidth, videoHeight } = video;
		if (videoWidth === 0 || videoHeight === 0) {
			// Video not ready yet
			scheduleNext(video);
			return;
		}

		const context = ensureCanvas(videoWidth, videoHeight);
		const captureCanvas = canvas;
		if (!captureCanvas) return;

		// Step 1: draw video to capture canvas (PRD §5.7)
		context.drawImage(video, 0, 0, videoWidth, videoHeight);

		// Step 2: createImageBitmap from canvas (GPU-accelerated path)
		const bitmap = await createImageBitmap(captureCanvas);

		frameCount++;

		if (listeners.size === 1) {
			// Fast path: single consumer owns the bitmap (no clone needed).
			// Consumer is responsible for calling bitmap.close() (PRD §5.12).
			for (const cb of listeners) {
				cb(bitmap);
			}
		} else if (listeners.size > 1) {
			// Multiple consumers: clone per listener, then close the original.
			const clonePromises = [...listeners].map(async (cb) => {
				const clone = await createImageBitmap(bitmap);
				cb(clone);
			});
			await Promise.all(clonePromises);
			bitmap.close();
		} else {
			// No consumer — close immediately to prevent GPU memory leak
			bitmap.close();
		}

		scheduleNext(video);
	}

	function scheduleNext(video: HTMLVideoElement): void {
		if (!active) return;
		video.requestVideoFrameCallback((now, _meta) => {
			onVideoFrame(video, now);
		});
	}

	return {
		start(video: HTMLVideoElement): void {
			if (active) return;
			active = true;
			frameCount = 0;
			fps = 0;
			lastFpsTime = 0;
			framesInWindow = 0;

			video.requestVideoFrameCallback((now, _meta) => {
				onVideoFrame(video, now);
			});
		},

		stop(): void {
			active = false;

			// Canvas cleanup: set .width = 0; .height = 0 before releasing (PRD §5.13)
			if (canvas) {
				canvas.width = 0;
				canvas.height = 0;
				canvas = null;
				ctx = null;
			}
		},

		onFrame(callback: FrameCallback): () => void {
			listeners.add(callback);
			return () => {
				listeners.delete(callback);
			};
		},

		get stats(): FrameCaptureStats {
			return { frameCount, fps, capturing: active };
		},
	};
}
