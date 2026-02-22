/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
      },
      colors: {
        gold: {
          light: '#f4e4a6',
          DEFAULT: '#d4af37',
          dark: '#b8860b',
          darker: '#8b6914',
        },
        bg: {
          dark: '#0a0908',
          card: 'rgba(20, 18, 15, 0.95)',
        },
        border: {
          gold: 'rgba(212, 175, 55, 0.3)',
        },
        status: {
          green: '#4ade80',
          yellow: '#fbbf24',
          red: '#f87171',
          blue: '#60a5fa',
        },
      },
      maxWidth: {
        app: '430px',
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
}
