/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tts-primary': '#6366f1',
        'tts-secondary': '#8b5cf6',
        'tts-dark': '#1e1e2e',
        'tts-card': '#2a2a3e',
        'tts-text': '#ffffff',
        'tts-muted': '#a1a1aa',
        'tts-success': '#22c55e',
        'tts-warning': '#f59e0b',
        'tts-danger': '#ef4444',
      }
    },
  },
  plugins: [],
}
