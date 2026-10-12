import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Car,
  ChevronRight,
  CircleCheck,
  FileText,
  MessageCircle,
  Palette,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { MATERIALS, MATERIAL_META, type PublicProduct } from '@pcs/shared';
import { api } from '../api/index.js';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';
import { Seo } from '../components/Seo.js';
import { ProductCard } from '../components/ProductCard.js';
import { ProductGridSkeleton, ErrorState, EmptyState } from '../components/States.js';
import { Carousel } from '../components/Carousel.js';
import { Marquee } from '../components/Marquee.js';
import { SeatSvg } from '../components/SeatSvg.js';
import { MaterialBadge } from '../components/MaterialBadge.js';
import { Eyebrow, SectionHeading } from '../components/Section.js';
import { Button, LinkButton } from '../components/motion/Button.js';
import { RevealItem, RevealSection } from '../components/motion/Reveal.js';
import { WordReveal } from '../components/motion/WordReveal.js';
import { useReducedMotion } from '../motion/hooks.js';
import { useAsync } from '../lib/useAsync.js';
import { currentLang, localized } from '../lib/format.js';
import { COLOUR_OPTIONS } from '../lib/colours.js';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';
import { useSettings } from '../lib/useSettings.js';
import { MATERIAL_ICON } from '../lib/materialStyle.js';
import { WhyUs } from './home/WhyUs.js';
import { ShopByCategory } from './home/Categories.js';
import { MaterialFinder } from './home/MaterialFinder.js';
import { Transform } from './home/Transform.js';
import { CareGuide } from './home/CareGuide.js';
import { Faq, faqJsonLd, type FaqItem } from './home/Faq.js';
import { SeoContent } from './home/SeoContent.js';

const STEPS: ReadonlyArray<{ key: 'One' | 'Two' | 'Three' | 'Four'; icon: LucideIcon; colour: string }> = [
  { key: 'One', icon: Car, colour: 'var(--primary)' },
  { key: 'Two', icon: Palette, colour: 'var(--material-leather)' },
  { key: 'Three', icon: FileText, colour: 'var(--teal)' },
  { key: 'Four', icon: BadgeCheck, colour: 'var(--highlight)' },
];

const pad = (n: number) => String(n).padStart(2, '0');

