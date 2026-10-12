import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { RefreshCw, SearchX, TriangleAlert } from 'lucide-react';
import { scaleIn } from '../motion/variants.js';
import { Button } from './motion/Button.js';

/** Shimmer placeholder. Same aspect ratio as the real card, so nothing jumps when data arrives. */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-2xl ${className}`} aria-hidden />;
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <span className="sr-only">{t('states.loading')}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card-soft overflow-hidden">
          <div className="aspect-[4/3] shimmer" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-3/4 shimmer rounded-md" />
            <div className="h-4 w-1/3 shimmer rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <motion.div variants={scaleIn} initial="hidden" animate="show" className="card-soft mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
      <div className="icon-tile !h-16 !w-16 !rounded-2xl" aria-hidden>
        {icon ?? <SearchX size={40} />}
      </div>
      <h2 className="t-h3">{title}</h2>
      {body ? <p className="text-muted">{body}</p> : null}
      {action}
    </motion.div>
  );
}

export function ErrorState({ title, message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div role="alert" variants={scaleIn} initial="hidden" animate="show" className="card-soft mx-auto flex max-w-md flex-col items-center gap-4 !border-sale/40 p-8 text-center">
      <TriangleAlert className="text-sale" size={40} aria-hidden />
      <h2 className="t-h3">{title ?? t('states.errorTitle')}</h2>
      <p className="text-muted">{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} icon={<RefreshCw size={18} aria-hidden />}>
          {t('states.retry')}
        </Button>
      ) : null}
    </motion.div>
  );
}
