/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Core Primary Blue
          700: '#1d4ed8',
          800: '#1e40af', // Deep Brand Navy
          900: '#1e3a8a',
          950: '#172554',
        },
        surface: {
          light: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          dark: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'premium': '0 20px 25px -5px rgba(30, 64, 175, 0.1), 0 8px 10px -6px rgba(30, 64, 175, 0.1)',
      }
    },
  },
  plugins: [],
}
