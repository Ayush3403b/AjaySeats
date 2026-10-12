import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MessageCircle, FileText } from 'lucide-react';
import type { PublicProduct } from '@pcs/shared';
import { fadeUp } from '../motion/variants.js';
import { localized, priceSummary } from '../lib/format.js';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';
import { useSettings } from '../lib/useSettings.js';
import type { UiLanguage } from '../i18n/index.js';
import { MaterialBadge } from './MaterialBadge.js';
import { SeatSvg } from './SeatSvg.js';

/**
 * Product card: white card that lifts on hover, seat preview zooms gently, and the quote and
 * WhatsApp actions are always visible so touch and keyboard users see the same thing.
 */
export function ProductCard({ product }: { product: PublicProduct }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === 'hi' ? 'hi' : 'en') as UiLanguage;
  const settings = useSettings();
  const name = localized(product.name, lang);
  const category = localized(product.category.name, lang);
  const prices = priceSummary(product, lang);
  const href = `/products/${product.slug}`;
  const whatsapp = buildWhatsAppUrl(
    settings.whatsappNumber,
    t('whatsapp.productMessage', { name, sku: product.sku }),
  );
  const primaryColour = product.colours[0]?.code;

  return (
    <motion.article variants={fadeUp} className="group card-soft card-hover relative flex h-full flex-col overflow-hidden">
      <Link to={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/3] overflow-hidden border-b border-line bg-mist">
        <div aria-hidden className="bg-dots absolute inset-0 opacity-70" />
        <div aria-hidden className="absolute inset-x-10 bottom-6 h-6 rounded-[50%] bg-ink/10 blur-md" />
        <motion.div className="relative h-full w-full p-9" whileHover={{ scale: 1.06 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
          <SeatSvg cushion={primaryColour} back={primaryColour} className="h-full w-full drop-shadow-[0_14px_18px_rgba(17,24,39,0.18)]" />
        </motion.div>
        {prices.onSale ? (
          <span className="absolute left-3 top-3 rounded-full bg-sale px-2.5 py-1 text-xs font-bold text-white shadow-soft">{t('product.salePrice')}</span>
        ) : null}
        <MaterialBadge material={product.material} className="absolute right-3 top-3 shadow-soft" />
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
          {category} · <span className="font-mono normal-case tracking-normal">{product.sku}</span>
        </p>
        <h3 className="t-h3 leading-snug">
          <Link to={href} className="text-ink no-underline transition-colors hover:text-primary">
            {name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-2">
          <span className="font-heading text-2xl font-semibold text-ink" aria-label={`${t('product.salePrice')}: ${prices.current}`}>
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
                    className="tip inline-block h-5 w-5 rounded-full border-2 border-white shadow-[0_0_0_1px_var(--border)] transition-transform duration-200 hover:scale-125"
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

        <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-4">
          <Link
            to={`/request-quote?product=${product.slug}`}
            className="inline-flex min-h-[44px] min-w-[8.5rem] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-4 text-sm font-semibold text-on-primary no-underline transition-colors hover:bg-primary-dark"
          >
            <FileText size={16} aria-hidden />
            {t('product.getQuote')}
          </Link>
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] min-w-[8.5rem] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-whatsapp/50 bg-whatsapp/10 px-4 text-sm font-semibold text-[#0b6b34] no-underline transition-colors hover:bg-whatsapp/20"
            >
              <MessageCircle size={16} aria-hidden />
              {t('nav.whatsapp')}
            </a>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
