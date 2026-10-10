import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, get, type FieldError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, type AdminCampaign } from '@pcs/shared';
import { adminApi } from '../api/admin.js';
import { ApiError } from '../api/http.js';
import { Seo } from '../components/Seo.js';
import { Field, inputClass } from '../components/Field.js';
import { Button, LinkButton } from '../components/motion/Button.js';
import { useAsync } from '../lib/useAsync.js';
import {
  campaignFormSchema,
  campaignServerPathToField,
  emptyCampaignForm,
  toCampaignFormValues,
  toCampaignPayload,
  type CampaignFormValues,
} from './campaignForm.js';
import { adminErrorKey } from './messages.js';
import { AdminHeading, AsyncBlock, Notice } from './ui.js';

export default function CampaignFormPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const existing = useAsync(() => (id ? adminApi.getCampaign(id) : Promise.resolve(null)), [id]);

  return (
    <>
      <Seo title={t('admin.campaigns.form.title')} description={t('admin.campaigns.form.title')} path="/admin/campaigns" noindex />
      <AdminHeading
        title={id ? t('admin.campaigns.form.editTitle') : t('admin.campaigns.form.newTitle')}
        back={{ to: id ? `/admin/campaigns/${id}` : '/admin/campaigns', label: t('admin.campaigns.form.back') }}
      />
      <AsyncBlock loading={existing.loading} error={existing.error} onRetry={existing.reload} empty={false} emptyTitle="">
        {existing.data?.status === 'prepared' ? (
          <Notice tone="bad">{t('admin.campaigns.form.preparedLocked')}</Notice>
        ) : (!id || existing.data) ? (
          <CampaignForm key={existing.data ? existing.data.id : 'new'} campaignId={existing.data?.id ?? null} initial={existing.data ?? null} />
        ) : null}
      </AsyncBlock>
    </>
  );
}

function CampaignForm({ campaignId, initial }: { campaignId: string | null; initial: AdminCampaign | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: initial ? toCampaignFormValues(initial) : emptyCampaignForm(),
  });
  const { register, handleSubmit, formState, setError } = form;
  const { errors } = formState;

  const msg = (name: keyof CampaignFormValues): string | undefined => {
    const e = get(errors, name) as FieldError | undefined;
    if (!e?.message) return undefined;
    return e.type === 'server' ? e.message : t(e.message);
  };

  const onSubmit = async (values: CampaignFormValues) => {
    setSaving(true);
    setServerError(null);
    try {
      const payload = toCampaignPayload(values);
      if (campaignId) {
        await adminApi.updateCampaign(campaignId, payload);
        navigate(`/admin/campaigns/${campaignId}`, { replace: true, state: { notice: 'saved' } });
      } else {
        const created = await adminApi.createCampaign(payload);
        navigate(`/admin/campaigns/${created.id}`, { replace: true, state: { notice: 'created' } });
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_FAILED' && Array.isArray(err.details)) {
        const unmapped: string[] = [];
        for (const d of err.details as Array<{ path?: string; message?: string }>) {
          const field = campaignServerPathToField(d.path ?? '');
          if (field) setError(field, { type: 'server', message: d.message ?? t('admin.errors.VALIDATION_FAILED') });
          else if (d.message) unmapped.push(d.message);
        }
        setServerError(unmapped.length > 0 ? unmapped.join(' ') : t('admin.errors.checkFields'));
      } else {
        setServerError(t(adminErrorKey(err)));
      }
    } finally {
      setSaving(false);
    }
  };

  const sectionClass = 'glass space-y-5 rounded-2xl p-5 md:p-6';

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit, () => setServerError(t('admin.errors.checkFields')))} className="space-y-6">
      <div aria-live="polite" className="space-y-3">
        {serverError ? <Notice tone="bad">{serverError}</Notice> : null}
      </div>

      <section aria-labelledby="sec-campaign" className={sectionClass}>
        <h2 id="sec-campaign" className="t-h3">
          {t('admin.campaigns.form.sections.details')}
        </h2>
        <p className="text-sm text-muted">{t('admin.campaigns.form.lockNotice')}</p>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={t('admin.campaigns.form.fields.name')} error={msg('name')}>
            {(p) => <input id={p.id} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register('name')} />}
          </Field>
          <Field label={t('admin.campaigns.form.fields.language')} error={msg('language')}>
            {(p) => (
              <select id={p.id} className={inputClass} aria-invalid={p.invalid} {...register('language')}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {t(`admin.campaigns.languages.${l}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('admin.campaigns.form.fields.city')} error={msg('city')} hint={t('admin.campaigns.form.hints.city')}>
            {(p) => <input id={p.id} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register('city')} />}
          </Field>
        </div>
        <Field label={t('admin.campaigns.form.fields.message')} error={msg('message')} hint={t('admin.campaigns.form.hints.message')}>
          {(p) => (
            <textarea
              id={p.id}
              rows={6}
              className={inputClass}
              aria-describedby={p.describedBy}
              aria-invalid={p.invalid}
              {...register('message')}
            />
          )}
        </Field>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface/95 px-4 py-4 backdrop-blur md:-mx-6 md:px-6">
        <LinkButton to={campaignId ? `/admin/campaigns/${campaignId}` : '/admin/campaigns'} variant="secondary">
          {t('admin.campaigns.form.cancel')}
        </LinkButton>
        <Button type="submit" disabled={saving} aria-busy={saving}>
          {saving ? t('admin.campaigns.form.saving') : t('admin.campaigns.form.save')}
        </Button>
      </div>
    </form>
  );
}
