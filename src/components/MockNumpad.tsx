import * as m from "motion/react-m";
import type { Digit } from "../types/cv";

interface MockNumpadProps {
	readonly onDigit: (digit: Digit) => void;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function MockNumpad({ onDigit }: MockNumpadProps): React.JSX.Element {
	return (
		<div className="grid grid-cols-5 gap-3">
			{DIGITS.map((digit) => (
				<m.button
					key={digit}
					type="button"
					onClick={() => onDigit(digit)}
					whileTap={{ scale: 0.9 }}
					transition={{ type: "spring", stiffness: 400, damping: 17 }}
					className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-100 font-display text-3xl text-primary-700"
				>
					{digit}
				</m.button>
			))}
		</div>
	);
}