function Hero() {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const reduced = useReducedMotion();
  const factor = reduced ? 0 : 1;
  const { scrollY } = useScroll();
  const seatY = useTransform(scrollY, [0, 700], [0, -50 * factor]);
  const chipsY = useTransform(scrollY, [0, 700], [0, -110 * factor]);

  // The showcase seat slowly cycles through the colour range (paused for reduced motion).
  const [colourIndex, setColourIndex] = useState(1);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setColourIndex((i) => (i + 1) % COLOUR_OPTIONS.length), 2800);
    return () => window.clearInterval(id);
  }, [reduced]);
  const colour = COLOUR_OPTIONS[colourIndex];

  const stats = [
    { value: MATERIALS.length, label: t('hero.statMaterials') },
    { value: COLOUR_OPTIONS.length, label: t('hero.statColours') },
    { value: SUPPORTED_LANGUAGES.length, label: t('hero.statLanguages') },
  ];

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden border-b border-line">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="aurora">
          <span />
          <span />
          <span />
        </div>
        <div className="bg-grid absolute inset-0" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-12 md:px-6 md:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-24 lg:pt-20">
        <div>
          <Eyebrow>{t('hero.eyebrow')}</Eyebrow>
          <WordReveal id="hero-title" as="h1" onLoad text={t('hero.titleLead')} script={t('hero.titleScript')} scriptClassName="text-primary text-[0.9em] xl:whitespace-nowrap" className="t-display mt-6 text-ink" />
          <span aria-hidden className="accent-bar mt-7 w-24" />
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">{t('hero.subtitle')}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <LinkButton to="/products" icon={<ArrowRight size={18} aria-hidden />}>
              {t('hero.explore')}
            </LinkButton>
            <LinkButton to="/request-quote" variant="secondary" icon={<FileText size={18} aria-hidden />}>
              {t('hero.quote')}
            </LinkButton>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2.5">
            {(['trustFitment', 'trustPrices', 'trustLanguages'] as const).map((key) => (
              <li key={key} className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                <CircleCheck size={17} aria-hidden className="shrink-0 text-highlight" />
                {t(`hero.${key}`)}
              </li>
            ))}
          </ul>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse justify-end gap-2">
                <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">{s.label}</dt>
                <dd className="numeral text-4xl text-primary">{pad(s.value)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <motion.div style={{ y: seatY }} className="relative mx-auto w-full max-w-lg">
          <div className="card-soft relative aspect-[10/9] overflow-hidden !rounded-[2rem] p-10 md:p-12">
            <div aria-hidden className="bg-dots absolute inset-0 opacity-80" />
            <div aria-hidden className="absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/20 blur-3xl" />
            <div aria-hidden className="absolute inset-x-16 bottom-10 h-8 rounded-[50%] bg-ink/15 blur-lg" />
            <SeatSvg cushion={colour.code} back={colour.code} className="relative h-full w-full drop-shadow-[0_24px_28px_rgba(17,24,39,0.22)]" label={`${t('home.colourLabel')}: ${localized(colour.name, lang)}`} />
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-line bg-surface/90 px-3 py-1 text-xs font-semibold text-ink shadow-soft" aria-hidden>
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: colour.code }} />
              {localized(colour.name, lang)}
            </p>
          </div>
          <motion.span style={{ y: chipsY }} className="absolute -left-3 top-10 md:-left-8">
            <span className="float-slow inline-block">
              <MaterialBadge material="leather" className="shadow-soft" />
            </span>
          </motion.span>
          <motion.span style={{ y: chipsY }} className="absolute -right-2 top-1/3 md:-right-7">
            <span className="float-slow inline-block [animation-delay:-2s]">
              <MaterialBadge material="pvc" className="shadow-soft" />
            </span>
          </motion.span>
          <motion.span style={{ y: chipsY }} className="absolute -left-2 bottom-24 md:-left-10">
            <span className="float-slow inline-block [animation-delay:-4s]">
              <MaterialBadge material="fabric" className="shadow-soft" />
            </span>
          </motion.span>
          <div className="card-soft relative mt-4 flex max-w-xs items-start gap-3 p-4 sm:absolute sm:-bottom-8 sm:right-0 sm:mt-0 md:-right-6">
            <span className="icon-tile !h-10 !w-10 shrink-0" style={{ '--tile': 'var(--highlight)' } as CSSProperties} aria-hidden>
              <ShieldCheck size={20} />
            </span>
            <span>
              <span className="block font-heading text-base font-semibold text-ink">{t('hero.cardTitle')}</span>
              <span className="mt-0.5 block text-sm leading-snug text-muted">{t('hero.cardBody')}</span>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CompatibilityStrip({ products }: { products: PublicProduct[] }) {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const makes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.compatibleVehicles.forEach((v) => set.add(v.make)));
    return [...set];
  }, [products]);
  const chips = [...COLOUR_OPTIONS.map((c) => ({ key: c.id, label: localized(c.name, lang), code: c.code })), ...makes.map((m) => ({ key: m, label: m, code: undefined }))];
  if (chips.length === 0) return null;
  return (
    <section aria-labelledby="makes-title" className="border-b border-line bg-surface">
      <h2 id="makes-title" className="sr-only">{t('home.makesTitle')}</h2>
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 md:px-6">
        <span className="hidden shrink-0 rounded-full border border-primary/25 bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary sm:inline-flex">
          {t('home.stripLabel')}
        </span>
        <div className="min-w-0 flex-1 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
          <Marquee
            label={t('home.makesTitle')}
            items={chips.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-2 rounded-full border border-line bg-page px-4 py-2 text-sm font-semibold text-ink">
                {c.code ? <span className="h-3 w-3 rounded-full border border-line" style={{ background: c.code }} aria-hidden /> : <Car size={14} aria-hidden className="text-primary" />}
                {c.label}
              </span>
            ))}
          />
        </div>
      </div>
      <p className="border-t border-line/70 px-4 py-2 text-center text-xs text-muted">{t('home.makesSubtitle')}</p>
    </section>
  );
}

