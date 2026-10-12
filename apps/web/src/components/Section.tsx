import type { ReactNode } from 'react';
import { WordReveal } from './motion/WordReveal.js';

type Tone = 'indigo' | 'gold' | 'dark';

const TONE_CLASS: Record<Tone, string> = { indigo: '', gold: 'eyebrow-gold', dark: 'eyebrow-dark' };

/** Small tracked-caps pill with a dot, shown above a section title. */
export function Eyebrow({ children, tone = 'indigo', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <p className={`eyebrow ${TONE_CLASS[tone]} ${className}`}>{children}</p>;
}

/**
 * Section title block: eyebrow, serif heading (last words in indigo, or a script line), accent bar
 * and an optional subtitle. Centre-aligned or left-aligned.
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  accentWords = 1,
  script,
  subtitle,
  align = 'left',
  tone = 'indigo',
  className = '',
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  accentWords?: number;
  script?: string;
  subtitle?: string;
  align?: 'left' | 'center';
  tone?: Tone;
  className?: string;
}) {
  const centre = align === 'center';
  return (
    <div className={`${centre ? 'mx-auto text-center' : ''} max-w-3xl ${className}`}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <WordReveal id={id} as="h2" text={title} accentWords={script ? 0 : accentWords} script={script} className="t-h2 mt-5 text-ink" />
      <span aria-hidden className={`accent-bar mt-5 ${centre ? 'mx-auto' : ''}`} />
      {subtitle ? <p className={`mt-5 text-lg leading-relaxed text-muted ${centre ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>{subtitle}</p> : null}
    </div>
  );
}

/** Top band for inner pages: cream with a faint grid, eyebrow, h1 and subtitle. */
export function PageHeader({
  eyebrow,
  title,
  script,
  subtitle,
  width = 'max-w-7xl',
  children,
}: {
  eyebrow: string;
  title: string;
  script?: string;
  subtitle?: string;
  width?: string;
  children?: ReactNode;
}) {
  return (
    <header className="relative isolate overflow-hidden border-b border-line">
      <div aria-hidden className="bg-grid absolute inset-0 -z-10" />
      <div aria-hidden className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 left-10 -z-10 h-64 w-64 rounded-full bg-gold/15 blur-3xl" />
      <div className={`mx-auto ${width} px-4 pb-12 pt-12 md:px-6 md:pb-16 md:pt-16`}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <WordReveal as="h1" text={title} script={script} accentWords={script ? 0 : 1} onLoad className="t-display mt-5 max-w-4xl text-ink" />
        <span aria-hidden className="accent-bar mt-6" />
        {subtitle ? <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{subtitle}</p> : null}
        {children}
      </div>
    </header>
  );
}
