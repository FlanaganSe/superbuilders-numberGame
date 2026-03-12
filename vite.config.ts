/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";
import { viteStaticCopy } from "vite-plugin-static-copy";

const isTest = process.env.VITEST === "true";

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		!isTest ? mkcert() : null,
		viteStaticCopy({
			targets: [
				{
					src: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm",
					dest: ".",
				},
			],
		}),
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
