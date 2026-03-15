/**
 * Number bond SVG — part-whole visual scaffold.
 *
 * Research: Singapore Math CPA (Concrete-Pictorial-Abstract).
 * Marx et al. (2025): 0/18 math apps implement systematic part-whole learning.
 * Gated on difficulty <= 3 (Sweller's expertise reversal, ADR-009).
 */

interface NumberBondProps {
	readonly whole: number;
	readonly knownPart: number;
	readonly unknownPart: number | "?";
	readonly showUnknown: boolean;
}

export function NumberBond({
	whole,
	knownPart,
	unknownPart,
	showUnknown,
}: NumberBondProps): React.JSX.Element {
	return (
		<svg
			width="160"
			height="100"
			viewBox="0 0 160 100"
			className="mx-auto"
			aria-label={`Number bond: ${knownPart} and ${showUnknown ? unknownPart : "unknown"} make ${whole}`}
		>
			{/* Connecting lines */}
			<line x1="80" y1="30" x2="40" y2="70" stroke="#94a3b8" strokeWidth="2" />
			<line x1="80" y1="30" x2="120" y2="70" stroke="#94a3b8" strokeWidth="2" />

			{/* Whole (top) */}
			<circle
				cx="80"
				cy="24"
				r="22"
				fill="#eff6ff"
				stroke="#3b82f6"
				strokeWidth="2"
			/>
			<text
				x="80"
				y="30"
				textAnchor="middle"
				className="font-display text-xl"
				fill="#1e40af"
			>
				{whole}
			</text>

			{/* Known part (bottom-left) */}
			<circle
				cx="40"
				cy="76"
				r="22"
				fill="#f0fdf4"
				stroke="#22c55e"
				strokeWidth="2"
			/>
			<text
				x="40"
				y="82"
				textAnchor="middle"
				className="font-display text-xl"
				fill="#166534"
			>
				{knownPart}
			</text>

			{/* Unknown part (bottom-right) */}
			<circle
				cx="120"
				cy="76"
				r="22"
				fill={showUnknown ? "#f0fdf4" : "#fefce8"}
				stroke={showUnknown ? "#22c55e" : "#eab308"}
				strokeWidth="2"
				strokeDasharray={showUnknown ? "none" : "4 3"}
			/>
			<text
				x="120"
				y="82"
				textAnchor="middle"
				className="font-display text-xl"
				fill={showUnknown ? "#166534" : "#a16207"}
			>
				{showUnknown ? unknownPart : "?"}
			</text>
		</svg>
	);
}
