/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-light': '#85B7EB',
        'brand-dark': '#042C53',
      }
    },
  },
  plugins: [],
}
