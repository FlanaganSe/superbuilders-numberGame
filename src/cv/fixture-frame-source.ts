// ─── Fixture Frame Source ────────────────────────────────────────────────────
//
// Implements FrameSource for test/regression use. Loads labeled test images
// from a list of URLs, converts them to ImageBitmaps, and feeds them through
// the pipeline. This is the infrastructure M9's fixture regression tests
// depend on.
//
// Usage:
//   const source = createFixtureFrameSource([
//     { imageUrl: '/fixtures/digit-7-bright.jpg' },
//     { imageUrl: '/fixtures/multi-13-normal.jpg' },
//   ]);
//   source.onFrame(bitmap => { ... });
//   await source.start(); // emits frames sequentially

import type { FrameSource } from "../types/cv";

export interface FixtureFrame {
	readonly imageUrl: string;
	readonly label?: string;
}

const FRAME_INTERVAL_MS = 100;

export function createFixtureFrameSource(
	fixtures: readonly FixtureFrame[],
): FrameSource {
	let isActive = false;
	let currentIndex = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;
	const listeners = new Set<(frame: ImageBitmap) => void>();

	async function emitFrame(): Promise<void> {
		if (!isActive || currentIndex >= fixtures.length) {
			isActive = false;
			return;
		}

		const fixture = fixtures[currentIndex];
		if (!fixture) {
			isActive = false;
			return;
		}

		try {
			const response = await fetch(fixture.imageUrl);
			const blob = await response.blob();
			const bitmap = await createImageBitmap(blob);

			if (!isActive) {
				bitmap.close();
				return;
			}

			if (listeners.size === 1) {
				// Single consumer owns the bitmap
				for (const cb of listeners) {
					cb(bitmap);
				}
			} else if (listeners.size > 1) {
				// Multiple consumers: clone per listener, close original
				for (const cb of listeners) {
					const clone = await createImageBitmap(bitmap);
					cb(clone);
				}
				bitmap.close();
			} else {
				// No listeners — close to prevent leak
				bitmap.close();
			}
		} catch {
			isActive = false;
			return;
		}

		currentIndex++;

		if (isActive && currentIndex < fixtures.length) {
			timer = setTimeout(() => {
				emitFrame();
			}, FRAME_INTERVAL_MS);
		} else {
			isActive = false;
		}
	}

	return {
		async start(): Promise<void> {
			if (isActive) return;
			isActive = true;
			currentIndex = 0;
			await emitFrame();
		},

		stop(): void {
			isActive = false;
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
		},

		get active(): boolean {
			return isActive;
		},

		onFrame(callback: (frame: ImageBitmap) => void): () => void {
			listeners.add(callback);
			return () => {
				listeners.delete(callback);
			};
		},
	};
}
