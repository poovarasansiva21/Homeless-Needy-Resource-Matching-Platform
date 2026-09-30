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
        serif: ['Playfair Display', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Manrope', 'Noto Sans Tamil', 'Noto Sans Devanagari', 'sans-serif'],
        handwriting: ['Caveat', 'cursive'],
      },
      colors: {
        humanitarian: {
          ivory: '#F9F6F0',
          cream: '#FAF7F2',
          sand: '#F3ECE2',
          beige: '#EFE7DB',
          charcoal: '#1C1917',
          dark: '#0D0D0D',
          'card-dark': '#161616',
          'surface-dark': '#1E1E1E',
          coral: '#F25C38',
          'coral-hover': '#E04925',
          amber: '#D97706',
          muted: '#78716C',
        },
        forest: {
          900: '#0B4F3A',
          800: '#159A68',
          700: '#12B76A',
          dark: '#10251E',
          deep: '#0B1713',
        },
        brand: {
          coral: '#F25C38',
          orange: '#F25C38',
          cream: '#F9F6F0',
          dark: '#0D0D0D',
          text: '#1C1917',
          muted: '#78716C',
        },
        urgency: {
          critical: '#F25C38',
          high: '#EA580C',
          medium: '#D97706',
          low: '#10B981',
        },
        surface: {
          card: 'rgba(255, 255, 255, 0.88)',
          darkcard: 'rgba(16, 37, 30, 0.85)',
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

