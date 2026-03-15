import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	buildCorrectSequence,
	buildTimeoutSequence,
	playSentence,
} from "../audio/spoken-feedback";
import type { SoundName } from "../audio/use-audio";
import { useAudio } from "../audio/use-audio";
import {
	createMockDetection,
	createMockDetectionPair,
} from "../cv/mock-recognition";
import { MAX_PROBLEMS } from "../engine/game-reducer";
import { useGameStore } from "../store/game-store";
import type { Digit } from "../types/cv";
import type { Problem } from "../types/game";
import { getFeatureFlags } from "../utils/feature-flags";
import { CameraUncertaintyPrompt } from "./CameraUncertaintyPrompt";
import { FeedbackOverlay, type FeedbackState } from "./FeedbackOverlay";
import { GhostTileGuide } from "./GhostTileGuide";
import { hasSeenGuide, markGuideSeen } from "./ghost-tile-storage";
import { MockNumpad } from "./MockNumpad";
import { ProblemDisplay } from "./ProblemDisplay";
import { ProgressPips } from "./ProgressPips";

// ─── Prompt sound helper ─────────────────────────────────────────────────────
// Mirrors ProblemDisplay.tsx text prompt logic (lines 45-51) exactly.

function getPromptSound(problem: Problem): SoundName | null {
	if (problem.unknownPosition === "right") {
		return problem.target === 10 ? "promptMakeTen" : "promptMissing";
	}
	if (problem.operator === "+") return "promptAltogether";
	if (problem.operator === "-") return "promptLeft";
	return null;
}

// ─── Spring config for tile-detected pop (research §3.3) ───────────────────

const POP_SPRING = {
	type: "spring" as const,
	stiffness: 400,
	damping: 10,
};

// ─── Celebration timing ──────────────────────────────────────────────────────
// Event-driven: advance after both minimum display time AND spoken feedback
// completion. No clip-count duration estimates.
const MIN_CELEBRATION_MS = 3500;
const MAX_CELEBRATION_MS = 15_000; // safety net if audio events never fire

// ─── Props ──────────────────────────────────────────────────────────────────

