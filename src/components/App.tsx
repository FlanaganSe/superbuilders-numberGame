import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { selectGamePhase, useGameStore } from "../store/game-store";
import { CountdownTimer } from "./CountdownTimer";
import { GameScreen } from "./GameScreen";
import { SessionSummary } from "./SessionSummary";
import { TapToStart } from "./TapToStart";

export function App(): React.JSX.Element {
	const phase = useGameStore(selectGamePhase);

	return (
		<LazyMotion features={domAnimation}>
			<MotionConfig reducedMotion="user">
				<div className="flex min-h-dvh items-center justify-center">
					<PhaseRouter phase={phase} />
				</div>
			</MotionConfig>
		</LazyMotion>
	);
}

function PhaseRouter({
	phase,
}: {
	readonly phase: ReturnType<typeof selectGamePhase>;
}): React.JSX.Element {
	switch (phase.phase) {
		case "idle":
			return <TapToStart />;
		case "countdown":
			return <CountdownTimer secondsLeft={phase.secondsLeft} />;
		case "scanning":
			return (
				<GameScreen
					problem={phase.problem}
					attemptNumber={phase.attemptNumber}
				/>
			);
		case "success":
			return (
				<GameScreen
					problem={phase.problem}
					attemptNumber={1}
					stars={phase.stars}
				/>
			);
		case "timeout":
			return (
				<GameScreen
					problem={phase.problem}
					attemptNumber={phase.attemptNumber}
					timedOut
				/>
			);
		case "session-end":
			return <SessionSummary session={phase.session} />;
	}
}
