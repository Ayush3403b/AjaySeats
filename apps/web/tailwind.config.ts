import type { Config } from 'tailwindcss';

/**
 * Tailwind maps to CSS variables defined in src/styles/theme.css.
 * To re-brand, change the variables in theme.css; nothing here needs to change.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        'bg-deep': 'var(--bg-deep)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-light': 'var(--bg-light)',
        'bg-card-light': 'var(--bg-card-light)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        highlight: 'var(--highlight)',
        premium: 'var(--premium)',
        sale: 'var(--sale)',
        whatsapp: 'var(--whatsapp)',
        'material-leather': 'var(--material-leather)',
        'material-leatherette': 'var(--material-leatherette)',
        'material-pvc': 'var(--material-pvc)',
        'material-fabric': 'var(--material-fabric)',
        'material-other': 'var(--material-other)',
        page: 'var(--bg)',
        surface: 'var(--surface)',
        card: 'var(--card)',
        ink: 'var(--text)',
        muted: 'var(--text-muted)',
        line: 'var(--border)',
        'on-primary': 'var(--on-primary)',
      },
      fontFamily: {
        heading: ['var(--font-heading)'],
        body: ['var(--font-body)'],
      },
      boxShadow: {
        glow: '0 0 0 1px var(--glow, transparent), 0 18px 50px -18px var(--glow, transparent)',
      },
    },
  },
  plugins: [],
};

export default config;
