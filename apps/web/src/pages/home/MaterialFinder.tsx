import { useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { MATERIAL_META, type Material } from '@pcs/shared';
import { SectionHeading } from '../../components/Section.js';
import { LinkButton } from '../../components/motion/Button.js';
import { RevealItem, RevealSection } from '../../components/motion/Reveal.js';
import { useReducedMotion } from '../../motion/hooks.js';
import { easeOutExpo } from '../../motion/variants.js';
import { MATERIAL_ICON, materialSurface } from '../../lib/materialStyle.js';

/** Each priority maps to the material whose "best for" text in the materials guide matches it. */
const PRIORITIES = [
  { key: 'look', material: 'leather' },
  { key: 'colour', material: 'leatherette' },
  { key: 'clean', material: 'pvc' },
  { key: 'comfort', material: 'fabric' },
] as const satisfies ReadonlyArray<{ key: string; material: Material }>;

type Priority = (typeof PRIORITIES)[number]['key'];

export function MaterialFinder() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [choice, setChoice] = useState<Priority>('look');
  const material = PRIORITIES.find((p) => p.key === choice)?.material ?? 'leather';
  const Icon = MATERIAL_ICON[material];
  const name = t(`materials.${material}.name`);
  const token = `var(${MATERIAL_META[material].token})`;
  const facts = (['finish', 'feel', 'bestFor'] as const).map((k) => ({ k, label: t(`materials.${k}`), value: t(`materials.${material}.${k}`) }));

  return (
    <RevealSection as="section" aria-labelledby="finder-title" className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <RevealItem>
          <SectionHeading id="finder-title" eyebrow={t('home.finder.eyebrow')} title={t('home.finder.title')} accentWords={2} subtitle={t('home.finder.subtitle')} />
          <fieldset className="mt-10">
            <legend className="text-sm font-semibold uppercase tracking-[0.14em] text-ink">{t('home.finder.question')}</legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {PRIORITIES.map((p) => {
                const active = p.key === choice;
                const OptionIcon = MATERIAL_ICON[p.material];
                return (
                  <label
                    key={p.key}
                    className={`relative flex min-h-[64px] cursor-pointer items-center gap-3 rounded-2xl border bg-card p-4 transition-[border-color,box-shadow] duration-200 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/40 ${
                      active ? 'border-primary shadow-lift' : 'border-line shadow-soft hover:border-primary/40'
                    }`}
                    style={{ '--tile': `var(${MATERIAL_META[p.material].token})` } as CSSProperties}
                  >
                    <input type="radio" name="material-finder" value={p.key} checked={active} onChange={() => setChoice(p.key)} className="sr-only" />
                    <span className="icon-tile !h-10 !w-10 shrink-0" aria-hidden>
                      <OptionIcon size={20} />
                    </span>
                    <span className="text-sm font-semibold leading-snug text-ink">{t(`home.finder.options.${p.key}`)}</span>
                    <CircleCheck size={18} aria-hidden className={`ml-auto shrink-0 text-primary transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`} />
                  </label>
                );
              })}
            </div>
          </fieldset>
        </RevealItem>

        <RevealItem>
          <p className="sr-only" aria-live="polite">
            {t('home.finder.result')}: {name}
          </p>
          <div className="card-soft overflow-hidden !rounded-[2rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={material}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: easeOutExpo }}
              >
                <div className="relative h-44 md:h-52" style={{ background: materialSurface(material), boxShadow: 'inset 0 0 60px rgba(0,0,0,.2)' }}>
                  <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-ink">{t('home.finder.result')}</span>
                  <span className="absolute bottom-5 right-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 shadow-soft" style={{ color: token }} aria-hidden>
                    <Icon size={26} />
                  </span>
                </div>
                <div className="p-6 md:p-8">
                  <h3 className="text-[clamp(1.6rem,1.2rem+1.4vw,2.4rem)] font-semibold leading-tight text-ink">{name}</h3>
                  <p className="mt-3 leading-relaxed text-muted">{t(`materials.${material}.body`)}</p>
                  <dl className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
                    {facts.map((f) => (
                      <div key={f.k}>
                        <dt className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: token }} aria-hidden />
                          {f.label}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-ink">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <LinkButton to={`/products?material=${material}`} icon={<ArrowRight size={18} aria-hidden />}>
                      {t('materials.viewProducts', { name })}
                    </LinkButton>
                    <LinkButton to="/materials" variant="secondary">
                      {t('home.finder.compare')}
                    </LinkButton>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </RevealItem>
      </div>
    </RevealSection>
  );
}
