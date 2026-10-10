import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useFieldArray, useForm, get, type Control, type FieldError, type Path, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from 'lucide-react';
import { AVAILABILITY, MATERIALS, MATERIAL_META, type AdminProduct, type PublicCategory } from '@pcs/shared';
import { adminApi } from '../api/admin.js';
import { ApiError, api } from '../api/index.js';
import { Seo } from '../components/Seo.js';
import { Field, inputClass } from '../components/Field.js';
import { Button } from '../components/motion/Button.js';
import { useAsync } from '../lib/useAsync.js';
import { currentLang, localized } from '../lib/format.js';
import {
  emptyProductForm,
  productFormSchema,
  serverPathToField,
  toFormValues,
  toPayload,
  type ProductFormValues,
} from './productForm.js';
import { adminErrorKey } from './messages.js';
import { imageFileProblem, MAX_PRODUCT_IMAGES } from './imageUpload.js';
import { AdminHeading, AsyncBlock, Notice } from './ui.js';

const MAX_COLOURS = 20;
const MAX_VEHICLES = 60;
const MAX_STITCHING = 10;

export default function ProductFormPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const location = useLocation();
  const notice = (location.state as { notice?: 'created' | 'saved' } | null)?.notice;
  const categories = useAsync(() => api.getCategories(), []);
  const existing = useAsync(() => (id ? adminApi.getProduct(id) : Promise.resolve(null)), [id]);

  const loading = categories.loading || existing.loading;
  const failed = categories.error || existing.error;
  const reload = () => {
    categories.reload();
    existing.reload();
  };

  return (
    <>
      <Seo title={t('admin.form.title')} description={t('admin.form.title')} path="/admin/products" noindex />
      <AdminHeading title={id ? t('admin.form.editTitle') : t('admin.form.newTitle')} back={{ to: '/admin/products', label: t('admin.form.backToList') }} />
      <AsyncBlock loading={loading} error={failed} onRetry={reload} empty={false} emptyTitle="">
        {categories.data && (!id || existing.data) ? (
          <ProductForm
            key={existing.data ? `${existing.data.id}:${existing.data.updatedAt}` : 'new'}
            product={existing.data ?? null}
            categories={categories.data.items}
            notice={notice}
            onSaved={() => existing.reload()}
          />
        ) : null}
      </AsyncBlock>
    </>
  );
}

