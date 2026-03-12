import { useCallback, useEffect } from "react";
import {
	createMockDetection,
	createMockDetectionPair,
} from "../cv/mock-recognition";
import { useGameStore } from "../store/game-store";
import type { Problem } from "../types/game";
import { getFeatureFlags } from "../utils/feature-flags";
import { MockNumpad } from "./MockNumpad";
import { ProblemDisplay } from "./ProblemDisplay";

interface GameScreenProps {
	readonly problem: Problem;
	readonly attemptNumber: number;
	readonly stars?: 1 | 2 | 3;
	readonly timedOut?: boolean;
}

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

	const handleDigit = useCallback(
		(digit: number): void => {
			const phase = useGameStore.getState().gameState.phase;
			if (phase.phase !== "scanning") return;

			const answer = phase.problem.answer;
			const answerStr = answer.toString();

			if (answerStr.length === 1) {
				processDetections([createMockDetection(digit)]);
			} else if (answerStr.length === 2) {
				// For two-digit answers, if the user presses the tens digit,
				// wait for ones. For simplicity in mock mode, if the full
				// number is typed we simulate the pair.
				const tens = Math.floor(answer / 10);
				const ones = answer % 10;
				if (digit === tens) {
					// User typed tens digit — emit pair (assume ones follows)
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

	// Auto-advance after success
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

	return (
		<div className="flex flex-col items-center gap-8">
			<ProblemDisplay problem={problem} />

			{tileSeen !== null && !stars && !timedOut && (
				<p className="font-body text-2xl text-primary-400">I see a tile!</p>
			)}

			{stars && (
				<div className="flex flex-col items-center gap-2">
					<p className="font-body text-3xl text-success-600">Great job!</p>
					<p className="font-display text-4xl text-gold-500">
						{"★".repeat(stars)}
					</p>
				</div>
			)}

			{timedOut && (
				<div className="flex flex-col items-center gap-2">
					<p className="font-body text-2xl text-primary-400">
						The answer is {problem.answer}. Let's try again!
					</p>
				</div>
			)}

			{flags.recognition === "mock" && !stars && !timedOut && (
				<MockNumpad onDigit={handleDigit} />
			)}
		</div>
	);
}
