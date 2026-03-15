import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

/**
 * First-scan onboarding guide — shows a ghost tile animation.
 * Dismisses on first TILE_SEEN event. Never shows again.
 *
 * Research: NN/G — pre-readers need demonstration, not text instruction.
 */

interface GhostTileGuideProps {
	readonly visible: boolean;
}

export function GhostTileGuide({
	visible,
}: GhostTileGuideProps): React.JSX.Element | null {
	const reduced = useReducedMotion();

	if (!visible) return null;

	return (
		<m.div
			initial={{ opacity: 0 }}
			animate={reduced ? { opacity: 0.6 } : { opacity: [0.3, 0.6, 0.3] }}
			transition={
				reduced
					? { duration: 0.3 }
					: { duration: 2, repeat: Number.POSITIVE_INFINITY }
			}
			className="flex flex-col items-center gap-2"
		>
			<svg
				width="80"
				height="80"
				viewBox="0 0 80 80"
				className="mx-auto"
				aria-label="Hold a tile up to the camera"
			>
				{/* Tile shape */}
				<rect
					x="10"
					y="10"
					width="60"
					height="60"
					rx="8"
					fill="#e2e8f0"
					stroke="#94a3b8"
					strokeWidth="2"
				/>
				<text
					x="40"
					y="50"
					textAnchor="middle"
					className="font-display text-3xl"
					fill="#64748b"
				>
					5
				</text>
			</svg>
			<p className="font-body text-lg text-slate-400">
				Hold a tile up to the camera
			</p>
		</m.div>
	);
}
