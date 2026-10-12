import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Handshake, IndianRupee, Languages, Layers, Palette, Ruler, type LucideIcon } from 'lucide-react';
import { MATERIALS, MATERIAL_META } from '@pcs/shared';
import { SeatSvg } from '../../components/SeatSvg.js';
import { SectionHeading } from '../../components/Section.js';
import { RevealItem, RevealSection } from '../../components/motion/Reveal.js';
import { useReducedMotion } from '../../motion/hooks.js';
import { easeOutExpo } from '../../motion/variants.js';
import { COLOUR_OPTIONS } from '../../lib/colours.js';
import { currentLang, localized } from '../../lib/format.js';

function Tile({
  icon: Icon,
  colour,
  title,
  body,
  className = '',
  children,
}: {
  icon: LucideIcon;
  colour: string;
  title: string;
  body: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <RevealItem className={`card-soft card-hover flex h-full flex-col p-6 ${className}`}>
      <span className="icon-tile" style={{ '--tile': colour } as CSSProperties} aria-hidden>
        <Icon size={22} />
      </span>
      <h3 className="t-h3 mt-5">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      {children ? <div className="mt-auto pt-5">{children}</div> : null}
    </RevealItem>
  );
}

/** Feature tile: the seat being "measured" with dashed guides, plus the three details we ask for. */
function FitTile() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const guide = { viewport: { once: true }, transition: { duration: 1, delay: 0.3, ease: easeOutExpo } };
  const drawY = { ...guide, initial: reduced ? false : { scaleY: 0 }, whileInView: { scaleY: 1 } };
  const drawX = { ...guide, initial: reduced ? false : { scaleX: 0 }, whileInView: { scaleX: 1 } };
  const chips = [t('home.why.chipMake'), t('home.why.chipModel'), t('home.why.chipYear')];

  return (
    <RevealItem className="relative isolate h-full overflow-hidden rounded-[1.75rem] bg-navy p-7 text-white sm:col-span-2 md:p-9 lg:row-span-2">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/70 blur-3xl" />
        <div className="absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-gold/25 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>
      <div className="grid h-full items-center gap-8 md:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="icon-tile !bg-white/10 !text-gold" aria-hidden>
            <Ruler size={22} />
          </span>
          <h3 className="mt-6 text-[clamp(1.6rem,1.2rem+1.4vw,2.4rem)] font-semibold leading-tight text-white">{t('home.why.fitTitle')}</h3>
          <p className="mt-3 leading-relaxed text-white/75">{t('home.why.fitBody')}</p>
          <ol className="mt-7 flex flex-wrap gap-2">
            {chips.map((chip, i) => (
              <li key={chip} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 py-1.5 pl-1.5 pr-4 text-sm font-semibold">
                <span className="numeral inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold text-xs text-on-gold" aria-hidden>
                  {i + 1}
                </span>
                {chip}
              </li>
            ))}
          </ol>
        </div>
        <div aria-hidden className="relative mx-auto aspect-square w-full max-w-xs">
          <div className="absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/25 blur-3xl" />
          <motion.span {...drawY} className="absolute bottom-8 left-0 top-4 origin-top border-l-2 border-dashed border-white/40" />
          <motion.span {...drawX} className="absolute bottom-0 left-8 right-4 origin-left border-b-2 border-dashed border-white/40" />
          <span className="absolute left-0 top-4 h-0.5 w-3 -translate-x-1/2 bg-white/60" />
          <span className="absolute bottom-8 left-0 h-0.5 w-3 -translate-x-1/2 bg-white/60" />
          <span className="absolute bottom-0 left-8 h-3 w-0.5 translate-y-1/2 bg-white/60" />
          <span className="absolute bottom-0 right-4 h-3 w-0.5 translate-y-1/2 bg-white/60" />
          <div className="absolute inset-0 p-8 pb-10 pl-10">
            <SeatSvg cushion="#ffb000" back="#ffd470" className="h-full w-full drop-shadow-[0_24px_28px_rgba(0,0,0,0.35)]" />
          </div>
        </div>
      </div>
    </RevealItem>
  );
}

export function WhyUs() {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  return (
    <section aria-labelledby="why-title" className="border-y border-line bg-mist py-20 md:py-24">
      <RevealSection className="mx-auto max-w-7xl px-4 md:px-6">
        <RevealItem>
          <SectionHeading id="why-title" align="center" eyebrow={t('home.why.eyebrow')} title={t('home.why.title')} accentWords={3} subtitle={t('home.why.subtitle')} />
        </RevealItem>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FitTile />
          <Tile icon={IndianRupee} colour="var(--highlight)" title={t('home.why.priceTitle')} body={t('home.why.priceBody')} />
          <Tile icon={Layers} colour="var(--material-leather)" title={t('home.why.materialTitle')} body={t('home.why.materialBody')}>
            <ul className="flex flex-wrap gap-1.5">
              {MATERIALS.filter((m) => m !== 'other').map((m) => (
                <li key={m} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-2.5 py-1 text-xs font-semibold text-ink">
                  <span className="h-2 w-2 rounded-full" style={{ background: `var(${MATERIAL_META[m].token})` }} aria-hidden />
                  {t(`materials.${m}.name`)}
                </li>
              ))}
            </ul>
          </Tile>
          <Tile icon={Palette} colour="var(--primary)" title={t('home.why.colourTitle')} body={t('home.why.colourBody')}>
            <ul className="flex -space-x-2">
              {COLOUR_OPTIONS.map((c) => (
                <li
                  key={c.id}
                  title={localized(c.name, lang)}
                  className="h-8 w-8 rounded-full border-2 border-white shadow-[0_0_0_1px_var(--border)]"
                  style={{ background: c.code }}
                >
                  <span className="sr-only">{localized(c.name, lang)}</span>
                </li>
              ))}
            </ul>
          </Tile>
          <Tile icon={Languages} colour="var(--teal)" title={t('home.why.languageTitle')} body={t('home.why.languageBody')}>
            <p className="flex items-center gap-2" aria-hidden>
              <span className="rounded-xl border border-line bg-page px-3 py-1.5 font-heading text-lg font-semibold text-ink">Aa</span>
              <span className="rounded-xl border border-line bg-page px-3 py-1.5 font-heading text-lg font-semibold text-primary" lang="hi">
                अ
              </span>
            </p>
          </Tile>
          <Tile icon={Handshake} colour="var(--material-other)" title={t('home.why.confirmTitle')} body={t('home.why.confirmBody')} className="sm:col-span-2 lg:col-span-1" />
        </div>
      </RevealSection>
    </section>
  );
}
