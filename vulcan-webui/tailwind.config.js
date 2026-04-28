/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vulcan: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d4fe',
          300: '#a3b8fc',
          400: '#7a91f9',
          500: '#5a6ef5',
          600: '#4449e8',
          700: '#3638cf',
          800: '#2e30ab',
          900: '#292d8a',
          950: '#161848',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
