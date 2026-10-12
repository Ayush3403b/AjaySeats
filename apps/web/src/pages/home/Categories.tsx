import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { api } from '../../api/index.js';
import { SeatSvg } from '../../components/SeatSvg.js';
import { SectionHeading } from '../../components/Section.js';
import { SkeletonBlock } from '../../components/States.js';
import { LinkButton } from '../../components/motion/Button.js';
import { RevealItem, RevealSection } from '../../components/motion/Reveal.js';
import { useAsync } from '../../lib/useAsync.js';
import { currentLang, localized } from '../../lib/format.js';

/** Card colours cycle through the brand and material tokens. White text stays above AA on each. */
const TONES = ['--primary', '--material-leather', '--teal', '--highlight', '--material-other', '--material-leatherette'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Category cards linking into the filtered catalogue. Hidden when there are no categories or they fail to load. */
export function ShopByCategory() {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const categories = useAsync(() => api.getCategories(), []);
  const items = categories.data?.items ?? [];
  if (categories.error || (!categories.loading && items.length === 0)) return null;

  return (
    <RevealSection as="section" aria-labelledby="categories-title" className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
      <RevealItem className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <SectionHeading id="categories-title" eyebrow={t('home.categories.eyebrow')} title={t('home.categories.title')} subtitle={t('home.categories.subtitle')} />
        <LinkButton to="/products" variant="secondary" icon={<ArrowRight size={18} aria-hidden />}>
          {t('home.viewAll')}
        </LinkButton>
      </RevealItem>
      <RevealItem>
        {categories.loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-live="polite">
            <span className="sr-only">{t('states.loading')}</span>
            {[0, 1, 2].map((i) => (
              <SkeletonBlock key={i} className="h-64 !rounded-[1.5rem]" />
            ))}
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c, i) => {
              const tone = TONES[i % TONES.length];
              const description = localized(c.description, lang);
              return (
                <li key={c.id}>
                  <Link
                    to={`/products?category=${encodeURIComponent(c.slug)}`}
                    className="group relative isolate flex h-full min-h-[16rem] flex-col overflow-hidden rounded-[1.5rem] p-6 text-white no-underline shadow-soft transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift motion-reduce:hover:translate-y-0 md:p-7"
                    style={{ background: `linear-gradient(150deg, color-mix(in srgb, var(${tone}) 78%, #1b1660), color-mix(in srgb, var(${tone}) 38%, #0d0a3a))` }}
                  >
                    <span aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1.6px)] bg-[size:18px_18px] opacity-50" />
                    <span aria-hidden className="absolute -bottom-8 -right-8 -z-10 h-44 w-44 opacity-20 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 motion-reduce:group-hover:transform-none">
                      <SeatSvg cushion="#ffffff" back="#ffffff" className="h-full w-full" />
                    </span>
                    <span className="numeral text-4xl text-white/90" aria-hidden>
                      {pad(i + 1)}
                    </span>
                    <h3 className="t-h3 mt-auto pt-10 text-white">{localized(c.name, lang)}</h3>
                    {description ? <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/80">{description}</p> : null}
                    <span className="mt-5 inline-flex items-center gap-3 text-sm font-semibold">
                      {t('home.categories.browse')}
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors group-hover:bg-white group-hover:text-ink" aria-hidden>
                        <ArrowUpRight size={15} />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </RevealItem>
    </RevealSection>
  );
}