interface GameScreenProps {
	readonly problem: Problem;
	readonly attemptNumber: number;
	readonly stars?: 1 | 2 | 3;
	readonly timedOut?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GameScreen({
	problem,
	attemptNumber,
	stars,
	timedOut,
}: GameScreenProps): React.JSX.Element {
	const dispatch = useGameStore((s) => s.dispatch);
	const processDetections = useGameStore((s) => s.processDetections);
	const resetCvState = useGameStore((s) => s.resetCvState);
	const tileSeen = useGameStore((s) => s.tileSeen);
	const cameraUncertain = useGameStore((s) => s.cameraUncertain);
	const wrongTileSeen = useGameStore((s) => s.wrongTileSeen);
	const roundsCompleted = useGameStore((s) => s.gameState.rounds.length);
	const rounds = useGameStore((s) => s.gameState.rounds);
	const difficulty = useGameStore((s) => s.gameState.difficulty);
	const modeName = useGameStore((s) => s.gameState.modeName);
	const flags = getFeatureFlags();
	const { play } = useAudio();

	// Round stars for color-coded progress pips
	const roundStars = useMemo(() => rounds.map((r) => r.stars), [rounds]);

	// Track difficulty promotions — show "Level Up!", hide demotions (math anxiety research)
	const prevDifficultyRef = useRef(difficulty);
	const [showLevelUp, setShowLevelUp] = useState(false);

	// Ghost tile onboarding guide — shows on first-ever scan
	const [showGuide, setShowGuide] = useState(() => !hasSeenGuide());

	// Idle timer for gentle prompt escalation
	const [idleSeconds, setIdleSeconds] = useState(0);

	useEffect(() => {
		if (difficulty > prevDifficultyRef.current) {
			prevDifficultyRef.current = difficulty;
			setShowLevelUp(true);
			const timer = setTimeout(() => setShowLevelUp(false), 1500);
			return () => clearTimeout(timer);
		}
		// Demotion: invisible — no feedback
		prevDifficultyRef.current = difficulty;
	}, [difficulty]);

	const handleDigit = useCallback(
		(digit: Digit): void => {
			const phase = useGameStore.getState().gameState.phase;
			if (phase.phase !== "scanning") return;

			const answer = phase.problem.answer;
			const answerStr = answer.toString();

			if (answerStr.length === 1) {
				processDetections([createMockDetection(digit)]);
			} else if (answerStr.length === 2) {
				const tens = Math.floor(answer / 10) as Digit;
				const ones = (answer % 10) as Digit;
				if (digit === tens) {
					processDetections([...createMockDetectionPair(tens, ones)]);
				} else {
					processDetections([createMockDetection(digit)]);
				}
			}
		},
		[processDetections],
	);

	// Keyboard listener for digits 0-9
	useEffect(() => {
		if (flags.recognition !== "mock") return;

		function onKeyDown(e: KeyboardEvent): void {
			const digit = Number.parseInt(e.key, 10);
			if (!Number.isNaN(digit) && digit >= 0 && digit <= 9) {
				handleDigit(digit as Digit);
			}
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handleDigit, flags.recognition]);

	// ─── Celebration advance coordination ──────────────────────────────────
	// Auto-advance requires two conditions: (1) minimum display time elapsed
	// AND (2) spoken feedback complete (or not applicable). Driven by
	// playSentence's onComplete callback — no clip-count duration estimates.

	const advanceRef = useRef({
		minElapsed: false,
		audioDone: true,
		cancelled: false,
	});

	const tryAdvance = useCallback((): void => {
		const c = advanceRef.current;
		if (c.cancelled || !c.minElapsed || !c.audioDone) return;
		c.cancelled = true;
		resetCvState();
		dispatch({ type: "NEXT_ROUND" });
	}, [dispatch, resetCvState]);

	// Auto-advance after success — waits for min display time, then checks
	// whether spoken feedback has also finished before advancing.
	useEffect(() => {
		if (!stars) return;

		const willSpeak =
			problem.answer >= 0 &&
			problem.answer <= 9 &&
			difficulty <= 3 &&
			buildCorrectSequence(problem, difficulty, stars).length > 0;

		const c = advanceRef.current;
		c.minElapsed = false;
		c.audioDone = !willSpeak;
		c.cancelled = false;

		const minTimer = setTimeout(() => {
			c.minElapsed = true;
			tryAdvance();
		}, MIN_CELEBRATION_MS);

		const maxTimer = setTimeout(() => {
			if (!c.cancelled) {
				c.cancelled = true;
				resetCvState();
				dispatch({ type: "NEXT_ROUND" });
			}
		}, MAX_CELEBRATION_MS);

		return () => {
			c.cancelled = true;
			clearTimeout(minTimer);
			clearTimeout(maxTimer);
		};
	}, [stars, problem, difficulty, dispatch, resetCvState, tryAdvance]);

	const isScanning = !stars && !timedOut;

	// ─── Ghost tile guide dismissal ─────────────────────────────────────────
	useEffect(() => {
		if (tileSeen !== null && showGuide) {
			markGuideSeen();
			setShowGuide(false);
		}
	}, [tileSeen, showGuide]);

	// ─── Idle timer ──────────────────────────────────────────────────────────
	// Reset + start counting idle seconds during scanning.
	// When isScanning or tileSeen changes, the effect re-runs and resets to 0.
	useEffect(() => {
		setIdleSeconds(0);
		if (!isScanning || tileSeen !== null) return;
		const interval = setInterval(() => {
			setIdleSeconds((s) => s + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [isScanning, tileSeen]);

	// ─── Sound effects ──────────────────────────────────────────────────────

	// StrictMode guard: useRef persists across StrictMode's effect
	// double-invoke (React re-runs effects but doesn't remount the component),
	// so the second run sees the ref was already set and skips playback.
	const lastPlayedRoundRef = useRef(-1);

	// Correct answer → number word then chime (Mayer dual coding)
	useEffect(() => {
		if (!stars) return;
		if (lastPlayedRoundRef.current === roundsCompleted) return;
		lastPlayedRoundRef.current = roundsCompleted;

		const hasNumberWord = problem.answer >= 0 && problem.answer <= 9;

		if (hasNumberWord) {
			play(`number${problem.answer}` as SoundName);
			// Delay chime so the number word is heard clearly first
			const timer = setTimeout(() => play("correctChime"), 500);
			return () => clearTimeout(timer);
		}

		play("correctChime");
	}, [stars, play, problem.answer, roundsCompleted]);

	// Timeout → encouragement
	useEffect(() => {
		if (timedOut) play("encouragement");
	}, [timedOut, play]);

	// Tile first detected → pop
	useEffect(() => {
		if (tileSeen !== null) play("tileDetectedPop");
	}, [tileSeen, play]);

	// Math language prompt audio — plays once when a new problem appears
	// (Mayer temporal contiguity + Purpura math vocabulary).
	// Ref guards against replay on timeout retry (same problem object).
	const lastPromptedProblemRef = useRef<Problem | null>(null);

	useEffect(() => {
		if (stars || timedOut) return;
		if (problem.answer < 0) return;
		if (problem === lastPromptedProblemRef.current) return;

		const promptSound = getPromptSound(problem);
		if (promptSound) {
			lastPromptedProblemRef.current = problem;
			const timer = setTimeout(() => {
				play(promptSound);
			}, 400);
			return () => clearTimeout(timer);
		}
	}, [problem, stars, timedOut, play]);

	// Idle audio prompt — plays once when idle crosses 10s (JLS 2020)
	useEffect(() => {
		if (idleSeconds === 10 && isScanning && tileSeen === null) {
			play("idleWonder");
		}
	}, [idleSeconds, isScanning, tileSeen, play]);

	// Spoken feedback — audible explanation after chime (PRD req #13)
	// Signals advanceRef.audioDone when the chain completes so the
	// auto-advance effect can fire (event-driven, no time estimates).
	useEffect(() => {
		if (!stars) return;
		if (problem.answer < 0) return; // spelling
		if (difficulty > 3) return;

		const seq = buildCorrectSequence(problem, difficulty, stars);
		if (seq.length === 0) return;

		// Start after existing number-word + chime sequence completes (~1.5s)
		let cancel: (() => void) | null = null;
		const startTimer = setTimeout(() => {
			cancel = playSentence(seq, play, () => {
				advanceRef.current.audioDone = true;
				tryAdvance();
			});
		}, 1500);

		return () => {
			clearTimeout(startTimer);
			cancel?.();
			// Signal done on cleanup so auto-advance doesn't hang
			advanceRef.current.audioDone = true;
		};
	}, [stars, play, problem, difficulty, tryAdvance]);

	// Spoken feedback — worked example answer on repeated timeout (PRD req #14)
	useEffect(() => {
		if (!timedOut) return;
		if (attemptNumber < 2) return;
		if (difficulty > 3) return;
		if (problem.answer < 0) return; // spelling

		const seq = buildTimeoutSequence(problem, difficulty, attemptNumber);
		if (seq.length === 0) return;

		// Start after encouragement clip (measured at 1.043s) + small buffer
		let cancel: (() => void) | null = null;
		const startTimer = setTimeout(() => {
			cancel = playSentence(seq, play);
		}, 1200);

		return () => {
			clearTimeout(startTimer);
			cancel?.();
		};
	}, [timedOut, attemptNumber, play, problem, difficulty]);

	// Timeout handling — `stars` in deps ensures the timer is cancelled when
	// a correct answer arrives (otherwise the old 30s timer survives into the
	// next round's scanning phase and fires a phantom ROUND_TIMEOUT).
	useEffect(() => {
		if (timedOut || stars) return;
		const phase = useGameStore.getState().gameState.phase;
		if (phase.phase !== "scanning") return;

		const timer = setTimeout(() => {
			dispatch({ type: "ROUND_TIMEOUT" });
		}, 30_000);
		return () => clearTimeout(timer);
	}, [timedOut, stars, dispatch]);

	// Auto-retry after timeout
	useEffect(() => {
		if (!timedOut) return;
		// Longer display for repeated timeouts — worked examples need time to read
		const delay = attemptNumber >= 2 ? 4000 : 2000;
		const timer = setTimeout(() => {
			resetCvState();
			dispatch({ type: "NEXT_ROUND" });
		}, delay);
		return () => clearTimeout(timer);
	}, [timedOut, dispatch, resetCvState, attemptNumber]);

	// ─── Derive feedback state ──────────────────────────────────────────────
	// Priority: correct > timeout > tile-seen > wrong-tile.
	// correct/timeout are phase-level (mutually exclusive with scanning).
	// tile-seen means CORRECT answer detected — always takes priority.
	// wrong-tile means a wrong answer stabilized for 2+ frames.

	const feedback: FeedbackState = stars
		? { type: "correct", stars, problem, difficulty }
		: timedOut
			? { type: "timeout", problem, attemptNumber, difficulty }
			: tileSeen !== null
				? { type: "tile-seen", answer: tileSeen }
				: wrongTileSeen !== null
					? {
							type: "wrong-tile",
							wrongValue: wrongTileSeen,
							expectedValue: problem.answer,
							targetConfusion:
								problem.unknownPosition === "right" &&
								wrongTileSeen === problem.target,
						}
					: null;

	return (
		<div className="flex flex-col items-center gap-4">
			{/* CARD: status + problem + feedback */}
			<div className="flex flex-col items-center gap-6 rounded-2xl bg-black/55 px-8 py-6">
				{/* Progress + mode + difficulty */}
				<div className="flex items-center gap-3">
					<span className="font-body text-sm text-white">{modeName}</span>
					<ProgressPips
						current={roundsCompleted}
						total={MAX_PROBLEMS}
						roundStars={roundStars}
					/>
				</div>

				{/* Level Up! indicator — only on promotion, never demotion */}
				<AnimatePresence>
					{showLevelUp && (
						<m.p
							key="level-up"
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: [0.8, 1.15, 1] }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.4 }}
							className="font-display text-2xl text-amber-600"
						>
							Level Up!
						</m.p>
					)}
				</AnimatePresence>

				{/* Problem display with tile-held beat animation */}
				<m.div
					key={tileSeen !== null ? `pop-${tileSeen}` : "idle"}
					animate={tileSeen !== null ? { scale: [1, 1.03, 1] } : { scale: 1 }}
					transition={
						tileSeen !== null
							? {
									...POP_SPRING,
									repeat: Number.POSITIVE_INFINITY,
									repeatDelay: 0.4,
								}
							: { duration: 0 }
					}
				>
					<ProblemDisplay
						problem={problem}
						showAnswer={!!stars}
						roundIndex={roundsCompleted}
						difficulty={difficulty}
					/>
				</m.div>

				{/* Feedback overlay: correct / timeout / tile-seen */}
				<FeedbackOverlay feedback={feedback} />

				{/* Camera uncertainty prompt — shown when tile was seen but lost */}
				<AnimatePresence>
					{isScanning && cameraUncertain && (
						<CameraUncertaintyPrompt key="camera-uncertainty" />
					)}
				</AnimatePresence>

				{/* Ghost tile onboarding guide — first-scan only */}
				<AnimatePresence>
					{isScanning &&
						showGuide &&
						!cameraUncertain &&
						tileSeen === null &&
						wrongTileSeen === null && <GhostTileGuide key="ghost-guide" />}
				</AnimatePresence>
			</div>

			{/* CLEAR ZONE: answer hint + mock numpad */}
			{/* Answer zone hint — only during scanning with no feedback showing */}
			{isScanning &&
				!showGuide &&
				!cameraUncertain &&
				tileSeen === null &&
				wrongTileSeen === null && (
					<div
						className={`rounded-3xl border-4 border-dashed border-primary-400 bg-black/30 px-12 py-5 ${
							idleSeconds >= 10 ? "animate-pulse" : "animate-pulse-soft"
						}`}
					>
						<p className="font-body text-2xl text-primary-300">
							{idleSeconds >= 15
								? "Try holding a tile up!"
								: "Put your answer here"}
						</p>
					</div>
				)}

			{/* Mock numpad — only during scanning */}
			{flags.recognition === "mock" && isScanning && (
				<MockNumpad onDigit={handleDigit} />
			)}
		</div>
	);
}
