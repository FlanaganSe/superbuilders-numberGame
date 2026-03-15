interface ProgressPipsProps {
	readonly current: number;
	readonly total: number;
	readonly roundStars?: readonly (1 | 2 | 3)[];
}

function pipColor(
	index: number,
	current: number,
	roundStars: readonly (1 | 2 | 3)[] | undefined,
): string {
	if (index >= current) return "bg-primary-200";
	const stars = roundStars?.[index];
	if (stars === 3) return "bg-success-500";
	if (stars === 2) return "bg-amber-400";
	return "bg-orange-400";
}

export function ProgressPips({
	current,
	total,
	roundStars,
}: ProgressPipsProps): React.JSX.Element {
	return (
		<div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5">
			{Array.from({ length: total }, (_, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: static fixed-length list, never reorders
					key={i}
					className={`h-2.5 w-2.5 rounded-full ${pipColor(i, current, roundStars)}`}
				/>
			))}
		</div>
	);
}
