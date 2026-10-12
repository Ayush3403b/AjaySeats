import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import type { PublicProduct } from '@pcs/shared';
import { SectionHeading } from '../../components/Section.js';
import { RevealItem, RevealSection } from '../../components/motion/Reveal.js';
import { currentLang } from '../../lib/format.js';

const SEARCH_MATERIALS = ['leather', 'leatherette', 'pvc', 'fabric'] as const;
const MAX_MAKE_LINKS = 8;

/**
 * Plain-language overview plus "popular searches" links into the filtered catalogue.
 * Gives search engines descriptive text and internal links; the makes come from listed fitment only.
 */
export function SeoContent({ products }: { products: PublicProduct[] }) {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const makes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.compatibleVehicles.forEach((v) => set.add(v.make)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products]);
  const makesText = makes.length > 0 ? new Intl.ListFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { style: 'long', type: 'conjunction' }).format(makes) : '';

  const searches = [
    ...SEARCH_MATERIALS.map((m) => ({ to: `/products?material=${m}`, label: t('home.seoBlock.materialLink', { name: t(`materials.${m}.name`) }) })),
    ...makes.slice(0, MAX_MAKE_LINKS).map((make) => ({ to: `/products?make=${encodeURIComponent(make)}`, label: t('home.seoBlock.makeLink', { make }) })),
  ];

  return (
    <RevealSection as="section" aria-labelledby="guide-title" className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
      <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <RevealItem>
          <SectionHeading id="guide-title" eyebrow={t('home.seoBlock.eyebrow')} title={t('home.seoBlock.title')} accentWords={2} />
          <div className="mt-6 max-w-2xl space-y-4 leading-relaxed text-muted">
            <p>{t('home.seoBlock.p1', { brand: t('app.name') })}</p>
            <p>{t('home.seoBlock.p2')}</p>
            {makesText ? <p>{t('home.seoBlock.makes', { makes: makesText })}</p> : null}
          </div>
        </RevealItem>
        <RevealItem>
          <nav aria-labelledby="popular-title" className="card-soft p-6 md:p-7">
            <h3 id="popular-title" className="t-h3">
              {t('home.seoBlock.popular')}
            </h3>
            <ul className="mt-5 flex flex-wrap gap-2">
              {searches.map((s) => (
                <li key={s.to}>
                  <Link
                    to={s.to}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-line bg-page px-4 py-2 text-sm font-semibold text-ink no-underline transition-colors hover:border-primary hover:text-primary"
                  >
                    <Search size={14} aria-hidden className="text-muted" />
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </RevealItem>
      </div>
    </RevealSection>
  );
}
