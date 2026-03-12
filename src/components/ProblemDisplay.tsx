import type { Problem } from "../types/game";

interface ProblemDisplayProps {
	readonly problem: Problem;
}

export function ProblemDisplay({
	problem,
}: ProblemDisplayProps): React.JSX.Element {
	return (
		<div className="flex items-center gap-4 font-display text-7xl text-slate-800">
			<span>{problem.left}</span>
			<span className="text-primary-500">{problem.operator}</span>
			<span>{problem.right}</span>
			<span className="text-primary-500">=</span>
			<span className="text-slate-400">?</span>
		</div>
	);
}
