import type { Config } from 'tailwindcss';

/**
 * Tailwind maps to CSS variables defined in src/styles/theme.css.
 * To re-brand, change the variables in theme.css; nothing here needs to change.
 * color-mix with <alpha-value> keeps opacity modifiers such as bg-primary/10 working on variables.
 */
const token = (name: string) => `color-mix(in srgb, var(${name}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-elevated': token('--bg-elevated'),
        primary: token('--primary'),
        'primary-dark': token('--primary-dark'),
        'primary-soft': token('--primary-soft'),
        secondary: token('--secondary'),
        gold: token('--secondary'),
        'gold-dark': token('--gold-dark'),
        'on-gold': token('--on-gold'),
        accent: token('--accent'),
        teal: token('--teal'),
        highlight: token('--highlight'),
        premium: token('--premium'),
        sale: token('--sale'),
        whatsapp: token('--whatsapp'),
        'material-leather': token('--material-leather'),
        'material-leatherette': token('--material-leatherette'),
        'material-pvc': token('--material-pvc'),
        'material-fabric': token('--material-fabric'),
        'material-other': token('--material-other'),
        page: token('--bg'),
        mist: token('--mist'),
        navy: token('--navy'),
        surface: token('--surface'),
        card: token('--card'),
        ink: token('--text'),
        muted: token('--text-muted'),
        line: token('--border'),
        'on-primary': token('--on-primary'),
      },
      fontFamily: {
        heading: ['var(--font-heading)'],
        body: ['var(--font-body)'],
        script: ['var(--font-script)'],
        brand: ['var(--font-brand)'],
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        lift: 'var(--shadow-lift)',
        glow: '0 0 0 1px var(--glow, transparent), 0 18px 50px -18px var(--glow, transparent)',
      },
    },
  },
  plugins: [],
};

export default config;
