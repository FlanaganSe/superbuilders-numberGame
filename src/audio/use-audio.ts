import { useCallback, useRef } from "react";
import { selectMuted, useGameStore } from "../store/game-store";
import { playSound, type SoundName } from "./sound-manager";

export type { SoundName } from "./sound-manager";

interface AudioControls {
	readonly play: (name: SoundName) => void;
}

/**
 * React hook for playing game sounds. Respects mute state from game store.
 * Returns a stable `play` function reference (safe for effect dependencies).
 */
export function useAudio(): AudioControls {
	const muted = useGameStore(selectMuted);
	const mutedRef = useRef(muted);
	mutedRef.current = muted;

	const play = useCallback((name: SoundName): void => {
		if (!mutedRef.current) {
			playSound(name);
		}
	}, []);

	return { play };
}
