import * as m from "motion/react-m";
import { useAudio } from "../audio/use-audio";
import { getWordAudioName } from "../engine/spelling-words";

interface SpellingWordAudioProps {
	readonly word: string;
}

/**
 * Tappable speaker icon that plays the target word's pronunciation.
 * Visible at all scaffold levels. Uses conditional audio — if the sound
 * file isn't loaded, Howler logs a warning but doesn't crash.
 */
export function SpellingWordAudio({
	word,
}: SpellingWordAudioProps): React.JSX.Element {
	const { play } = useAudio();

	function handleTap(): void {
		play(getWordAudioName(word));
	}

	return (
		<m.button
			type="button"
			onClick={handleTap}
			whileTap={{ scale: 0.9 }}
			className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 shadow-md active:bg-primary-200"
			aria-label={`Play pronunciation of ${word}`}
		>
			<svg
				width="28"
				height="28"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="text-primary-600"
				role="img"
				aria-label="Speaker"
			>
				<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
				<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
				<path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
			</svg>
		</m.button>
	);
}
