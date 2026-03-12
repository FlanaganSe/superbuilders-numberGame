import { AdditionMode } from "../engine/problem-generator";
import { useGameStore } from "../store/game-store";

export function TapToStart(): React.JSX.Element {
	const dispatch = useGameStore((s) => s.dispatch);

	function handleStart(): void {
		dispatch({ type: "START_SESSION", mode: AdditionMode });
	}

	return (
		<div className="flex flex-col items-center gap-8">
			<h1 className="font-display text-6xl text-primary-600">Superbuilders</h1>
			<button
				type="button"
				onClick={handleStart}
				className="rounded-2xl bg-primary-500 px-12 py-6 font-display text-4xl text-white shadow-lg active:scale-95"
			>
				Let's Play!
			</button>
		</div>
	);
}
