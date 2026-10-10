import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { useScrollDirection } from '../motion/hooks.js';
import { fadeUp, staggerContainer } from '../motion/variants.js';
import { useAsync } from '../lib/useAsync.js';
import { localized } from '../lib/format.js';
import { api } from '../api/index.js';
import type { UiLanguage } from '../i18n/index.js';
import { LanguageSwitch } from './LanguageSwitch.js';
import { ThemeToggle } from './ThemeToggle.js';
import { LinkButton } from './motion/Button.js';
import { SeatSvg } from './SeatSvg.js';

const NAV = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/materials', key: 'nav.materials', end: false },
  { to: '/about', key: 'nav.about', end: false },
  { to: '/contact', key: 'nav.contact', end: false },
] as const;

function Logo() {
  const { t } = useTranslation();
  return (
    <Link to="/" className="flex items-center gap-2 text-ink no-underline" aria-label={t('app.name')}>
      <motion.span whileHover={{ scale: 1.08, rotate: -4 }} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary p-1">
        <SeatSvg cushion="#0b1020" back="#0b1020" className="h-full w-full" />
      </motion.span>
      <span className="font-heading text-base font-extrabold leading-tight sm:text-lg">{t('app.name')}</span>
    </Link>
  );
}

function ProductsMega() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === 'hi' ? 'hi' : 'en') as UiLanguage;
  const [open, setOpen] = useState(false);
  const categories = useAsync(() => api.getCategories(), []);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="products-mega"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        className="group tap-target relative inline-flex items-center gap-1 rounded-lg px-3 text-sm font-medium text-ink"
      >
        {t('nav.products')}
        <ChevronDown size={16} aria-hidden className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        <span aria-hidden className="absolute inset-x-3 bottom-1.5 h-0.5 origin-left scale-x-0 rounded bg-gradient-to-r from-primary to-accent transition-transform duration-300 group-hover:scale-x-100" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            id="products-mega"
            role="region"
            aria-label={t('nav.byCategory')}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="glass absolute left-1/2 top-full z-50 mt-3 w-[min(560px,90vw)] -translate-x-1/2 rounded-2xl p-5 shadow-2xl"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{t('nav.byCategory')}</p>
            <motion.ul variants={staggerContainer(0.05)} initial="hidden" animate="show" className="grid grid-cols-2 gap-2">
              {(categories.data?.items ?? []).map((c) => (
                <motion.li key={c.slug} variants={fadeUp}>
                  <Link to={`/products?category=${c.slug}`} className="block rounded-xl px-3 py-3 text-sm font-semibold text-ink no-underline hover:bg-card">
                    {localized(c.name, lang)}
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
            <Link to="/products" className="mt-3 inline-block text-sm font-semibold text-accent no-underline">
              {t('nav.allProducts')} →
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  const common = 'absolute left-0 block h-0.5 w-5 rounded bg-ink';
  return (
    <span className="relative block h-5 w-5" aria-hidden>
      <motion.span className={common} style={{ top: 4 }} animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }} transition={{ duration: 0.25 }} />
      <motion.span className={common} style={{ top: 10 }} animate={open ? { opacity: 0, scaleX: 0.2 } : { opacity: 1, scaleX: 1 }} transition={{ duration: 0.2 }} />
      <motion.span className={common} style={{ top: 16 }} animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }} transition={{ duration: 0.25 }} />
    </span>
  );
}

export function Navbar() {
  const { t } = useTranslation();
  const { atTop } = useScrollDirection();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,box-shadow] duration-300 ${atTop ? 'bg-transparent' : 'glass shadow-lg'}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
        <Logo />
        <nav aria-label={t('nav.products')} className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="group tap-target relative inline-flex items-center rounded-lg px-3 text-sm font-medium text-ink no-underline"
            >
              {({ isActive }) => (
                <>
                  {t(item.key)}
                  <span
                    aria-hidden
                    className={`absolute inset-x-3 bottom-1.5 h-0.5 origin-left rounded bg-gradient-to-r from-primary to-accent transition-transform duration-300 ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}
                  />
                </>
              )}
            </NavLink>
          ))}
          <ProductsMega />
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitch className="hidden sm:inline-flex" />
          <ThemeToggle />
          <LinkButton to="/request-quote" className="hidden !min-h-[44px] !px-4 md:inline-flex">
            {t('nav.quote')}
          </LinkButton>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-drawer"
            aria-label={menuOpen ? t('a11y.closeMenu') : t('a11y.openMenu')}
            className="tap-target inline-flex items-center justify-center rounded-xl border border-line bg-card lg:hidden"
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} aria-hidden />
            <motion.aside
              id="mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={t('nav.home')}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
              className="absolute right-0 top-0 flex h-full w-[min(360px,88vw)] flex-col gap-2 bg-surface p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <Logo />
                <LanguageSwitch />
              </div>
              <motion.nav variants={staggerContainer(0.06, 0.1)} initial="hidden" animate="show" className="flex flex-col gap-1" aria-label={t('nav.products')}>
                {[...NAV.slice(0, 1), { to: '/products', key: 'nav.products', end: false }, ...NAV.slice(1)].map((item) => (
                  <motion.div key={item.to} variants={fadeUp}>
                    <Link to={item.to} className="tap-target flex items-center rounded-xl px-3 text-lg font-semibold text-ink no-underline hover:bg-card">
                      {t(item.key)}
                    </Link>
                  </motion.div>
                ))}
                <motion.div variants={fadeUp}>
                  <Link to="/privacy" className="tap-target flex items-center rounded-xl px-3 text-base text-muted no-underline hover:bg-card">
                    {t('nav.privacy')}
                  </Link>
                </motion.div>
                <motion.div variants={fadeUp}>
                  <Link to="/terms" className="tap-target flex items-center rounded-xl px-3 text-base text-muted no-underline hover:bg-card">
                    {t('nav.terms')}
                  </Link>
                </motion.div>
              </motion.nav>
              <div className="mt-auto">
                <LinkButton to="/request-quote" className="w-full">
                  {t('nav.quote')}
                </LinkButton>
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
