import { useTranslation } from 'react-i18next';
import { Seo } from '../components/Seo.js';
import { RevealItem, RevealSection } from '../components/motion/Reveal.js';
import { WordReveal } from '../components/motion/WordReveal.js';
import { currentLang } from '../lib/format.js';

/** Last time the legal text was reviewed in this codebase. Shown to readers. */
const LAST_UPDATED = '2026-10-10';

interface LegalSection {
  h: string;
  p: string;
}

function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const sections = t(`legal.${kind}.sections`, { returnObjects: true }) as LegalSection[];
  const date = new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { dateStyle: 'long' }).format(new Date(LAST_UPDATED));
  const title = t(`legal.${kind}Title`);

  return (
    <>
      <Seo title={t(`seo.${kind}Title`)} description={t(`legal.${kind}Title`)} path={`/${kind}`} />
      <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-16">
        <header>
          <WordReveal as="h1" text={title} className="t-h2 gradient-text" onLoad />
          <p className="mt-3 text-sm text-muted">{t('legal.updated', { date })}</p>
          <p role="note" className="mt-4 rounded-xl border border-line bg-card p-4 text-sm text-muted">
            {t('legal.draft')}
          </p>
        </header>
        <RevealSection className="mt-10 space-y-8">
          {sections.map((s, i) => (
            <RevealItem key={i}>
              <h2 className="t-h3">{s.h}</h2>
              <p className="mt-2 leading-relaxed text-muted">{s.p}</p>
            </RevealItem>
          ))}
        </RevealSection>
      </article>
    </>
  );
}

export function Privacy() {
  return <LegalPage kind="privacy" />;
}

export function Terms() {
  return <LegalPage kind="terms" />;
}
