/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx}',
  ],
  theme: {
    borderRadius: {
      none: '0',
      DEFAULT: '0',
      sm: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '0',
    },
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        brand: {
          base: 'var(--base)',
          surface1: 'var(--surface-1)',
          surface2: 'var(--surface-2)',
          surface3: 'var(--surface-3)',
          border: 'var(--border)',
          borderActive: 'var(--border-active)',
          text1: 'var(--text-1)',
          text2: 'var(--text-2)',
          text3: 'var(--text-3)',
          accent: 'var(--accent)',
          accentHover: 'var(--accent-hover)',
          accentMuted: 'var(--accent-muted)',
          cyan: 'var(--cyan)',
          success: 'var(--success)',
          error: 'var(--error)',
          warning: 'var(--warning)',
        }
      },
      animation: {
        'cursor-blink': 'cursor-blink 1s steps(2) infinite',
        'fade': 'fade 150ms ease',
        'panel-slide': 'panel-slide 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'highlight-pulse': 'highlight-pulse 600ms ease-out',
      },
      keyframes: {
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'fade': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'panel-slide': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'highlight-pulse': {
          '0%': { boxShadow: '0 0 0 0 var(--accent-muted)' },
          '100%': { boxShadow: '0 0 0 8px transparent' },
        },
      },
    },
  },
  plugins: [],
};
