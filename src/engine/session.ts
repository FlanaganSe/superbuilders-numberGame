import type { RoundResult, SessionData } from "../types/game";

// ─── Star calculation ───────────────────────────────────────────────────────

export function starsForAttempt(attemptNumber: number): 1 | 2 | 3 {
	if (attemptNumber <= 1) return 3;
	if (attemptNumber === 2) return 2;
	return 1;
}

// ─── Session building ───────────────────────────────────────────────────────

export const DEFAULT_PROBLEM_COUNT = 15;

export function totalStarsFromRounds(rounds: readonly RoundResult[]): number {
	return rounds.reduce((sum, round) => sum + round.stars, 0);
}

// ─── Cumulative persistence ─────────────────────────────────────────────────

const STORAGE_KEY = "superbuilders-cumulative";

interface CumulativeData {
	readonly totalStars: number;
	readonly sessionsPlayed: number;
}

const DEFAULT_CUMULATIVE: CumulativeData = {
	totalStars: 0,
	sessionsPlayed: 0,
};

export function loadCumulative(): CumulativeData {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULT_CUMULATIVE;
		const parsed: unknown = JSON.parse(raw);
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"totalStars" in parsed &&
			"sessionsPlayed" in parsed &&
			typeof (parsed as CumulativeData).totalStars === "number" &&
			typeof (parsed as CumulativeData).sessionsPlayed === "number"
		) {
			return parsed as CumulativeData;
		}
		return DEFAULT_CUMULATIVE;
	} catch {
		return DEFAULT_CUMULATIVE;
	}
}

export function saveCumulative(data: CumulativeData): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch {
		// localStorage may be full or disabled — silently fail
	}
}

export function recordSession(session: SessionData): CumulativeData {
	const current = loadCumulative();
	const updated: CumulativeData = {
		totalStars: current.totalStars + session.totalStars,
		sessionsPlayed: current.sessionsPlayed + 1,
	};
	saveCumulative(updated);
	return updated;
}

// ─── Mute preference ────────────────────────────────────────────────────────

const MUTE_KEY = "superbuilders-mute";

export function loadMute(): boolean {
	try {
		return localStorage.getItem(MUTE_KEY) === "true";
	} catch {
		return false;
	}
}

export function saveMute(muted: boolean): void {
	try {
		localStorage.setItem(MUTE_KEY, muted ? "true" : "false");
	} catch {
		// silently fail
	}
}
