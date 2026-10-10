import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CAMPAIGN_STATUSES, type CampaignStatus } from '@pcs/shared';
import { adminApi } from '../api/admin.js';
import { Seo } from '../components/Seo.js';
import { inputClass } from '../components/Field.js';
import { LinkButton } from '../components/motion/Button.js';
import { useAsync } from '../lib/useAsync.js';
import { currentLang } from '../lib/format.js';
import { formatAdminDate } from './messages.js';
import { AdminHeading, AsyncBlock, PagerButtons, StatusBadge } from './ui.js';

const PAGE_SIZE = 20;

function isCampaignStatus(value: string | null): value is CampaignStatus {
  return value !== null && (CAMPAIGN_STATUSES as readonly string[]).includes(value);
}

export default function CampaignsPage() {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status');
  const status = isCampaignStatus(statusParam) ? statusParam : '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const key = params.toString();

  const list = useAsync(() => adminApi.listCampaigns({ page, pageSize: PAGE_SIZE, status: status || undefined }), [key]);

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === undefined || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const data = list.data;
  const totalPages = data?.totalPages ?? 1;

  return (
    <>
      <Seo title={t('admin.campaigns.title')} description={t('admin.campaigns.title')} path="/admin/campaigns" noindex />
      <AdminHeading title={t('admin.campaigns.title')} actions={<LinkButton to="/admin/campaigns/new">{t('admin.campaigns.new')}</LinkButton>} />
      <p className="mb-6 text-sm text-muted">{t('admin.campaigns.explain')}</p>

      <div className="mb-6 max-w-xs">
        <label htmlFor="admin-campaign-status" className="sr-only">
          {t('admin.campaigns.statusFilter')}
        </label>
        <select id="admin-campaign-status" className={inputClass} value={status} onChange={(e) => update({ status: e.target.value || undefined })}>
          <option value="">{t('admin.campaigns.statusAll')}</option>
          {CAMPAIGN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`admin.campaigns.status.${s}`)}
            </option>
          ))}
        </select>
      </div>

      <AsyncBlock
        loading={list.loading && !list.data}
        error={list.error}
        onRetry={list.reload}
        empty={!!data && data.items.length === 0}
        emptyTitle={t('admin.campaigns.empty')}
        emptyAction={<LinkButton to="/admin/campaigns/new">{t('admin.campaigns.new')}</LinkButton>}
      >
        <p className="mb-3 text-sm text-muted" aria-live="polite">
          {t('admin.campaigns.count', { n: data?.total ?? 0 })}
        </p>
        <ul className="space-y-3">
          {data?.items.map((c) => (
            <li key={c.id}>
              <LinkButtonCard to={`/admin/campaigns/${c.id}`}>
                <div className="min-w-0 space-y-1">
                  <p className="break-words text-lg font-bold">{c.name}</p>
                  <p className="text-sm text-muted">
                    {t(`admin.campaigns.languages.${c.language}`)} · {c.city ?? t('admin.campaigns.allCities')} ·{' '}
                    {formatAdminDate(c.createdAt, lang)}
                  </p>
                  {c.status === 'prepared' ? (
                    <p className="text-sm text-muted">
                      {t('admin.campaigns.summaryLine', {
                        eligible: c.counts.eligible,
                        noConsent: c.counts.excludedNoConsent,
                        optedOut: c.counts.excludedOptedOut,
                      })}
                    </p>
                  ) : null}
                </div>
                <StatusBadge tone={c.status === 'prepared' ? 'good' : 'warn'}>{t(`admin.campaigns.status.${c.status}`)}</StatusBadge>
              </LinkButtonCard>
            </li>
          ))}
        </ul>
        {totalPages > 1 ? <PagerButtons page={page} totalPages={totalPages} onPage={(p) => update({ page: String(p) })} /> : null}
      </AsyncBlock>
    </>
  );
}

function LinkButtonCard({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="glass flex flex-col gap-3 rounded-2xl p-4 text-ink no-underline transition-colors hover:bg-card focus-visible:outline-accent md:flex-row md:items-center md:justify-between md:p-5"
    >
      {children}
    </Link>
  );
}
