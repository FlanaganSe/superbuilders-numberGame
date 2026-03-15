import { getMathPrompt } from "../engine/math-vocabulary";
import type { DifficultyLevel, Problem } from "../types/game";
import { NumberBond } from "./NumberBond";

interface ProblemDisplayProps {
	readonly problem: Problem;
	readonly showAnswer?: boolean;
	readonly roundIndex?: number;
	readonly difficulty?: DifficultyLevel;
}

export function ProblemDisplay({
	problem,
	showAnswer,
	roundIndex = 0,
	difficulty,
}: ProblemDisplayProps): React.JSX.Element {
	const isMissingAddend = problem.unknownPosition === "right";

	return (
		<div className="flex flex-col items-center gap-2">
			{/* Equation */}
			<div className="flex items-center gap-4 font-display text-7xl text-white">
				<span>{problem.left}</span>
				<span className="text-primary-300">{problem.operator}</span>

				{isMissingAddend ? (
					showAnswer ? (
						<span className="text-success-400">{problem.answer}</span>
					) : (
						<span className="text-8xl text-primary-300">?</span>
					)
				) : (
					<span>{problem.right}</span>
				)}

				<span className="text-primary-300">=</span>

				{isMissingAddend ? (
					<span>{problem.target}</span>
				) : showAnswer ? (
					<span className="text-success-400">{problem.answer}</span>
				) : (
					<span className="text-8xl text-primary-300">?</span>
				)}
			</div>

			{/* Math language prompt — rotated synonyms (Purpura et al. 2020) */}
			{!showAnswer && problem.answer >= 0 && (
				<p className="font-body text-xl text-slate-300">
					{getMathPrompt(
						problem.operator,
						problem.unknownPosition,
						problem.target,
						roundIndex,
					)}
				</p>
			)}

			{/* Number bond scaffold — part-whole visual (Marx et al. 2025) */}
			{!showAnswer &&
				isMissingAddend &&
				problem.target !== undefined &&
				(difficulty ?? 1) <= 3 && (
					<NumberBond
						whole={problem.target}
						knownPart={problem.left}
						unknownPart={problem.answer}
						showUnknown={false}
					/>
				)}
		</div>
	);
}
