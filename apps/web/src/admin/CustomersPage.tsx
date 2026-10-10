import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CUSTOMER_ELIGIBILITY, type AdminCustomer, type CustomerEligibility } from '@pcs/shared';
import { adminApi } from '../api/admin.js';
import { Seo } from '../components/Seo.js';
import { inputClass } from '../components/Field.js';
import { Button } from '../components/motion/Button.js';
import { useAsync } from '../lib/useAsync.js';
import { currentLang } from '../lib/format.js';
import { useAdminSession } from './session.js';
import { adminErrorKey, formatAdminDate } from './messages.js';
import { AdminHeading, AsyncBlock, Notice, PagerButtons, StatusBadge, type Tone } from './ui.js';

const PAGE_SIZE = 20;

function isEligibility(value: string | null): value is CustomerEligibility {
  return value !== null && (CUSTOMER_ELIGIBILITY as readonly string[]).includes(value);
}

function customerState(c: AdminCustomer): { tone: Tone; key: string } {
  if (c.optedOut) return { tone: 'bad', key: 'admin.customers.optedOutBadge' };
  if (c.eligible) return { tone: 'good', key: 'admin.customers.eligibleBadge' };
  return { tone: 'neutral', key: 'admin.customers.noConsentBadge' };
}

type Pending = { id: string; kind: 'optOut' | 'restore' } | null;

export default function CustomersPage() {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const session = useAdminSession();
  const isOwner = session.user?.role === 'owner';
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const eligibilityParam = params.get('eligibility');
  const eligibility = isEligibility(eligibilityParam) ? eligibilityParam : '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);
  const key = params.toString();

  const list = useAsync(
    () => adminApi.listCustomers({ page, pageSize: PAGE_SIZE, q: q || undefined, eligibility: eligibility || undefined }),
    [key],
  );

  const [pending, setPending] = useState<Pending>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === undefined || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  // Debounced search, as on the inquiries page.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (search.trim() !== q) update({ q: search.trim() || undefined });
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const confirm = async (c: AdminCustomer) => {
    if (!pending) return;
    setBusy(true);
    setResult(null);
    try {
      const optedOut = pending.kind === 'optOut';
      await adminApi.setCustomerOptOut(c.id, optedOut, optedOut && note.trim() ? note.trim() : undefined);
      setResult({ tone: 'good', text: t(optedOut ? 'admin.customers.optedOutDone' : 'admin.customers.restoredDone') });
      setPending(null);
      setNote('');
      list.reload();
    } catch (err) {
      setResult({ tone: 'bad', text: t(adminErrorKey(err)) });
    } finally {
      setBusy(false);
    }
  };

  const data = list.data;
  const totalPages = data?.totalPages ?? 1;

  return (
    <>
      <Seo title={t('admin.customers.title')} description={t('admin.customers.title')} path="/admin/customers" noindex />
      <AdminHeading title={t('admin.customers.title')} />
      <p className="mb-6 text-sm text-muted">{t('admin.customers.explain')}</p>

      {result ? <Notice tone={result.tone}>{result.text}</Notice> : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_16rem]">
        <div>
          <label htmlFor="admin-customer-search" className="sr-only">
            {t('admin.customers.search')}
          </label>
          <input
            id="admin-customer-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.customers.searchPlaceholder')}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="admin-customer-eligibility" className="sr-only">
            {t('admin.customers.eligibilityFilter')}
          </label>
          <select
            id="admin-customer-eligibility"
            className={inputClass}
            value={eligibility}
            onChange={(e) => update({ eligibility: e.target.value || undefined })}
          >
            <option value="">{t('admin.customers.eligibilityAll')}</option>
            {CUSTOMER_ELIGIBILITY.map((e) => (
              <option key={e} value={e}>
                {t(`admin.customers.eligibility.${e}`)}
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
        emptyTitle={t('admin.customers.empty')}
      >
        <p className="mb-3 text-sm text-muted" aria-live="polite">
          {t('admin.customers.count', { n: data?.total ?? 0 })}
        </p>
        <ul className="space-y-3">
          {data?.items.map((c) => {
            const state = customerState(c);
            const isPending = pending?.id === c.id;
            return (
              <li key={c.id} className="glass space-y-4 rounded-2xl p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="break-words text-lg font-bold">{c.name}</p>
                    <p className="break-words text-sm text-muted">
                      {c.phoneMasked}
                      {c.city ? ` · ${c.city}` : ''} · {t('admin.customers.inquiries', { n: c.inquiryCount })}
                    </p>
                    {c.lastInquiryAt ? (
                      <p className="text-xs text-muted">
                        {t('admin.customers.lastRequest')}{' '}
                        <time dateTime={c.lastInquiryAt}>{formatAdminDate(c.lastInquiryAt, lang)}</time>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={state.tone}>{t(state.key)}</StatusBadge>
                    <StatusBadge tone={c.consentMarketing ? 'info' : 'neutral'}>
                      {c.consentMarketing ? t('admin.customers.consentYes') : t('admin.customers.consentNo')}
                    </StatusBadge>
                  </div>
                </div>

                {c.optedOut && c.optedOutAt ? (
                  <p className="text-xs text-muted">
                    {t('admin.customers.optedOutOn', { when: formatAdminDate(c.optedOutAt, lang) })}
                  </p>
                ) : null}

                {!isPending ? (
                  c.optedOut ? (
                    isOwner ? (
                      <Button variant="secondary" className="min-h-[40px] px-4 py-2" disabled={busy} onClick={() => setPending({ id: c.id, kind: 'restore' })}>
                        {t('admin.customers.restore')}
                      </Button>
                    ) : (
                      <p className="text-sm text-muted">{t('admin.customers.restoreOwnerOnly')}</p>
                    )
                  ) : (
                    <Button variant="ghost" className="min-h-[40px] px-4 py-2 text-sale" disabled={busy} onClick={() => setPending({ id: c.id, kind: 'optOut' })}>
                      {t('admin.customers.optOut')}
                    </Button>
                  )
                ) : (
                  <div className="space-y-3 rounded-xl border border-line p-4">
                    {pending.kind === 'optOut' ? (
                      <div className="space-y-1">
                        <label htmlFor={`note-${c.id}`} className="text-sm font-semibold">
                          {t('admin.customers.noteLabel')}
                        </label>
                        <input
                          id={`note-${c.id}`}
                          value={note}
                          maxLength={300}
                          onChange={(e) => setNote(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    ) : null}
                    <p className="text-sm text-muted">
                      {t(pending.kind === 'optOut' ? 'admin.customers.optOutHelp' : 'admin.customers.restoreHelp')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={pending.kind === 'optOut' ? 'primary' : 'secondary'}
                        className="min-h-[40px] px-4 py-2"
                        disabled={busy}
                        aria-busy={busy}
                        onClick={() => confirm(c)}
                      >
                        {t(pending.kind === 'optOut' ? 'admin.customers.confirmOptOut' : 'admin.customers.confirmRestore')}
                      </Button>
                      <Button
                        variant="ghost"
                        className="min-h-[40px] px-4 py-2"
                        disabled={busy}
                        onClick={() => {
                          setPending(null);
                          setNote('');
                        }}
                      >
                        {t('admin.customers.cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {totalPages > 1 ? <PagerButtons page={page} totalPages={totalPages} onPage={(p) => update({ page: String(p) })} /> : null}
      </AsyncBlock>
    </>
  );
}
