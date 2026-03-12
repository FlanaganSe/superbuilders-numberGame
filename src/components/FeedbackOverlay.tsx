import confetti from "canvas-confetti";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useMemo } from "react";
import type { Problem } from "../types/game";

// ─── Child-friendly text ────────────────────────────────────────────────────

const CELEBRATION_TEXTS = [
	"Great job!",
	"You got it!",
	"Amazing!",
	"Awesome!",
	"Way to go!",
	"Super!",
] as const;

const ENCOURAGEMENT_TEXTS = [
	"Keep trying!",
	"Almost there!",
	"You can do it!",
	"Nice effort!",
	"You're so close!",
] as const;

// ─── Spring configs (from research-game-ux.md §3.3) ────────────────────────

const CORRECT_SPRING = {
	type: "spring" as const,
	stiffness: 300,
	damping: 15,
};

const WOBBLE_TRANSITION = {
	duration: 0.5,
	ease: "easeInOut" as const,
};

// ─── Confetti config ────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
	"#FFD700",
	"#FF6B6B",
	"#4ECDC4",
	"#45B7D1",
	"#96CEB4",
	"#f472b6",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function pickRandom<T>(items: readonly [T, ...T[]]): T {
	return items[Math.floor(Math.random() * items.length)] as T;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type FeedbackState =
	| { readonly type: "correct"; readonly stars: 1 | 2 | 3 }
	| { readonly type: "timeout"; readonly problem: Problem }
	| { readonly type: "tile-seen"; readonly answer: number }
	| null;

interface FeedbackOverlayProps {
	readonly feedback: FeedbackState;
}

// ─── Main component ─────────────────────────────────────────────────────────

export function FeedbackOverlay({
	feedback,
}: FeedbackOverlayProps): React.JSX.Element {
	return (
		<AnimatePresence>
			{feedback?.type === "correct" && (
				<CorrectFeedback key="correct" stars={feedback.stars} />
			)}
			{feedback?.type === "timeout" && (
				<TimeoutFeedback key="timeout" problem={feedback.problem} />
			)}
			{feedback?.type === "tile-seen" && (
				<TileSeenFeedback key={`tile-${feedback.answer}`} />
			)}
		</AnimatePresence>
	);
}

// ─── Confetti triggers ──────────────────────────────────────────────────────

function fireCorrectConfetti(): void {
	confetti({
		particleCount: 80,
		spread: 60,
		origin: { y: 0.6 },
		colors: CONFETTI_COLORS,
		disableForReducedMotion: true,
	});
}

// ─── Correct feedback ───────────────────────────────────────────────────────

function CorrectFeedback({
	stars,
}: {
	readonly stars: 1 | 2 | 3;
}): React.JSX.Element {
	const reduced = useReducedMotion();
	const text = useMemo(() => pickRandom(CELEBRATION_TEXTS), []);

	useEffect(() => {
		fireCorrectConfetti();
	}, []);

	return (
		<m.div
			className="flex flex-col items-center gap-3"
			initial={reduced ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
			animate={reduced ? { opacity: 1 } : { scale: [0.8, 1.2, 1], opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={reduced ? { duration: 0.3 } : CORRECT_SPRING}
		>
			<p className="font-display text-5xl text-success-600 drop-shadow-md">
				{text}
			</p>
			<p className="font-display text-6xl text-gold-500">{"★".repeat(stars)}</p>
		</m.div>
	);
}

// ─── Timeout feedback ───────────────────────────────────────────────────────

function TimeoutFeedback({
	problem,
}: {
	readonly problem: Problem;
}): React.JSX.Element {
	const reduced = useReducedMotion();
	const text = useMemo(() => pickRandom(ENCOURAGEMENT_TEXTS), []);

	return (
		<m.div
			className="flex flex-col items-center gap-3"
			initial={{ opacity: 0 }}
			animate={
				reduced ? { opacity: 1 } : { opacity: 1, rotate: [-3, 3, -3, 3, 0] }
			}
			exit={{ opacity: 0 }}
			transition={reduced ? { duration: 0.3 } : WOBBLE_TRANSITION}
		>
			<p className="font-display text-4xl text-primary-500">{text}</p>
			<p className="font-body text-3xl text-slate-600">
				The answer is{" "}
				<span className="font-display text-4xl text-primary-600">
					{problem.answer}
				</span>
			</p>
		</m.div>
	);
}

// ─── Tile-seen feedback ─────────────────────────────────────────────────────

function TileSeenFeedback(): React.JSX.Element {
	const reduced = useReducedMotion();

	return (
		<m.p
			className="font-body text-3xl text-primary-400"
			initial={{ opacity: 0 }}
			animate={reduced ? { opacity: 1 } : { opacity: 1, scale: [0.9, 1.05, 1] }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
		>
			I see a tile!
		</m.p>
	);
}
