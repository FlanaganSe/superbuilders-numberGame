import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SoundName } from "../audio/use-audio";
import { useAudio } from "../audio/use-audio";
import {
	createMockDetection,
	createMockDetectionPair,
} from "../cv/mock-recognition";
import { MAX_PROBLEMS } from "../engine/game-reducer";
import { useGameStore } from "../store/game-store";
import type { Digit } from "../types/cv";
import type { Problem } from "../types/game";
import { getFeatureFlags } from "../utils/feature-flags";
import { CameraUncertaintyPrompt } from "./CameraUncertaintyPrompt";
import { FeedbackOverlay, type FeedbackState } from "./FeedbackOverlay";
import { MockNumpad } from "./MockNumpad";
import { ProblemDisplay } from "./ProblemDisplay";
import { ProgressPips } from "./ProgressPips";

// ─── Prompt sound helper ─────────────────────────────────────────────────────
// Mirrors ProblemDisplay.tsx text prompt logic (lines 45-51) exactly.

function getPromptSound(problem: Problem): SoundName | null {
	if (problem.unknownPosition === "right") {
		return problem.target === 10 ? "promptMakeTen" : "promptMissing";
	}
	if (problem.operator === "+") return "promptAltogether";
	if (problem.operator === "-") return "promptLeft";
	return null;
}

// ─── Spring config for tile-detected pop (research §3.3) ───────────────────

