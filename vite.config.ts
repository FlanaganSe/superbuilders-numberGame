/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";
import { VitePWA } from "vite-plugin-pwa";
import { viteStaticCopy } from "vite-plugin-static-copy";

const isTest = process.env.VITEST === "true";
const skipHttps = isTest || process.env.NO_HTTPS === "true";

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		!skipHttps ? mkcert() : null,
		viteStaticCopy({
			targets: [
				{
					src: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm",
					dest: ".",
				},
				{
					src: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs",
					dest: ".",
				},
			],
		}),
		!isTest
			? VitePWA({
					registerType: "autoUpdate",
					workbox: {
						maximumFileSizeToCacheInBytes: 30_000_000,
						globPatterns: ["**/*.{js,css,html,wasm,mp3,m4a}"],
						runtimeCaching: [
							{
								urlPattern: /\/models\/.*\.onnx$/,
								handler: "StaleWhileRevalidate",
								options: {
									cacheName: "onnx-models",
									expiration: {
										maxEntries: 5,
										maxAgeSeconds: 60 * 60 * 24 * 365,
									},
									cacheableResponse: { statuses: [0, 200] },
								},
							},
						],
					},
					manifest: false,
				})
			: null,
	].filter(Boolean) as import("vite").PluginOption[],
	worker: {
		format: "es",
	},
	optimizeDeps: {
		exclude: ["onnxruntime-web"],
	},
	resolve: {
		conditions: ["browser"],
	},
	assetsInclude: ["**/*.onnx"],
	test: {
		environment: "happy-dom",
		include: ["src/**/*.test.{ts,tsx}"],
	},
});
