interface MockNumpadProps {
	readonly onDigit: (digit: number) => void;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function MockNumpad({ onDigit }: MockNumpadProps): React.JSX.Element {
	return (
		<div className="grid grid-cols-5 gap-2">
			{DIGITS.map((digit) => (
				<button
					key={digit}
					type="button"
					onClick={() => onDigit(digit)}
					className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-100 font-display text-2xl text-primary-700 active:bg-primary-200"
				>
					{digit}
				</button>
			))}
		</div>
	);
}
