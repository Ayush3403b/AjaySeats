import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

/** Snap points as a share of the sheet height: full (0), half (40%), peek (75%). */
const SNAPS = { full: 0, half: 0.4, peek: 0.75 } as const;

/** Mobile filters: draggable bottom sheet with a handle and spring snap points. */
export function FilterSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { t } = useTranslation();
  const y = useMotionValue(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const snapTo = (point: keyof typeof SNAPS) => {
    const sheetHeight = window.innerHeight * 0.9;
    animate(y, SNAPS[point] * sheetHeight, { type: 'spring', stiffness: 380, damping: 38 });
  };

  const onDragEnd = (_: unknown, info: { velocity: { y: number } }) => {
    if (info.velocity.y > 800) return onClose();
    const sheetHeight = window.innerHeight * 0.9;
    const ratio = y.get() / sheetHeight;
    const nearest = (Object.keys(SNAPS) as Array<keyof typeof SNAPS>).reduce((best, key) =>
      Math.abs(SNAPS[key] - ratio) < Math.abs(SNAPS[best] - ratio) ? key : best,
    'full');
    snapTo(nearest);
  };

  return (
    <AnimatePresence onExitComplete={() => y.set(0)}>
      {open ? (
        <div className="fixed inset-0 z-[60] md:hidden" role="presentation">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="absolute inset-x-0 bottom-0 flex h-[90vh] flex-col rounded-t-3xl border-t border-line bg-surface shadow-2xl"
            style={{ y }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: window.innerHeight * 0.6 }}
            dragElastic={0.1}
            onDragEnd={onDragEnd}
          >
            <button
              type="button"
              aria-label={t('a11y.closeMenu')}
              onClick={() => snapTo('peek')}
              className="tap-target mx-auto mt-2 flex w-full items-center justify-center"
            >
              <span className="h-1.5 w-12 rounded-full bg-muted/60" aria-hidden />
            </button>
            <div className="flex items-center justify-between px-5 pb-3">
              <h2 className="t-h3">{title}</h2>
              <button type="button" onClick={onClose} aria-label={t('a11y.closeMenu')} className="tap-target inline-flex items-center justify-center rounded-lg text-ink">
                <X size={22} aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-28">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
