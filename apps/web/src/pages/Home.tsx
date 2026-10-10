import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react';
import { MATERIALS, MATERIAL_META, type PublicProduct } from '@pcs/shared';
import { api } from '../api/index.js';
import { Seo } from '../components/Seo.js';
import { ProductCard } from '../components/ProductCard.js';
import { ProductGridSkeleton, ErrorState, EmptyState } from '../components/States.js';
import { Carousel } from '../components/Carousel.js';
import { Marquee } from '../components/Marquee.js';
import { SeatSvg } from '../components/SeatSvg.js';
import { MaterialBadge } from '../components/MaterialBadge.js';
import { Button, LinkButton } from '../components/motion/Button.js';
import { RevealItem, RevealSection } from '../components/motion/Reveal.js';
import { WordReveal } from '../components/motion/WordReveal.js';
import { useCursorGlow, useReducedMotion } from '../motion/hooks.js';
import { fadeUp } from '../motion/variants.js';
import { useAsync } from '../lib/useAsync.js';
import { currentLang, localized } from '../lib/format.js';
import { COLOUR_OPTIONS } from '../lib/colours.js';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';
import { useSettings } from '../lib/useSettings.js';

function Hero() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const factor = reduced ? 0 : 1;
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 700], [0, -140 * factor]);
  const seatY = useTransform(scrollY, [0, 700], [0, -60 * factor]);
  const chipsY = useTransform(scrollY, [0, 700], [0, -200 * factor]);
  const glow = useCursorGlow();

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden" onPointerMove={glow.onPointerMove}>
      <motion.div style={{ y: bgY }} className="absolute inset-0 -z-10" aria-hidden>
        <div className="mesh">
          <span />
          <span />
          <span />
        </div>
      </motion.div>
      {glow.enabled ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -z-10 h-[36rem] w-[36rem] rounded-full opacity-30 blur-3xl"
          style={{ x: glow.x, y: glow.y, marginLeft: -288, marginTop: -288, background: 'radial-gradient(circle, var(--accent), transparent 65%)' }}
        />
      ) : null}

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 md:grid-cols-2 md:gap-6 md:px-6 md:pb-24 md:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card/80 px-3 py-1 text-xs font-semibold text-muted">
            <span aria-hidden className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-accent" />
            {t('hero.eyebrow')}
          </p>
          <WordReveal
            as="h1"
            onLoad
            text={t('hero.title')}
            className="gradient-text t-display mt-5 max-w-[16ch]"
          />
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{t('hero.subtitle')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to="/products" icon={<ArrowRight size={18} aria-hidden />}>
              {t('hero.explore')}
            </LinkButton>
            <LinkButton to="/request-quote" variant="secondary">
              {t('hero.quote')}
            </LinkButton>
          </div>
        </div>

        <motion.div style={{ y: seatY }} className="relative mx-auto w-full max-w-md">
          <div className="glass relative aspect-square rounded-[2rem] p-8 shadow-2xl">
            <SeatSvg cushion="#8b5a2b" back="#8b5a2b" className="h-full w-full drop-shadow-2xl" label={t('hero.title')} />
          </div>
          <motion.span style={{ y: chipsY }} className="absolute -left-2 top-10 md:-left-6">
            <span className="float-slow inline-block">
              <MaterialBadge material="leather" />
            </span>
          </motion.span>
          <motion.span style={{ y: chipsY }} className="absolute -right-2 top-1/2 md:-right-6">
            <span className="float-slow inline-block [animation-delay:-2s]">
              <MaterialBadge material="pvc" />
            </span>
          </motion.span>
          <motion.span style={{ y: chipsY }} className="absolute bottom-6 left-6">
            <span className="float-slow inline-block [animation-delay:-4s]">
              <MaterialBadge material="fabric" />
            </span>
          </motion.span>
        </motion.div>
      </div>
    </section>
  );
}

