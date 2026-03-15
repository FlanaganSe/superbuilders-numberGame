import * as m from "motion/react-m";
import { useEffect, useRef } from "react";
import { useAudio } from "../audio/use-audio";
import { generateSpellingProblem } from "../engine/spelling-words";
import { useGameStore } from "../store/game-store";
import type { Problem } from "../types/game";

interface CountdownTimerProps {
	readonly secondsLeft: number;
}

const COUNTDOWN_COLORS: Record<number, string> = {
	3: "text-primary-300",
	2: "text-orange-300",
	1: "text-red-400",
} as const;

const COUNTDOWN_SPRING = {
	type: "spring" as const,
	stiffness: 300,
	damping: 20,
};

export function CountdownTimer({
	secondsLeft,
}: CountdownTimerProps): React.JSX.Element {
	const dispatch = useGameStore((s) => s.dispatch);
	const mode = useGameStore((s) => s.mode);
	const difficulty = useGameStore((s) => s.gameState.difficulty);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const { play, stop } = useAudio();

	useEffect(() => {
		play("countdownTick");

		intervalRef.current = setInterval(() => {
			const currentPhase = useGameStore.getState().gameState.phase;
			if (currentPhase.phase !== "countdown") {
				if (intervalRef.current) clearInterval(intervalRef.current);
				return;
			}

			const next = currentPhase.secondsLeft - 1;
			if (next <= 0) {
				if (intervalRef.current) clearInterval(intervalRef.current);
				stop("countdownTick");

				const currentGameKind = useGameStore.getState().gameKind;
				if (currentGameKind === "spelling") {
					// Generate a spelling problem and store it
					const usedWords = useGameStore.getState().spellingWordsUsed;
					const sp = generateSpellingProblem(usedWords);
					useGameStore.getState().setSpellingProblem(sp);

					// Create a stub Problem for the reducer — spelling matching
					// is handled separately in processDetections
					const problem: Problem = {
						left: 0,
						right: 0,
						operator: "+",
						answer: -1,
						displayAnswer: sp.word,
					};
					dispatch({ type: "COUNTDOWN_COMPLETE", problem });
				} else {
					const problem = mode.generate(difficulty);
					dispatch({ type: "COUNTDOWN_COMPLETE", problem });
				}
			} else {
				dispatch({ type: "COUNTDOWN_TICK", secondsLeft: next });
			}
		}, 1000);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
			stop("countdownTick");
		};
	}, [dispatch, mode, difficulty, play, stop]);

	return (
		<div className="flex flex-col items-center gap-4 rounded-3xl bg-black/55 px-10 py-8">
			<p className="font-body text-3xl text-white">Get ready!</p>
			<m.span
				key={secondsLeft}
				className={`inline-block font-display text-9xl ${COUNTDOWN_COLORS[secondsLeft] ?? "text-primary-500"}`}
				initial={{ scale: 0, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={COUNTDOWN_SPRING}
			>
				{secondsLeft}
			</m.span>
		</div>
	);
}
