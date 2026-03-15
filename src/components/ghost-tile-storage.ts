const STORAGE_KEY = "superbuilders_first_scan";

export function hasSeenGuide(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === "true";
	} catch {
		return false;
	}
}

export function markGuideSeen(): void {
	try {
		localStorage.setItem(STORAGE_KEY, "true");
	} catch {
		// silently fail
	}
}