/** Images upload straight to the image host through a signed request. Saving stores their URLs and order. */
function ImagesSection({
  control,
  register,
  msg,
}: {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  msg: (name: string) => string | undefined;
}) {
  const { t } = useTranslation();
  const images = useFieldArray({ control, name: 'images' });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const full = images.fields.length >= MAX_PRODUCT_IMAGES;
  const rootError = msg('images');

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = imageFileProblem(file);
    if (problem) {
      setUploadError(t(`admin.form.images.${problem}`));
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await adminApi.uploadProductImage(file);
      images.append({ url: uploaded.url, publicId: uploaded.publicId, alt: { en: '', hi: '' } });
    } catch (err) {
      setUploadError(err instanceof ApiError && err.code === 'NOT_ENABLED' ? t('admin.form.images.unavailable') : t(adminErrorKey(err)));
    } finally {
      setUploading(false);
    }
  };

  return (
    <section aria-labelledby="sec-images" className="glass space-y-5 rounded-2xl p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="sec-images" className="t-h3">
          {t('admin.form.sections.images')}
        </h2>
        <div>
          <input
            ref={fileRef}
            id="product-image-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            onChange={onFile}
            disabled={uploading || full}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={uploading || full}
            aria-busy={uploading}
            onClick={() => fileRef.current?.click()}
            icon={<Upload size={16} aria-hidden />}
          >
            {uploading ? t('admin.form.images.uploading') : t('admin.form.images.add')}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted">{t('admin.form.images.help')}</p>
      {uploadError ? <Notice tone="bad">{uploadError}</Notice> : null}
      {rootError ? <Notice tone="bad">{rootError}</Notice> : null}
      {images.fields.length === 0 ? <p className="text-sm text-muted">{t('admin.form.images.none')}</p> : null}

      {images.fields.map((f, i) => (
        <div key={f.id} className="grid gap-4 rounded-xl border border-line p-4 md:grid-cols-[8rem_1fr_1fr] md:items-start">
          <img src={f.url} alt="" loading="lazy" className="h-32 w-32 rounded-xl bg-surface object-cover" />
          <Field label={t('admin.form.images.altEn')} error={msg(`images.${i}.alt.en`)}>
            {(p) => <input id={p.id} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register(`images.${i}.alt.en`)} />}
          </Field>
          <Field label={t('admin.form.images.altHi')} error={msg(`images.${i}.alt.hi`)}>
            {(p) => <input id={p.id} lang="hi" className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register(`images.${i}.alt.hi`)} />}
          </Field>
          <div className="flex flex-wrap gap-2 md:col-span-3">
            <Button type="button" variant="ghost" disabled={i === 0} onClick={() => images.move(i, i - 1)} icon={<ArrowUp size={16} aria-hidden />}>
              {t('admin.form.images.moveUp')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={i === images.fields.length - 1}
              onClick={() => images.move(i, i + 1)}
              icon={<ArrowDown size={16} aria-hidden />}
            >
              {t('admin.form.images.moveDown')}
            </Button>
            <Button type="button" variant="ghost" className="text-sale" onClick={() => images.remove(i)} icon={<Trash2 size={16} aria-hidden />}>
              {t('admin.form.images.remove')}
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}

function ProductForm({
  product,
  categories,
  notice,
  onSaved,
}: {
  product: AdminProduct | null;
  categories: PublicCategory[];
  notice: 'created' | 'saved' | undefined;
  onSaved: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const navigate = useNavigate();
  const location = useLocation();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const saved = notice === 'created' ? t('admin.form.created') : notice === 'saved' ? t('admin.form.saved') : null;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: product ? toFormValues(product) : emptyProductForm(),
  });
  const { register, control, handleSubmit, formState, setError } = form;
  const { errors } = formState;
  const colours = useFieldArray({ control, name: 'colours' });
  const vehicles = useFieldArray({ control, name: 'vehicles' });
  const stitching = useFieldArray({ control, name: 'stitching' });

  /** Message for a field: server text is shown as returned, client text is a translation key. */
  const msg = (name: string): string | undefined => {
    const e = get(errors, name) as FieldError | undefined;
    if (!e?.message) return undefined;
    return e.type === 'server' ? e.message : t(e.message);
  };

  const onSubmit = async (values: ProductFormValues) => {
    setSaving(true);
    setServerError(null);
    try {
      const payload = toPayload(values);
      if (product) {
        await adminApi.updateProduct(product.id, payload);
        navigate(location.pathname, { replace: true, state: { notice: 'saved' } });
        onSaved();
      } else {
        const created = await adminApi.createProduct(payload);
        navigate(`/admin/products/${created.id}/edit`, { replace: true, state: { notice: 'created' } });
      }
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'SLUG_TAKEN' || err.code === 'SKU_TAKEN')) {
        const field = err.code === 'SLUG_TAKEN' ? 'slug' : 'sku';
        setError(field, { type: 'server', message: t(`admin.errors.${err.code}`) });
        setServerError(t('admin.errors.checkFields'));
      } else if (err instanceof ApiError && err.code === 'VALIDATION_FAILED' && Array.isArray(err.details)) {
        const unmapped: string[] = [];
        for (const d of err.details as Array<{ path?: string; message?: string }>) {
          const field = serverPathToField(d.path ?? '');
          if (field) setError(field as Path<ProductFormValues>, { type: 'server', message: d.message ?? t('admin.errors.VALIDATION_FAILED') });
          else if (d.message) unmapped.push(d.message);
        }
        setServerError(unmapped.length > 0 ? unmapped.join(' ') : t('admin.errors.VALIDATION_FAILED'));
      } else {
        setServerError(t(adminErrorKey(err)));
      }
    } finally {
      setSaving(false);
    }
  };

  const onInvalid = () => setServerError(t('admin.errors.checkFields'));
  const sectionClass = 'glass space-y-5 rounded-2xl p-5 md:p-6';
  const helpId = 'price-help';

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
      <div aria-live="polite" className="space-y-3">
        {saved ? <Notice tone="good">{saved}</Notice> : null}
        {serverError ? <Notice tone="bad">{serverError}</Notice> : null}
      </div>

      <section aria-labelledby="sec-basics" className={sectionClass}>
        <h2 id="sec-basics" className="t-h3">{t('admin.form.sections.basics')}</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('admin.form.fields.sku')} error={msg('sku')} hint={t('admin.form.hints.sku')}>
            {(p) => <input id={p.id} className={`${inputClass} font-mono uppercase`} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register('sku')} />}
          </Field>
          <Field label={t('admin.form.fields.slug')} error={msg('slug')} hint={t('admin.form.hints.slug')}>
            {(p) => <input id={p.id} className={`${inputClass} font-mono`} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register('slug')} />}
          </Field>
          <Field label={t('admin.form.fields.category')} error={msg('categoryId')}>
            {(p) => (
              <select id={p.id} className={inputClass} aria-invalid={p.invalid} {...register('categoryId')}>
                <option value="">{t('admin.form.fields.chooseCategory')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {localized(c.name, lang)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('admin.form.fields.material')} error={msg('material')}>
            {(p) => (
              <select id={p.id} className={inputClass} aria-invalid={p.invalid} {...register('material')}>
                {MATERIALS.map((m) => (
                  <option key={m} value={m}>
                    {localized(MATERIAL_META[m].label, lang)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('admin.form.fields.availability')} error={msg('availability')}>
            {(p) => (
              <select id={p.id} className={inputClass} aria-invalid={p.invalid} {...register('availability')}>
                {AVAILABILITY.map((a) => (
                  <option key={a} value={a}>
                    {t(`product.${a}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="flex flex-col gap-3 pt-7">
            <label className="flex min-h-[44px] items-center gap-3 text-sm font-semibold">
              <input type="checkbox" className="h-5 w-5 accent-primary" {...register('published')} />
              {t('admin.form.fields.published')}
            </label>
            <label className="flex min-h-[44px] items-center gap-3 text-sm font-semibold">
              <input type="checkbox" className="h-5 w-5 accent-primary" {...register('featured')} />
              {t('admin.form.fields.featured')}
            </label>
          </div>
        </div>
      </section>

      <section aria-labelledby="sec-text" className={sectionClass}>
        <h2 id="sec-text" className="t-h3">{t('admin.form.sections.text')}</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={t('admin.form.fields.nameEn')} error={msg('name.en')}>
            {(p) => <input id={p.id} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register('name.en')} />}
          </Field>
          <Field label={t('admin.form.fields.nameHi')} error={msg('name.hi')}>
            {(p) => <input id={p.id} lang="hi" className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register('name.hi')} />}
          </Field>
          <Field label={t('admin.form.fields.descriptionEn')} error={msg('description.en')}>
            {(p) => <textarea id={p.id} rows={4} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register('description.en')} />}
          </Field>
          <Field label={t('admin.form.fields.descriptionHi')} error={msg('description.hi')}>
            {(p) => <textarea id={p.id} lang="hi" rows={4} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register('description.hi')} />}
          </Field>
        </div>
      </section>

      <ImagesSection control={control} register={register} msg={msg} />

      <section aria-labelledby="sec-price" className={sectionClass}>
        <h2 id="sec-price" className="t-h3">{t('admin.form.sections.pricing')}</h2>
        <p id={helpId} className="text-sm text-muted">{t('admin.form.hints.price')}</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('admin.form.fields.price')} error={msg('priceRupees')} hint={t('admin.form.hints.rupees')}>
            {(p) => <input id={p.id} inputMode="decimal" className={inputClass} aria-describedby={`${helpId} ${p.describedBy ?? ''}`.trim()} aria-invalid={p.invalid} {...register('priceRupees')} />}
          </Field>
          <Field label={t('admin.form.fields.salePrice')} error={msg('salePriceRupees')} hint={t('admin.form.hints.salePrice')}>
            {(p) => <input id={p.id} inputMode="decimal" className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register('salePriceRupees')} />}
          </Field>
        </div>
      </section>

      <section aria-labelledby="sec-colours" className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="sec-colours" className="t-h3">{t('admin.form.sections.colours')}</h2>
          <Button type="button" variant="secondary" disabled={colours.fields.length >= MAX_COLOURS} onClick={() => colours.append({ name: { en: '', hi: '' }, code: '#111111' })} icon={<Plus size={16} aria-hidden />}>
            {t('admin.form.add')}
          </Button>
        </div>
        {colours.fields.length === 0 ? <p className="text-sm text-muted">{t('admin.form.empty.colours')}</p> : null}
        {colours.fields.map((f, i) => (
          <div key={f.id} className="grid gap-4 rounded-xl border border-line p-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
            <Field label={t('admin.form.fields.colourEn')} error={msg(`colours.${i}.name.en`)}>
              {(p) => <input id={p.id} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register(`colours.${i}.name.en`)} />}
            </Field>
            <Field label={t('admin.form.fields.colourHi')} error={msg(`colours.${i}.name.hi`)}>
              {(p) => <input id={p.id} lang="hi" className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register(`colours.${i}.name.hi`)} />}
            </Field>
            <Field label={t('admin.form.fields.colourCode')} error={msg(`colours.${i}.code`)}>
              {(p) => <input id={p.id} type="color" className="h-11 w-20 cursor-pointer rounded-xl border border-line bg-surface p-1" aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register(`colours.${i}.code`)} />}
            </Field>
            <Button type="button" variant="ghost" className="text-sale" onClick={() => colours.remove(i)} icon={<Trash2 size={16} aria-hidden />}>
              {t('admin.form.remove')}
            </Button>
          </div>
        ))}
      </section>

      <section aria-labelledby="sec-vehicles" className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="sec-vehicles" className="t-h3">{t('admin.form.sections.vehicles')}</h2>
          <Button type="button" variant="secondary" disabled={vehicles.fields.length >= MAX_VEHICLES} onClick={() => vehicles.append({ make: '', model: '', yearFrom: '', yearTo: '' })} icon={<Plus size={16} aria-hidden />}>
            {t('admin.form.add')}
          </Button>
        </div>
        {vehicles.fields.length === 0 ? <p className="text-sm text-muted">{t('admin.form.empty.vehicles')}</p> : null}
        {vehicles.fields.map((f, i) => (
          <div key={f.id} className="grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_8rem_8rem_auto] lg:items-end">
            <Field label={t('admin.form.fields.make')} error={msg(`vehicles.${i}.make`)}>
              {(p) => <input id={p.id} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register(`vehicles.${i}.make`)} />}
            </Field>
            <Field label={t('admin.form.fields.model')} error={msg(`vehicles.${i}.model`)}>
              {(p) => <input id={p.id} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register(`vehicles.${i}.model`)} />}
            </Field>
            <Field label={t('admin.form.fields.yearFrom')} error={msg(`vehicles.${i}.yearFrom`)}>
              {(p) => <input id={p.id} inputMode="numeric" maxLength={4} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register(`vehicles.${i}.yearFrom`)} />}
            </Field>
            <Field label={t('admin.form.fields.yearTo')} error={msg(`vehicles.${i}.yearTo`)}>
              {(p) => <input id={p.id} inputMode="numeric" maxLength={4} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register(`vehicles.${i}.yearTo`)} />}
            </Field>
            <Button type="button" variant="ghost" className="text-sale" onClick={() => vehicles.remove(i)} icon={<Trash2 size={16} aria-hidden />}>
              {t('admin.form.remove')}
            </Button>
          </div>
        ))}
      </section>

      <section aria-labelledby="sec-stitching" className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="sec-stitching" className="t-h3">{t('admin.form.sections.stitching')}</h2>
          <Button type="button" variant="secondary" disabled={stitching.fields.length >= MAX_STITCHING} onClick={() => stitching.append({ en: '', hi: '' })} icon={<Plus size={16} aria-hidden />}>
            {t('admin.form.add')}
          </Button>
        </div>
        {stitching.fields.map((f, i) => (
          <div key={f.id} className="grid gap-4 rounded-xl border border-line p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Field label={t('admin.form.fields.stitchingEn')} error={msg(`stitching.${i}.en`)}>
              {(p) => <input id={p.id} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register(`stitching.${i}.en`)} />}
            </Field>
            <Field label={t('admin.form.fields.stitchingHi')} error={msg(`stitching.${i}.hi`)}>
              {(p) => <input id={p.id} lang="hi" className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register(`stitching.${i}.hi`)} />}
            </Field>
            <Button type="button" variant="ghost" className="text-sale" onClick={() => stitching.remove(i)} icon={<Trash2 size={16} aria-hidden />}>
              {t('admin.form.remove')}
            </Button>
          </div>
        ))}
      </section>

      <section aria-labelledby="sec-seo" className={sectionClass}>
        <h2 id="sec-seo" className="t-h3">{t('admin.form.sections.seo')}</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={t('admin.form.fields.seoTitleEn')} error={msg('seo.title.en')}>
            {(p) => <input id={p.id} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register('seo.title.en')} />}
          </Field>
          <Field label={t('admin.form.fields.seoTitleHi')} error={msg('seo.title.hi')}>
            {(p) => <input id={p.id} lang="hi" className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register('seo.title.hi')} />}
          </Field>
          <Field label={t('admin.form.fields.seoDescEn')} error={msg('seo.description.en')}>
            {(p) => <textarea id={p.id} rows={3} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register('seo.description.en')} />}
          </Field>
          <Field label={t('admin.form.fields.seoDescHi')} error={msg('seo.description.hi')}>
            {(p) => <textarea id={p.id} lang="hi" rows={3} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} {...register('seo.description.hi')} />}
          </Field>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface/95 px-4 py-4 backdrop-blur md:-mx-6 md:px-6">
        <Button type="button" variant="secondary" onClick={() => navigate('/admin/products')}>
          {t('admin.products.cancel')}
        </Button>
        <Button type="submit" disabled={saving} aria-busy={saving}>
          {saving ? t('admin.form.saving') : t('admin.form.save')}
        </Button>
      </div>
    </form>
  );
}
