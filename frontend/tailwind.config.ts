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
      colors: {
        brand: {
          50:  '#eef6ff',
          100: '#dceeff',
          200: '#badcff',
          300: '#91c4ff',
          400: '#60a4ff',
          500: '#3b82f6',   // primary
          600: '#2f6adf',
          700: '#2556b9',
          800: '#1f4694',
          900: '#1c3a78'
        },
        bg: {
          DEFAULT: '#f6f7f9', // app canvas
          card: '#ffffff',
          muted: '#f3f4f6',
        },
        border: '#e5e7eb',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        elevate: '0 8px 24px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1rem',
      },
      fontSize: {
        xs: ['0.75rem', '1rem'],
        sm: ['0.875rem', '1.25rem'],
        base: ['1rem', '1.6rem'],
        lg: ['1.125rem', '1.8rem'],
        xl: ['1.25rem', '2rem'],
        '2xl': ['1.5rem', '2.2rem'],
      }
    }
  },
  plugins: [],
} satisfies Config
