/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
				display: ['"Space Grotesk"', 'Inter', 'sans-serif']
			},
			colors: {
				'bg-main': 'var(--bg-main)',
				'bg-secondary': 'var(--bg-secondary)',
				'bg-card': 'var(--bg-card)',
				'bg-hover': 'var(--bg-hover)',
				primary: 'var(--primary)',
				'primary-dark': 'var(--primary-dark)',
				'text-on-primary': 'var(--text-on-primary)',
				'text-main': 'var(--text-main)',
				'text-muted': 'var(--text-muted)',
				'red-hot': '#FF3B30',
				ink: 'var(--border-ink)',
				'admin-ink': 'var(--admin-border)'
			},
			/* ---- Neumorphism: soft, generous rounding everywhere ---- */
			borderRadius: {
				none: '0px',
				sm: '10px',
				DEFAULT: '16px',
				md: '18px',
				lg: '22px',
				xl: '26px',
				'2xl': '30px',
				'3xl': '34px',
				full: '9999px',
				poster: '18px'
			},
			borderWidth: {
				DEFAULT: '1px'
			},
			boxShadow: {
				none: 'none',
				sm: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
				DEFAULT: '5px 5px 10px var(--neu-dark), -5px -5px 10px var(--neu-light)',
				md: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
				lg: '8px 8px 18px var(--neu-dark), -8px -8px 18px var(--neu-light)',
				xl: '10px 10px 22px var(--neu-dark), -10px -10px 22px var(--neu-light)',
				'2xl': '14px 14px 28px var(--neu-dark), -14px -14px 28px var(--neu-light)',
				inner: 'inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)',
				'brutal-sm': '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
				brutal: '5px 5px 10px var(--neu-dark), -5px -5px 10px var(--neu-light)',
				'brutal-lg': '8px 8px 18px var(--neu-dark), -8px -8px 18px var(--neu-light)',
				'brutal-primary': '5px 5px 14px color-mix(in srgb, var(--primary) 35%, transparent)',
				'brutal-admin-sm': '2px 2px 5px var(--admin-neu-dark), -2px -2px 5px var(--admin-neu-light)',
				'brutal-admin': '4px 4px 10px var(--admin-neu-dark), -4px -4px 10px var(--admin-neu-light)',
				'brutal-admin-lg': '6px 6px 16px var(--admin-neu-dark), -6px -6px 16px var(--admin-neu-light)',
				'brutal-admin-xl': '8px 8px 20px var(--admin-neu-dark), -8px -8px 20px var(--admin-neu-light)'
			},
			animation: {
				'fade-in': 'fadeIn 0.5s ease-in-out'
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				}
			}
		}
	},
	plugins: []
};
