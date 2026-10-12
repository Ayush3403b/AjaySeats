import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleCheck } from 'lucide-react';
import { MATERIAL_META, type Material } from '@pcs/shared';
import { SectionHeading } from '../../components/Section.js';
import { RevealItem, RevealSection } from '../../components/motion/Reveal.js';
import { MATERIAL_ICON, materialSurface } from '../../lib/materialStyle.js';

const CARE_MATERIALS: Material[] = ['leather', 'leatherette', 'pvc', 'fabric'];

/** Three general care tips per material, on a card topped with that material's texture. */
export function CareGuide() {
  const { t } = useTranslation();
  return (
    <RevealSection as="section" aria-labelledby="care-title" className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
      <RevealItem>
        <SectionHeading id="care-title" align="center" eyebrow={t('home.care.eyebrow')} title={t('home.care.title')} accentWords={2} subtitle={t('home.care.subtitle')} />
      </RevealItem>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {CARE_MATERIALS.map((m) => {
          const Icon = MATERIAL_ICON[m];
          const token = `var(${MATERIAL_META[m].token})`;
          const tips = t(`home.care.${m}`, { returnObjects: true }) as string[];
          return (
            <RevealItem key={m} className="card-soft card-hover flex h-full flex-col overflow-hidden">
              <div className="relative h-24 shrink-0" style={{ background: materialSurface(m), boxShadow: 'inset 0 0 40px rgba(0,0,0,.18)' }}>
                <span className="icon-tile absolute -bottom-6 left-6 shadow-[0_0_0_4px_var(--card)]" style={{ '--tile': token } as CSSProperties} aria-hidden>
                  <Icon size={22} />
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6 pt-10">
                <h3 className="t-h3">{t(`materials.${m}.name`)}</h3>
                <ul className="mt-4 space-y-3">
                  {tips.map((tip) => (
                    <li key={tip} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                      <CircleCheck size={18} aria-hidden className="mt-0.5 shrink-0" style={{ color: token }} />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </RevealItem>
          );
        })}
      </div>
      <RevealItem>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">{t('home.care.note')}</p>
      </RevealItem>
    </RevealSection>
  );
}
