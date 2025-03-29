/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-bg': '#1a2d27',
      },
      fontFamily: {
        sarabun: ['THSarabunNew', 'sans-serif'],
      },
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-in-out',
        'spin-slow': 'spin 3s linear infinite',
        'ripple': 'ripple 0.6s linear',
        'enter': 'enter 0.3s ease-out forwards',
        'leave': 'leave 0.2s ease-in forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.4' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        enter: {
          '0%': { opacity: '0', transform: 'scale(0.9) translateY(-10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' }
        },
        leave: {
          '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          '100%': { opacity: '0', transform: 'scale(0.9) translateY(-10px)' }
        }
      },
    },
  },
  plugins: [],
}
