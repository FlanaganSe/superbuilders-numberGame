import { useCallback, useEffect, useRef, useState } from "react";

interface WakeLockResult {
	readonly supported: boolean;
	readonly active: boolean;
	readonly acquire: () => void;
}

/**
 * Screen Wake Lock hook — prevents iPad from sleeping during gameplay.
 * `acquire()` must be called inside a user gesture (WebKit requirement).
 * Re-acquires automatically when the page returns to the foreground.
 */
export function useWakeLock(): WakeLockResult {
	const sentinelRef = useRef<WakeLockSentinel | null>(null);
	const acquiredRef = useRef(false);
	const [active, setActive] = useState(false);

	const supported = "wakeLock" in navigator;

	const acquire = useCallback((): void => {
		if (!supported) return;
		acquiredRef.current = true;

		// Release any existing sentinel to prevent leaks on re-acquire
		sentinelRef.current?.release().catch(() => {});
		sentinelRef.current = null;

		navigator.wakeLock
			.request("screen")
			.then((sentinel) => {
				sentinelRef.current = sentinel;
				setActive(true);
				sentinel.addEventListener("release", () => {
					setActive(false);
					sentinelRef.current = null;
				});
			})
			.catch(() => {
				// Best-effort — failure is silent (not all environments support it)
			});
	}, [supported]);

	// Re-acquire on visibilitychange (same pattern as sound-manager.ts:95-114)
	useEffect(() => {
		if (!supported) return;

		function handleVisibilityChange(): void {
			if (document.visibilityState !== "visible") return;
			if (!acquiredRef.current) return;
			acquire();
		}

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			sentinelRef.current?.release().catch(() => {});
			sentinelRef.current = null;
			acquiredRef.current = false;
		};
	}, [supported, acquire]);

	return { supported, active, acquire };
}
