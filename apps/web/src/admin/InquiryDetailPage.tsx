import { useState, type FormEvent, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { INQUIRY_STATUSES, MATERIAL_META, type AdminInquiryDetail, type InquiryStatus } from '@pcs/shared';
import { adminApi } from '../api/admin.js';
import { Seo } from '../components/Seo.js';
import { inputClass } from '../components/Field.js';
import { Button } from '../components/motion/Button.js';
import { useAsync } from '../lib/useAsync.js';
import { currentLang, localized, price } from '../lib/format.js';
import { adminErrorKey, formatAdminDate, INQUIRY_TONE } from './messages.js';
import { AdminHeading, AsyncBlock, Notice, StatusBadge } from './ui.js';

/**
 * Staff-entered markers written as notes. The API records nothing server-side when a WhatsApp link
 * is opened, so these notes are the only record that the link was used. Only the confirmation
 * marker means staff believe the message was sent.
 */
export const NOTE_LINK_OPENED = 'WhatsApp link opened';
export const NOTE_SENT_CONFIRMED = 'Sent on WhatsApp, confirmed by staff';

const NOTE_MAX = 1000;
const STATUS_NOTE_MAX = 500;

type FlashMessage = { tone: 'good' | 'bad'; text: string };

export default function InquiryDetailPage() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const detail = useAsync(() => adminApi.getInquiry(id), [id]);
  const [notice, setNotice] = useState<FlashMessage | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, doneKey: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      setNotice({ tone: 'good', text: t(doneKey) });
      detail.reload();
      return true;
    } catch (err) {
      setNotice({ tone: 'bad', text: t(adminErrorKey(err)) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const inquiry = detail.data;

  return (
    <>
      <Seo title={t('admin.detail.title')} description={t('admin.detail.title')} path="/admin/inquiries" noindex />
      <AdminHeading title={inquiry ? inquiry.reference : t('admin.detail.title')} back={{ to: '/admin/inquiries', label: t('admin.detail.backToList') }} />
      <AsyncBlock loading={detail.loading && !detail.data} error={detail.error} onRetry={detail.reload} empty={false} emptyTitle="">
        {inquiry ? (
          <div className="space-y-6">
            <div aria-live="polite">{notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}</div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
              <div className="min-w-0 space-y-6">
                <Summary inquiry={inquiry} lang={lang} />
                <ItemsList inquiry={inquiry} lang={lang} />
                <History inquiry={inquiry} lang={lang} />
              </div>
              <aside className="min-w-0 space-y-6" aria-label={t('admin.detail.actions')}>
                <StatusForm key={`${inquiry.status}:${inquiry.statusHistory.length}`} inquiry={inquiry} busy={busy} onSubmit={(status, note) => run(() => adminApi.updateInquiryStatus(inquiry.id, status, note), 'admin.detail.statusSaved')} />
                <WhatsAppPanel
                  busy={busy}
                  onLinkOpened={() => run(() => adminApi.addNote(inquiry.id, NOTE_LINK_OPENED), 'admin.detail.linkNoted')}
                  onRequestLink={() => adminApi.whatsappLink(inquiry.id)}
                  onConfirmSent={() => run(() => adminApi.addNote(inquiry.id, NOTE_SENT_CONFIRMED), 'admin.detail.sentNoted')}
                />
                <NotesPanel busy={busy} onAdd={(text) => run(() => adminApi.addNote(inquiry.id, text), 'admin.detail.noteSaved')} />
              </aside>
            </div>
          </div>
        ) : null}
      </AsyncBlock>
    </>
  );
}

function Summary({ inquiry, lang }: { inquiry: AdminInquiryDetail; lang: 'en' | 'hi' }) {
  const { t } = useTranslation();
  const material = inquiry.material ? localized(MATERIAL_META[inquiry.material].label, lang) : t('admin.detail.notGiven');
  return (
    <section aria-labelledby="inq-summary" className="glass rounded-2xl p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="inq-summary" className="t-h3 break-words">{inquiry.customerName}</h2>
        <StatusBadge tone={INQUIRY_TONE[inquiry.status]}>{t(`admin.inquiries.status.${inquiry.status}`)}</StatusBadge>
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <Row label={t('admin.detail.phone')}>
          <a href={`tel:${inquiry.phone}`} className="font-mono break-all text-accent">
            {inquiry.phone}
          </a>
        </Row>
        <Row label={t('admin.detail.city')}>{inquiry.city}</Row>
        <Row label={t('admin.detail.language')}>{inquiry.language === 'hi' ? t('admin.detail.langHi') : t('admin.detail.langEn')}</Row>
        <Row label={t('admin.detail.received')}>
          <time dateTime={inquiry.createdAt}>{formatAdminDate(inquiry.createdAt, lang)}</time>
        </Row>
        <Row label={t('admin.detail.vehicle')}>
          {inquiry.vehicle.make} {inquiry.vehicle.model} ({inquiry.vehicle.year})
        </Row>
        <Row label={t('admin.detail.materialColour')}>
          {material}
          {inquiry.colour ? ` · ${inquiry.colour}` : ''}
        </Row>
        <Row label={t('admin.detail.marketing')}>{inquiry.consentMarketing ? t('admin.detail.yes') : t('admin.detail.no')}</Row>
      </dl>
      <div className="mt-5 border-t border-line pt-5">
        <h3 className="text-sm font-semibold text-muted">{t('admin.detail.message')}</h3>
        <p className="mt-2 whitespace-pre-line break-words">{inquiry.message || t('admin.detail.notGiven')}</p>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words text-base">{children}</dd>
    </div>
  );
}

function ItemsList({ inquiry, lang }: { inquiry: AdminInquiryDetail; lang: 'en' | 'hi' }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="inq-items" className="glass rounded-2xl p-5 md:p-6">
      <h2 id="inq-items" className="t-h3">{t('admin.detail.items')}</h2>
      {inquiry.items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t('admin.detail.noItems')}</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {inquiry.items.map((item, i) => (
            <li key={`${item.productId}:${i}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words font-semibold">{localized(item.name, lang)}</p>
                <p className="font-mono text-xs text-muted">{item.sku}</p>
              </div>
              <p className="text-sm text-muted">
                {t('admin.detail.quantity', { n: item.quantity })} ·{' '}
                {item.salePriceMinorSnapshot !== null
                  ? `${price(item.salePriceMinorSnapshot, lang)} (${t('admin.detail.snapshotSale')}, ${price(item.unitPriceMinorSnapshot, lang)})`
                  : price(item.unitPriceMinorSnapshot, lang)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function History({ inquiry, lang }: { inquiry: AdminInquiryDetail; lang: 'en' | 'hi' }) {
  const { t } = useTranslation();
  const statusHistory = [...inquiry.statusHistory].reverse();
  const notes = [...inquiry.notes].reverse();
  return (
    <section aria-labelledby="inq-history" className="glass rounded-2xl p-5 md:p-6">
      <h2 id="inq-history" className="t-h3">{t('admin.detail.history')}</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-muted">{t('admin.detail.statusChanges')}</h3>
          <ol className="mt-3 space-y-3">
            {statusHistory.map((h, i) => (
              <li key={`${h.at}:${i}`} className="border-l-2 border-line pl-3">
                <p className="font-semibold">{t(`admin.inquiries.status.${h.status}`)}</p>
                <time dateTime={h.at} className="text-xs text-muted">
                  {formatAdminDate(h.at, lang)}
                </time>
                {h.note ? <p className="mt-1 break-words text-sm">{h.note}</p> : null}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted">{t('admin.detail.notes')}</h3>
          {notes.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t('admin.detail.noNotes')}</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {notes.map((n, i) => (
                <li key={`${n.at}:${i}`} className="border-l-2 border-line pl-3">
                  <p className="whitespace-pre-line break-words text-sm">{n.text}</p>
                  <p className="text-xs text-muted">
                    <time dateTime={n.at}>{formatAdminDate(n.at, lang)}</time> · {n.by}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

function StatusForm({
  inquiry,
  busy,
  onSubmit,
}: {
  inquiry: AdminInquiryDetail;
  busy: boolean;
  onSubmit: (status: InquiryStatus, note?: string) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<InquiryStatus>(inquiry.status);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (note.length > STATUS_NOTE_MAX) return setError(t('admin.errors.tooLong'));
    setError(null);
    const ok = await onSubmit(status, note.trim() === '' ? undefined : note.trim());
    if (ok) setNote('');
  };

  return (
    <section aria-labelledby="inq-status" className="glass rounded-2xl p-5">
      <h2 id="inq-status" className="t-h3">{t('admin.detail.updateStatus')}</h2>
      <form noValidate onSubmit={submit} className="mt-4 space-y-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inq-status-select" className="text-sm font-semibold">
            {t('admin.detail.status')}
          </label>
          <select id="inq-status-select" className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as InquiryStatus)}>
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`admin.inquiries.status.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inq-status-note" className="text-sm font-semibold">
            {t('admin.detail.statusNote')}
          </label>
          <textarea
            id="inq-status-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-describedby="inq-status-note-hint"
            aria-invalid={note.length > STATUS_NOTE_MAX}
            className={inputClass}
          />
          <p id="inq-status-note-hint" className="text-xs text-muted">
            {t('admin.detail.noteCount', { n: note.length, max: STATUS_NOTE_MAX })}
          </p>
          {error ? (
            <p role="alert" className="text-sm font-semibold text-sale">
              {error}
            </p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={busy || (status === inquiry.status && note.trim() === '')}>
          {t('admin.detail.saveStatus')}
        </Button>
      </form>
    </section>
  );
}

function WhatsAppPanel({
  busy,
  onRequestLink,
  onLinkOpened,
  onConfirmSent,
}: {
  busy: boolean;
  onRequestLink: () => Promise<{ url: string; language: 'en' | 'hi' }>;
  onLinkOpened: () => Promise<boolean>;
  onConfirmSent: () => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [link, setLink] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const prepare = async () => {
    setLinkBusy(true);
    setLinkError(null);
    try {
      const res = await onRequestLink();
      setLink(res.url);
    } catch (err) {
      setLink(null);
      setLinkError(t(adminErrorKey(err)));
    } finally {
      setLinkBusy(false);
    }
  };

  return (
    <section aria-labelledby="inq-wa" className="glass rounded-2xl p-5">
      <h2 id="inq-wa" className="t-h3">{t('admin.detail.whatsapp')}</h2>
      <p className="mt-2 text-sm text-muted">{t('admin.detail.whatsappHelp')}</p>
      <div className="mt-4 space-y-3">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void onLinkOpened()}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-whatsapp px-5 py-3 font-semibold text-[#04130A] no-underline hover:brightness-105"
          >
            {t('admin.detail.openWhatsapp')}
          </a>
        ) : (
          <Button variant="whatsapp" className="w-full" onClick={prepare} disabled={linkBusy || busy}>
            {linkBusy ? t('admin.detail.preparing') : t('admin.detail.prepareWhatsapp')}
          </Button>
        )}
        {linkError ? (
          <p role="alert" className="text-sm font-semibold text-sale">
            {linkError}
          </p>
        ) : null}
        <Button variant="secondary" className="w-full" onClick={() => void onConfirmSent()} disabled={busy}>
          {t('admin.detail.markSent')}
        </Button>
        <p className="text-xs text-muted">{t('admin.detail.whatsappNotDelivery')}</p>
      </div>
    </section>
  );
}

function NotesPanel({ busy, onAdd }: { busy: boolean; onAdd: (text: string) => Promise<boolean> }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed === '') return setError(t('admin.errors.required'));
    if (trimmed.length > NOTE_MAX) return setError(t('admin.errors.tooLong'));
    setError(null);
    const ok = await onAdd(trimmed);
    if (ok) setText('');
  };

  return (
    <section aria-labelledby="inq-note" className="glass rounded-2xl p-5">
      <h2 id="inq-note" className="t-h3">{t('admin.detail.addNote')}</h2>
      <form noValidate onSubmit={submit} className="mt-4 space-y-3">
        <label htmlFor="inq-note-text" className="sr-only">
          {t('admin.detail.addNote')}
        </label>
        <textarea
          id="inq-note-text"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'inq-note-error' : undefined}
          className={inputClass}
        />
        {error ? (
          <p id="inq-note-error" role="alert" className="text-sm font-semibold text-sale">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="secondary" className="w-full" disabled={busy}>
          {t('admin.detail.saveNote')}
        </Button>
      </form>
    </section>
  );
}
