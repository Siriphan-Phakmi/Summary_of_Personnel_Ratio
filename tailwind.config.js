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
      fontFamily: {
        sarabun: ['THSarabunNew', 'sans-serif'],
      },
      fontSize: {
        base: '24px',
        lg: '24px',
        xl: '24px',
        '2xl': '24px',
        nav: '24px',
        table: '24px',
        input: '24px',
        button: '24px',
        label: '24px',
      },
      colors: {
        'dark-bg': '#111827',
        'dark-card': '#1e293b',
        'dark-input': '#1e293b',
        'dark-border': '#374151',
        'dark-text': '#f9fafb',
        'dark-text-secondary': '#d1d5db',
        'light-bg': '#f9fafb',
        'light-card': '#ffffff',
        'light-border': '#e5e7eb',
        'light-text': '#111827',
        'light-text-secondary': '#4b5563',
        'btn-primary': '#2563eb',
        'btn-primary-hover': '#1d4ed8',
        'btn-danger': '#ef4444',
        'btn-danger-hover': '#dc2626',
      },
      backgroundColor: {
        'dark-bg': 'var(--bg-color)',
        'dark-card': 'var(--card-bg)',
        'dark-input': 'var(--input-bg)',
      },
      textColor: {
        'dark-text': 'var(--text-color)',
        'dark-text-secondary': 'var(--text-color-secondary)',
      },
      borderColor: {
        'dark-border': 'var(--border-color)',
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
