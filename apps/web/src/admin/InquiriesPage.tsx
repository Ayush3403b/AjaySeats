import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { INQUIRY_STATUSES, type InquiryStatus } from '@pcs/shared';
import { adminApi } from '../api/admin.js';
import { Seo } from '../components/Seo.js';
import { inputClass } from '../components/Field.js';
import { useAsync } from '../lib/useAsync.js';
import { currentLang } from '../lib/format.js';
import { formatAdminDate, INQUIRY_TONE } from './messages.js';
import { AdminHeading, AsyncBlock, PagerButtons, StatusBadge } from './ui.js';

const PAGE_SIZE = 20;

function isInquiryStatus(value: string | null): value is InquiryStatus {
  return value !== null && (INQUIRY_STATUSES as readonly string[]).includes(value);
}

export default function InquiriesPage() {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const statusParam = params.get('status');
  const status = isInquiryStatus(statusParam) ? statusParam : '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);
  const key = params.toString();

  const list = useAsync(
    () => adminApi.listInquiries({ page, pageSize: PAGE_SIZE, q: q || undefined, status: status || undefined }),
    [key],
  );

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === undefined || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  // Debounced search: the URL updates 300 ms after typing stops.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (search.trim() !== q) update({ q: search.trim() || undefined });
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const data = list.data;
  const totalPages = data?.totalPages ?? 1;

  return (
    <>
      <Seo title={t('admin.inquiries.title')} description={t('admin.inquiries.title')} path="/admin/inquiries" noindex />
      <AdminHeading title={t('admin.inquiries.title')} />

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_14rem]">
        <div>
          <label htmlFor="admin-inquiry-search" className="sr-only">
            {t('admin.inquiries.search')}
          </label>
          <input
            id="admin-inquiry-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.inquiries.searchPlaceholder')}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="admin-inquiry-status" className="sr-only">
            {t('admin.inquiries.statusFilter')}
          </label>
          <select id="admin-inquiry-status" className={inputClass} value={status} onChange={(e) => update({ status: e.target.value || undefined })}>
            <option value="">{t('admin.inquiries.statusAll')}</option>
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`admin.inquiries.status.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <AsyncBlock
        loading={list.loading && !list.data}
        error={list.error}
        onRetry={list.reload}
        empty={!!data && data.items.length === 0}
        emptyTitle={t('admin.inquiries.empty')}
      >
        <p className="mb-3 text-sm text-muted" aria-live="polite">
          {t('admin.inquiries.count', { n: data?.total ?? 0 })}
        </p>
        <ul className="space-y-3">
          {data?.items.map((inq) => (
            <li key={inq.id}>
              <Link
                to={`/admin/inquiries/${inq.id}`}
                className="glass flex flex-col gap-3 rounded-2xl p-4 text-ink no-underline transition-colors hover:bg-card focus-visible:outline-accent md:flex-row md:items-center md:justify-between md:p-5"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-mono text-sm font-bold text-accent">{inq.reference}</p>
                  <p className="break-words text-lg font-bold">{inq.customerName}</p>
                  <p className="break-words text-sm text-muted">
                    {inq.phoneMasked} · {inq.city} · {t('admin.inquiries.itemCount', { n: inq.itemCount })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-end">
                  <StatusBadge tone={INQUIRY_TONE[inq.status]}>{t(`admin.inquiries.status.${inq.status}`)}</StatusBadge>
                  <time dateTime={inq.createdAt} className="text-xs text-muted">
                    {formatAdminDate(inq.createdAt, lang)}
                  </time>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {totalPages > 1 ? <PagerButtons page={page} totalPages={totalPages} onPage={(p) => update({ page: String(p) })} /> : null}
      </AsyncBlock>
    </>
  );
}
