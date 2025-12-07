/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"], // Enable dark mode via class (shadcn/ui requirement)
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Keep your content paths
  ],
  theme: {
  	extend: {
  		fontSize: {
  			xs: [
  				'12px',
  				'16px'
  			]
  		},
  		backgroundImage: {
  			signin: "url('/src/assets/background/curve-rocket.webp')",
			"rocketsmall": "url('/src/assets/background/rocketsmall.webp')",
  		},
  		fontFamily: {
  			neon: [
  				'Tilt Neon',
  				'sans-serif'
  			]
  		},
  		colors: {
  			dark: '#0f1729',
  			lightDark: '#5fa5fa',
  			brown: '#854e00ff',
  			lightYellow: '#f5ff82',
  			manz: '#d5e055',
  			parrot: '#8dcc90',
  			deepSlate: '#274490',
  			deepOldSlate: '#4260cad6',
  			lightPink: '#edae8c',
  			lightChocolate: '#663039',
  			chocolate: '#462737',
  			oceanBlue: '#027bb3ff',
  			fireOrange: '#ff6803ff',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		screens: {
  			sm: '740px',
  			md: '968px',
  			lg: '1100px',
  			xl: '1100px',
  			wide: '1440px'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'animate-heart': {
  				'0%': {
  					'stroke-dashoffset': '0'
  				},
  				'40%': {
  					'stroke-dashoffset': '60'
  				},
  				'60%': {
  					'stroke-dashoffset': '120',
  					'fill': 'transparent'
  				},
  				'100%': {
  					'stroke-dashoffset': '120',
  					'fill': 'var(--fill-color, #31e8ff)'
  				}
  			},
  			'fill-animation': {
  				'0%': {
  					'fill': 'var(--fill-color, #31e8ff)'
  				},
  				'60%': {
  					'fill': 'transparent'
  				},
  				'100%': {
  					'fill': 'transparent'
  				}
  			},
  			gototop: {
  				'0%': {
  					transform: 'translateY(0.2rem)'
  				},
  				'100%': {
  					transform: 'translateY(1rem)'
  				}
  			},
  			slideUp: {
  				'0%': {
  					transform: 'translateY(100%)'
  				},
  				'100%': {
  					transform: 'translateY(0)'
  				}
  			},
  			rippleEffect: {
  				'0%': {
  					width: '57%',
  					height: '57%',
  					opacity: '1'
  				},
  				'100%': {
  					width: '160%',
  					height: '160%',
  					opacity: '0'
  				}
  			},
  			l6: {
  				'20%': {
  					'background-position': '0% 0%, 50% 50%, 100% 50%'
  				},
  				'40%': {
  					'background-position': '0% 100%, 50% 0%, 100% 50%'
  				},
  				'60%': {
  					'background-position': '0% 50%, 50% 100%, 100% 0%'
  				},
  				'80%': {
  					'background-position': '0% 50%, 50% 50%, 100% 100%'
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			heart: 'animate-heart 0.8s linear forwards',
  			'fill-animation': 'fill-animation 0.8s linear forwards',
  			gototop: 'gototop 3s linear infinite alternate-reverse',
  			slideUp: 'slideUp 0.5s ease-out',
  			rippleEffect: 'rippleEffect 5s infinite',
  			l6: 'l6 1s infinite linear',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")], // Keep shadcn/ui's animation plugin
};