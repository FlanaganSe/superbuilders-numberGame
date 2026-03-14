// ─── Sound Manager ──────────────────────────────────────────────────────────
//
// Howler.js setup with individual sound files (MP3 + M4A for iOS compatibility).
// Handles iOS AudioContext unlock and visibilitychange resume.
//
// Key constraints:
// - Howler.autoSuspend = false MUST be set before any Howl instance (research §4.3)
// - MP3 + M4A only — no OGG/WebM on iOS Safari
// - AudioContext unlock must happen inside a user gesture handler
// - Handle both 'suspended' and 'interrupted' AudioContext states (iOS quirk)

import { Howl, Howler } from "howler";

// ─── Critical: set BEFORE creating any Howl instance (research §4.3) ────────

Howler.autoSuspend = false;

// ─── Sound names ────────────────────────────────────────────────────────────

export type SoundName =
	| "correctChime"
	| "encouragement"
	| "tileDetectedPop"
	| "sessionEndFanfare"
	| "countdownTick"
	| "number0"
	| "number1"
	| "number2"
	| "number3"
	| "number4"
	| "number5"
	| "number6"
	| "number7"
	| "number8"
	| "number9";

// ─── File mapping ───────────────────────────────────────────────────────────
// Individual files (not sprites). Swap to a single sprite by changing
// this to a Howl sprite config — the SoundName type and playSound API stay
// the same.

const SOUND_FILES: Record<SoundName, string> = {
	correctChime: "correct",
	encouragement: "encourage",
	tileDetectedPop: "tile-pop",
	sessionEndFanfare: "fanfare",
	countdownTick: "countdown-tick",
	number0: "zero",
	number1: "one",
	number2: "two",
	number3: "three",
	number4: "four",
	number5: "five",
	number6: "six",
	number7: "seven",
	number8: "eight",
	number9: "nine",
};

// ─── Howl instance cache ────────────────────────────────────────────────────

const howls = new Map<SoundName, Howl>();

function getHowl(name: SoundName): Howl {
	const existing = howls.get(name);
	if (existing) return existing;

	const file = SOUND_FILES[name];
	const howl = new Howl({
		src: [`/sounds/${file}.mp3`, `/sounds/${file}.m4a`],
		preload: true,
		volume: 0.8,
	});
	howls.set(name, howl);
	return howl;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Preload all sound files. Safe to call multiple times. */
export function preloadSounds(): void {
	const names = Object.keys(SOUND_FILES) as readonly SoundName[];
	for (const name of names) {
		getHowl(name);
	}
}

/** Play a named sound. Does NOT check mute — caller is responsible. */
export function playSound(name: SoundName): void {
	const howl = getHowl(name);
	const id = howl.play();
	if (name === "correctChime") {
		howl.once(
			"play",
			() => {
				howl.rate(0.9 + Math.random() * 0.2, id);
			},
			id,
		);
	}
}

/** Stop all instances of a named sound. */
export function stopSound(name: SoundName): void {
	const howl = howls.get(name);
	if (howl) howl.stop();
}

/**
 * Unlock iOS AudioContext and preload sounds.
 * MUST be called inside a user gesture handler (tap/click).
 */
export function unlockAudio(): void {
	// preloadSounds triggers lazy AudioContext creation inside Howler,
	// so Howler.ctx is guaranteed non-null after this call.
	preloadSounds();
	const ctx = Howler.ctx;
	if (ctx && ctx.state !== "running") {
		// resume() returns a Promise — catch rejections that can occur
		// if the context is in 'interrupted' state (iOS after Siri/phone call).
		// The visibilitychange handler will retry on next foreground.
		ctx.resume().catch(() => {});
	}
}

/**
 * Set up visibilitychange listener to resume audio after backgrounding.
 * Handles both 'suspended' and 'interrupted' states (iOS quirk — research §4.4).
 * Returns cleanup function.
 */
export function setupVisibilityResume(): () => void {
	function handleVisibilityChange(): void {
		if (document.visibilityState !== "visible") return;
		const ctx = Howler.ctx;
		if (!ctx) return;
		// iOS can set AudioContext state to 'interrupted' after Siri, phone
		// calls, or backgrounding — not in standard TS types, so cast.
		const state = ctx.state as string;
		if (state === "suspended" || state === "interrupted") {
			// Small delay — immediate resume sometimes fails on iOS (research §4.4)
			setTimeout(() => {
				ctx.resume().catch(() => {});
			}, 200);
		}
	}

	document.addEventListener("visibilitychange", handleVisibilityChange);
	return () => {
		document.removeEventListener("visibilitychange", handleVisibilityChange);
	};
}
