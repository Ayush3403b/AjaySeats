import { useEffect, type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { MATERIALS, MATERIAL_META, type Material } from '@pcs/shared';
import { Seo } from '../components/Seo.js';
import { LinkButton } from '../components/motion/Button.js';
import { RevealItem, RevealSection } from '../components/motion/Reveal.js';
import { WordReveal } from '../components/motion/WordReveal.js';
import { useReducedMotion } from '../motion/hooks.js';
import { motion } from 'framer-motion';

/** CSS texture per material. Each is a layered gradient so no images are needed. */
const TEXTURE: Record<Material, string> = {
  leather:
    'radial-gradient(circle at 30% 30%, rgba(255,255,255,.22) 0 1.5px, transparent 2.5px) 0 0 / 14px 14px, radial-gradient(circle at 70% 70%, rgba(0,0,0,.3) 0 2px, transparent 3px) 0 0 / 22px 22px',
  leatherette: 'repeating-linear-gradient(45deg, rgba(255,255,255,.14) 0 2px, transparent 2px 10px)',
  pvc: 'linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px) 0 0 / 24px 24px',
  fabric:
    'repeating-linear-gradient(0deg, rgba(255,255,255,.12) 0 2px, transparent 2px 6px), repeating-linear-gradient(90deg, rgba(0,0,0,.2) 0 2px, transparent 2px 6px)',
  other: 'repeating-radial-gradient(circle at 50% 120%, rgba(255,255,255,.16) 0 2px, transparent 2px 14px)',
};

function TexturePanel({ material, label }: { material: Material; label: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      role="img"
      aria-label={label}
      initial={reduced ? false : { scale: 1.08 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-line"
      style={{
        background: `${TEXTURE[material]}, linear-gradient(135deg, var(${MATERIAL_META[material].token}), #0b1020)`,
        boxShadow: `inset 0 0 60px rgba(0,0,0,.35), 0 20px 60px -20px var(${MATERIAL_META[material].token})`,
      }}
    />
  );
}

export default function Materials() {
  const { t } = useTranslation();
  const location = useLocation();

  // Hash links are client-side navigations, so the browser does not scroll on its own.
  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  return (
    <>
      <Seo title={t('seo.materialsTitle')} description={t('seo.materialsDescription')} path="/materials" />
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <header className="max-w-3xl">
          <WordReveal as="h1" text={t('materials.title')} className="t-display gradient-text" onLoad />
          <p className="mt-4 text-lg text-muted">{t('materials.subtitle')}</p>
        </header>

        <nav aria-label={t('materials.jump')} className="mt-8 flex flex-wrap gap-2">
          {MATERIALS.map((key) => (
            <a
              key={key}
              href={`#${key}`}
              className="tap-target inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-semibold text-ink no-underline"
              style={{ '--mc': `var(${MATERIAL_META[key].token})` } as CSSProperties}
            >
              <span className="h-3 w-3 rounded-full" style={{ background: 'var(--mc)' }} aria-hidden />
              {t(`materials.${key}.name`)}
            </a>
          ))}
        </nav>
      </div>

      {MATERIALS.map((key, index) => {
        const name = t(`materials.${key}.name`);
        const reversed = index % 2 === 1;
        return (
          <RevealSection
            key={key}
            as="section"
            id={key}
            aria-labelledby={`${key}-title`}
            className="scroll-mt-28 border-t border-line py-14 md:py-20"
          >
            <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-2 md:px-6">
              <RevealItem className={reversed ? 'md:order-2' : ''}>
                <TexturePanel material={key} label={`${t('materials.closeUp')}: ${name}`} />
              </RevealItem>
              <RevealItem className="space-y-5">
                <span className="block h-2 w-16 rounded-full" style={{ background: `var(${MATERIAL_META[key].token})` }} aria-hidden />
                <h2 id={`${key}-title`} className="t-h2">{name}</h2>
                <p className="text-lg leading-relaxed text-muted">{t(`materials.${key}.body`)}</p>
                <LinkButton to={`/products?material=${key}`} icon={<ArrowRight size={18} aria-hidden />}>
                  {t('materials.viewProducts', { name })}
                </LinkButton>
              </RevealItem>
            </div>
          </RevealSection>
        );
      })}

      <RevealSection as="section" aria-labelledby="compare-title" className="border-t border-line py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <RevealItem>
            <h2 id="compare-title" className="t-h2 mb-8">{t('materials.compareTitle')}</h2>
          </RevealItem>
          <div className="grid gap-4 md:grid-cols-5">
            {MATERIALS.map((key) => (
              <RevealItem key={key} className="h-full">
                <article className="glass h-full rounded-2xl p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: `var(${MATERIAL_META[key].token})` }} aria-hidden />
                    <h3 className="font-bold text-ink">{t(`materials.${key}.name`)}</h3>
                  </div>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="font-semibold text-ink">{t('materials.finish')}</dt>
                      <dd className="text-muted">{t(`materials.${key}.finish`)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-ink">{t('materials.feel')}</dt>
                      <dd className="text-muted">{t(`materials.${key}.feel`)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-ink">{t('materials.bestFor')}</dt>
                      <dd className="text-muted">{t(`materials.${key}.bestFor`)}</dd>
                    </div>
                  </dl>
                </article>
              </RevealItem>
            ))}
          </div>
        </div>
      </RevealSection>
    </>
  );
}
