import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/motion/Button.js';
import { EmptyState, ErrorState } from '../components/States.js';

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'border-line bg-card text-muted',
  good: 'border-emerald-600/40 bg-emerald-500/10 text-emerald-800',
  warn: 'border-amber-500/50 bg-amber-400/15 text-amber-900',
  bad: 'border-sale bg-sale/10 text-sale',
  info: 'border-accent/50 bg-accent/10 text-accent',
};

/** Status pill. Colour is paired with text so it never carries meaning alone. */
export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}

export function AdminHeading({ title, actions, back }: { title: string; actions?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        {back ? (
          <Link to={back.to} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-muted no-underline hover:text-ink">
            <ArrowLeft size={16} aria-hidden /> {back.label}
          </Link>
        ) : null}
        <h1 className="t-h2 break-words text-ink">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** Inline live region for save results. Success and errors are announced without moving focus. */
export function Notice({ tone, children }: { tone: 'good' | 'bad'; children: ReactNode }) {
  return (
    <p role={tone === 'bad' ? 'alert' : 'status'} className={`mb-4 rounded-xl border p-3 text-sm font-semibold ${TONES[tone]}`}>
      {children}
    </p>
  );
}

export function PagerButtons({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('catalogue.pagination.page', { page, total: totalPages })} className="mt-8 flex items-center justify-center gap-4">
      <Button variant="secondary" disabled={page <= 1} aria-label={t('catalogue.pagination.prev')} onClick={() => onPage(page - 1)}>
        ←
      </Button>
      <span className="min-w-[9rem] text-center text-sm font-semibold">{t('catalogue.pagination.page', { page, total: totalPages })}</span>
      <Button variant="secondary" disabled={page >= totalPages} aria-label={t('catalogue.pagination.next')} onClick={() => onPage(page + 1)}>
        →
      </Button>
    </nav>
  );
}

export function AsyncBlock({
  loading,
  error,
  onRetry,
  empty,
  emptyTitle,
  emptyAction,
  children,
}: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  empty: boolean;
  emptyTitle: string;
  emptyAction?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div role="status" aria-label={t('states.loading')} className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass h-24 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorState message={t('states.errorBody')} onRetry={onRetry} />;
  if (empty) return <EmptyState title={emptyTitle} action={emptyAction} />;
  return <>{children}</>;
}
