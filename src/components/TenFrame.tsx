/**
 * Ten-frame SVG — visual representation of a number relative to 10.
 *
 * Research: IRIS Vanderbilt CRA — students 6x more likely to solve with visual representations.
 * Highest-evidence tool for ages 5-7 for building number-to-10 relationships.
 */

interface TenFrameProps {
	readonly value: number;
	/** If provided, first `splitAt` dots use primary color, rest use success color */
	readonly splitAt?: number | undefined;
}

const CELL_SIZE = 28;
const GAP = 4;
const DOT_RADIUS = 10;
const PADDING = 6;

interface DotData {
	readonly cx: number;
	readonly cy: number;
	readonly filled: boolean;
	readonly isPrimary: boolean;
}

export function TenFrame({ value, splitAt }: TenFrameProps): React.JSX.Element {
	const width = 5 * CELL_SIZE + 4 * GAP + 2 * PADDING;
	const height = 2 * CELL_SIZE + GAP + 2 * PADDING;

	const dots: readonly DotData[] = Array.from({ length: 10 }, (_, index) => {
		const row = Math.floor(index / 5);
		const col = index % 5;
		const cx = PADDING + col * (CELL_SIZE + GAP) + CELL_SIZE / 2;
		const cy = PADDING + row * (CELL_SIZE + GAP) + CELL_SIZE / 2;
		const filled = index < value;
		const isPrimary = splitAt !== undefined ? index < splitAt : true;
		return { cx, cy, filled, isPrimary };
	});

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className="mx-auto"
			aria-label={`Ten frame showing ${value}`}
		>
			{/* Frame background */}
			<rect
				x={1}
				y={1}
				width={width - 2}
				height={height - 2}
				rx={6}
				fill="#fefce8"
				stroke="#d4d4d8"
				strokeWidth="1.5"
			/>

			{/* Cell borders */}
			{dots.map((dot, i) => (
				<rect
					// biome-ignore lint/suspicious/noArrayIndexKey: static grid layout, indices are stable
					key={`cell-${i}`}
					x={dot.cx - CELL_SIZE / 2}
					y={dot.cy - CELL_SIZE / 2}
					width={CELL_SIZE}
					height={CELL_SIZE}
					rx={4}
					fill="none"
					stroke="#e5e7eb"
					strokeWidth="1"
				/>
			))}

			{/* Dots */}
			{dots.map((dot, i) =>
				dot.filled ? (
					<circle
						// biome-ignore lint/suspicious/noArrayIndexKey: static grid layout, indices are stable
						key={`dot-${i}`}
						cx={dot.cx}
						cy={dot.cy}
						r={DOT_RADIUS}
						fill={dot.isPrimary ? "#3b82f6" : "#22c55e"}
					/>
				) : null,
			)}
		</svg>
	);
}
