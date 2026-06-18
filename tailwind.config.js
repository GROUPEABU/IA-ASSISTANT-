/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      fontSize: {
        label:   ['10px', { lineHeight: '1.4' }],
        caption: ['11px', { lineHeight: '1.4' }],
      },
      colors: {
        navy: {
          900: '#0D273C',
          800: '#102f47',
          700: '#143756',
          600: '#1a4468',
        },
        cyan: {
          400: '#50E5E5',
          300: '#7aecec',
          200: '#a3f3f3',
          500: '#2ed8d8',
        },
        warn: '#E6B450',
        surface: {
          DEFAULT: '#102f47',
          dark: '#0D273C',
          light: '#143756',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand':
          'linear-gradient(135deg, #0D273C 0%, #143756 100%)',
      },
      boxShadow: {
        cyan: '0 0 20px rgba(80, 229, 229, 0.15)',
        'cyan-lg': '0 0 40px rgba(80, 229, 229, 0.25)',
      },
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':     'fadeIn 0.3s ease-in-out',
        'fade-in-up':  'fadeInUp 0.35s ease-out both',
        'slide-up':    'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(7px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
