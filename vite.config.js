import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { viteCommonjs, esbuildCommonjs } from '@originjs/vite-plugin-commonjs';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [sveltekit(), wasm(), topLevelAwait(), viteCommonjs()],

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
			drop: ['console', 'debugger'],
			pure: ['console.log', 'console.warn', 'console.error', 'console.info'],
		},
	},
	// to make use of `TAURI_DEBUG` and other env variables
	// https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
	envPrefix: ['VITE_', 'TAURI_'],
	build: {
		// Tauri supports es2021
		target: ['es2021', 'chrome100', 'safari13'],
		// don't minify for debug builds
		minify: !process.env.TAURI_DEBUG ? 'terser' : false,
		// produce sourcemaps for debug builds
		sourcemap: !!process.env.TAURI_DEBUG,

		rollupOptions: {
			manualChunks: {
				carbon: ['carbon-icons-svelte'],
				emojibase: ['emojibase-data/en/compact.json', 'emojibase-data/en/messages.json'],
				emojibaseShort: ['emojibase-data/en/shortcodes/emojibase.json'],
			},
		},
	},
});
