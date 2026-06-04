/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        festi: {
          bg: '#0c0a1d',
          panel: '#161232',
          panel2: '#1e1842',
          border: '#2d2660',
          accent: '#a855f7',
          accent2: '#ec4899',
          gold: '#fbbf24',
          mint: '#34d399',
          danger: '#f43f5e',
        },
      },
      fontFamily: {
        display: ['"Trebuchet MS"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(168,85,247,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(168,85,247,0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'pop': 'pop 0.25s ease-out',
        'pulse-glow': 'pulse-glow 2s infinite',
      },
    },
  },
  plugins: [],
};
