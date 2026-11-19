/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wood: {
          50: '#fbf7ee',
          100: '#f4ecd7',
          200: '#e8d6ad',
          300: '#d9b97c',
          400: '#ca9b4f',
          500: '#b88132',
          600: '#9b6526',
          700: '#7c4d21',
          800: '#673f21',
          900: '#56351f',
          950: '#311b0e',
        },
        guitar: {
          dark: '#121214',
          body: '#1e1c1a',
          fret: '#2a2724',
          string: '#d4af37',
          bronze: '#cd7f32',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
