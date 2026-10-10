import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { applyTheme, readTheme, type ThemeMode } from '../lib/theme.js';

/** Animated sun/moon. Rotates and scales the icon (transform + opacity only). */
export function ThemeToggle() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ThemeMode>(() => readTheme());
  const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      aria-label={t('a11y.theme')}
      aria-pressed={mode === 'light'}
      onClick={() => {
        applyTheme(next);
        setMode(next);
      }}
      className="tap-target relative inline-flex items-center justify-center rounded-xl border border-line bg-card text-ink hover:bg-surface"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={mode}
          initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="inline-flex"
          aria-hidden
        >
          {mode === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