function FeaturedCollection() {
  const { t } = useTranslation();
  const featured = useAsync(() => api.getProducts({ featured: true, pageSize: 6 }), []);
  const items = featured.data?.items ?? [];

  return (
    <RevealSection as="section" aria-labelledby="featured-title" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <RevealItem className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <WordReveal as="h2" text={t('home.featuredTitle')} className="t-h2 gradient-text" />
          <p className="mt-2 max-w-xl text-muted">{t('home.featuredSubtitle')}</p>
        </div>
        <Link to="/products" className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-accent no-underline hover:underline">
          {t('home.viewAll')} <ArrowRight size={16} aria-hidden />
        </Link>
      </RevealItem>

      {featured.loading ? <ProductGridSkeleton count={3} /> : null}
      {featured.error ? <ErrorState message={t('states.errorBody')} onRetry={featured.reload} /> : null}
      {!featured.loading && !featured.error && items.length === 0 ? (
        <EmptyState title={t('states.emptyTitle')} body={t('home.emptyFeatured')} />
      ) : null}
      {items.length > 0 ? (
        <>
          <div className="hidden gap-5 md:grid md:grid-cols-2 xl:grid-cols-3">
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

function ColourPicker() {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const [selected, setSelected] = useState(0);
  const colour = COLOUR_OPTIONS[selected];
  const name = localized(colour.name, lang);

  return (
    <RevealSection as="section" aria-labelledby="colour-title" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <RevealItem>
          <div className="glass relative mx-auto aspect-square w-full max-w-sm rounded-[2rem] p-8">
            <SeatSvg cushion={colour.code} back={colour.code} className="h-full w-full" label={`${t('home.colourLabel')}: ${name}`} />
          </div>
        </RevealItem>
        <RevealItem className="space-y-6">
          <WordReveal as="h2" text={t('home.colourTitle')} className="t-h2" />
          <p className="text-muted">{t('home.colourSubtitle')}</p>
          <p className="text-sm font-semibold text-ink" aria-live="polite">
            {t('home.colourLabel')}: <span>{name}</span>
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
                    <motion.span layoutId="home-colour-ring" className="absolute -inset-1.5 rounded-full border-2 border-accent" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
                  ) : null}
                  <span className="h-10 w-10 rounded-full border border-line" style={{ background: c.code }} aria-hidden />
                </motion.button>
              );
            })}
          </div>
        </RevealItem>
      </div>
    </RevealSection>
  );
}

function MaterialsHighlight() {
  const { t } = useTranslation();
  return (
    <RevealSection as="section" aria-labelledby="materials-title" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <RevealItem className="mb-8 max-w-2xl">
        <WordReveal as="h2" text={t('home.materialsTitle')} className="t-h2" />
        <p className="mt-2 text-muted">{t('home.materialsSubtitle')}</p>
      </RevealItem>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {MATERIALS.map((key) => (
          <RevealItem key={key}>
            <Link
              to={`/materials#${key}`}
              className="glow-card group block h-full rounded-2xl border border-line bg-card p-5 text-ink no-underline"
              style={{ '--glow': `var(${MATERIAL_META[key].token})` } as CSSProperties}
            >
              <span className="mb-4 block h-2 w-14 rounded-full" style={{ background: `var(${MATERIAL_META[key].token})` }} aria-hidden />
              <h3 className="t-h3">{t(`materials.${key}.name`)}</h3>
              <p className="mt-2 text-sm text-muted">{t(`materials.${key}.body`)}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                {t('materials.viewProducts', { name: t(`materials.${key}.name`) })}
                <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </RevealItem>
        ))}
      </div>
    </RevealSection>
  );
}

function WhatsAppBand() {
  const { t } = useTranslation();
  const settings = useSettings();
  const link = buildWhatsAppUrl(settings.whatsappNumber, t('whatsapp.general'));
  return (
    <RevealSection as="section" aria-labelledby="wa-title" className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
      <RevealItem variants={fadeUp} className="glass relative overflow-hidden rounded-3xl p-8 md:p-12">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-3">
            <h2 id="wa-title" className="t-h2">{t('home.whatsappTitle')}</h2>
            <p className="text-muted">{t('home.whatsappBody')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {link ? (
              <Button
                variant="whatsapp"
                icon={<MessageCircle size={18} aria-hidden />}
                onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}
              >
                {t('home.whatsappCta')}
              </Button>
            ) : null}
            <LinkButton to="/request-quote" variant="secondary" icon={<Sparkles size={18} aria-hidden />}>
              {t('home.quoteCta')}
            </LinkButton>
          </div>
        </div>
      </RevealItem>
    </RevealSection>
  );
}

function CompatibilityMarquee({ products }: { products: PublicProduct[] }) {
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
    <section aria-labelledby="makes-title" className="border-y border-line bg-surface/60 py-6">
      <h2 id="makes-title" className="sr-only">{t('home.makesTitle')}</h2>
      <Marquee
        label={t('home.makesTitle')}
        items={chips.map((c) => (
          <span key={c.key} className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-ink">
            {c.code ? <span className="h-3 w-3 rounded-full border border-line" style={{ background: c.code }} aria-hidden /> : null}
            {c.label}
          </span>
        ))}
      />
      <p className="mt-2 px-4 text-center text-xs text-muted">{t('home.makesSubtitle')}</p>
    </section>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const everything = useAsync(() => api.getProducts({ pageSize: 48 }), []);
  return (
    <>
      <Seo title={t('seo.homeTitle')} description={t('seo.homeDescription')} path="/" />
      <Hero />
      <CompatibilityMarquee products={everything.data?.items ?? []} />
      <FeaturedCollection />
      <ColourPicker />
      <MaterialsHighlight />
      <WhatsAppBand />
    </>
  );
}
