/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				display: ['"Space Grotesk"', 'Inter', 'sans-serif']
			},
			/**
			 * Colours come from CSS variables so the theme picker can swap the
			 * whole palette without a rebuild. Every value is a real token, not
			 * a hardcoded Tailwind colour, so nothing drifts out of the system.
			 */
			colors: {
				surface: {
					DEFAULT: 'var(--surface-0)',
					1: 'var(--surface-1)',
					2: 'var(--surface-2)',
					3: 'var(--surface-3)'
				},
				content: {
					DEFAULT: 'var(--content-primary)',
					muted: 'var(--content-muted)',
					subtle: 'var(--content-subtle)'
				},
				accent: {
					DEFAULT: 'var(--accent)',
					hover: 'var(--accent-hover)',
					soft: 'var(--accent-soft)',
					on: 'var(--accent-on)'
				},
				line: {
					DEFAULT: 'var(--line)',
					strong: 'var(--line-strong)'
				},
				/* Semantic only — never decorative. */
				positive: 'var(--positive)',
				warning: 'var(--warning)',
				critical: 'var(--critical)'
			},
			/**
			 * One radius scale, applied consistently. Previously the UI mixed
			 * sharp corners, pills and three different card radii, which is a
			 * large part of why it looked assembled rather than designed.
			 */
			borderRadius: {
				sm: '6px',
				DEFAULT: '8px',
				md: '10px',
				lg: '12px',
				xl: '16px',
				'2xl': '20px',
				full: '9999px'
			},
			boxShadow: {
				/* Elevation is expressed as depth, not as a decorative outline. */
				sm: '0 1px 2px 0 rgb(0 0 0 / 0.24)',
				DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
				md: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
				lg: '0 10px 15px -3px rgb(0 0 0 / 0.35), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
				xl: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
				none: 'none'
			},
			transitionTimingFunction: {
				smooth: 'cubic-bezier(0.4, 0, 0.2, 1)'
			},
			keyframes: {
				'fade-in': {
					from: { opacity: '0' },
					to: { opacity: '1' }
				},
				'fade-up': {
					from: { opacity: '0', transform: 'translateY(6px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-in-left': {
					from: { transform: 'translateX(-100%)' },
					to: { transform: 'translateX(0)' }
				}
			},
			animation: {
				'fade-in': 'fade-in 0.2s ease-out both',
				'fade-up': 'fade-up 0.25s ease-out both',
				'slide-in-left': 'slide-in-left 0.25s ease-out both'
			}
		}
	},
	plugins: []
};
