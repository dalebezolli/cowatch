/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[dark=""]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'Arial', 'sans-serif']
      },
      keyframes: {
        scroll: {
          '0%': { transform: 'translateX(110%)' },
          '100%': { transform: 'translateX(-200%)' }
        }
      },
      animation: {
        scroll: 'scroll 10s linear infinite',
      }
    },
  },
  plugins: [],
}

