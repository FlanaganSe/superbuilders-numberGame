import * as m from "motion/react-m";
import { useEffect, useState } from "react";

// ─── Loading messages (child-friendly, no percentages — research §8) ────────

const LOADING_MESSAGES = [
	"Getting ready\u2026",
	"Almost there\u2026",
	"Let\u2019s go!",
] as const;

const MESSAGE_INTERVAL_MS = 3000;

// ─── Props ──────────────────────────────────────────────────────────────────

interface ProgressiveLoaderProps {
	readonly status: "loading" | "error";
	readonly errorMessage: string | null;
	readonly onRetry: () => void;
	readonly onFallbackMock: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProgressiveLoader({
	status,
	errorMessage,
	onRetry,
	onFallbackMock,
}: ProgressiveLoaderProps): React.JSX.Element {
	const [messageIndex, setMessageIndex] = useState(0);

	useEffect(() => {
		if (status !== "loading") return;

		const timer = setInterval(() => {
			setMessageIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
		}, MESSAGE_INTERVAL_MS);

		return () => clearInterval(timer);
	}, [status]);

	if (status === "error") {
		return (
			<div className="flex flex-col items-center gap-6">
				<p className="font-display text-4xl text-amber-500">Oops!</p>
				<p className="max-w-sm text-center font-body text-2xl text-slate-600">
					Something went wrong loading the game.
				</p>
				{errorMessage && (
					<p className="max-w-sm text-center font-body text-lg text-slate-400">
						{errorMessage}
					</p>
				)}
				<div className="flex gap-4">
					<m.button
						type="button"
						onClick={onRetry}
						whileTap={{ scale: 0.95 }}
						transition={{ type: "spring", stiffness: 400, damping: 17 }}
						className="min-h-16 rounded-2xl bg-primary-500 px-8 py-4 font-display text-2xl text-white shadow-lg"
					>
						Try Again
					</m.button>
					<m.button
						type="button"
						onClick={onFallbackMock}
						whileTap={{ scale: 0.95 }}
						transition={{ type: "spring", stiffness: 400, damping: 17 }}
						className="min-h-16 rounded-2xl bg-slate-200 px-8 py-4 font-display text-2xl text-slate-600 shadow-lg"
					>
						Play Without Camera
					</m.button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center gap-6">
			<m.p
				key={messageIndex}
				className="font-display text-4xl text-primary-500"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
			>
				{LOADING_MESSAGES[messageIndex]}
			</m.p>
			<LoadingDots />
		</div>
	);
}

// ─── Animated dots ──────────────────────────────────────────────────────────

function LoadingDots(): React.JSX.Element {
	return (
		<div className="flex gap-2">
			{[0, 1, 2].map((i) => (
				<m.div
					key={`dot-${i.toString()}`}
					className="h-4 w-4 rounded-full bg-primary-400"
					animate={{ opacity: [0.3, 1, 0.3] }}
					transition={{
						duration: 1,
						repeat: Number.POSITIVE_INFINITY,
						delay: i * 0.2,
					}}
				/>
			))}
		</div>
	);
}
