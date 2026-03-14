import * as m from "motion/react-m";
import { unlockAudio } from "../audio/sound-manager";
import type { CameraError } from "../camera/use-camera";
import {
	AdditionMode,
	Make10Mode,
	MissingAddendMode,
	SubtractionMode,
} from "../engine/problem-generator";
import { MAX_SPELLING_WORDS } from "../engine/spelling-words";
import { useWakeLock } from "../hooks/use-wake-lock";
import { useGameStore } from "../store/game-store";
import { getFeatureFlags } from "../utils/feature-flags";

const GENTLE_SPRING = { type: "spring", stiffness: 300, damping: 20 } as const;

interface TapToStartProps {
	readonly requestCamera: () => Promise<void>;
	readonly cameraError: CameraError | null;
}

export function TapToStart({
	requestCamera,
	cameraError,
}: TapToStartProps): React.JSX.Element {
	const dispatch = useGameStore((s) => s.dispatch);
	const setMode = useGameStore((s) => s.setMode);
	const setGameKind = useGameStore((s) => s.setGameKind);
	const flags = getFeatureFlags();
	const { acquire } = useWakeLock();

	function startMathSession(
		modeName: "Addition" | "Subtraction" | "Missing Part" | "Make 10",
	): void {
		// AudioContext unlock MUST happen in user gesture (research §4.2).
		// Camera unlock MUST happen in the same user gesture handler (PRD §5.5).
		// One tap does both: (a) unlock AudioContext, (b) unlock camera, (c) wake lock, (d) start game.
		unlockAudio();
		acquire();

		if (flags.recognition !== "mock") {
			requestCamera();
		}

		setGameKind("math");
		dispatch({ type: "START_SESSION", modeName });
	}

	function handleStart(): void {
		setMode(AdditionMode);
		startMathSession("Addition");
	}

	function handleSubtractionStart(): void {
		setMode(SubtractionMode);
		startMathSession("Subtraction");
	}

	function handleMissingPartStart(): void {
		setMode(MissingAddendMode);
		startMathSession("Missing Part");
	}

	function handleMake10Start(): void {
		setMode(Make10Mode);
		startMathSession("Make 10");
	}

	function handleSpellingStart(): void {
		unlockAudio();
		acquire();

		if (flags.recognition !== "mock") {
			requestCamera();
		}

		setGameKind("spelling");
		dispatch({
			type: "START_SESSION",
			maxProblems: MAX_SPELLING_WORDS,
			modeName: "Spelling",
		});
	}

	return (
		<div className="flex flex-col items-center gap-8">
			<m.h1
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={GENTLE_SPRING}
				className="font-display text-7xl text-primary-600 drop-shadow-sm"
			>
				Superbuilders
			</m.h1>

			{cameraError && (
				<p className="max-w-sm text-center font-body text-2xl text-amber-600">
					{cameraError.message}
				</p>
			)}

			<m.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2, ...GENTLE_SPRING }}
				className="grid grid-cols-2 gap-4"
			>
				<m.button
					type="button"
					onClick={handleStart}
					whileTap={{
						scale: 0.95,
						transition: { type: "spring", stiffness: 400, damping: 17 },
					}}
					className="min-h-20 rounded-3xl bg-primary-500 px-14 py-6 font-display text-4xl text-white shadow-xl"
				>
					Addition
				</m.button>
				<m.button
					type="button"
					onClick={handleSubtractionStart}
					whileTap={{
						scale: 0.95,
						transition: { type: "spring", stiffness: 400, damping: 17 },
					}}
					className="min-h-20 rounded-3xl bg-orange-500 px-14 py-6 font-display text-4xl text-white shadow-xl"
				>
					Subtraction
				</m.button>
				<m.button
					type="button"
					onClick={handleMissingPartStart}
					whileTap={{
						scale: 0.95,
						transition: { type: "spring", stiffness: 400, damping: 17 },
					}}
					className="min-h-20 rounded-3xl bg-violet-500 px-14 py-6 font-display text-4xl text-white shadow-xl"
				>
					Missing Part
				</m.button>
				<m.button
					type="button"
					onClick={handleMake10Start}
					whileTap={{
						scale: 0.95,
						transition: { type: "spring", stiffness: 400, damping: 17 },
					}}
					className="min-h-20 rounded-3xl bg-emerald-500 px-14 py-6 font-display text-4xl text-white shadow-xl"
				>
					Make 10
				</m.button>
			</m.div>

			<m.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.4, ...GENTLE_SPRING }}
				className="flex gap-4"
			>
				<m.button
					type="button"
					onClick={handleSpellingStart}
					whileTap={{
						scale: 0.95,
						transition: {
							type: "spring",
							stiffness: 400,
							damping: 17,
						},
					}}
					className="rounded-2xl bg-teal-500 px-6 py-3 font-display text-xl text-white shadow-lg"
				>
					Spelling
					<span className="block font-body text-sm">
						{MAX_SPELLING_WORDS} words
					</span>
				</m.button>
				<button
					type="button"
					disabled
					className="rounded-2xl bg-slate-200 px-6 py-3 font-display text-xl text-slate-400 opacity-60"
				>
					Image Quiz
					<span className="block font-body text-sm">Coming Soon</span>
				</button>
			</m.div>
		</div>
	);
}
