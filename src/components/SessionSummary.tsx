import confetti from "canvas-confetti";
import * as m from "motion/react-m";
import { useEffect, useState } from "react";
import { useAudio } from "../audio/use-audio";
import { getCaregiverTip } from "../engine/caregiver-prompts";
import { loadCumulative, recordSession } from "../engine/session";
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
			damping: 8,
		},
	},
};

// ─── StrictMode guard ───────────────────────────────────────────────────────
// Prevent recordSession (localStorage side effect) from double-firing in
// React StrictMode. Module-level Set keyed by session.startedAt timestamp.

const recordedSessions = new Set<number>();

// ─── Component ──────────────────────────────────────────────────────────────

interface SessionSummaryProps {
	readonly session: SessionData;
}

export function SessionSummary({
	session,
}: SessionSummaryProps): React.JSX.Element {
	const dispatch = useGameStore((s) => s.dispatch);
	const { play } = useAudio();

	// Initialize with pre-existing cumulative; update after recording.
	const [cumulative, setCumulative] = useState(() => loadCumulative());

	// Record session and play fanfare — exactly once per session, guarded
	// against StrictMode double-invoke.
	useEffect(() => {
		if (recordedSessions.has(session.startedAt)) return;
		recordedSessions.add(session.startedAt);
		play("sessionEndFanfare");
		setCumulative(recordSession(session));
	}, [session, play]);

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
	}

	// Show up to 5 animated star icons for visual appeal
	const displayStarCount = Math.min(session.totalStars, 5);
	const firstTryCount = session.rounds.filter((r) => r.stars === 3).length;

	return (
		<div className="flex flex-col items-center gap-6 rounded-2xl bg-black/55 px-10 py-8">
			<m.h2
				className="font-display text-5xl text-primary-300"
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ type: "spring", stiffness: 300, damping: 15 }}
			>
				Great practice!
			</m.h2>

			<div className="flex flex-col items-center gap-3">
				<p className="font-body text-2xl text-slate-300">Stars this session</p>

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
							className="font-display text-6xl text-amber-600"
						>
							★
						</m.span>
					))}
				</m.div>

				<m.p
					className="font-display text-5xl text-amber-600"
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: displayStarCount * 0.15 + 0.2 }}
				>
					{session.totalStars}
				</m.p>
			</div>

			<div className="flex flex-col items-center gap-1">
				<p className="font-body text-2xl text-slate-300">
					Total stars collected
				</p>
				<p className="font-display text-3xl text-amber-600">
					{cumulative.totalStars}
				</p>
			</div>

			<p className="font-body text-2xl text-slate-300">
				{session.rounds.length} problems completed
			</p>

			{firstTryCount > 0 && (
				<p className="font-body text-xl text-success-400">
					{firstTryCount} of {session.rounds.length} on your first try!
				</p>
			)}

			<m.button
				type="button"
				onClick={handlePlayAgain}
				whileTap={{ scale: 0.95 }}
				transition={{ type: "spring", stiffness: 400, damping: 17 }}
				className="min-h-20 rounded-3xl bg-primary-500 px-12 py-6 font-display text-3xl text-white shadow-xl"
			>
				Play More!
			</m.button>

			<p className="font-body text-lg text-slate-300">
				Come back tomorrow to practice more!
			</p>

			{/* Caregiver coaching tip — process-oriented (Berkowitz et al. 2015) */}
			<p className="mt-2 font-body text-base text-slate-300 italic">
				{getCaregiverTip(cumulative.sessionsPlayed)}
			</p>
		</div>
	);
}
