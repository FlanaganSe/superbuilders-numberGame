import * as m from "motion/react-m";
import { useEffect } from "react";
import { useAudio } from "../audio/use-audio";
import { MAX_SPELLING_WORDS } from "../engine/spelling-words";
import {
	selectDetectedLetters,
	selectSpellingProblem,
	useGameStore,
} from "../store/game-store";
import type { Problem } from "../types/game";
import { FeedbackOverlay, type FeedbackState } from "./FeedbackOverlay";
import { ProgressPips } from "./ProgressPips";

// ─── Spring config ──────────────────────────────────────────────────────────

const POP_SPRING = {
	type: "spring" as const,
	stiffness: 400,
	damping: 10,
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface SpellingScreenProps {
	readonly problem: Problem;
	readonly attemptNumber: number;
	readonly stars?: 1 | 2 | 3;
	readonly timedOut?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SpellingScreen({
	problem,
	attemptNumber,
	stars,
	timedOut,
}: SpellingScreenProps): React.JSX.Element {
	const dispatch = useGameStore((s) => s.dispatch);
	const resetCvState = useGameStore((s) => s.resetCvState);
	const tileSeen = useGameStore((s) => s.tileSeen);
	const roundsCompleted = useGameStore((s) => s.gameState.rounds.length);
	const difficulty = useGameStore((s) => s.gameState.difficulty);
	const spellingProblem = useGameStore(selectSpellingProblem);
	const detectedLetters = useGameStore(selectDetectedLetters);
	const { play } = useAudio();

	const word = spellingProblem?.word ?? problem.displayAnswer;

	// Auto-advance after success (3.5s celebration window)
	useEffect(() => {
		if (!stars) return;
		const timer = setTimeout(() => {
			resetCvState();
			dispatch({ type: "NEXT_ROUND" });
		}, 3500);
		return () => clearTimeout(timer);
	}, [stars, dispatch, resetCvState]);

	// Sound effects
	useEffect(() => {
		if (stars) play("correctChime");
	}, [stars, play]);

	useEffect(() => {
		if (timedOut) play("encouragement");
	}, [timedOut, play]);

	useEffect(() => {
		if (tileSeen !== null) play("tileDetectedPop");
	}, [tileSeen, play]);

	// Timeout handling — 45s for spelling (more tiles to place)
	useEffect(() => {
		if (timedOut || stars) return;
		const phase = useGameStore.getState().gameState.phase;
		if (phase.phase !== "scanning") return;

		const timer = setTimeout(() => {
			dispatch({ type: "ROUND_TIMEOUT" });
		}, 45_000);
		return () => clearTimeout(timer);
	}, [timedOut, stars, dispatch]);

	// Auto-retry after timeout
	useEffect(() => {
		if (!timedOut) return;
		const timer = setTimeout(() => {
			resetCvState();
			dispatch({ type: "NEXT_ROUND" });
		}, 2000);
		return () => clearTimeout(timer);
	}, [timedOut, dispatch, resetCvState]);

	// ─── Derive feedback state ──────────────────────────────────────────────

	const feedback: FeedbackState = stars
		? { type: "correct", stars, problem, difficulty }
		: timedOut
			? { type: "timeout", problem, attemptNumber, difficulty }
			: tileSeen !== null
				? { type: "tile-seen", answer: tileSeen }
				: null;

	const isScanning = !stars && !timedOut;

	return (
		<div className="flex flex-col items-center gap-6">
			{/* Progress indicator */}
			<ProgressPips current={roundsCompleted} total={MAX_SPELLING_WORDS} />

			{/* "Spell:" label */}
			<p className="font-body text-2xl text-slate-500">Spell the word:</p>

			{/* Target word with letter boxes */}
			<m.div
				key={tileSeen !== null ? `pop-${String(tileSeen)}` : "idle"}
				animate={tileSeen !== null ? { scale: [1, 1.05, 1] } : { scale: 1 }}
				transition={tileSeen !== null ? POP_SPRING : { duration: 0 }}
				className="flex gap-3"
			>
				{word.split("").map((letter, i) => (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: static word, never reorders
						key={i}
						className="flex h-20 w-16 items-center justify-center rounded-xl border-4 border-primary-300 bg-primary-50 font-display text-6xl text-primary-600 shadow-md"
					>
						{letter}
					</span>
				))}
			</m.div>

			{/* Detected letters (what the camera sees) */}
			{isScanning && detectedLetters.length > 0 && (
				<div className="flex gap-2">
					<span className="font-body text-xl text-slate-400">Camera sees:</span>
					{detectedLetters.map((letter, i) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: transient detection array
							key={i}
							className="font-display text-2xl text-success-500"
						>
							{letter}
						</span>
					))}
				</div>
			)}

			{/* Feedback overlay */}
			<FeedbackOverlay feedback={feedback} />

			{/* Hint text when no tiles detected */}
			{isScanning && tileSeen === null && detectedLetters.length === 0 && (
				<div className="animate-pulse-soft rounded-3xl border-4 border-dashed border-teal-400 px-12 py-5">
					<p className="font-body text-2xl text-teal-400/80">
						Put your letter tiles here
					</p>
				</div>
			)}
		</div>
	);
}
