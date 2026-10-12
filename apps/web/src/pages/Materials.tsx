import { useEffect, type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Droplets, Gem, Layers, Sparkles, Wind, type LucideIcon } from 'lucide-react';
import { MATERIALS, MATERIAL_META, type Material } from '@pcs/shared';
import { Seo } from '../components/Seo.js';
import { PageHeader } from '../components/Section.js';
import { LinkButton } from '../components/motion/Button.js';
import { RevealItem, RevealSection } from '../components/motion/Reveal.js';
import { useReducedMotion } from '../motion/hooks.js';
import { motion } from 'framer-motion';

const ICON: Record<Material, LucideIcon> = { leather: Gem, leatherette: Layers, pvc: Droplets, fabric: Wind, other: Sparkles };

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
      className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] border-[6px] border-white"
      style={{
        background: `${TEXTURE[material]}, linear-gradient(135deg, color-mix(in srgb, var(${MATERIAL_META[material].token}) 88%, white), color-mix(in srgb, var(${MATERIAL_META[material].token}) 62%, #1b1660))`,
        boxShadow: `inset 0 0 50px rgba(0,0,0,.18), 0 0 0 1px var(--border), 0 28px 60px -24px color-mix(in srgb, var(${MATERIAL_META[material].token}) 70%, transparent)`,
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
      <PageHeader eyebrow={t('materials.eyebrow')} title={t('materials.title')} subtitle={t('materials.subtitle')}>
        <nav aria-label={t('materials.jump')} className="mt-8 flex flex-wrap gap-2">
          {MATERIALS.map((key) => (
            <a
              key={key}
              href={`#${key}`}
              className="tap-target inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink no-underline shadow-soft transition-colors hover:border-primary/40 hover:text-primary"
              style={{ '--mc': `var(${MATERIAL_META[key].token})` } as CSSProperties}
            >
              <span className="h-3 w-3 rounded-full" style={{ background: 'var(--mc)' }} aria-hidden />
              {t(`materials.${key}.name`)}
            </a>
          ))}
        </nav>
      </PageHeader>

      {MATERIALS.map((key, index) => {
        const name = t(`materials.${key}.name`);
        const reversed = index % 2 === 1;
        const Icon = ICON[key];
        return (
          <RevealSection
            key={key}
            as="section"
            id={key}
            aria-labelledby={`${key}-title`}
            className={`scroll-mt-28 border-b border-line py-16 md:py-24 ${reversed ? 'bg-surface' : ''}`}
          >
            <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-2 md:px-6">
              <RevealItem className={reversed ? 'md:order-2' : ''}>
                <TexturePanel material={key} label={`${t('materials.closeUp')}: ${name}`} />
              </RevealItem>
              <RevealItem className="space-y-5">
                <div className="flex items-center gap-4" style={{ '--tile': `var(${MATERIAL_META[key].token})` } as CSSProperties}>
                  <span className="icon-tile" aria-hidden>
                    <Icon size={22} />
                  </span>
                  <span className="numeral text-4xl" style={{ color: `var(${MATERIAL_META[key].token})` }} aria-hidden>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h2 id={`${key}-title`} className="t-h2 text-ink">{name}</h2>
                <span className="block h-1 w-16 rounded-full" style={{ background: `var(${MATERIAL_META[key].token})` }} aria-hidden />
                <p className="text-lg leading-relaxed text-muted">{t(`materials.${key}.body`)}</p>
                <LinkButton to={`/products?material=${key}`} icon={<ArrowRight size={18} aria-hidden />}>
                  {t('materials.viewProducts', { name })}
                </LinkButton>
              </RevealItem>
            </div>
          </RevealSection>
        );
      })}

      <RevealSection as="section" aria-labelledby="compare-title" className="bg-mist py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <RevealItem className="mb-10">
            <h2 id="compare-title" className="t-h2 text-ink">{t('materials.compareTitle')}</h2>
            <span aria-hidden className="accent-bar mt-5" />
          </RevealItem>
          <div className="grid gap-4 md:grid-cols-5">
            {MATERIALS.map((key) => (
              <RevealItem key={key} className="h-full">
                <article className="card-soft card-hover h-full p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: `var(${MATERIAL_META[key].token})` }} aria-hidden />
                    <h3 className="font-heading text-lg font-semibold text-ink">{t(`materials.${key}.name`)}</h3>
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
