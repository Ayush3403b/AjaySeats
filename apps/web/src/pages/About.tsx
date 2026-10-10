import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Seo } from '../components/Seo.js';
import { LinkButton } from '../components/motion/Button.js';
import { RevealItem, RevealSection } from '../components/motion/Reveal.js';
import { WordReveal } from '../components/motion/WordReveal.js';
import { useReducedMotion } from '../motion/hooks.js';

const STEPS = ['One', 'Two', 'Three', 'Four'] as const;

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
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-16">
        <header>
          <WordReveal as="h1" text={t('about.title')} className="t-display gradient-text" onLoad />
          <p className="mt-5 text-lg text-muted">{t('about.subtitle')}</p>
        </header>

        <RevealSection as="div" className="relative mt-14 pl-10 md:pl-14" >
          <div ref={ref} className="relative">
            <span aria-hidden className="absolute left-[-1.75rem] top-2 bottom-2 w-1 rounded-full bg-line md:left-[-2.25rem]" />
            <motion.span
              aria-hidden
              className="absolute left-[-1.75rem] top-2 bottom-2 w-1 origin-top rounded-full bg-gradient-to-b from-primary to-accent md:left-[-2.25rem]"
              style={{ scaleY: reduced ? 1 : spine }}
            />
            <ol className="space-y-12">
              {STEPS.map((step, i) => (
                <li key={step} className="relative">
                  <RevealItem>
                  <span
                    aria-hidden
                    className="absolute -left-[2.35rem] top-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-accent bg-surface text-xs font-bold text-accent md:-left-[2.85rem]"
                  >
                    {i + 1}
                  </span>
                  <h3 className="t-h3">{t(`about.step${step}`)}</h3>
                  <p className="mt-2 text-muted">{t(`about.step${step}Body`)}</p>
                  </RevealItem>
                </li>
              ))}
            </ol>
          </div>
        </RevealSection>

        <div className="mt-16">
          <LinkButton to="/request-quote">{t('about.cta')}</LinkButton>
        </div>
      </div>
    </>
  );
}
