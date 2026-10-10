import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { applyLanguage, SUPPORTED_LANGUAGES, type UiLanguage } from '../i18n/index.js';

const LABELS: Record<UiLanguage, string> = { en: 'EN', hi: 'हिंदी' };
const FULL: Record<UiLanguage, string> = { en: 'English', hi: 'हिन्दी' };

/** Segmented EN | हिंदी control. Choice is saved and mirrored in ?lang= so links can be shared. */
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const current = (i18n.language === 'hi' ? 'hi' : 'en') as UiLanguage;

  const choose = (lng: UiLanguage) => {
    applyLanguage(lng);
    const next = new URLSearchParams(params);
    next.set('lang', lng);
    setParams(next, { replace: true });
  };

  return (
    <div role="group" aria-label={t('a11y.language')} className={`relative inline-flex rounded-xl border border-line bg-card p-1 ${className}`}>
      {SUPPORTED_LANGUAGES.map((lng) => {
        const active = lng === current;
        return (
          <button
            key={lng}
            type="button"
            lang={lng}
            aria-pressed={active}
            title={FULL[lng]}
            onClick={() => choose(lng)}
            className="tap-target relative z-10 rounded-lg px-3 text-sm font-semibold text-ink"
          >
            {active ? (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 -z-10 rounded-lg bg-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            ) : null}
            <span className={active ? 'text-on-primary' : ''}>{LABELS[lng]}</span>
          </button>
        );
      })}
    </div>
  );
}
