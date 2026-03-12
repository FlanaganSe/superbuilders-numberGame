import { useMemo } from "react";
import { AdditionMode } from "../engine/problem-generator";
import { recordSession } from "../engine/session";
import { useGameStore } from "../store/game-store";
import type { SessionData } from "../types/game";

interface SessionSummaryProps {
	readonly session: SessionData;
}

export function SessionSummary({
	session,
}: SessionSummaryProps): React.JSX.Element {
	const dispatch = useGameStore((s) => s.dispatch);

	// Record session exactly once, not on every render
	const cumulative = useMemo(() => recordSession(session), [session]);

	function handlePlayAgain(): void {
		dispatch({ type: "RESET" });
		dispatch({ type: "START_SESSION", mode: AdditionMode });
	}

	return (
		<div className="flex flex-col items-center gap-6">
			<h2 className="font-display text-5xl text-primary-600">Amazing work!</h2>

			<div className="flex flex-col items-center gap-2">
				<p className="font-body text-2xl text-slate-600">Stars this session</p>
				<p className="font-display text-6xl text-gold-500">
					{"★".repeat(session.totalStars)}
				</p>
				<p className="font-display text-3xl text-gold-400">
					{session.totalStars}
				</p>
			</div>

			<div className="flex flex-col items-center gap-1">
				<p className="font-body text-lg text-slate-500">
					Total stars collected
				</p>
				<p className="font-display text-2xl text-gold-500">
					{cumulative.totalStars}
				</p>
			</div>

			<p className="font-body text-xl text-slate-500">
				{session.rounds.length} problems completed
			</p>

			<button
				type="button"
				onClick={handlePlayAgain}
				className="rounded-2xl bg-primary-500 px-10 py-5 font-display text-3xl text-white shadow-lg active:scale-95"
			>
				Play Again!
			</button>
		</div>
	);
}
