import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWakeLock } from "./use-wake-lock";

describe("useWakeLock", () => {
	it("returns supported: false when wakeLock API is unavailable", () => {
		const { result } = renderHook(() => useWakeLock());
		expect(result.current.supported).toBe(false);
		expect(result.current.active).toBe(false);
	});

	describe("when wakeLock is available", () => {
		const mockRelease = vi
			.fn<() => Promise<undefined>>()
			.mockResolvedValue(undefined);
		const mockSentinel = {
			released: false,
			release: mockRelease,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			type: "screen" as const,
			onrelease: null,
			dispatchEvent: vi.fn().mockReturnValue(true),
		};
		const mockRequest = vi
			.fn<() => Promise<typeof mockSentinel>>()
			.mockResolvedValue(mockSentinel);

		beforeEach(() => {
			Object.defineProperty(navigator, "wakeLock", {
				value: { request: mockRequest },
				configurable: true,
			});
		});

		afterEach(() => {
			Object.defineProperty(navigator, "wakeLock", {
				value: undefined,
				configurable: true,
			});
			vi.restoreAllMocks();
		});

		it("returns supported: true", () => {
			const { result } = renderHook(() => useWakeLock());
			expect(result.current.supported).toBe(true);
		});

		it("acquires wake lock on acquire()", async () => {
			const { result } = renderHook(() => useWakeLock());

			await act(async () => {
				result.current.acquire();
			});

			expect(mockRequest).toHaveBeenCalledWith("screen");
			expect(result.current.active).toBe(true);
		});

		it("sets active to false when sentinel fires release", async () => {
			let releaseHandler: (() => void) | undefined;
			mockSentinel.addEventListener.mockImplementation(
				(event: string, handler: () => void) => {
					if (event === "release") releaseHandler = handler;
				},
			);

			const { result } = renderHook(() => useWakeLock());
			await act(async () => {
				result.current.acquire();
			});
			expect(result.current.active).toBe(true);

			act(() => {
				releaseHandler?.();
			});
			expect(result.current.active).toBe(false);
		});
	});
});
