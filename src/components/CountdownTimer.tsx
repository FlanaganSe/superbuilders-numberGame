import { useEffect, useRef } from "react";
import { useGameStore } from "../store/game-store";

interface CountdownTimerProps {
	readonly secondsLeft: number;
}

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
			<p className="font-body text-2xl text-slate-600">Get ready!</p>
			<span className="font-display text-9xl text-primary-500">
				{secondsLeft}
			</span>
		</div>
	);
}
