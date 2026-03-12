interface ProgressPipsProps {
	readonly current: number;
	readonly total: number;
}

export function ProgressPips({
	current,
	total,
}: ProgressPipsProps): React.JSX.Element {
	return (
		<div className="flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5">
			{Array.from({ length: total }, (_, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: static fixed-length list, never reorders
					key={i}
					className={`h-2.5 w-2.5 rounded-full ${
						i < current ? "bg-primary-500" : "bg-primary-200"
					}`}
				/>
			))}
		</div>
	);
}
