/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-light': 'var(--primary-light)',
        secondary: 'var(--secondary)',
        'secondary-light': 'var(--secondary-light)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
  darkMode: 'class', // เพิ่ม darkMode เพื่อให้รองรับการใช้งานโหมดมืด
  plugins: [],
}
