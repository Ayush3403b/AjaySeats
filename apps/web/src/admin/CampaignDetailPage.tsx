import { useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AdminCampaignRecipient } from '@pcs/shared';
import { adminApi } from '../api/admin.js';
import { Seo } from '../components/Seo.js';
import { Button, LinkButton } from '../components/motion/Button.js';
import { useAsync } from '../lib/useAsync.js';
import { currentLang } from '../lib/format.js';
import { adminErrorKey, formatAdminDate } from './messages.js';
import { AdminHeading, AsyncBlock, Notice, PagerButtons, StatusBadge } from './ui.js';

const PAGE_SIZE = 20;

type Result = { tone: 'good' | 'bad'; text: string } | null;

export default function CampaignDetailPage() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const notice = (location.state as { notice?: 'created' | 'saved' } | null)?.notice;

  const campaign = useAsync(() => adminApi.getCampaign(id), [id]);
  const prepared = campaign.data?.status === 'prepared';
  const recipients = useAsync(
    () => (prepared ? adminApi.listRecipients(id, { page, pageSize: PAGE_SIZE }) : Promise.resolve(null)),
    [id, page, prepared],
  );

  const [result, setResult] = useState<Result>(null);
  const [busy, setBusy] = useState(false);
  const [confirmPrepare, setConfirmPrepare] = useState(false);
  const [busyRecipient, setBusyRecipient] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState<string | null>(null);

  const reloadAll = () => {
    campaign.reload();
    recipients.reload();
  };

  const prepare = async () => {
    setBusy(true);
    setResult(null);
    try {
      const c = await adminApi.prepareCampaign(id);
      setResult({ tone: 'good', text: t('admin.campaigns.detail.preparedDone', { n: c.counts.eligible }) });
      setConfirmPrepare(false);
      reloadAll();
    } catch (err) {
      setResult({ tone: 'bad', text: t(adminErrorKey(err)) });
      reloadAll();
    } finally {
      setBusy(false);
    }
  };

  /**
   * The window is opened synchronously in the click so browsers do not block it. Only after the
   * API confirms eligibility is the link loaded into it. Opening is recorded as a staff click,
   * not as a delivery.
   */
  const openLink = async (r: AdminCampaignRecipient) => {
    const win = window.open('about:blank', '_blank');
    if (!win) {
      setResult({ tone: 'bad', text: t('admin.campaigns.recipients.popupBlocked') });
      return;
    }
    setBusyRecipient(r.id);
    setResult(null);
    try {
      const link = await adminApi.recipientLink(id, r.id);
      win.opener = null;
      win.location.href = link.url;
      await adminApi.markLinkOpened(id, r.id);
    } catch (err) {
      win.close();
      setResult({ tone: 'bad', text: t(adminErrorKey(err)) });
    } finally {
      setBusyRecipient(null);
      recipients.reload();
    }
  };

  const markSent = async (r: AdminCampaignRecipient) => {
    setBusyRecipient(r.id);
    setResult(null);
    try {
      await adminApi.markSentConfirmed(id, r.id);
      setResult({ tone: 'good', text: t('admin.campaigns.recipients.sentDone') });
      setConfirmSent(null);
    } catch (err) {
      setResult({ tone: 'bad', text: t(adminErrorKey(err)) });
    } finally {
      setBusyRecipient(null);
      recipients.reload();
    }
  };

  const c = campaign.data;
  const totalPages = recipients.data?.totalPages ?? 1;

  return (
    <>
      <Seo title={c?.name ?? t('admin.campaigns.title')} description={t('admin.campaigns.title')} path="/admin/campaigns" noindex />
      <AdminHeading
        title={c?.name ?? t('admin.campaigns.title')}
        back={{ to: '/admin/campaigns', label: t('admin.campaigns.detail.back') }}
        actions={
          c && !prepared ? (
            <LinkButton to={`/admin/campaigns/${c.id}/edit`} variant="secondary">
              {t('admin.campaigns.detail.edit')}
            </LinkButton>
          ) : undefined
        }
      />

      <div aria-live="polite" className="mb-4 space-y-3">
        {notice === 'created' ? <Notice tone="good">{t('admin.campaigns.form.created')}</Notice> : null}
        {notice === 'saved' ? <Notice tone="good">{t('admin.campaigns.form.saved')}</Notice> : null}
        {result ? <Notice tone={result.tone}>{result.text}</Notice> : null}
      </div>

      <AsyncBlock loading={campaign.loading && !campaign.data} error={campaign.error} onRetry={reloadAll} empty={false} emptyTitle="">
        {c ? (
          <div className="space-y-6">
            <section aria-labelledby="sec-summary" className="glass space-y-4 rounded-2xl p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 id="sec-summary" className="sr-only">
                  {t('admin.campaigns.detail.summary')}
                </h2>
                <StatusBadge tone={prepared ? 'good' : 'warn'}>{t(`admin.campaigns.status.${c.status}`)}</StatusBadge>
                <span className="text-sm text-muted">
                  {t(`admin.campaigns.languages.${c.language}`)} · {c.city ?? t('admin.campaigns.allCities')} ·{' '}
                  {formatAdminDate(c.createdAt, lang)}
                </span>
              </div>
              <pre lang={c.language} className="whitespace-pre-wrap break-words rounded-xl border border-line bg-surface p-4 font-sans text-sm">
                {c.message}
              </pre>
              <p className="text-xs text-muted">{t('admin.campaigns.detail.placeholderHint')}</p>
            </section>

            {!prepared ? (
              <section aria-labelledby="sec-prepare" className="glass space-y-4 rounded-2xl p-5 md:p-6">
                <h2 id="sec-prepare" className="t-h3">
                  {t('admin.campaigns.detail.prepareTitle')}
                </h2>
                <p className="text-sm text-muted">{t('admin.campaigns.detail.prepareHelp')}</p>
                {!confirmPrepare ? (
                  <Button onClick={() => setConfirmPrepare(true)} disabled={busy}>
                    {t('admin.campaigns.detail.prepare')}
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={prepare} disabled={busy} aria-busy={busy}>
                      {t('admin.campaigns.detail.confirmPrepare')}
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmPrepare(false)} disabled={busy}>
                      {t('admin.campaigns.detail.cancel')}
                    </Button>
                  </div>
                )}
              </section>
            ) : (
              <>
                <section aria-labelledby="sec-counts" className="space-y-3">
                  <h2 id="sec-counts" className="t-h3">
                    {t('admin.campaigns.detail.countsTitle')}
                  </h2>
                  <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    {(
                      [
                        ['eligible', c.counts.eligible],
                        ['excludedNoConsent', c.counts.excludedNoConsent],
                        ['excludedOptedOut', c.counts.excludedOptedOut],
                        ['linkOpened', c.linkOpenedCount],
                        ['sentConfirmed', c.sentConfirmedCount],
                      ] as const
                    ).map(([key, value]) => (
                      <div key={key} className="glass rounded-2xl p-4">
                        <dt className="text-xs font-semibold text-muted">{t(`admin.campaigns.detail.counts.${key}`)}</dt>
                        <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-xs text-muted">{t('admin.campaigns.detail.excludedNote')}</p>
                </section>

                <section aria-labelledby="sec-recipients" className="space-y-3">
                  <h2 id="sec-recipients" className="t-h3">
                    {t('admin.campaigns.recipients.title')}
                  </h2>
                  <p className="text-sm text-muted">{t('admin.campaigns.recipients.reminder')}</p>
                  <AsyncBlock
                    loading={recipients.loading && !recipients.data}
                    error={recipients.error}
                    onRetry={recipients.reload}
                    empty={!!recipients.data && recipients.data.items.length === 0}
                    emptyTitle={t('admin.campaigns.recipients.empty')}
                  >
                    <ul className="space-y-3">
                      {recipients.data?.items.map((r) => {
                        const isBusy = busyRecipient === r.id;
                        return (
                          <li key={r.id} className="glass space-y-3 rounded-2xl p-4 md:p-5">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div className="min-w-0">
                                <p className="break-words font-bold">{r.customerName}</p>
                                <p className="text-sm text-muted">{r.phoneMasked}</p>
                              </div>
                              {r.eligible ? null : (
                                <StatusBadge tone="bad">{t('admin.campaigns.recipients.notEligible')}</StatusBadge>
                              )}
                            </div>
                            {r.eligible ? null : <p className="text-sm text-sale">{t('admin.campaigns.recipients.notEligibleHelp')}</p>}
                            <div className="grid gap-1 text-xs text-muted sm:grid-cols-2">
                              <span>
                                {r.linkOpenedAt
                                  ? t('admin.campaigns.recipients.linkOpenedAt', { when: formatAdminDate(r.linkOpenedAt, lang) })
                                  : t('admin.campaigns.recipients.notOpened')}
                              </span>
                              <span>
                                {r.sentConfirmedAt
                                  ? t('admin.campaigns.recipients.sentAt', { when: formatAdminDate(r.sentConfirmedAt, lang) })
                                  : t('admin.campaigns.recipients.notSent')}
                              </span>
                            </div>
                            {r.eligible ? (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="whatsapp"
                                  className="min-h-[40px] px-4 py-2"
                                  disabled={isBusy}
                                  aria-busy={isBusy}
                                  onClick={() => openLink(r)}
                                >
                                  {t('admin.campaigns.recipients.openLink')}
                                </Button>
                                {!r.sentConfirmedAt ? (
                                  confirmSent === r.id ? (
                                    <>
                                      <Button variant="secondary" className="min-h-[40px] px-4 py-2" disabled={isBusy} onClick={() => markSent(r)}>
                                        {t('admin.campaigns.recipients.confirmSent')}
                                      </Button>
                                      <Button variant="ghost" className="min-h-[40px] px-4 py-2" disabled={isBusy} onClick={() => setConfirmSent(null)}>
                                        {t('admin.campaigns.detail.cancel')}
                                      </Button>
                                    </>
                                  ) : (
                                    <Button variant="ghost" className="min-h-[40px] px-4 py-2" disabled={isBusy} onClick={() => setConfirmSent(r.id)}>
                                      {t('admin.campaigns.recipients.markSent')}
                                    </Button>
                                  )
                                ) : null}
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                    {totalPages > 1 ? (
                      <PagerButtons
                        page={page}
                        totalPages={totalPages}
                        onPage={(p) => {
                          const next = new URLSearchParams(params);
                          next.set('page', String(p));
                          setParams(next);
                        }}
                      />
                    ) : null}
                  </AsyncBlock>
                </section>
              </>
            )}
          </div>
        ) : null}
      </AsyncBlock>
    </>
  );
}
