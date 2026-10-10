import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MessageCircle, FileText } from 'lucide-react';
import { MATERIAL_META, type PublicProduct } from '@pcs/shared';
import { useTilt } from '../motion/hooks.js';
import { fadeUp } from '../motion/variants.js';
import { localized, priceSummary } from '../lib/format.js';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';
import { useSettings } from '../lib/useSettings.js';
import type { UiLanguage } from '../i18n/index.js';
import { MaterialBadge } from './MaterialBadge.js';
import { SeatSvg } from './SeatSvg.js';

/**
 * Product card: mouse-position 3D tilt (±8°) and image zoom on desktop, material-colour glow,
 * conic border on hover, quick actions that slide up on hover. Touch devices show the actions statically.
 */
export function ProductCard({ product }: { product: PublicProduct }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === 'hi' ? 'hi' : 'en') as UiLanguage;
  const tilt = useTilt(8);
  const settings = useSettings();
  const name = localized(product.name, lang);
  const category = localized(product.category.name, lang);
  const prices = priceSummary(product, lang);
  const meta = MATERIAL_META[product.material];
  const href = `/products/${product.slug}`;
  const whatsapp = buildWhatsAppUrl(
    settings.whatsappNumber,
    t('whatsapp.productMessage', { name, sku: product.sku }),
  );
  const primaryColour = product.colours[0]?.code;

  return (
    <motion.article
      variants={fadeUp}
      className="group conic-frame glow-card relative h-full rounded-2xl"
      style={{ '--glow': `var(${meta.token})` } as CSSProperties}
    >
      <motion.div
        style={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY, transformPerspective: 900 }}
        onPointerMove={tilt.handlers.onPointerMove}
        onPointerLeave={tilt.handlers.onPointerLeave}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card"
      >
        <Link to={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/3] overflow-hidden bg-surface">
          <motion.div className="h-full w-full p-8" whileHover={{ scale: 1.06 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
            <SeatSvg cushion={primaryColour} back={primaryColour} className="h-full w-full" />
          </motion.div>
          <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
            {prices.onSale ? (
              <span className="rounded-full bg-sale px-2.5 py-1 text-xs font-bold text-on-primary">{t('product.salePrice')}</span>
            ) : null}
          </div>
          <MaterialBadge material={product.material} className="absolute right-3 top-3 bg-card/90" />
        </Link>

        <div className="flex flex-1 flex-col gap-3 p-5">
          <p className="text-xs font-medium text-muted">
            {category} · <span className="font-mono">{product.sku}</span>
          </p>
          <h3 className="t-h3 leading-snug">
            <Link to={href} className="text-ink no-underline hover:underline">
              {name}
            </Link>
          </h3>
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-bold text-ink" aria-label={`${t('product.salePrice')}: ${prices.current}`}>
              {prices.current}
            </span>
            {prices.regular ? (
              <span className="text-sm text-muted line-through">
                <span className="sr-only">{t('product.regularPrice')}: </span>
                {prices.regular}
              </span>
            ) : null}
          </p>

          {product.colours.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label={t('product.colours')}>
              {product.colours.map((c) => {
                const label = localized(c.name, lang);
                return (
                  <li key={c.code}>
                    <span
                      className="tip inline-block h-5 w-5 rounded-full border border-line transition-transform duration-200 hover:scale-125"
                      style={{ background: c.code }}
                      data-tip={label}
                      title={label}
                      role="img"
                      aria-label={label}
                    />
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="mt-auto overflow-hidden rounded-xl">
            <div className="quick-actions flex flex-wrap gap-2 bg-surface p-2">
              <Link
                to={`/request-quote?product=${product.slug}`}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary no-underline"
              >
                <FileText size={16} aria-hidden />
                {t('product.getQuote')}
              </Link>
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-whatsapp px-3 text-sm font-semibold text-[#04130A] no-underline"
                >
                  <MessageCircle size={16} aria-hidden />
                  {t('nav.whatsapp')}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.article>
  );
}
