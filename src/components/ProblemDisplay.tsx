import type { Problem } from "../types/game";

interface ProblemDisplayProps {
	readonly problem: Problem;
	readonly showAnswer?: boolean;
}

export function ProblemDisplay({
	problem,
	showAnswer,
}: ProblemDisplayProps): React.JSX.Element {
	return (
		<div className="flex items-center gap-4 font-display text-7xl text-slate-800">
			<span>{problem.left}</span>
			<span className="text-primary-500">{problem.operator}</span>
			<span>{problem.right}</span>
			<span className="text-primary-500">=</span>
			{showAnswer ? (
				<span className="text-success-600">{problem.answer}</span>
			) : (
				<span className="text-8xl text-primary-300">?</span>
			)}
		</div>
	);
}
