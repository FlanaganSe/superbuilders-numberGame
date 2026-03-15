import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

/**
 * First-scan onboarding guide — shows a tile floating toward a camera icon.
 * Communicates "hold a tile up to the camera" without text (pre-reader friendly).
 * Dismisses on first TILE_SEEN event. Never shows again.
 *
 * Research: NN/G — pre-readers need demonstration, not text instruction.
 */

// ─── Springs ────────────────────────────────────────────────────────────────

const ENTER_SPRING = {
	type: "spring" as const,
	stiffness: 300,
	damping: 20,
};

// ─── Component ──────────────────────────────────────────────────────────────

export function GhostTileGuide(): React.JSX.Element {
	const reduced = useReducedMotion();
	// Treat null (unresolved) as reduced — safe default avoids motion flash
	const prefersReduced = reduced !== false;

	return (
		<m.div
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0 }}
			transition={ENTER_SPRING}
			className="flex flex-col items-center gap-3"
			aria-label="Hold a tile up to the camera"
		>
			{/* Camera icon */}
			<svg
				width="56"
				height="44"
				viewBox="0 0 56 44"
				fill="none"
				aria-hidden="true"
			>
				{/* Viewfinder nub */}
				<rect x="18" y="2" width="14" height="8" rx="3" fill="#94a3b8" />
				{/* Camera body */}
				<rect x="4" y="8" width="48" height="32" rx="6" fill="#94a3b8" />
				{/* Lens outer */}
				<circle cx="28" cy="24" r="11" fill="#64748b" />
				{/* Lens inner */}
				<circle cx="28" cy="24" r="6" fill="#94a3b8" />
			</svg>

			{/* Animated tile */}
			<m.div
				animate={
					prefersReduced
						? { opacity: 0.85 }
						: {
								y: [0, -32, 0],
								scale: [1, 1.05, 1],
								opacity: [0.85, 1, 0.85],
							}
				}
				transition={
					prefersReduced
						? { duration: 0.3 }
						: {
								duration: 2,
								repeat: Number.POSITIVE_INFINITY,
								ease: "easeInOut",
							}
				}
			>
				<svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
					<rect
						x="2"
						y="2"
						width="56"
						height="56"
						rx="8"
						fill="#e2e8f0"
						stroke="#94a3b8"
						strokeWidth="2"
					/>
					<text
						x="30"
						y="40"
						textAnchor="middle"
						className="font-display text-3xl"
						fill="#64748b"
					>
						5
					</text>
				</svg>
			</m.div>

			{/* Text label — only for reduced motion (animation communicates otherwise) */}
			{prefersReduced && (
				<p aria-hidden="true" className="font-body text-lg text-slate-300">
					Hold a tile up to the camera
				</p>
			)}
		</m.div>
	);
}
