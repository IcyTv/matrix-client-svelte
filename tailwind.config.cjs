/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			transitionTimingFunction: {
				bounce: 'cubic-bezier(0.18, 0.89, 0.87, 2)',
			},
		},
		fontFamily: {
			sans: ["'Poppins'", 'sans-serif', 'Twemoji'],
			plaster: ["'Plaster'", 'cursive'],
			mono: ["'Roboto Mono'", 'monospace'],
		},
	},
	plugins: [require('tailwind-scrollbar')({ nocompatible: true }), require('@vidstack/player/tailwind.cjs')],
};
