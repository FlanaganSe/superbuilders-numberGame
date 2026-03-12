import confetti from "canvas-confetti";
import * as m from "motion/react-m";
import { useEffect, useMemo } from "react";
import { AdditionMode } from "../engine/problem-generator";
import { recordSession } from "../engine/session";
import { useGameStore } from "../store/game-store";
import type { SessionData } from "../types/game";

// ─── Confetti config ────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
	"#FFD700",
	"#FF6B6B",
	"#4ECDC4",
	"#45B7D1",
	"#96CEB4",
	"#f472b6",
];

// ─── Stagger variants ──────────────────────────────────────────────────────

const containerVariants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: 0.15,
		},
	},
};

const starVariants = {
	hidden: { scale: 0, opacity: 0 },
	visible: {
		scale: 1,
		opacity: 1,
		transition: {
			type: "spring" as const,
			stiffness: 300,
			damping: 15,
		},
	},
};

// ─── Component ──────────────────────────────────────────────────────────────

interface SessionSummaryProps {
	readonly session: SessionData;
}

export function SessionSummary({
	session,
}: SessionSummaryProps): React.JSX.Element {
	const dispatch = useGameStore((s) => s.dispatch);

	// Record session exactly once, not on every render
	const cumulative = useMemo(() => recordSession(session), [session]);

	// Fire session-end double cannon confetti on mount
	useEffect(() => {
		confetti({
			particleCount: 60,
			angle: 60,
			spread: 55,
			origin: { x: 0 },
			colors: CONFETTI_COLORS,
			disableForReducedMotion: true,
		});
		confetti({
			particleCount: 60,
			angle: 120,
			spread: 55,
			origin: { x: 1 },
			colors: CONFETTI_COLORS,
			disableForReducedMotion: true,
		});
	}, []);

	function handlePlayAgain(): void {
		dispatch({ type: "RESET" });
		dispatch({ type: "START_SESSION", mode: AdditionMode });
	}

	// Show up to 5 animated star icons for visual appeal
	const displayStarCount = Math.min(session.totalStars, 5);

	return (
		<div className="flex flex-col items-center gap-6">
			<m.h2
				className="font-display text-5xl text-primary-600"
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ type: "spring", stiffness: 300, damping: 15 }}
			>
				Amazing work!
			</m.h2>

			<div className="flex flex-col items-center gap-3">
				<p className="font-body text-2xl text-slate-600">Stars this session</p>

				{/* Staggered animated stars */}
				<m.div
					className="flex gap-2"
					variants={containerVariants}
					initial="hidden"
					animate="visible"
				>
					{Array.from({ length: displayStarCount }, (_, i) => (
						<m.span
							key={`star-${i.toString()}`}
							variants={starVariants}
							className="font-display text-6xl text-gold-500"
						>
							★
						</m.span>
					))}
				</m.div>

				<m.p
					className="font-display text-5xl text-gold-500"
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: displayStarCount * 0.15 + 0.2 }}
				>
					{session.totalStars}
				</m.p>
			</div>

			<div className="flex flex-col items-center gap-1">
				<p className="font-body text-2xl text-slate-500">
					Total stars collected
				</p>
				<p className="font-display text-3xl text-gold-500">
					{cumulative.totalStars}
				</p>
			</div>

			<p className="font-body text-2xl text-slate-500">
				{session.rounds.length} problems completed
			</p>

			<m.button
				type="button"
				onClick={handlePlayAgain}
				whileTap={{ scale: 0.95 }}
				transition={{ type: "spring", stiffness: 400, damping: 17 }}
				className="min-h-20 rounded-3xl bg-primary-500 px-12 py-6 font-display text-3xl text-white shadow-xl"
			>
				Play Again!
			</m.button>
		</div>
	);
}
