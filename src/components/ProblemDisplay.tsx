import type { Problem } from "../types/game";

interface ProblemDisplayProps {
	readonly problem: Problem;
	readonly showAnswer?: boolean;
}

export function ProblemDisplay({
	problem,
	showAnswer,
}: ProblemDisplayProps): React.JSX.Element {
	const isMissingAddend = problem.unknownPosition === "right";

	return (
		<div className="flex flex-col items-center gap-2">
			{/* Equation */}
			<div className="flex items-center gap-4 font-display text-7xl text-slate-800">
				<span>{problem.left}</span>
				<span className="text-primary-500">{problem.operator}</span>

				{isMissingAddend ? (
					showAnswer ? (
						<span className="text-success-600">{problem.answer}</span>
					) : (
						<span className="text-8xl text-primary-300">?</span>
					)
				) : (
					<span>{problem.right}</span>
				)}

				<span className="text-primary-500">=</span>

				{isMissingAddend ? (
					<span>{problem.target}</span>
				) : showAnswer ? (
					<span className="text-success-600">{problem.answer}</span>
				) : (
					<span className="text-8xl text-primary-300">?</span>
				)}
			</div>

			{/* Math language prompt — only during problem-solving, not when showing answer */}
			{!showAnswer && problem.answer >= 0 && (
				<p className="font-body text-xl text-slate-400">
					{isMissingAddend
						? problem.target === 10
							? "How many more to make ten?"
							: "What's the missing part?"
						: problem.operator === "+"
							? "How many altogether?"
							: "How many are left?"}
				</p>
			)}
		</div>
	);
}
