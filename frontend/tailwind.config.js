/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'Plus Jakarta Sans', 'Noto Sans Tamil', 'Noto Sans Devanagari', 'sans-serif'],
        handwriting: ['Caveat', 'cursive'],
      },
      colors: {
        charity: {
          cream: '#F7EBD2',
          'cream-light': '#FFF9ED',
          'cream-dark': '#EFE1C3',
          dark: '#17231E',
          'dark-soft': '#24332D',
          'dark-muted': '#3D4D46',
          green: '#159B5B',
          'green-hover': '#12834D',
          'green-light': '#E8F3E9',
          'green-pale': '#F1F8F2',
          orange: '#F2A33A',
          'orange-light': '#FEF6EA',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        urgency: {
          critical: '#f43f5e',
          high: '#fb923c',
          medium: '#facc15',
          low: '#10b981',
        },
        surface: {
          card: 'rgba(255, 255, 255, 0.85)',
          darkcard: 'rgba(15, 23, 42, 0.75)',
        }
      },
      boxShadow: {
        'glow-brand': '0 0 30px -5px rgba(99, 102, 241, 0.45)',
        'glow-indigo': '0 0 30px -5px rgba(99, 102, 241, 0.45)',
        'glow-blue': '0 0 30px -5px rgba(59, 130, 246, 0.45)',
        'glow-emerald': '0 0 30px -5px rgba(16, 185, 129, 0.45)',
        'glow-teal': '0 0 30px -5px rgba(20, 184, 166, 0.45)',
        'glow-rose': '0 0 30px -5px rgba(244, 63, 94, 0.45)',
        'glow-violet': '0 0 30px -5px rgba(139, 92, 246, 0.45)',
        'glow-amber': '0 0 30px -5px rgba(245, 158, 11, 0.45)',
        'glass': '0 10px 40px -10px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.6)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1deg)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-16px) rotate(-1.5deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        'gradient-shift': {
          '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
          '50%': { 'background-size': '200% 200%', 'background-position': 'right center' },
        }
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        'float-slow': 'float-slow 8s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
        shimmer: 'shimmer 2.5s infinite',
        'gradient-shift': 'gradient-shift 6s ease infinite',
      }
    },
  },
  plugins: [],
}