function FeaturedCollection() {
  const { t } = useTranslation();
  const featured = useAsync(() => api.getProducts({ featured: true, pageSize: 6 }), []);
  const items = featured.data?.items ?? [];

  return (
    <RevealSection as="section" aria-labelledby="featured-title" className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
      <RevealItem className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <SectionHeading id="featured-title" eyebrow={t('home.featuredEyebrow')} title={t('home.featuredTitle')} subtitle={t('home.featuredSubtitle')} />
        <LinkButton to="/products" variant="secondary" icon={<ArrowRight size={18} aria-hidden />}>
          {t('home.viewAll')}
        </LinkButton>
      </RevealItem>

      {featured.loading ? <ProductGridSkeleton count={3} /> : null}
      {featured.error ? <ErrorState message={t('states.errorBody')} onRetry={featured.reload} /> : null}
      {!featured.loading && !featured.error && items.length === 0 ? (
        <EmptyState title={t('states.emptyTitle')} body={t('home.emptyFeatured')} />
      ) : null}
      {items.length > 0 ? (
        <>
          <div className="hidden gap-6 md:grid md:grid-cols-2 xl:grid-cols-3">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="md:hidden">
            <Carousel label={t('home.featuredTitle')}>
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </Carousel>
          </div>
        </>
      ) : null}
    </RevealSection>
  );
}

function HowItWorks() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="steps-title" className="relative isolate border-y border-line bg-surface py-20 md:py-24">
      <div aria-hidden className="bg-dots absolute inset-0 -z-10 opacity-50 [mask-image:linear-gradient(180deg,#000,transparent_70%)]" />
      <RevealSection className="mx-auto max-w-7xl px-4 md:px-6">
        <RevealItem>
          <SectionHeading id="steps-title" align="center" eyebrow={t('home.stepsEyebrow')} title={t('home.stepsTitle')} accentWords={2} subtitle={t('home.stepsSubtitle')} />
        </RevealItem>
        <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.key} className="relative">
              <RevealItem className="card-soft card-hover flex h-full flex-col p-6">
                <div className="flex items-start justify-between" style={{ '--tile': step.colour } as CSSProperties}>
                  <span className="numeral text-[2.6rem]" style={{ color: step.colour }} aria-hidden>
                    {pad(i + 1)}
                  </span>
                  <span className="icon-tile" aria-hidden>
                    <step.icon size={22} />
                  </span>
                </div>
                <h3 className="t-h3 mt-6">{t(`about.step${step.key}`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(`about.step${step.key}Body`)}</p>
                <div className="mt-auto pt-6" aria-hidden>
                  <span className="block h-1 w-10 rounded-full" style={{ background: step.colour }} />
                </div>
              </RevealItem>
              {i < STEPS.length - 1 ? (
                <span aria-hidden className="absolute -right-[1.15rem] top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-primary shadow-soft lg:flex">
                  <ChevronRight size={16} />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </RevealSection>
    </section>
  );
}

function ColourStudio() {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const [selected, setSelected] = useState(0);
  const colour = COLOUR_OPTIONS[selected];
  const name = localized(colour.name, lang);

  return (
    <RevealSection as="section" aria-labelledby="colour-title" className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <RevealItem>
          <div className="card-soft relative mx-auto aspect-square w-full max-w-md overflow-hidden !rounded-[2rem] p-10">
            <div aria-hidden className="bg-dots absolute inset-0 opacity-70" />
            <motion.div aria-hidden className="absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" animate={{ backgroundColor: colour.code, opacity: 0.18 }} transition={{ duration: 0.5 }} />
            <SeatSvg cushion={colour.code} back={colour.code} className="relative h-full w-full drop-shadow-[0_24px_28px_rgba(17,24,39,0.2)]" label={`${t('home.colourLabel')}: ${name}`} />
          </div>
        </RevealItem>
        <RevealItem className="space-y-7">
          <SectionHeading id="colour-title" eyebrow={t('home.colourEyebrow')} title={t('home.colourTitle')} subtitle={t('home.colourSubtitle')} />
          <p className="text-sm font-semibold text-ink" aria-live="polite">
            {t('home.colourLabel')}: <span className="text-primary">{name}</span>
          </p>
          <div role="radiogroup" aria-label={t('home.colourLabel')} className="flex flex-wrap gap-3">
            {COLOUR_OPTIONS.map((c, i) => {
              const label = localized(c.name, lang);
              const active = i === selected;
              return (
                <motion.button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={label}
                  title={label}
                  onClick={() => setSelected(i)}
                  whileTap={{ scale: 0.92 }}
                  className="tap-target relative inline-flex items-center justify-center rounded-full"
                >
                  {active ? (
                    <motion.span layoutId="home-colour-ring" className="absolute -inset-1.5 rounded-full border-2 border-primary" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
                  ) : null}
                  <span className="h-10 w-10 rounded-full border-2 border-white shadow-[0_0_0_1px_var(--border),0_6px_14px_-6px_rgba(17,24,39,0.4)]" style={{ background: c.code }} aria-hidden />
                </motion.button>
              );
            })}
          </div>
          <LinkButton to={`/products?colour=${encodeURIComponent(colour.code)}`} icon={<ArrowRight size={18} aria-hidden />}>
            {t('hero.explore')}
          </LinkButton>
        </RevealItem>
      </div>
    </RevealSection>
  );
}

function MaterialsHighlight() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="materials-title" className="border-y border-line bg-mist py-20 md:py-24">
      <RevealSection className="mx-auto max-w-7xl px-4 md:px-6">
        <RevealItem>
          <SectionHeading id="materials-title" align="center" eyebrow={t('home.materialsEyebrow')} title={t('home.materialsTitle')} accentWords={2} subtitle={t('home.materialsSubtitle')} />
        </RevealItem>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {MATERIALS.map((key, i) => {
            const Icon = MATERIAL_ICON[key];
            const name = t(`materials.${key}.name`);
            return (
              <RevealItem key={key} className="h-full">
                <Link
                  to={`/materials#${key}`}
                  className="group card-soft card-hover flex h-full flex-col p-6 text-ink no-underline"
                  style={{ '--tile': `var(${MATERIAL_META[key].token})` } as CSSProperties}
                >
                  <div className="flex items-start justify-between">
                    <span className="icon-tile" aria-hidden>
                      <Icon size={22} />
                    </span>
                    <span className="numeral text-xl" style={{ color: `var(${MATERIAL_META[key].token})` }} aria-hidden>
                      {pad(i + 1)}
                    </span>
                  </div>
                  <h3 className="t-h3 mt-6">{name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(`materials.${key}.body`)}</p>
                  <span className="mt-auto block pt-6">
                    <span className="flex items-center justify-between gap-3 border-t border-line pt-4 text-sm font-semibold text-primary">
                      {t('materials.viewProducts', { name })}
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-on-primary" aria-hidden>
                        <ArrowUpRight size={15} />
                      </span>
                    </span>
                  </span>
                </Link>
              </RevealItem>
            );
          })}
        </div>
      </RevealSection>
    </section>
  );
}

