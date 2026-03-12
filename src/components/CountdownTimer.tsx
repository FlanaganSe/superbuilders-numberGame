import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef } from "react";
import { useGameStore } from "../store/game-store";

interface CountdownTimerProps {
	readonly secondsLeft: number;
}

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

	useEffect(() => {
		intervalRef.current = setInterval(() => {
			const currentPhase = useGameStore.getState().gameState.phase;
			if (currentPhase.phase !== "countdown") {
				if (intervalRef.current) clearInterval(intervalRef.current);
				return;
			}

			const next = currentPhase.secondsLeft - 1;
			if (next <= 0) {
				if (intervalRef.current) clearInterval(intervalRef.current);
				const problem = mode.generate(difficulty);
				dispatch({ type: "COUNTDOWN_COMPLETE", problem });
			} else {
				dispatch({ type: "COUNTDOWN_TICK", secondsLeft: next });
			}
		}, 1000);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [dispatch, mode, difficulty]);

	return (
		<div className="flex flex-col items-center gap-4">
			<p className="font-body text-3xl text-slate-600">Get ready!</p>
			<AnimatePresence mode="wait">
				<m.span
					key={secondsLeft}
					className="inline-block font-display text-9xl text-primary-500"
					initial={{ scale: 0, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					exit={{ scale: 0.5, opacity: 0 }}
					transition={COUNTDOWN_SPRING}
				>
					{secondsLeft}
				</m.span>
			</AnimatePresence>
		</div>
	);
}
