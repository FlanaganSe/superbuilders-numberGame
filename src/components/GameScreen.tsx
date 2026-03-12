import * as m from "motion/react-m";
import { useCallback, useEffect } from "react";
import { useAudio } from "../audio/use-audio";
import {
	createMockDetection,
	createMockDetectionPair,
} from "../cv/mock-recognition";
import { useGameStore } from "../store/game-store";
import type { Problem } from "../types/game";
import { getFeatureFlags } from "../utils/feature-flags";
import { FeedbackOverlay, type FeedbackState } from "./FeedbackOverlay";
import { MockNumpad } from "./MockNumpad";
import { ProblemDisplay } from "./ProblemDisplay";

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
	attemptNumber: _attemptNumber,
	stars,
	timedOut,
}: GameScreenProps): React.JSX.Element {
	const dispatch = useGameStore((s) => s.dispatch);
	const processDetections = useGameStore((s) => s.processDetections);
	const resetCvState = useGameStore((s) => s.resetCvState);
	const tileSeen = useGameStore((s) => s.tileSeen);
	const flags = getFeatureFlags();
	const { play } = useAudio();

	const handleDigit = useCallback(
		(digit: number): void => {
			const phase = useGameStore.getState().gameState.phase;
			if (phase.phase !== "scanning") return;

			const answer = phase.problem.answer;
			const answerStr = answer.toString();

			if (answerStr.length === 1) {
				processDetections([createMockDetection(digit)]);
			} else if (answerStr.length === 2) {
				const tens = Math.floor(answer / 10);
				const ones = answer % 10;
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
				handleDigit(digit);
			}
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handleDigit, flags.recognition]);

	// Auto-advance after success (1.5s celebration window — CV is paused
	// because frame handler in App.tsx gates on phase !== "scanning")
	useEffect(() => {
		if (!stars) return;
		const mode = useGameStore.getState().mode;
		const difficulty = useGameStore.getState().gameState.difficulty;
		const timer = setTimeout(() => {
			resetCvState();
			const nextProblem = mode.generate(difficulty);
			dispatch({ type: "NEXT_ROUND", problem: nextProblem });
		}, 1500);
		return () => clearTimeout(timer);
	}, [stars, dispatch, resetCvState]);

	// ─── Sound effects ──────────────────────────────────────────────────────

	// Correct answer → chime
	useEffect(() => {
		if (stars) play("correctChime");
	}, [stars, play]);

	// Timeout → encouragement
	useEffect(() => {
		if (timedOut) play("encouragement");
	}, [timedOut, play]);

	// Tile first detected → pop
	useEffect(() => {
		if (tileSeen !== null) play("tileDetectedPop");
	}, [tileSeen, play]);

	// Timeout handling
	useEffect(() => {
		if (timedOut) return;
		const phase = useGameStore.getState().gameState.phase;
		if (phase.phase !== "scanning") return;

		const timer = setTimeout(() => {
			dispatch({ type: "ROUND_TIMEOUT" });
		}, 30_000);
		return () => clearTimeout(timer);
	}, [timedOut, dispatch]);

	// Auto-retry after timeout
	useEffect(() => {
		if (!timedOut) return;
		const timer = setTimeout(() => {
			resetCvState();
			dispatch({ type: "NEXT_ROUND", problem });
		}, 2000);
		return () => clearTimeout(timer);
	}, [timedOut, dispatch, problem, resetCvState]);

	// ─── Derive feedback state ──────────────────────────────────────────────
	// Priority: correct > timeout > tile-seen.
	// This is guaranteed by game phases: stars/timedOut are mutually exclusive
	// (set by phase router in App.tsx), and tileSeen is only set during scanning.
	// FeedbackOverlay's AnimatePresence depends on this mutual exclusivity.

	const feedback: FeedbackState = stars
		? { type: "correct", stars }
		: timedOut
			? { type: "timeout", problem }
			: tileSeen !== null
				? { type: "tile-seen", answer: tileSeen }
				: null;

	const isScanning = !stars && !timedOut;

	return (
		<div className="flex flex-col items-center gap-6">
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

			{/* Answer zone hint — only during scanning with no tile detected */}
			{isScanning && tileSeen === null && (
				<div className="animate-pulse-soft rounded-3xl border-4 border-dashed border-primary-300/50 px-12 py-5">
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
