import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: isCI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: "http://localhost:4173",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
	],
	webServer: {
		command: "NO_HTTPS=true pnpm preview --port 4173",
		url: "http://localhost:4173",
		reuseExistingServer: !isCI,
	},
});