const POP_SPRING = {
	type: "spring" as const,
	stiffness: 400,
	damping: 10,
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface GameScreenProps {
	readonly problem: Problem;
	readonly attemptNumber: number;
	readonly stars?: 1 | 2 | 3;
	readonly timedOut?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GameScreen({
	problem,
	attemptNumber,
	stars,
	timedOut,
}: GameScreenProps): React.JSX.Element {
	const dispatch = useGameStore((s) => s.dispatch);
	const processDetections = useGameStore((s) => s.processDetections);
	const resetCvState = useGameStore((s) => s.resetCvState);
	const tileSeen = useGameStore((s) => s.tileSeen);
	const cameraUncertain = useGameStore((s) => s.cameraUncertain);
	const wrongTileSeen = useGameStore((s) => s.wrongTileSeen);
	const roundsCompleted = useGameStore((s) => s.gameState.rounds.length);
	const difficulty = useGameStore((s) => s.gameState.difficulty);
	const modeName = useGameStore((s) => s.gameState.modeName);
	const flags = getFeatureFlags();
	const { play } = useAudio();

	// Track difficulty promotions — show "Level Up!", hide demotions (math anxiety research)
	const prevDifficultyRef = useRef(difficulty);
	const [showLevelUp, setShowLevelUp] = useState(false);

	useEffect(() => {
		if (difficulty > prevDifficultyRef.current) {
			prevDifficultyRef.current = difficulty;
			setShowLevelUp(true);
			const timer = setTimeout(() => setShowLevelUp(false), 1500);
			return () => clearTimeout(timer);
		}
		// Demotion: invisible — no feedback
		prevDifficultyRef.current = difficulty;
	}, [difficulty]);

	const handleDigit = useCallback(
		(digit: Digit): void => {
			const phase = useGameStore.getState().gameState.phase;
			if (phase.phase !== "scanning") return;

			const answer = phase.problem.answer;
			const answerStr = answer.toString();

			if (answerStr.length === 1) {
				processDetections([createMockDetection(digit)]);
			} else if (answerStr.length === 2) {
				const tens = Math.floor(answer / 10) as Digit;
				const ones = (answer % 10) as Digit;
				if (digit === tens) {
					processDetections([...createMockDetectionPair(tens, ones)]);
				} else {
					processDetections([createMockDetection(digit)]);
				}
			}
		},
		[processDetections],
	);

	// Keyboard listener for digits 0-9
	useEffect(() => {
		if (flags.recognition !== "mock") return;

		function onKeyDown(e: KeyboardEvent): void {
			const digit = Number.parseInt(e.key, 10);
			if (!Number.isNaN(digit) && digit >= 0 && digit <= 9) {
				handleDigit(digit as Digit);
			}
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handleDigit, flags.recognition]);

	// Auto-advance after success (3.5s celebration window — CV is paused
	// because frame handler in App.tsx gates on phase !== "scanning")
	useEffect(() => {
		if (!stars) return;
		const timer = setTimeout(() => {
			resetCvState();
			dispatch({ type: "NEXT_ROUND" });
		}, 3500);
		return () => clearTimeout(timer);
	}, [stars, dispatch, resetCvState]);

	// ─── Sound effects ──────────────────────────────────────────────────────

	// Correct answer → number word then chime (Mayer dual coding)
	useEffect(() => {
		if (!stars) return;

		const hasNumberWord = problem.answer >= 0 && problem.answer <= 9;

		if (hasNumberWord) {
			play(`number${problem.answer}` as SoundName);
			// Delay chime so the number word is heard clearly first
			const timer = setTimeout(() => play("correctChime"), 500);
			return () => clearTimeout(timer);
		}

		play("correctChime");
	}, [stars, play, problem.answer]);

	// Timeout → encouragement
	useEffect(() => {
		if (timedOut) play("encouragement");
	}, [timedOut, play]);

	// Tile first detected → pop
	useEffect(() => {
		if (tileSeen !== null) play("tileDetectedPop");
	}, [tileSeen, play]);

	// Math language prompt audio — plays once when a new problem appears
	// (Mayer temporal contiguity + Purpura math vocabulary).
	// Ref guards against replay on timeout retry (same problem object).
	const lastPromptedProblemRef = useRef<Problem | null>(null);

	useEffect(() => {
		if (stars || timedOut) return;
		if (problem.answer < 0) return;
		if (problem === lastPromptedProblemRef.current) return;

		const promptSound = getPromptSound(problem);
		if (promptSound) {
			lastPromptedProblemRef.current = problem;
			const timer = setTimeout(() => {
				play(promptSound);
			}, 400);
			return () => clearTimeout(timer);
		}
	}, [problem, stars, timedOut, play]);

	// Timeout handling — `stars` in deps ensures the timer is cancelled when
	// a correct answer arrives (otherwise the old 30s timer survives into the
	// next round's scanning phase and fires a phantom ROUND_TIMEOUT).
	useEffect(() => {
		if (timedOut || stars) return;
		const phase = useGameStore.getState().gameState.phase;
		if (phase.phase !== "scanning") return;

		const timer = setTimeout(() => {
			dispatch({ type: "ROUND_TIMEOUT" });
		}, 30_000);
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
	// Priority: correct > timeout > tile-seen > wrong-tile.
	// correct/timeout are phase-level (mutually exclusive with scanning).
	// tile-seen means CORRECT answer detected — always takes priority.
	// wrong-tile means a wrong answer stabilized for 2+ frames.

	const feedback: FeedbackState = stars
		? { type: "correct", stars, problem, difficulty }
		: timedOut
			? { type: "timeout", problem, attemptNumber, difficulty }
			: tileSeen !== null
				? { type: "tile-seen", answer: tileSeen }
				: wrongTileSeen !== null
					? {
							type: "wrong-tile",
							wrongValue: wrongTileSeen,
							expectedValue: problem.answer,
							targetConfusion:
								problem.unknownPosition === "right" &&
								wrongTileSeen === problem.target,
						}
					: null;

	const isScanning = !stars && !timedOut;

	return (
		<div className="flex flex-col items-center gap-6">
			{/* Progress + mode + difficulty */}
			<div className="flex items-center gap-3">
				<span className="font-body text-sm text-white/70">{modeName}</span>
				<ProgressPips current={roundsCompleted} total={MAX_PROBLEMS} />
				<span className="rounded-full bg-black/20 px-2.5 py-1 font-body text-sm text-white">
					Level {difficulty}
				</span>
			</div>

			{/* Level Up! indicator — only on promotion, never demotion */}
			<AnimatePresence>
				{showLevelUp && (
					<m.p
						key="level-up"
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: [0.8, 1.15, 1] }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.4 }}
						className="font-display text-2xl text-gold-500"
					>
						Level Up!
					</m.p>
				)}
			</AnimatePresence>

			{/* Problem display with tile-detected pop animation */}
			<m.div
				key={tileSeen !== null ? `pop-${tileSeen}` : "idle"}
				animate={tileSeen !== null ? { scale: [1, 1.05, 1] } : { scale: 1 }}
				transition={tileSeen !== null ? POP_SPRING : { duration: 0 }}
			>
				<ProblemDisplay problem={problem} showAnswer={!!stars} />
			</m.div>

			{/* Feedback overlay: correct / timeout / tile-seen */}
			<FeedbackOverlay feedback={feedback} />

			{/* Camera uncertainty prompt — shown when tile was seen but lost */}
			<AnimatePresence>
				{isScanning && cameraUncertain && (
					<CameraUncertaintyPrompt key="camera-uncertainty" />
				)}
			</AnimatePresence>

			{/* Answer zone hint — only during scanning with no feedback showing */}
			{isScanning &&
				!cameraUncertain &&
				tileSeen === null &&
				wrongTileSeen === null && (
					<div className="animate-pulse-soft rounded-3xl border-4 border-dashed border-primary-400 px-12 py-5">
						<p className="font-body text-2xl text-primary-400/80">
							Put your answer here
						</p>
					</div>
				)}

			{/* Mock numpad — only during scanning */}
			{flags.recognition === "mock" && isScanning && (
				<MockNumpad onDigit={handleDigit} />
			)}
		</div>
	);
}
