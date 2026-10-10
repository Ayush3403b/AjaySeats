import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RevealItem, RevealSection } from './motion/Reveal.js';
import { SeatSvg } from './SeatSvg.js';

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <RevealSection as="footer" className="mt-16 border-t border-line bg-surface" stagger={0.1}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
        <RevealItem className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary p-1">
              <SeatSvg cushion="#0b1020" back="#0b1020" className="h-full w-full" />
            </span>
            <span className="font-heading text-lg font-extrabold">{t('app.name')}</span>
          </div>
          <p className="max-w-xs text-sm text-muted">{t('footer.tagline')}</p>
        </RevealItem>
        <RevealItem>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">{t('footer.shop')}</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="text-ink no-underline hover:underline" to="/products">{t('nav.allProducts')}</Link></li>
            <li><Link className="text-ink no-underline hover:underline" to="/materials">{t('nav.materials')}</Link></li>
          </ul>
        </RevealItem>
        <RevealItem>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">{t('footer.company')}</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="text-ink no-underline hover:underline" to="/about">{t('nav.about')}</Link></li>
            <li><Link className="text-ink no-underline hover:underline" to="/contact">{t('nav.contact')}</Link></li>
          </ul>
        </RevealItem>
        <RevealItem>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">{t('footer.help')}</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="text-ink no-underline hover:underline" to="/request-quote">{t('nav.quote')}</Link></li>
            <li><Link className="text-ink no-underline hover:underline" to="/privacy">{t('nav.privacy')}</Link></li>
            <li><Link className="text-ink no-underline hover:underline" to="/terms">{t('nav.terms')}</Link></li>
          </ul>
        </RevealItem>
      </div>
      <RevealItem className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted md:px-6">
          © {year} {t('app.name')}. {t('footer.rights')}
        </p>
      </RevealItem>
    </RevealSection>
  );
}
