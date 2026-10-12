import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronsLeftRight, Droplets, Paintbrush, ShieldCheck, TrendingUp, type LucideIcon } from 'lucide-react';
import { SeatSvg } from '../../components/SeatSvg.js';
import { SectionHeading } from '../../components/Section.js';
import { RevealItem, RevealSection } from '../../components/motion/Reveal.js';

interface Benefit {
  h: string;
  p: string;
}

const BENEFIT_STYLE: ReadonlyArray<{ icon: LucideIcon; colour: string }> = [
  { icon: ShieldCheck, colour: 'var(--highlight)' },
  { icon: TrendingUp, colour: 'var(--primary)' },
  { icon: Droplets, colour: 'var(--teal)' },
  { icon: Paintbrush, colour: 'var(--material-leather)' },
];

/** Stains, creases and a tear drawn over the "before" seat. Same viewBox as SeatSvg so they line up. */
function WearMarks({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 220" className={className} aria-hidden focusable="false">
      <g fill="#4a3b2c" opacity="0.28">
        <ellipse cx="150" cy="62" rx="15" ry="9" transform="rotate(-20 150 62)" />
        <ellipse cx="92" cy="112" rx="10" ry="6" />
        <ellipse cx="162" cy="178" rx="20" ry="7" />
        <ellipse cx="66" cy="184" rx="11" ry="5" />
      </g>
      <g stroke="#3a342c" strokeOpacity="0.5" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M108 158 l8 11 l-6 8 l11 10" />
        <path d="M72 38 q7 11 2 24" />
        <path d="M170 118 q-9 7 -4 17" />
        <path d="M128 30 q-4 9 3 16" />
      </g>
    </svg>
  );
}

/** Drag (or use arrow keys on the hidden range input) to wipe between a worn seat and a covered one. */
function BeforeAfter() {
  const { t } = useTranslation();
  const [position, setPosition] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const moveTo = (clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setPosition(Math.round(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))));
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveTo(event.clientX);
  };
  const stop = () => {
    dragging.current = false;
  };

  return (
    <figure className="m-0">
      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => dragging.current && moveTo(event.clientX)}
        onPointerUp={stop}
        onPointerCancel={stop}
        className="card-soft relative aspect-[10/9] cursor-ew-resize touch-pan-y select-none overflow-hidden !rounded-[2rem]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#fff6e3,#f3e8d4_70%)] p-10 md:p-12">
          <div aria-hidden className="bg-dots absolute inset-0 opacity-60" />
          <div aria-hidden className="absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/25 blur-3xl" />
          <SeatSvg cushion="#8b5a2b" back="#8b5a2b" label={t('home.transform.afterLabel')} className="relative h-full w-full drop-shadow-[0_24px_28px_rgba(17,24,39,0.25)]" />
        </div>
        <div className="absolute inset-0 bg-[#e7e5e0] p-10 md:p-12" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <div className="relative h-full w-full saturate-[.4]">
            <SeatSvg cushion="#9a948a" back="#a7a196" label={t('home.transform.beforeLabel')} className="h-full w-full" />
            <WearMarks className="absolute inset-0 h-full w-full" />
          </div>
        </div>

        <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-ink/75 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white" aria-hidden>
          {t('home.transform.before')}
        </span>
        <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-on-gold" aria-hidden>
          {t('home.transform.after')}
        </span>

        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          aria-label={t('home.transform.slider')}
          aria-valuetext={`${position}%`}
          className="peer sr-only"
        />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_12px_rgba(17,24,39,0.35)]" style={{ left: `${position}%` }} />
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 inline-flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-primary shadow-lift peer-focus-visible:ring-4 peer-focus-visible:ring-accent/50"
          style={{ left: `${position}%` }}
        >
          <ChevronsLeftRight size={20} />
        </span>
      </div>
      <figcaption className="mt-3 text-center text-xs font-medium text-muted">{t('home.transform.illustration')}</figcaption>
    </figure>
  );
}

export function Transform() {
  const { t } = useTranslation();
  const benefits = t('home.transform.benefits', { returnObjects: true }) as Benefit[];
  return (
    <section aria-labelledby="transform-title" className="border-y border-line bg-surface py-20 md:py-24">
      <RevealSection className="mx-auto grid max-w-7xl items-center gap-12 px-4 md:px-6 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <RevealItem>
          <SectionHeading id="transform-title" eyebrow={t('home.transform.eyebrow')} title={t('home.transform.title')} accentWords={2} subtitle={t('home.transform.subtitle')} />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {benefits.map((b, i) => {
              const style = BENEFIT_STYLE[i % BENEFIT_STYLE.length];
              return (
                <li key={b.h} className="rounded-2xl border border-line bg-page p-5" style={{ '--tile': style.colour } as CSSProperties}>
                  <span className="icon-tile !h-10 !w-10" aria-hidden>
                    <style.icon size={20} />
                  </span>
                  <h3 className="mt-4 font-heading text-lg font-semibold text-ink">{b.h}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{b.p}</p>
                </li>
              );
            })}
          </ul>
        </RevealItem>
        <RevealItem>
          <BeforeAfter />
        </RevealItem>
      </RevealSection>
    </section>
  );
}
