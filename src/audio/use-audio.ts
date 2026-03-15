import { useCallback, useRef } from "react";
import { selectMuted, useGameStore } from "../store/game-store";
import { playSound, type SoundName, stopSound } from "./sound-manager";

export type { SoundName } from "./sound-manager";

interface AudioControls {
	readonly play: (name: SoundName, onEnd?: () => void) => void;
	readonly stop: (name: SoundName) => void;
}

/**
 * React hook for playing game sounds. Respects mute state from game store.
 * Returns stable `play` and `stop` function references (safe for effect dependencies).
 */
export function useAudio(): AudioControls {
	const muted = useGameStore(selectMuted);
	const mutedRef = useRef(muted);
	mutedRef.current = muted;

	const play = useCallback((name: SoundName, onEnd?: () => void): void => {
		if (!mutedRef.current) {
			playSound(name, onEnd);
		} else {
			// When muted, still fire onEnd so sequential chains complete (silently).
			onEnd?.();
		}
	}, []);

	const stop = useCallback((name: SoundName): void => {
		stopSound(name);
	}, []);

	return { play, stop };
}
