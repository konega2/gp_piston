import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        gp: {
          bg: '#0A0F16',
          panel: '#111826',
          racingRed: '#E10600',
          telemetryBlue: '#00CFFF',
          stateGreen: '#00FF85',
          textSoft: '#B8C2D4'
        }
      },
      boxShadow: {
        'panel-deep': '0 20px 55px rgba(0, 0, 0, 0.55), 0 8px 24px rgba(0, 0, 0, 0.4)',
        'input-red': '0 0 0 1px rgba(225, 6, 0, 0.5), 0 0 16px rgba(225, 6, 0, 0.15)',
        'button-glow': '0 0 20px rgba(0, 207, 255, 0.25), 0 0 36px rgba(225, 6, 0, 0.2)'
      },
      backgroundImage: {
        'card-border': 'linear-gradient(120deg, rgba(225, 6, 0, 0.7) 0%, rgba(0, 207, 255, 0.6) 100%)'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'telemetry-glow': {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '0.45' }
        },
        'telemetry-scan': {
          '0%': { transform: 'translateX(-100%)', opacity: '0.3' },
          '45%': { opacity: '0.9' },
          '100%': { transform: 'translateX(220%)', opacity: '0.2' }
        }
      },
      animation: {
        'fade-in': 'fade-in 500ms ease-out both',
        'telemetry-glow': 'telemetry-glow 5s ease-in-out infinite',
        'telemetry-scan': 'telemetry-scan 3.6s ease-in-out infinite'
      },
      letterSpacing: {
        technical: '0.14em'
      }
    }
  },
  plugins: []
};

export default config;
