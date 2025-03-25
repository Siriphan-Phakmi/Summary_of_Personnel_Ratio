/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/flowbite/**/*.{js,ts,jsx,tsx}',
    './node_modules/flowbite-react/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['THSarabunNew', 'sans-serif'],
        'sarabun': ['THSarabunNew', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
