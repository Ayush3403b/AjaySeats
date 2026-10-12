import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Seo } from '../components/Seo.js';
import { PageHeader } from '../components/Section.js';
import { LinkButton } from '../components/motion/Button.js';
import { RevealItem, RevealSection } from '../components/motion/Reveal.js';
import { useReducedMotion } from '../motion/hooks.js';

const STEPS = [
  { key: 'One', colour: 'var(--primary)' },
  { key: 'Two', colour: 'var(--material-leather)' },
  { key: 'Three', colour: 'var(--teal)' },
  { key: 'Four', colour: 'var(--highlight)' },
] as const;

/** Scroll-linked timeline: the spine fills as the reader moves through the steps. */
export default function About() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] });
  const spine = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <>
      <Seo title={t('seo.aboutTitle')} description={t('seo.aboutDescription')} path="/about" />
      <PageHeader eyebrow={t('about.eyebrow')} title={t('about.titleLead')} script={t('about.titleScript')} subtitle={t('about.subtitle')} width="max-w-5xl" />
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-14 md:px-6 md:pt-20">
        <RevealSection as="div" className="relative pl-14 md:pl-20">
          <div ref={ref} className="relative">
            <span aria-hidden className="absolute -left-[2.05rem] bottom-6 top-6 w-1 rounded-full bg-line md:-left-[2.55rem]" />
            <motion.span
              aria-hidden
              className="absolute -left-[2.05rem] bottom-6 top-6 w-1 origin-top rounded-full bg-gradient-to-b from-primary via-teal to-gold md:-left-[2.55rem]"
              style={{ scaleY: reduced ? 1 : spine }}
            />
            <ol className="space-y-6">
              {STEPS.map((step, i) => (
                <li key={step.key} className="relative">
                  <RevealItem>
                    <span
                      aria-hidden
                      className="numeral absolute -left-[3.6rem] top-5 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-lg shadow-soft md:-left-[4.1rem]"
                      style={{ color: step.colour }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="card-soft card-hover p-6 md:p-7">
                      <h3 className="t-h3 text-ink">{t(`about.step${step.key}`)}</h3>
                      <p className="mt-2 leading-relaxed text-muted">{t(`about.step${step.key}Body`)}</p>
                      <span aria-hidden className="mt-5 block h-1 w-10 rounded-full" style={{ background: step.colour }} />
                    </div>
                  </RevealItem>
                </li>
              ))}
            </ol>
          </div>
        </RevealSection>

        <div className="mt-14 flex justify-center">
          <LinkButton to="/request-quote" icon={<ArrowRight size={18} aria-hidden />}>
            {t('about.cta')}
          </LinkButton>
        </div>
      </div>
    </>
  );
}
