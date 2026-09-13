/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'system-ui', 'sans-serif'],
      },
      colors: {
        zen: {
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          text: 'var(--text-primary)',
          'text-2': 'var(--text-secondary)',
          accent: 'var(--accent)',
          'accent-soft': 'var(--accent-soft)',
        },
      },
      borderRadius: {
        small: 'var(--radius-small)',
        card: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        'glass': '0 4px 20px var(--shadow)',
        'glass-hover': '0 8px 32px var(--shadow)',
        'btn': '0 2px 8px var(--shadow)',
      },
      backdropBlur: {
        zen: '24px',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        medium: 'var(--motion-medium)',
        slow: 'var(--motion-slow)',
      },
      transitionTimingFunction: {
        zen: 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      animation: {
        'fade-in': 'fadeIn var(--motion-medium) cubic-bezier(0.25, 1, 0.5, 1)',
        'fade-up': 'fadeUp var(--motion-slow) cubic-bezier(0.25, 1, 0.5, 1)',
        'slide-up': 'slideUp var(--motion-slow) cubic-bezier(0.25, 1, 0.5, 1)',
        'slide-right': 'slideRight var(--motion-slow) cubic-bezier(0.25, 1, 0.5, 1)',
        'scale-in': 'scaleIn var(--motion-medium) cubic-bezier(0.25, 1, 0.5, 1)',
        'ripple': 'ripple var(--motion-medium) ease-out',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
