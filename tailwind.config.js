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
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      fontSize: {
        xs: '0.75rem',     // 12px
        sm: '0.875rem',    // 14px
        base: '1rem',      // 16px
        lg: '1.125rem',    // 18px
        xl: '1.25rem',     // 20px
        '2xl': '1.5rem',   // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem',  // 36px
        '5xl': '3rem',     // 48px
        nav: '1.125rem',   // 18px
        table: '1rem',     // 16px
        input: '1rem',     // 16px
        button: '1rem',    // 16px
        label: '1rem',     // 16px
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
        'btn-success': '#10b981',
        'btn-success-hover': '#059669',
        'gray-750': '#323945',
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
