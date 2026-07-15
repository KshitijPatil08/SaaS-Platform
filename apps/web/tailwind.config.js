import { type Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#8B5CF6',
        secondary: '#7C3AED',
        dark: '#1e293b',
        light: '#f8fafc',
      },
      animation: {
        'gradient': 'gradient 8s linear infinite',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        gradient: {
          '0%': { 'background-position': '0% 50%' },
          '100%': { 'background-position': '100% 50%' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config