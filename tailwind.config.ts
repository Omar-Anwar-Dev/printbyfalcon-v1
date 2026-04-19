import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        ink: 'hsl(var(--ink))',
        'ink-2': 'hsl(var(--ink-2))',
        canvas: 'hsl(var(--canvas))',
        paper: 'hsl(var(--paper))',
        'paper-hover': 'hsl(var(--paper-hover))',

        border: 'hsl(var(--border))',
        'border-strong': 'hsl(var(--border-strong))',
        input: 'hsl(var(--border-strong))',
        ring: 'hsl(var(--accent))',

        background: 'hsl(var(--canvas))',
        foreground: 'hsl(var(--ink))',

        card: {
          DEFAULT: 'hsl(var(--paper))',
          foreground: 'hsl(var(--ink))',
        },
        popover: {
          DEFAULT: 'hsl(var(--canvas))',
          foreground: 'hsl(var(--ink))',
        },
        primary: {
          DEFAULT: 'hsl(var(--ink))',
          foreground: 'hsl(var(--canvas))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--paper))',
          foreground: 'hsl(var(--ink))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted-bg))',
          foreground: 'hsl(var(--muted-fg))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--canvas))',
          strong: 'hsl(var(--accent-strong))',
          soft: 'hsl(var(--accent-soft))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--error))',
          foreground: 'hsl(var(--canvas))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          soft: 'hsl(var(--success-soft))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          soft: 'hsl(var(--warning-soft))',
        },
        error: {
          DEFAULT: 'hsl(var(--error))',
          soft: 'hsl(var(--error-soft))',
        },
      },

      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        arabic: [
          'var(--font-arabic)',
          'var(--font-sans)',
          'ui-sans-serif',
          'sans-serif',
        ],
      },

      fontSize: {
        xs: ['12px', { lineHeight: '1.5', letterSpacing: '0' }],
        sm: ['14px', { lineHeight: '1.5', letterSpacing: '0' }],
        base: ['16px', { lineHeight: '1.5', letterSpacing: '0' }],
        lg: ['18px', { lineHeight: '1.5', letterSpacing: '0' }],
        xl: ['20px', { lineHeight: '1.4', letterSpacing: '-0.005em' }],
        '2xl': ['24px', { lineHeight: '1.35', letterSpacing: '-0.01em' }],
        '3xl': ['32px', { lineHeight: '1.25', letterSpacing: '-0.015em' }],
        '4xl': ['48px', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        '5xl': ['64px', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
      },

      spacing: {
        '18': '72px',
        '22': '88px',
        '30': '120px',
        '34': '136px',
      },

      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        md: '10px',
        lg: '10px',
        xl: '16px',
        '2xl': '20px',
      },

      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 2px 8px rgba(15,23,42,0.04)',
        popover:
          '0 8px 24px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.04)',
      },

      transitionTimingFunction: {
        'out-smooth': 'cubic-bezier(0.2, 0.7, 0.3, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
        slow: '280ms',
      },

      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in-end': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-start': {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms cubic-bezier(0.2,0.7,0.3,1) both',
        'slide-in-end': 'slide-in-end 220ms cubic-bezier(0.2,0.7,0.3,1) both',
        'slide-in-start':
          'slide-in-start 220ms cubic-bezier(0.2,0.7,0.3,1) both',
        'slide-up': 'slide-up 220ms cubic-bezier(0.2,0.7,0.3,1) both',
        'scale-in': 'scale-in 180ms cubic-bezier(0.2,0.7,0.3,1) both',
      },
    },
  },
  plugins: [animate],
};

export default config;
