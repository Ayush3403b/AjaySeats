import { useTranslation } from 'react-i18next';
import { Seo } from '../components/Seo.js';
import { PageHeader } from '../components/Section.js';
import { RevealItem, RevealSection } from '../components/motion/Reveal.js';
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
      <PageHeader eyebrow={t('legal.eyebrow')} title={title} width="max-w-3xl">
        <p className="mt-6 text-sm font-medium text-muted">{t('legal.updated', { date })}</p>
      </PageHeader>
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-10 md:px-6 md:pt-14">
        <p role="note" className="rounded-2xl border border-gold/50 bg-gold/10 p-4 text-sm text-ink">
          {t('legal.draft')}
        </p>
        <RevealSection className="card-soft mt-8 divide-y divide-line !rounded-[1.75rem] px-6 md:px-8">
          {sections.map((s, i) => (
            <RevealItem key={i} className="py-6">
              <h2 className="t-h3 flex items-baseline gap-3 text-ink">
                <span className="numeral text-base text-primary" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                {s.h}
              </h2>
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
