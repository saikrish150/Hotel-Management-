/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-gold': 'var(--theme-primary)',
        'brand-gold-dark': 'var(--theme-primary-dark)',
        'brand-dark': 'var(--theme-bg)',
        'brand-dark-card': 'var(--theme-card)',
        'brand-dark-surface': 'var(--theme-surface)',
        'brand-panel': 'var(--theme-panel)',
        'accent-green': '#10b981',
        'accent-red': '#f43f5e'
      },
      boxShadow: {
        'gold-glow': '0 0 25px var(--theme-glow)',
        'gold-glow-hover': '0 0 35px var(--theme-glow-hover)',
        'premium-shadow': '0 10px 40px -10px var(--theme-shadow)',
        'panel-shadow': '0 20px 50px var(--theme-shadow-heavy)'
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' }
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(212, 175, 55, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(212, 175, 55, 0.4)' }
        }
      }
    },
  },
  plugins: [],
}

