/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: '#3D6CB9',
          light: '#E0F2FE',
          pastel: '#F0F7FF',
          dark: '#2C4E8A'
        },
        secondary: {
          DEFAULT: '#10b981',
          light: '#d1fae5',
          pastel: '#F0FDF9',
          dark: '#0B8A61'
        },
        success: {
          DEFAULT: '#22c55e',
          light: '#dcfce7',
          pastel: '#F0FDF4',
          dark: '#16A34A'
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fef3c7',
          pastel: '#FFFBEB',
          dark: '#D97706'
        },
        error: {
          DEFAULT: '#ef4444',
          light: '#fee2e2',
          pastel: '#FEF2F2',
          dark: '#DC2626'
        },
        info: {
          DEFAULT: '#3b82f6',
          light: '#dbeafe',
          pastel: '#F0F7FF',
          dark: '#2563EB'
        }
      },
    },
  },
  plugins: [],
};