function CtaBand() {
  const { t } = useTranslation();
  const settings = useSettings();
  const link = buildWhatsAppUrl(settings.whatsappNumber, t('whatsapp.general'));
  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden bg-navy py-20 text-white md:py-24">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/70 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_75%)]" />
      </div>
      <RevealSection className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center md:px-6">
        <RevealItem>
          <Eyebrow tone="dark">{t('home.ctaEyebrow')}</Eyebrow>
        </RevealItem>
        <WordReveal id="cta-title" as="h2" text={t('home.ctaTitleLead')} script={t('home.ctaTitleScript')} scriptClassName="text-gold" className="t-h2 mt-6 text-white" />
        <RevealItem>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/80">{t('home.whatsappBody')}</p>
        </RevealItem>
        <RevealItem className="mt-9 flex flex-wrap justify-center gap-3">
          <LinkButton to="/request-quote" variant="gold" icon={<ArrowRight size={18} aria-hidden />}>
            {t('home.quoteCta')}
          </LinkButton>
          {link ? (
            <Button variant="outline-light" icon={<MessageCircle size={18} aria-hidden />} onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}>
              {t('home.whatsappCta')}
            </Button>
          ) : null}
        </RevealItem>
      </RevealSection>
    </section>
  );
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const everything = useAsync(() => api.getProducts({ pageSize: 48 }), []);
  const products = everything.data?.items ?? [];
  // Keyed on the language: returnObjects builds a new array on every call, which would re-insert the JSON-LD each render.
  const faqItems = useMemo(() => t('home.faq.items', { returnObjects: true }) as FaqItem[], [t, i18n.language]);
  const jsonLd = useMemo(() => faqJsonLd(faqItems), [faqItems]);
  return (
    <>
      <Seo title={t('seo.homeTitle')} description={t('seo.homeDescription')} keywords={t('seo.homeKeywords')} path="/" jsonLd={jsonLd} />
      <Hero />
      <CompatibilityStrip products={products} />
      <FeaturedCollection />
      <WhyUs />
      <ShopByCategory />
      <HowItWorks />
      <ColourStudio />
      <MaterialsHighlight />
      <MaterialFinder />
      <Transform />
      <CareGuide />
      <Faq items={faqItems} />
      <SeoContent products={products} />
      <CtaBand />
    </>
  );
}
