import confetti from "canvas-confetti";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useMemo } from "react";
import {
	type CountSequence,
	getCorrectExplanation,
	getCountSequence,
	getTimeoutHint,
} from "../engine/explanation-generator";
import { getSpellingProcessPraise } from "../engine/spelling-scaffold";
import type { DifficultyLevel, Problem } from "../types/game";
import { TenFrame } from "./TenFrame";

// ─── Child-friendly text ────────────────────────────────────────────────────

const CELEBRATION_FIRST_TRY = [
	"First try!",
	"Quick thinking!",
	"You knew it!",
	"Right away!",
	"Spot on!",
	"Nailed it!",
] as const;

const CELEBRATION_SECOND_TRY = [
	"You figured it out!",
	"Nice problem solving!",
	"Good thinking!",
	"You worked it out!",
	"Smart move!",
] as const;

const CELEBRATION_PERSEVERED = [
	"You didn't give up!",
	"You kept trying!",
	"You got there!",
	"Way to stick with it!",
	"Persistence pays off!",
] as const;

const ENCOURAGEMENT_TEXTS = [
	"Keep going!",
	"Let's try again!",
	"You can do it!",
	"Take your time!",
	"Try a different tile!",
] as const;

// ─── Spring configs (from research-game-ux.md §3.3) ────────────────────────

const CORRECT_SPRING = {
	type: "spring" as const,
	stiffness: 400,
	damping: 10,
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
	| {
			readonly type: "correct";
			readonly stars: 1 | 2 | 3;
			readonly problem: Problem;
			readonly difficulty: DifficultyLevel;
	  }
	| {
			readonly type: "timeout";
			readonly problem: Problem;
			readonly attemptNumber: number;
			readonly difficulty: DifficultyLevel;
	  }
	| { readonly type: "tile-seen"; readonly answer: number | string }
	| {
			readonly type: "wrong-tile";
			readonly wrongValue: number;
			readonly expectedValue: number;
			readonly targetConfusion?: boolean;
	  }
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
				<CorrectFeedback
					key="correct"
					stars={feedback.stars}
					problem={feedback.problem}
					difficulty={feedback.difficulty}
				/>
			)}
			{feedback?.type === "timeout" && (
				<TimeoutFeedback
					key="timeout"
					problem={feedback.problem}
					attemptNumber={feedback.attemptNumber}
					difficulty={feedback.difficulty}
				/>
			)}
			{feedback?.type === "tile-seen" && (
				<TileSeenFeedback
					key={`tile-${String(feedback.answer)}`}
					answer={feedback.answer}
				/>
			)}
			{feedback?.type === "wrong-tile" && (
				<WrongTileFeedback
					key={`wrong-${feedback.wrongValue}`}
					wrongValue={feedback.wrongValue}
					expectedValue={feedback.expectedValue}
					targetConfusion={feedback.targetConfusion ?? false}
				/>
			)}
		</AnimatePresence>
	);
}

// ─── Confetti triggers ──────────────────────────────────────────────────────

const CONFETTI_SCALAR = 2;
const EMOJI_STAR = confetti.shapeFromText({
	text: "⭐",
	scalar: CONFETTI_SCALAR,
});
const EMOJI_SPARKLE = confetti.shapeFromText({
	text: "✨",
	scalar: CONFETTI_SCALAR,
});

function fireCorrectConfetti(): void {
	confetti({
		particleCount: 60,
		spread: 60,
		origin: { y: 0.7 },
		colors: CONFETTI_COLORS,
		shapes: [EMOJI_STAR, EMOJI_SPARKLE, "circle"],
		scalar: CONFETTI_SCALAR,
		flat: true,
		disableForReducedMotion: true,
	});
}

// ─── Count sequence animation ────────────────────────────────────────────────

function CountSequenceAnimation({
	sequence,
	reduced,
}: {
	readonly sequence: CountSequence;
	readonly reduced: boolean;
}): React.JSX.Element {
	return (
		<div className="flex items-center gap-2">
			<span className="font-body text-lg text-slate-400">
				{sequence.start},
			</span>
			{sequence.steps.map((num, i) => (
				<m.span
					key={num}
					initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.5 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={
						reduced ? { duration: 0 } : { delay: 0.3 + i * 0.3, duration: 0.3 }
					}
					className="font-display text-2xl text-primary-600"
				>
					{num}
					{i < sequence.steps.length - 1 ? "," : "!"}
				</m.span>
			))}
		</div>
	);
}

// ─── Correct feedback ───────────────────────────────────────────────────────

