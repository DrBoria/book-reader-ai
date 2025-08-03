/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-dot': 'pulse-dot 1.4s infinite ease-in-out both',
      }
    },
  },
  plugins: [],
}
