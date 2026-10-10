import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, Search } from 'lucide-react';
import { MATERIALS, MATERIAL_META, SORT_OPTIONS, type Material, type PublicProduct, type SortOption } from '@pcs/shared';
import { api, type CatalogueQuery } from '../api/index.js';
import { Seo } from '../components/Seo.js';
import { ProductCard } from '../components/ProductCard.js';
import { ProductGridSkeleton, ErrorState, EmptyState } from '../components/States.js';
import { FilterSheet } from '../components/FilterSheet.js';
import { Button } from '../components/motion/Button.js';
import { inputClass } from '../components/Field.js';
import { useAsync } from '../lib/useAsync.js';
import { currentLang, localized, price } from '../lib/format.js';
import { COLOUR_OPTIONS } from '../lib/colours.js';
import { staggerContainer, fadeUp } from '../motion/variants.js';
import { useReducedMotion } from '../motion/hooks.js';

const PAGE_SIZE = 12;
const SLIDER_STEP_PAISE = 50_000; // Rs 500

function num(value: string | null): number | undefined {
  if (value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function isMaterial(v: string | null): v is Material {
  return v !== null && (MATERIALS as readonly string[]).includes(v);
}

function isSort(v: string | null): v is SortOption {
  return v !== null && (SORT_OPTIONS as readonly string[]).includes(v);
}

interface FilterProps {
  params: URLSearchParams;
  facets: PublicProduct[];
  categories: Array<{ slug: string; name: { en: string; hi: string } }>;
  onChange: (changes: Record<string, string | undefined>) => void;
}

/** Filter controls, reused in the desktop sidebar and the mobile bottom sheet. */
function FilterControls({ params, facets, categories, onChange }: FilterProps) {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const material = params.get('material');
  const colour = params.get('colour');
  const make = params.get('make') ?? '';
  const model = params.get('model') ?? '';
  const maxPaise = num(params.get('maxPrice'));

  const makes = useMemo(() => [...new Set(facets.flatMap((p) => p.compatibleVehicles.map((v) => v.make)))].sort(), [facets]);
  const models = useMemo(
    () => [...new Set(facets.flatMap((p) => p.compatibleVehicles.filter((v) => !make || v.make === make).map((v) => v.model)))].sort(),
    [facets, make],
  );
  const facetMax = useMemo(() => Math.max(0, ...facets.map((p) => p.salePriceMinor ?? p.priceMinor)), [facets]);
  const sliderMax = Math.max(SLIDER_STEP_PAISE, Math.ceil(facetMax / SLIDER_STEP_PAISE) * SLIDER_STEP_PAISE);
  const [sliderValue, setSliderValue] = useState<number>(maxPaise ?? sliderMax);
  useEffect(() => setSliderValue(maxPaise ?? sliderMax), [maxPaise, sliderMax]);
  const fill = sliderMax > 0 ? sliderValue / sliderMax : 1;
  const reduced = useReducedMotion();

  return (
    <div className="space-y-7">
      <div>
        <label htmlFor="flt-category" className="mb-2 block text-sm font-semibold">{t('catalogue.filters.category')}</label>
        <select id="flt-category" className={inputClass} value={params.get('category') ?? ''} onChange={(e) => onChange({ category: e.target.value || undefined })}>
          <option value="">{t('catalogue.filters.all')}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{localized(c.name, lang)}</option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t('catalogue.filters.material')}</legend>
        <div className="flex flex-wrap gap-2">
          {[undefined, ...MATERIALS].map((m) => {
            const active = (m ?? null) === (material ?? null) || (!m && !material);
            const label = m ? localized(MATERIAL_META[m].label, lang) : t('catalogue.filters.all');
            return (
              <motion.button
                key={m ?? 'all'}
                type="button"
                aria-pressed={active}
                whileTap={reduced ? undefined : { scale: 0.94 }}
                onClick={() => onChange({ material: m })}
                className="tap-target relative rounded-full border border-line px-4 text-sm font-semibold text-ink"
              >
                {active ? <motion.span layoutId="material-chip" className="absolute inset-0 -z-0 rounded-full bg-primary" transition={{ type: 'spring', stiffness: 500, damping: 36 }} /> : null}
                <span className={`relative ${active ? 'text-on-primary' : ''}`}>{label}</span>
              </motion.button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t('catalogue.filters.colour')}</legend>
        <div className="flex flex-wrap gap-3">
          {COLOUR_OPTIONS.map((c) => {
            const active = colour?.toLowerCase() === c.code.toLowerCase();
            const label = localized(c.name, lang);
            return (
              <motion.button
                key={c.id}
                type="button"
                aria-pressed={active}
                aria-label={label}
                title={label}
                whileTap={reduced ? undefined : { scale: 0.9 }}
                onClick={() => onChange({ colour: active ? undefined : c.code })}
                className="tap-target relative inline-flex items-center justify-center rounded-full"
              >
                {active ? <motion.span layoutId="colour-filter-ring" className="absolute -inset-1 rounded-full border-2 border-accent" transition={{ type: 'spring', stiffness: 500, damping: 34 }} /> : null}
                <span className="h-8 w-8 rounded-full border border-line" style={{ background: c.code }} aria-hidden />
              </motion.button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4">
        <div>
          <label htmlFor="flt-make" className="mb-2 block text-sm font-semibold">{t('catalogue.filters.make')}</label>
          <select id="flt-make" className={inputClass} value={make} onChange={(e) => onChange({ make: e.target.value || undefined, model: undefined })}>
            <option value="">{t('catalogue.filters.anyMake')}</option>
            {makes.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="flt-model" className="mb-2 block text-sm font-semibold">{t('catalogue.filters.model')}</label>
          <select id="flt-model" className={inputClass} value={model} onChange={(e) => onChange({ model: e.target.value || undefined })}>
            <option value="">{t('catalogue.filters.anyModel')}</option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="flt-price" className="mb-2 flex items-center justify-between text-sm font-semibold">
          {t('catalogue.filters.price')}
          <span className="font-mono text-muted">{price(sliderValue, lang)}</span>
        </label>
        <div className="relative h-11">
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-line" aria-hidden />
          <motion.div
            aria-hidden
            className="absolute inset-x-0 top-1/2 h-2 origin-left -translate-y-1/2 rounded-full bg-gradient-to-r from-primary to-accent"
            animate={{ scaleX: fill }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
          />
          <input
            id="flt-price"
            type="range"
            min={0}
            max={sliderMax}
            step={SLIDER_STEP_PAISE}
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            onPointerUp={() => onChange({ maxPrice: sliderValue >= sliderMax ? undefined : String(sliderValue) })}
            onKeyUp={() => onChange({ maxPrice: sliderValue >= sliderMax ? undefined : String(sliderValue) })}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent accent-primary"
            aria-valuetext={price(sliderValue, lang)}
          />
        </div>
      </div>

      <button type="button" onClick={() => onChange({ category: undefined, material: undefined, colour: undefined, make: undefined, model: undefined, maxPrice: undefined, q: undefined })} className="tap-target font-semibold text-accent underline-offset-4 hover:underline">
        {t('catalogue.clear')}
      </button>
    </div>
  );
}

export default function Products() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState(params.get('q') ?? '');

  const query: CatalogueQuery = {
    q: params.get('q') ?? undefined,
    category: params.get('category') ?? undefined,
    material: isMaterial(params.get('material')) ? (params.get('material') as Material) : undefined,
    colour: params.get('colour') ?? undefined,
    make: params.get('make') ?? undefined,
    model: params.get('model') ?? undefined,
    maxPrice: num(params.get('maxPrice')),
    sort: isSort(params.get('sort')) ? (params.get('sort') as SortOption) : 'latest',
    page: num(params.get('page')) ?? 1,
    pageSize: PAGE_SIZE,
  };
  const queryKey = params.toString();
  const results = useAsync(() => api.getProducts(query), [queryKey]);
  const facets = useAsync(() => api.getProducts({ pageSize: 48 }), []);
  const categories = useAsync(() => api.getCategories(), []);

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: false });
  };

  // Debounced search: updates the URL 350ms after typing stops.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if ((params.get('q') ?? '') !== search.trim()) update({ q: search.trim() || undefined });
    }, 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const data = results.data;
  const page = data?.page ?? 1;
  const totalPages = data?.totalPages ?? 1;
  const sort = query.sort ?? 'latest';

  return (
    <>
      <Seo title={t('seo.productsTitle')} description={t('seo.productsDescription')} path="/products" />
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <header className="mb-8 max-w-2xl">
          <h1 className="t-h2 gradient-text">{t('catalogue.title')}</h1>
          <p className="mt-2 text-muted">{t('catalogue.subtitle')}</p>
        </header>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <label htmlFor="cat-search" className="sr-only">{t('catalogue.search')}</label>
            <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id="cat-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('catalogue.searchPlaceholder')}
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="cat-sort" className="text-sm font-semibold whitespace-nowrap">{t('catalogue.sort.label')}</label>
            <select id="cat-sort" className={`${inputClass} sm:w-56`} value={sort} onChange={(e) => update({ sort: e.target.value === 'latest' ? undefined : e.target.value })}>
              <option value="latest">{t('catalogue.sort.latest')}</option>
              <option value="price_asc">{t('catalogue.sort.priceAsc')}</option>
              <option value="price_desc">{t('catalogue.sort.priceDesc')}</option>
            </select>
          </div>
          <Button variant="secondary" className="md:hidden" onClick={() => setSheetOpen(true)} icon={<SlidersHorizontal size={18} aria-hidden />}>
            {t('catalogue.openFilters')}
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-[17rem_1fr]">
          <aside aria-label={t('catalogue.filters.title')} className="hidden md:block">
            <div className="glass sticky top-24 rounded-2xl p-5">
              <FilterControls params={params} facets={facets.data?.items ?? []} categories={categories.data?.items ?? []} onChange={update} />
            </div>
          </aside>

          <section aria-live="polite" aria-label={t('catalogue.title')}>
            {data && !results.loading ? (
              <p className="mb-4 text-sm text-muted">{t('catalogue.results', { count: data.total })}</p>
            ) : null}

            {results.loading ? <ProductGridSkeleton /> : null}
            {results.error ? <ErrorState message={t('states.errorBody')} onRetry={results.reload} /> : null}
            {!results.loading && !results.error && data && data.items.length === 0 ? (
              <EmptyState title={t('catalogue.noResults')} action={<Button variant="secondary" onClick={() => setParams(new URLSearchParams(), { replace: false })}>{t('catalogue.clear')}</Button>} />
            ) : null}

            {!results.loading && !results.error && data && data.items.length > 0 ? (
              <>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={queryKey}
                    variants={staggerContainer(0.05)}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                  >
                    {data.items.map((p) => (
                      <motion.div key={p.id} variants={fadeUp} className="h-full">
                        <ProductCard product={p} />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>

                <nav aria-label={t('catalogue.pagination.page', { page, total: totalPages })} className="mt-10 flex items-center justify-center gap-4">
                  <Button variant="secondary" disabled={page <= 1} aria-label={t('catalogue.pagination.prev')} onClick={() => update({ page: String(page - 1) })}>
                    ←
                  </Button>
                  <motion.span key={page} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="min-w-[9rem] text-center text-sm font-semibold">
                    {t('catalogue.pagination.page', { page, total: totalPages })}
                  </motion.span>
                  <Button variant="secondary" disabled={page >= totalPages} aria-label={t('catalogue.pagination.next')} onClick={() => update({ page: String(page + 1) })}>
                    →
                  </Button>
                </nav>
              </>
            ) : null}
          </section>
        </div>
      </div>

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t('catalogue.filters.title')}>
        <FilterControls params={params} facets={facets.data?.items ?? []} categories={categories.data?.items ?? []} onChange={update} />
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface p-4">
          <Button className="w-full" onClick={() => setSheetOpen(false)}>
            {t('catalogue.filters.show', { count: data?.total ?? 0 })}
          </Button>
        </div>
      </FilterSheet>
    </>
  );
}