function CorrectFeedback({
	stars,
	problem,
	difficulty,
}: {
	readonly stars: 1 | 2 | 3;
	readonly problem: Problem;
	readonly difficulty: DifficultyLevel;
}): React.JSX.Element {
	const reduced = useReducedMotion();
	const isSpelling = problem.answer < 0;
	const text = useMemo(() => {
		if (isSpelling) {
			// Stars map inversely to attemptNumber: 3→1, 2→2, 1→3
			const attemptNumber = 4 - stars;
			return getSpellingProcessPraise(attemptNumber);
		}
		switch (stars) {
			case 3:
				return pickRandom(CELEBRATION_FIRST_TRY);
			case 2:
				return pickRandom(CELEBRATION_SECOND_TRY);
			default:
				return pickRandom(CELEBRATION_PERSEVERED);
		}
	}, [stars, isSpelling]);
	const explanation = useMemo(
		() => getCorrectExplanation(problem, difficulty, stars),
		[problem, difficulty, stars],
	);
	const countSequence = useMemo(() => getCountSequence(problem), [problem]);

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
			{explanation && (
				<p className="font-body text-xl text-slate-500">{explanation}</p>
			)}

			{/* Counting-on/back animation — staggered entrance (Schiffman et al. 2018) */}
			{countSequence && difficulty <= 3 && (
				<CountSequenceAnimation
					sequence={countSequence}
					reduced={reduced ?? false}
				/>
			)}

			{/* Ten-frame visual scaffold — number relative to 10 (IRIS Vanderbilt CRA) */}
			{problem.answer >= 1 && problem.answer <= 10 && difficulty <= 3 && (
				<TenFrame
					value={problem.answer}
					splitAt={
						problem.unknownPosition === "right" && problem.target !== undefined
							? problem.left
							: undefined
					}
				/>
			)}
		</m.div>
	);
}

// ─── Timeout feedback ───────────────────────────────────────────────────────

function TimeoutFeedback({
	problem,
	attemptNumber,
	difficulty,
}: {
	readonly problem: Problem;
	readonly attemptNumber: number;
	readonly difficulty: DifficultyLevel;
}): React.JSX.Element {
	const reduced = useReducedMotion();
	const text = useMemo(() => pickRandom(ENCOURAGEMENT_TEXTS), []);
	const hint = useMemo(
		() => getTimeoutHint(problem, difficulty, attemptNumber),
		[problem, difficulty, attemptNumber],
	);
	const countSequence = useMemo(() => getCountSequence(problem), [problem]);

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
			<p className="font-body text-2xl text-slate-600">{hint}</p>

			{/* Count sequence on repeated timeout — worked example visual (attemptNumber >= 2) */}
			{countSequence && attemptNumber >= 2 && difficulty <= 3 && (
				<CountSequenceAnimation
					sequence={countSequence}
					reduced={reduced ?? false}
				/>
			)}
		</m.div>
	);
}

// ─── Tile-seen feedback ─────────────────────────────────────────────────────

function TileSeenFeedback({
	answer,
}: {
	readonly answer: number | string;
}): React.JSX.Element {
	const reduced = useReducedMotion();

	return (
		<m.p
			className="font-body text-3xl text-success-500"
			initial={{ opacity: 0 }}
			animate={reduced ? { opacity: 1 } : { opacity: 1, scale: [0.8, 1.15, 1] }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
		>
			I see {answer}!
		</m.p>
	);
}

// ─── Wrong-tile feedback ────────────────────────────────────────────────────

function WrongTileFeedback({
	wrongValue,
	expectedValue,
	targetConfusion,
}: {
	readonly wrongValue: number;
	readonly expectedValue: number;
	readonly targetConfusion?: boolean;
}): React.JSX.Element {
	const reduced = useReducedMotion();

	return (
		<m.div
			className="flex flex-col items-center gap-2"
			initial={{ opacity: 0 }}
			animate={reduced ? { opacity: 1 } : { opacity: 1, scale: [0.9, 1.05, 1] }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.3 }}
		>
			{targetConfusion ? (
				<p className="font-body text-2xl text-amber-600">
					That's the total! Find the missing part.
				</p>
			) : (
				<p className="font-body text-2xl text-amber-600">
					You made <span className="font-display text-3xl">{wrongValue}</span>.
					We need{" "}
					<span className="font-display text-3xl text-primary-600">
						{expectedValue}
					</span>
					.
				</p>
			)}
			<p className="font-body text-xl text-slate-500">Try again!</p>
		</m.div>
	);
}
