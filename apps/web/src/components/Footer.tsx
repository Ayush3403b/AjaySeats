import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, LifeBuoy, MessageCircle, Store, type LucideIcon } from 'lucide-react';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';
import { useSettings } from '../lib/useSettings.js';
import { RevealItem, RevealSection } from './motion/Reveal.js';
import { Logo } from './Navbar.js';

function Column({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <RevealItem>
      <h2 className="mb-4 flex items-center gap-2 font-body text-xs font-bold uppercase tracking-[0.2em] text-ink">
        <Icon size={15} aria-hidden className="text-primary" />
        {title}
      </h2>
      <ul className="space-y-3 text-sm">{children}</ul>
    </RevealItem>
  );
}

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <li>
      <Link className="text-muted no-underline transition-colors hover:text-primary" to={to}>
        {children}
      </Link>
    </li>
  );
}

export function Footer() {
  const { t } = useTranslation();
  const settings = useSettings();
  const whatsapp = buildWhatsAppUrl(settings.whatsappNumber, t('whatsapp.general'));
  const year = new Date().getFullYear();
  return (
    <RevealSection as="footer" className="relative isolate mt-0 overflow-hidden border-t border-line bg-page" stagger={0.08}>
      <div aria-hidden className="bg-grid absolute inset-0 -z-10 opacity-70" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 md:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr]">
        <RevealItem className="space-y-4 sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="t-script text-3xl text-primary">{t('hero.titleScript')}</p>
          <p className="max-w-xs text-sm leading-relaxed text-muted">{t('footer.tagline')}</p>
        </RevealItem>
        <Column title={t('footer.shop')} icon={Store}>
          <FooterLink to="/products">{t('nav.allProducts')}</FooterLink>
          <FooterLink to="/materials">{t('nav.materials')}</FooterLink>
        </Column>
        <Column title={t('footer.company')} icon={Building2}>
          <FooterLink to="/about">{t('nav.about')}</FooterLink>
          <FooterLink to="/contact">{t('nav.contact')}</FooterLink>
        </Column>
        <Column title={t('footer.help')} icon={LifeBuoy}>
          <FooterLink to="/request-quote">{t('nav.quote')}</FooterLink>
          <FooterLink to="/privacy">{t('nav.privacy')}</FooterLink>
          <FooterLink to="/terms">{t('nav.terms')}</FooterLink>
        </Column>
        <Column title={t('footer.talk')} icon={MessageCircle}>
          <li className="text-muted">{t('home.whatsappBody')}</li>
          {whatsapp ? (
            <li>
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-whatsapp px-5 text-sm font-semibold text-[#04130A] no-underline shadow-[0_12px_26px_-14px_rgba(37,211,102,0.8)] hover:brightness-105"
              >
                <MessageCircle size={16} aria-hidden />
                {t('home.whatsappCta')}
              </a>
            </li>
          ) : null}
        </Column>
      </div>
      <RevealItem className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 py-6 text-xs uppercase tracking-[0.16em] text-muted sm:flex-row sm:items-center md:px-6">
          <p>
            © {year} {t('app.name')}. {t('footer.rights')}
          </p>
          <p className="flex items-center gap-3">
            <Link to="/privacy" className="text-muted no-underline hover:text-primary">{t('nav.privacy')}</Link>
            <span aria-hidden className="h-1 w-1 rounded-full bg-gold" />
            <Link to="/terms" className="text-muted no-underline hover:text-primary">{t('nav.terms')}</Link>
          </p>
        </div>
      </RevealItem>
    </RevealSection>
  );
}
