/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        neural: {
          dark: '#0a0e27',
          glow: '#00d4ff',
        }
      }
    },
  },
  plugins: [],
}