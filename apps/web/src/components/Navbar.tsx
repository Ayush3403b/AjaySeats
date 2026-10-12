import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronDown, House, Info, Layers, Mail, Package, type LucideIcon } from 'lucide-react';
import { useScrollDirection } from '../motion/hooks.js';
import { fadeUp, staggerContainer } from '../motion/variants.js';
import { useAsync } from '../lib/useAsync.js';
import { localized } from '../lib/format.js';
import { api } from '../api/index.js';
import type { UiLanguage } from '../i18n/index.js';
import { LanguageSwitch } from './LanguageSwitch.js';
import { LinkButton } from './motion/Button.js';
import { SeatSvg } from './SeatSvg.js';

const NAV: ReadonlyArray<{ to: string; key: string; end: boolean; icon: LucideIcon }> = [
  { to: '/', key: 'nav.home', end: true, icon: House },
  { to: '/materials', key: 'nav.materials', end: false, icon: Layers },
  { to: '/about', key: 'nav.about', end: false, icon: Info },
  { to: '/contact', key: 'nav.contact', end: false, icon: Mail },
];

const MOBILE_NAV = [NAV[0], { to: '/products', key: 'nav.products', end: false, icon: Package }, ...NAV.slice(1)];

/** Brand mark: indigo tile with a gold seat, Sancreek wordmark and a tracked subline. */
export function Logo({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <Link to="/" className="group flex items-center gap-3 text-ink no-underline" aria-label={t('app.name')}>
      <motion.span
        whileHover={{ rotate: -6, scale: 1.05 }}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-2 shadow-[0_10px_24px_-10px_rgba(48,38,179,0.7)]"
      >
        <SeatSvg cushion="#ffb000" back="#ffd470" className="h-full w-full" />
      </motion.span>
      <span className="flex flex-col">
        <span className="wordmark text-[1.05rem] text-primary-dark sm:text-xl">{t('app.name')}</span>
        {compact ? null : (
          <span className="mt-1 hidden whitespace-nowrap text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-muted sm:block">{t('brand.subline')}</span>
        )}
      </span>
    </Link>
  );
}

function ProductsMega() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === 'hi' ? 'hi' : 'en') as UiLanguage;
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const active = location.pathname.startsWith('/products');
  const categories = useAsync(() => api.getCategories(), []);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="products-mega"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        className={`tap-target relative inline-flex items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors ${
          active ? 'bg-primary-soft text-primary' : 'text-ink hover:bg-mist'
        }`}
      >
        <Package size={16} aria-hidden className={active ? '' : 'text-muted'} />
        {t('nav.products')}
        <ChevronDown size={15} aria-hidden className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
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
            className="absolute right-0 top-full z-50 mt-3 w-[min(560px,90vw)] rounded-3xl border border-line bg-surface p-5 shadow-lift"
          >
            <p className="eyebrow mb-4">{t('nav.byCategory')}</p>
            <motion.ul variants={staggerContainer(0.05)} initial="hidden" animate="show" className="grid grid-cols-2 gap-2">
              {(categories.data?.items ?? []).map((c) => (
                <motion.li key={c.slug} variants={fadeUp}>
                  <Link
                    to={`/products?category=${c.slug}`}
                    className="group flex items-center justify-between gap-2 rounded-2xl border border-transparent px-3 py-3 text-sm font-semibold text-ink no-underline transition-colors hover:border-line hover:bg-page"
                  >
                    {localized(c.name, lang)}
                    <ArrowRight size={15} aria-hidden className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
            <Link to="/products" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary no-underline hover:underline">
              {t('nav.allProducts')} <ArrowRight size={15} aria-hidden />
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

  // The drawer sits outside <header>: the header's backdrop-filter would otherwise become the
  // containing block for the drawer's position: fixed and clip it to the header's height.
  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b bg-surface/90 backdrop-blur-md transition-[box-shadow,border-color] duration-300 ${
          atTop ? 'border-line/60' : 'border-line shadow-soft'
        }`}
      >
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
          <Logo />
          <nav aria-label={t('nav.products')} className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `tap-target relative inline-flex items-center gap-1.5 rounded-full px-3.5 text-sm font-medium no-underline transition-colors ${
                    isActive ? 'bg-primary-soft text-primary' : 'text-ink hover:bg-mist'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={16} aria-hidden className={isActive ? '' : 'text-muted'} />
                    {t(item.key)}
                    {isActive ? (
                      <motion.span layoutId="nav-underline" aria-hidden className="absolute inset-x-4 -bottom-[3px] h-[3px] rounded-full bg-primary" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
            <ProductsMega />
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitch className="hidden sm:inline-flex" />
            <LinkButton to="/request-quote" className="hidden !min-h-[44px] !px-5 !text-sm md:inline-flex">
              {t('nav.quote')}
            </LinkButton>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
              aria-label={menuOpen ? t('a11y.closeMenu') : t('a11y.openMenu')}
              className="tap-target inline-flex items-center justify-center rounded-full border border-line bg-surface shadow-soft lg:hidden"
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </header>

        <AnimatePresence>
          {menuOpen ? (
            <div className="fixed inset-0 z-[60] lg:hidden">
              <motion.div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} aria-hidden />
              <motion.aside
                id="mobile-drawer"
                role="dialog"
                aria-modal="true"
                aria-label={t('nav.home')}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 360, damping: 36 }}
                className="absolute right-0 top-0 flex h-full w-[min(360px,88vw)] flex-col gap-2 bg-page p-6 shadow-2xl"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <Logo compact />
                </div>
                <LanguageSwitch className="mb-4 self-start" />
                <motion.nav variants={staggerContainer(0.06, 0.1)} initial="hidden" animate="show" className="flex flex-col gap-1.5" aria-label={t('nav.products')}>
                  {MOBILE_NAV.map((item) => (
                    <motion.div key={item.to} variants={fadeUp}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          `tap-target flex items-center gap-3 rounded-2xl border px-3 py-2 text-base font-semibold no-underline ${
                            isActive ? 'border-primary/20 bg-primary-soft text-primary' : 'border-transparent text-ink hover:bg-surface'
                          }`
                        }
                      >
                        <span className="icon-tile !h-9 !w-9 !rounded-xl" aria-hidden>
                          <item.icon size={17} />
                        </span>
                        {t(item.key)}
                      </NavLink>
                    </motion.div>
                  ))}
                  <motion.div variants={fadeUp} className="mt-2 flex gap-4 px-3">
                    <Link to="/privacy" className="tap-target inline-flex items-center text-sm text-muted no-underline hover:text-ink">
                      {t('nav.privacy')}
                    </Link>
                    <Link to="/terms" className="tap-target inline-flex items-center text-sm text-muted no-underline hover:text-ink">
                      {t('nav.terms')}
                    </Link>
                  </motion.div>
                </motion.nav>
                <div className="mt-auto">
                  <LinkButton to="/request-quote" className="w-full" icon={<ArrowRight size={18} aria-hidden />}>
                    {t('nav.quote')}
                  </LinkButton>
                </div>
              </motion.aside>
            </div>
          ) : null}
        </AnimatePresence>
    </>
  );
}
