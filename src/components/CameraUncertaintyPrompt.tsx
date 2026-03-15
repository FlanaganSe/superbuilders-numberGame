import * as m from "motion/react-m";
import { getUncertaintyPrompt } from "../engine/camera-uncertainty";
import { useGameStore } from "../store/game-store";

/**
 * Gentle system-attribution prompt shown when the camera loses sight of
 * a tile that was previously detected. Blames the camera, not the child.
 *
 * Mounted/unmounted by GameScreen inside AnimatePresence so exit
 * animations work correctly. This component only renders content.
 *
 * Research: math anxiety at kindergarten (Frontiers 2024).
 */
export function CameraUncertaintyPrompt(): React.JSX.Element {
	const missStreak = useGameStore((s) => s.cameraMissStreak);
	const prompt = getUncertaintyPrompt(missStreak);

	return (
		<m.p
			className="font-body text-2xl text-slate-300"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.3 }}
		>
			{prompt}
		</m.p>
	);
}
