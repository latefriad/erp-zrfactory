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
          DEFAULT: '#0F172A',
          light: '#1E293B',
          dark: '#020617',
        },
        accent: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#3B82F6',
        },
        gold: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
        }
      },
      fontFamily: {
        arabic: ['Cairo', 'Tajawal', 'IBM Plex Sans Arabic', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
