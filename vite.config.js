import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { viteCommonjs, esbuildCommonjs } from '@originjs/vite-plugin-commonjs';
// import { prismjsPlugin } from 'vite-plugin-prismjs';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		sveltekit(),
		wasm(),
		topLevelAwait(),
		viteCommonjs(),
		// prismjsPlugin({
		// 	theme: 'dark',
		// 	css: true,
		// }),
	],

	// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
	// prevent vite from obscuring rust errors
	clearScreen: false,
	// tauri expects a fixed port, fail if that port is not available
	server: {
		port: 1420,
		strictPort: true,
	},
	optimizeDeps: {
		esbuildOptions: {
			define: {
				global: 'globalThis',
			},
			plugins: [esbuildCommonjs(['raf'])],
		},
	},
	// to make use of `TAURI_DEBUG` and other env variables
	// https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
	envPrefix: ['VITE_', 'TAURI_'],
	build: {
		// Tauri supports es2021
		target: ['es2021', 'chrome100', 'safari13'],
		// don't minify for debug builds
		minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
		// produce sourcemaps for debug builds
		sourcemap: !!process.env.TAURI_DEBUG,
	},
});
