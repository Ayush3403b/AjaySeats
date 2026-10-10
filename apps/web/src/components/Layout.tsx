import { Suspense, useEffect } from 'react';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, FileText } from 'lucide-react';
import { api } from '../api/index.js';
import { isUiLanguage, applyLanguage, type UiLanguage } from '../i18n/index.js';
import { pageVariants } from '../motion/variants.js';
import { useScrollDirection } from '../motion/hooks.js';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';
import { useSettings } from '../lib/useSettings.js';
import { Navbar } from './Navbar.js';
import { Footer } from './Footer.js';
import { SkeletonBlock } from './States.js';
import { LinkButton } from './motion/Button.js';

/** Mobile-only top progress bar. Transform-only (scaleX). */
function ScrollProgress() {
  const { t } = useTranslation();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 30 });
  return (
    <motion.div
      role="progressbar"
      aria-label={t('a11y.progress')}
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed inset-x-0 top-0 z-[70] h-1 origin-left bg-gradient-to-r from-primary via-secondary to-accent md:hidden"
      style={{ scaleX }}
    />
  );
}

/** Mobile sticky CTA: Quote + WhatsApp. Hides on scroll-down, reveals on scroll-up. */
function MobileCtaBar() {
  const { t } = useTranslation();
  const { direction, atTop } = useScrollDirection();
  const settings = useSettings();
  const whatsapp = buildWhatsAppUrl(settings.whatsappNumber, t('whatsapp.general'));
  const hidden = direction === 'down' && !atTop;
  return (
    <motion.div
      animate={{ y: hidden ? '140%' : '0%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 40 }}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur md:hidden"
      role="region"
      aria-label={t('nav.quote')}
    >
      <div className="flex gap-2">
        <div className="flex-1">
          <LinkButton to="/request-quote" icon={<FileText size={18} aria-hidden />} className="w-full">
            {t('nav.quote')}
          </LinkButton>
        </div>
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 font-semibold text-[#04130A] no-underline"
          >
            <MessageCircle size={18} aria-hidden />
            {t('nav.whatsapp')}
          </a>
        ) : null}
      </div>
    </motion.div>
  );
}

function PageFallback() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-7xl space-y-4 px-4 py-16 md:px-6">
      <span className="sr-only">{t('states.loading')}</span>
      <SkeletonBlock className="h-10 w-2/3" />
      <SkeletonBlock className="h-5 w-1/2" />
      <SkeletonBlock className="h-64 w-full" />
    </div>
  );
}

export function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [params] = useSearchParams();

  // Keeps the language in sync when a link carries ?lang=.
  const urlLang = params.get('lang');
  useEffect(() => {
    if (isUiLanguage(urlLang)) applyLanguage(urlLang as UiLanguage);
  }, [urlLang]);

  const productPage = location.pathname.startsWith('/products/');

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:font-semibold focus:text-on-primary"
      >
        {t('a11y.skip')}
      </a>
      {api.mode === 'demo' ? (
        <div role="note" className="border-b border-line bg-premium/20 px-4 py-2 text-center text-sm text-ink">
          {t('demo.banner')}
        </div>
      ) : null}
      <Navbar />
      <ScrollProgress />
      <main id="main" className={`flex-1 ${productPage ? 'pb-28' : 'pb-24'} md:pb-0`} tabIndex={-1}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      {productPage ? null : <MobileCtaBar />}
    </div>
  );
}
