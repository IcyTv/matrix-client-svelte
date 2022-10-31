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
			sans: ["'Poppins'", "'Roboto'", "'Open Sans'", 'sans-serif', 'Twemoji'],
			plaster: ["'Plaster'", 'cursive'],
		},
	},
	plugins: [require('tailwind-scrollbar')({ nocompatible: true }), require('@vidstack/player/tailwind.cjs')],
};
