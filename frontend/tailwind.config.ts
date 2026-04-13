import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist)', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        /* Brand / accent */
        accent: {
          DEFAULT: '#2563eb',
          hover:   '#1d4ed8',
          subtle:  '#eff6ff',
          text:    '#1e40af',
        },
        /* Zinc — dark mode surfaces */
        zinc: {
          50:  '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          850: '#1f1f23',
          900: '#18181b',
          925: '#111113',
          950: '#09090b',
        },
        /* Keep legacy brand for existing pages */
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        /* Status */
        success: { DEFAULT: '#10b981', subtle: '#dcfce7', text: '#15803d' },
        warning: { DEFAULT: '#f59e0b', subtle: '#fef9c3', text: '#854d0e' },
        danger:  { DEFAULT: '#dc2626', subtle: '#fee2e2', text: '#dc2626' },
      },
      boxShadow: {
        sm:   '0 1px 2px rgba(0,0,0,0.05)',
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        md:   '0 4px 12px rgba(0,0,0,0.08)',
        lg:   '0 8px 24px rgba(0,0,0,0.10)',
        xl:   '0 20px 40px rgba(0,0,0,0.12)',
        elevate: '0 8px 24px rgba(0,0,0,0.08)',
        'accent-glow': '0 0 20px rgba(37,99,235,0.25)',
      },
      borderRadius: {
        sm:   '4px',
        md:   '6px',
        DEFAULT: '8px',
        lg:   '10px',
        xl:   '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      fontSize: {
        '2xs': ['10px',  { lineHeight: '14px' }],
        xs:    ['12px',  { lineHeight: '16px' }],
        sm:    ['13.5px',{ lineHeight: '20px' }],
        base:  ['14px',  { lineHeight: '22px' }],
        md:    ['15px',  { lineHeight: '24px' }],
        lg:    ['16px',  { lineHeight: '26px' }],
        xl:    ['18px',  { lineHeight: '28px' }],
        '2xl': ['22px',  { lineHeight: '30px' }],
        '3xl': ['28px',  { lineHeight: '36px' }],
        '4xl': ['36px',  { lineHeight: '42px' }],
        '5xl': ['44px',  { lineHeight: '52px' }],
        '6xl': ['56px',  { lineHeight: '64px' }],
      },
      letterSpacing: {
        tight:  '-0.03em',
        snug:   '-0.02em',
        normal: '-0.01em',
        wide:   '0.02em',
        wider:  '0.05em',
        widest: '0.08em',
      },
      animation: {
        'fade-in':      'fadeIn 0.2s ease',
        'fade-up':      'fadeUp 0.3s ease',
        'slide-in-left':'slideInLeft 0.25s ease',
        'slide-in-right':'slideInRight 0.25s ease',
        'scale-in':     'scaleIn 0.15s ease',
        'shimmer':      'shimmer 1.4s infinite linear',
        'pulse-soft':   'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
      },
      transitionDuration: {
        fast:   '100ms',
        normal: '150ms',
        slow:   '250ms',
      },
    },
  },
  plugins: [],
} satisfies Config
