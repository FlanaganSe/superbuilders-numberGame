import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, useState } from "react";
import { useAudio } from "../audio/use-audio";
import { getScaffoldReveal } from "../engine/spelling-scaffold";
import { getWordAudioName, MAX_SPELLING_WORDS } from "../engine/spelling-words";
import {
	selectDetectedLetters,
	selectSpellingProblem,
	useGameStore,
} from "../store/game-store";
import type { Problem } from "../types/game";
import { CameraUncertaintyPrompt } from "./CameraUncertaintyPrompt";
import { FeedbackOverlay, type FeedbackState } from "./FeedbackOverlay";
import { GhostTileGuide } from "./GhostTileGuide";
import { hasSeenGuide, markGuideSeen } from "./ghost-tile-storage";
import { ProgressPips } from "./ProgressPips";
import { SpellingWordAudio } from "./SpellingWordAudio";

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
	const cameraUncertain = useGameStore((s) => s.cameraUncertain);
	const roundsCompleted = useGameStore((s) => s.gameState.rounds.length);
	const difficulty = useGameStore((s) => s.gameState.difficulty);
	const spellingProblem = useGameStore(selectSpellingProblem);
	const detectedLetters = useGameStore(selectDetectedLetters);
	const { play } = useAudio();

	const word = spellingProblem?.word ?? problem.displayAnswer;
	const scaffoldCells = getScaffoldReveal(word, attemptNumber);

	// Ghost tile onboarding guide — shows on first-ever scan
	const [showGuide, setShowGuide] = useState(() => !hasSeenGuide());

	// Idle timer for gentle prompt escalation
	const [idleSeconds, setIdleSeconds] = useState(0);

	// Track which word we've auto-played audio for (reset on new word)
	const lastAutoPlayedWordRef = useRef<string>("");

	// Auto-advance after success (3.5s celebration window)
	useEffect(() => {
		if (!stars) return;
		const timer = setTimeout(() => {
			resetCvState();
			dispatch({ type: "NEXT_ROUND" });
		}, 3500);
		return () => clearTimeout(timer);
	}, [stars, dispatch, resetCvState]);

	// ─── Ghost tile guide dismissal ─────────────────────────────────────────
	useEffect(() => {
		if (tileSeen !== null && showGuide) {
			markGuideSeen();
			setShowGuide(false);
		}
	}, [tileSeen, showGuide]);

	// ─── Idle timer ──────────────────────────────────────────────────────────
	const isScanning = !stars && !timedOut;

	useEffect(() => {
		setIdleSeconds(0);
		if (!isScanning || tileSeen !== null) return;
		const interval = setInterval(() => {
			setIdleSeconds((s) => s + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [isScanning, tileSeen]);

	// ─── Sound effects ──────────────────────────────────────────────────────

	useEffect(() => {
		if (stars) play("correctChime");
	}, [stars, play]);

	useEffect(() => {
		if (timedOut) play("encouragement");
	}, [timedOut, play]);

	useEffect(() => {
		if (tileSeen !== null) play("tileDetectedPop");
	}, [tileSeen, play]);

	// Auto-play word audio on scaffold 1 only (once per word).
	// On scaffold 2-3, the replay button is available but no auto-play
	// to avoid jarring repeated audio during rapid timeout→retry cycles.
	useEffect(() => {
		if (stars || timedOut) return;
		if (attemptNumber !== 1) return;
		if (lastAutoPlayedWordRef.current === word) return;
		lastAutoPlayedWordRef.current = word;
		const timer = setTimeout(() => {
			play(getWordAudioName(word));
		}, 300);
		return () => clearTimeout(timer);
	}, [attemptNumber, stars, timedOut, play, word]);

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

	// Auto-retry after timeout (2s for all scaffold transitions —
	// spelling hints are short and aimed at young readers)
	useEffect(() => {
		if (!timedOut) return;
		const timer = setTimeout(() => {
			resetCvState();
			dispatch({ type: "NEXT_ROUND" });
		}, 2000);
		return () => clearTimeout(timer);
	}, [timedOut, dispatch, resetCvState]);

	// ─── Derive feedback state ──────────────────────────────────────────────
	// Note: wrong-tile feedback is intentionally omitted for spelling in this
	// milestone. The progressive encoding redesign changes the interaction
	// model (what does "wrong tile" mean when the word is hidden?). See plan.

	const feedback: FeedbackState = stars
		? { type: "correct", stars, problem, difficulty }
		: timedOut
			? { type: "timeout", problem, attemptNumber, difficulty }
			: tileSeen !== null
				? { type: "tile-seen", answer: tileSeen }
				: null;

	return (
		<div className="flex flex-col items-center gap-6">
			{/* Progress indicator */}
			<ProgressPips current={roundsCompleted} total={MAX_SPELLING_WORDS} />

			{/* "Spell:" label + audio replay button */}
			<div className="flex items-center gap-3">
				<p className="font-body text-2xl text-slate-500">Spell the word:</p>
				<SpellingWordAudio word={word} />
			</div>

			{/* Target word with scaffold-aware letter boxes */}
			<m.div
				key={tileSeen !== null ? `pop-${String(tileSeen)}` : "idle"}
				animate={tileSeen !== null ? { scale: [1, 1.05, 1] } : { scale: 1 }}
				transition={tileSeen !== null ? POP_SPRING : { duration: 0 }}
				className="flex gap-3"
			>
				{scaffoldCells.map((cell, i) => (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: static word, never reorders
						key={i}
						className={
							cell.revealed
								? "flex h-20 w-16 items-center justify-center rounded-xl border-4 border-primary-300 bg-primary-50 font-display text-6xl text-primary-600 shadow-md"
								: "flex h-20 w-16 items-center justify-center rounded-xl border-4 border-dashed border-primary-200 bg-primary-50/50 font-display text-5xl text-primary-300 shadow-sm"
						}
					>
						{cell.revealed ? cell.letter : "?"}
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

			{/* Camera uncertainty prompt — shown when tile was seen but lost */}
			<AnimatePresence>
				{isScanning && cameraUncertain && (
					<CameraUncertaintyPrompt key="camera-uncertainty" />
				)}
			</AnimatePresence>

			{/* Ghost tile onboarding guide — first-scan only */}
			{isScanning && showGuide && !cameraUncertain && tileSeen === null && (
				<GhostTileGuide visible={true} />
			)}

			{/* Answer zone hint — only during scanning with no feedback showing */}
			{isScanning &&
				!showGuide &&
				!cameraUncertain &&
				tileSeen === null &&
				detectedLetters.length === 0 && (
					<div
						className={`rounded-3xl border-4 border-dashed border-primary-400 px-12 py-5 ${
							idleSeconds >= 10 ? "animate-pulse" : "animate-pulse-soft"
						}`}
					>
						<p className="font-body text-2xl text-primary-400/80">
							{idleSeconds >= 15
								? "Try holding a tile up!"
								: "Put your letter tiles here"}
						</p>
					</div>
				)}
		</div>
	);
}
