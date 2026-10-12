import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronDown, FileText, MessageCircle, ShoppingBag, Check } from 'lucide-react';
import { MATERIAL_META, type PublicProduct } from '@pcs/shared';
import { api, ApiError } from '../api/index.js';
import { Seo } from '../components/Seo.js';
import { SeatSvg } from '../components/SeatSvg.js';
import { MaterialBadge } from '../components/MaterialBadge.js';
import { Carousel } from '../components/Carousel.js';
import { ProductCard } from '../components/ProductCard.js';
import { ErrorState, EmptyState, SkeletonBlock } from '../components/States.js';
import { Button, LinkButton } from '../components/motion/Button.js';
import { RevealItem, RevealSection } from '../components/motion/Reveal.js';
import { useAsync } from '../lib/useAsync.js';
import { currentLang, localized, priceSummary, schemaPrice } from '../lib/format.js';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';
import { useSettings } from '../lib/useSettings.js';
import { useQuoteBasket } from '../lib/quoteBasket.js';
import { useReducedMotion } from '../motion/hooks.js';

function Accordion({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const reduced = useReducedMotion();
  return (
    <div className="border-b border-line">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="tap-target flex w-full items-center justify-between py-4 text-left text-base font-bold text-ink"
        >
          {title}
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} aria-hidden>
            <ChevronDown size={20} />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0.15 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-5 text-muted">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Gallery({ product, selected, onSelect }: { product: PublicProduct; selected: number; onSelect: (i: number) => void }) {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const reduced = useReducedMotion();
  const colour = product.colours[selected] ?? product.colours[0];
  const name = localized(product.name, lang);

  return (
    <div className="space-y-4">
      <div
        className="card-soft relative aspect-[4/3] cursor-zoom-in overflow-hidden !rounded-[2rem] bg-mist"
        onPointerMove={(e) => {
          if (reduced || e.pointerType !== 'mouse') return;
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
        onClick={() => setZoomed((z) => !z)}
        role="button"
        tabIndex={0}
        aria-pressed={zoomed}
        aria-label={`${name}. ${t('product.zoom')}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setZoomed((z) => !z);
          }
        }}
      >
        <div aria-hidden className="bg-dots absolute inset-0 opacity-70" />
        <div aria-hidden className="absolute inset-x-[22%] bottom-[12%] h-8 rounded-[50%] bg-ink/15 blur-lg" />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={colour?.code ?? 'default'}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: zoomed && !reduced ? 1.6 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ transformOrigin: origin }}
            className="absolute inset-0 p-10"
          >
            <SeatSvg cushion={colour?.code} back={colour?.code} className="h-full w-full drop-shadow-[0_24px_28px_rgba(17,24,39,0.2)]" />
          </motion.div>
        </AnimatePresence>
        <p className="absolute bottom-4 left-4 rounded-full border border-line bg-surface/90 px-3 py-1 text-xs font-medium text-ink shadow-soft">{t('product.zoom')}</p>
      </div>
      {product.colours.length > 1 ? (
        <div className="flex gap-3" role="group" aria-label={t('product.gallery')}>
          {product.colours.map((c, i) => (
            <button
              key={c.code}
              type="button"
              aria-pressed={i === selected}
              aria-label={t('product.swatch', { name: localized(c.name, lang) })}
              onClick={() => onSelect(i)}
              className="tap-target relative inline-flex items-center justify-center rounded-xl"
            >
              <span className="h-14 w-14 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-soft">
                <SeatSvg cushion={c.code} back={c.code} className="h-full w-full" />
              </span>
              {i === selected ? <motion.span layoutId="thumb-ring" className="absolute -inset-1 rounded-2xl border-2 border-primary" transition={{ type: 'spring', stiffness: 500, damping: 34 }} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-2 md:px-6">
      <SkeletonBlock className="aspect-[4/3] w-full" />
      <div className="space-y-4">
        <SkeletonBlock className="h-8 w-3/4" />
        <SkeletonBlock className="h-6 w-1/3" />
        <SkeletonBlock className="h-32 w-full" />
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { slug = '' } = useParams();
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const settings = useSettings();
  const basket = useQuoteBasket();
  const [selected, setSelected] = useState(0);
  const [flash, setFlash] = useState<'addedToQuote' | 'alreadyInQuote' | 'quoteFull' | null>(null);

  const product = useAsync(() => api.getProduct(slug), [slug]);
  const related = useAsync(async () => {
    const p = product.data;
    if (!p) return [];
    const res = await api.getProducts({ category: p.category.slug, pageSize: 8 });
    return res.items.filter((i) => i.id !== p.id);
  }, [product.data?.id]);

  if (product.loading) return <DetailSkeleton />;

  if (product.error) {
    const notFound = product.error instanceof ApiError && product.error.status === 404;
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        {notFound ? (
          <EmptyState title={t('states.notFoundTitle')} body={t('product.notFound')} action={<LinkButton to="/products" variant="secondary">{t('product.back')}</LinkButton>} />
        ) : (
          <ErrorState message={t('states.errorBody')} onRetry={product.reload} />
        )}
      </div>
    );
  }

  const p = product.data!;
  const name = localized(p.name, lang);
  const description = localized(p.description, lang);
  const prices = priceSummary(p, lang);
  const meta = MATERIAL_META[p.material];
  const whatsapp = buildWhatsAppUrl(settings.whatsappNumber, t('whatsapp.productMessage', { name, sku: p.sku }));
  const inList = basket.has(p.id);
  const availabilityLabel = t(`product.${p.availability}`);

  const addToQuote = () => {
    if (inList) {
      setFlash('alreadyInQuote');
    } else {
      const ok = basket.add({ productId: p.id, slug: p.slug, sku: p.sku, name: p.name });
      setFlash(ok ? 'addedToQuote' : 'quoteFull');
    }
    window.setTimeout(() => setFlash(null), 2400);
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    sku: p.sku,
    category: localized(p.category.name, lang),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: schemaPrice(p.salePriceMinor ?? p.priceMinor),
      availability: p.availability === 'in_stock' ? 'https://schema.org/InStock' : p.availability === 'unavailable' ? 'https://schema.org/OutOfStock' : 'https://schema.org/PreOrder',
    },
  };

  return (
    <>
      <Seo title={localized(p.seo.title, lang)} description={localized(p.seo.description, lang)} path={`/products/${p.slug}`} jsonLd={jsonLd} />
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-6 md:pt-10">
        <nav aria-label={t('a11y.breadcrumb')} className="mb-6 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link to="/products" className="text-muted no-underline hover:text-primary">{t('nav.products')}</Link></li>
            <li aria-hidden>/</li>
            <li className="font-medium text-ink" aria-current="page">{name}</li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
          <motion.div initial={{ opacity: 0.001 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <Gallery product={p} selected={selected} onSelect={setSelected} />
          </motion.div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="card-soft !rounded-[2rem] p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <MaterialBadge material={p.material} />
                <span className="font-mono text-xs text-muted">{t('product.sku')}: {p.sku}</span>
              </div>
              <h1 className="t-h2 mt-4 leading-tight text-ink">{name}</h1>
              <span aria-hidden className="accent-bar mt-4" />

              <div className="mt-5 flex flex-wrap items-baseline gap-3" aria-live="polite">
                <span className="font-heading text-4xl font-semibold text-ink">{prices.current}</span>
                {prices.regular ? (
                  <span className="text-base text-muted line-through">
                    <span className="sr-only">{t('product.regularPrice')}: </span>
                    {prices.regular}
                  </span>
                ) : null}
                {prices.onSale ? (
                  <span className="rounded-full bg-sale px-2.5 py-1 text-xs font-bold text-white">{t('product.salePrice')}</span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted">{t('product.priceNote')}</p>
              <p className="mt-4 text-sm font-semibold text-ink">
                {t('product.availability')}: <span className="font-normal">{availabilityLabel}</span>
              </p>

              {p.colours.length > 0 ? (
                <div className="mt-6">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-ink">{t('product.colours')}</p>
                  <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={t('product.colours')}>
                    {p.colours.map((c, i) => {
                      const label = localized(c.name, lang);
                      return (
                        <motion.button
                          key={c.code}
                          type="button"
                          role="radio"
                          aria-checked={i === selected}
                          aria-label={label}
                          title={label}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setSelected(i)}
                          className="tap-target relative inline-flex items-center justify-center rounded-full"
                        >
                          {i === selected ? <motion.span layoutId="pdp-swatch" className="absolute -inset-1.5 rounded-full border-2 border-primary" transition={{ type: 'spring', stiffness: 500, damping: 34 }} /> : null}
                          <span className="h-9 w-9 rounded-full border-2 border-white shadow-[0_0_0_1px_var(--border),0_6px_14px_-6px_rgba(17,24,39,0.4)]" style={{ background: c.code }} aria-hidden />
                        </motion.button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-sm text-muted">{localized(p.colours[selected]?.name, lang)}</p>
                </div>
              ) : null}

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <LinkButton to={`/request-quote?product=${p.slug}`} icon={<FileText size={18} aria-hidden />} className="w-full">
                  {t('product.getQuote')}
                </LinkButton>
                <Button variant="secondary" onClick={addToQuote} icon={inList ? <Check size={18} aria-hidden /> : <ShoppingBag size={18} aria-hidden />} className="w-full" aria-pressed={inList}>
                  {inList ? t('product.inQuote') : t('product.addToQuote')}
                </Button>
              </div>
              <div className="mt-3 min-h-[1.5rem]" aria-live="polite">
                <AnimatePresence mode="wait">
                  {flash ? (
                    <motion.p key={flash} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm font-semibold text-primary">
                      {t(`product.${flash}`)}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>
              {whatsapp ? (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-5 font-semibold text-[#04130A] no-underline shadow-[0_14px_30px_-14px_rgba(37,211,102,0.7)] hover:brightness-105">
                  <MessageCircle size={18} aria-hidden />
                  {t('product.whatsapp')}
                </a>
              ) : (
                <p className="mt-2 text-center text-sm text-muted">{t('product.whatsappUnavailable')}</p>
              )}
            </div>
          </div>
        </div>

        <RevealSection className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <RevealItem>
            <div className="card-soft !rounded-[2rem] px-6 md:px-8">
              <Accordion title={t('product.description')} defaultOpen>
                <p className="leading-relaxed">{description}</p>
              </Accordion>
              <Accordion title={t('product.specs')}>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
                  <dt className="font-semibold text-ink">{t('product.material')}</dt>
                  <dd>{localized(meta.label, lang)}</dd>
                  <dt className="font-semibold text-ink">{t('product.sku')}</dt>
                  <dd className="font-mono">{p.sku}</dd>
                  <dt className="font-semibold text-ink">{t('product.colours')}</dt>
                  <dd>{p.colours.map((c) => localized(c.name, lang)).join(', ') || '—'}</dd>
                </dl>
              </Accordion>
              <Accordion title={t('product.stitching')}>
                {p.stitching.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5">{p.stitching.map((s, i) => <li key={i}>{localized(s, lang)}</li>)}</ul>
                ) : (
                  <p>{t('product.noStitching')}</p>
                )}
              </Accordion>
              <Accordion title={t('product.fitment')}>
                {p.compatibleVehicles.length > 0 ? (
                  <ul className="space-y-2">
                    {p.compatibleVehicles.map((v, i) => (
                      <li key={i}>
                        <span className="font-semibold text-ink">{v.make} {v.model}</span>{' '}
                        {v.yearTo ? t('product.fitmentYears', { from: v.yearFrom, to: v.yearTo }) : t('product.fitmentFrom', { from: v.yearFrom })}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{t('product.noFitment')}</p>
                )}
              </Accordion>
            </div>
          </RevealItem>
        </RevealSection>

        {related.data && related.data.length > 0 ? (
          <section aria-labelledby="related-title" className="mt-16">
            <h2 id="related-title" className="t-h2 mb-3 text-ink">{t('product.related')}</h2>
            <span aria-hidden className="accent-bar mb-8" />
            <Carousel label={t('product.related')}>
              {related.data.map((r) => (
                <ProductCard key={r.id} product={r} />
              ))}
            </Carousel>
          </section>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted">{name}</p>
            <p className="font-heading text-lg font-semibold">{prices.current}</p>
          </div>
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={t('product.whatsapp')} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-whatsapp text-[#04130A]">
              <MessageCircle size={20} aria-hidden />
            </a>
          ) : null}
          <LinkButton to={`/request-quote?product=${p.slug}`}>{t('product.getQuote')}</LinkButton>
        </div>
      </div>
    </>
  );
}
