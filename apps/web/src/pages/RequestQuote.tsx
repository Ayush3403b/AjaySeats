import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFieldArray, useForm, type FieldError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, animate, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, MessageCircle } from 'lucide-react';
import { LANGUAGES, MATERIALS, MATERIAL_META, type InquiryCreateInput, type InquiryReceipt, type LocalizedText } from '@pcs/shared';
import { api, ApiError } from '../api/index.js';
import { Seo } from '../components/Seo.js';
import { Field, inputClass } from '../components/Field.js';
import { Button } from '../components/motion/Button.js';
import { useAsync } from '../lib/useAsync.js';
import { currentLang, localized } from '../lib/format.js';
import { COLOUR_OPTIONS } from '../lib/colours.js';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';
import { useSettings } from '../lib/useSettings.js';
import { useQuoteBasket, type BasketItem } from '../lib/quoteBasket.js';
import { useReducedMotion } from '../motion/hooks.js';

const MAX_ITEMS = 10;
const MIN_YEAR = 1980;
const MAX_YEAR = new Date().getFullYear() + 1;
const STEPS = ['customer', 'vehicle', 'products', 'review'] as const;
const KNOWN_ERROR_CODES = ['NETWORK', 'VALIDATION_FAILED', 'RATE_LIMITED', 'SUBMISSION_REJECTED', 'NOT_FOUND', 'INTERNAL'] as const;

/** Every message is an i18n key, except server errors (marked type "server") which are shown as-is. */
const itemSchema = z.object({
  productId: z.string().min(1, 'quote.errors.items'),
  slug: z.string(),
  sku: z.string(),
  name: z.object({ en: z.string(), hi: z.string() }),
  quantity: z
    .number({ error: 'quote.errors.quantity' })
    .int({ error: 'quote.errors.quantity' })
    .min(1, { error: 'quote.errors.quantity' })
    .max(500, { error: 'quote.errors.quantity' }),
});

const formSchema = z.object({
  name: z.string().trim().min(2, 'quote.errors.name').max(80, 'quote.errors.name'),
  countryCode: z.string().trim().regex(/^\+\d{1,4}$/, 'quote.errors.required'),
  mobile: z.string().trim().regex(/^\+?[0-9 ()-]{6,20}$/, 'quote.errors.mobile'),
  language: z.enum(LANGUAGES),
  city: z.string().trim().min(2, 'quote.errors.city').max(80, 'quote.errors.city'),
  make: z.string().trim().min(1, 'quote.errors.makeModel').max(60, 'quote.errors.makeModel'),
  model: z.string().trim().min(1, 'quote.errors.makeModel').max(60, 'quote.errors.makeModel'),
  year: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'quote.errors.year')
    .refine((v) => Number(v) >= MIN_YEAR && Number(v) <= MAX_YEAR, 'quote.errors.year'),
  items: z.array(itemSchema).min(1, 'quote.errors.items').max(MAX_ITEMS, 'quote.errors.items'),
  material: z.enum(['', ...MATERIALS]),
  colour: z.string().refine((v) => v === '' || /^#[0-9a-fA-F]{6}$/.test(v), 'quote.errors.required'),
  message: z.string().max(1000, 'quote.errors.required'),
  consent: z.boolean(),
  website: z.string(),
  formStartedAt: z.number(),
});

type FormValues = z.infer<typeof formSchema>;

/** Which step each field lives on, so validation can move the user to the first broken step. */
const STEP_FIELDS: Record<number, Array<keyof FormValues>> = {
  0: ['name', 'countryCode', 'mobile', 'language', 'city'],
  1: ['make', 'model', 'year'],
  2: ['items', 'material', 'colour', 'message'],
  3: ['consent'],
};

function stepOf(field: string): number {
  const found = Object.entries(STEP_FIELDS).find(([, fields]) => fields.includes(field as keyof FormValues));
  return found ? Number(found[0]) : 0;
}

/** Maps server validation paths (e.g. "vehicle.make", "items.0.quantity") back to form fields. */
function serverFieldFor(path: string): keyof FormValues | null {
  if (path === 'vehicle.make') return 'make';
  if (path === 'vehicle.model') return 'model';
  if (path === 'vehicle.year') return 'year';
  if (path === 'items' || path.startsWith('items.')) return 'items';
  const direct: Array<keyof FormValues> = ['name', 'countryCode', 'mobile', 'language', 'city', 'material', 'colour', 'message'];
  return direct.includes(path as keyof FormValues) ? (path as keyof FormValues) : null;
}

function CountUpReference({ reference }: { reference: string }) {
  const match = reference.match(/(\d+)$/);
  const target = match ? Number(match[1]) : 0;
  const prefix = match && match.index !== undefined ? reference.slice(0, match.index) : reference;
  const width = match ? match[1].length : 0;
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    const controls = animate(0, target, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [target, reduced]);

  const shown = match ? `${prefix}${String(value).padStart(width, '0')}` : reference;
  return (
    <>
      <span aria-hidden className="font-mono text-2xl font-extrabold tabular-nums text-ink md:text-3xl">
        {shown}
      </span>
      <span className="sr-only">{reference}</span>
    </>
  );
}

export default function RequestQuote() {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const settings = useSettings();
  const basket = useQuoteBasket();
  const [searchParams, setSearchParams] = useSearchParams();
  const reduced = useReducedMotion();
  const [startedAt] = useState(() => Date.now());
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<InquiryReceipt | null>(null);
  const [pickId, setPickId] = useState('');
  const [prefillNotice, setPrefillNotice] = useState(false);
  const products = useAsync(() => api.getProducts({ pageSize: 48, sort: 'latest' }), []);

  const basketItems: FormValues['items'] = basket.items.map((i: BasketItem) => ({
    productId: i.productId,
    slug: i.slug,
    sku: i.sku,
    name: i.name,
    quantity: i.quantity,
  }));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      countryCode: '+91',
      mobile: '',
      language: lang,
      city: '',
      make: '',
      model: '',
      year: '',
      items: basketItems,
      material: '',
      colour: '',
      message: '',
      consent: false,
      website: '',
      formStartedAt: startedAt,
    },
  });
  const { register, control, handleSubmit, trigger, setError, formState, getValues, reset, watch } = form;
  const { errors } = formState;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');
  const watchedMessage = watch('message') ?? '';

  // "Request a quote" from a product page: ?product=slug adds that product once.
  const prefillHandled = useRef(false);
  useEffect(() => {
    const slug = searchParams.get('product');
    if (!slug || prefillHandled.current) return;
    prefillHandled.current = true;
    api
      .getProduct(slug)
      .then((p) => {
        const current = getValues('items');
        if (current.some((i) => i.productId === p.id) || current.length >= MAX_ITEMS) return;
        append({ productId: p.id, slug: p.slug, sku: p.sku, name: p.name, quantity: 1 });
      })
      .catch(() => setPrefillNotice(true))
      .finally(() => setSearchParams({}, { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const msg = (e?: Pick<FieldError, 'message' | 'type'>): string | undefined => {
    if (!e?.message) return undefined;
    return e.type === 'server' ? e.message : t(e.message, { max: MAX_YEAR, min: MIN_YEAR });
  };

  // Array-level errors (such as "add at least one") sit on `root` when the field array is validated.
  const itemsRoot = (errors.items as { root?: FieldError } | undefined)?.root;
  const itemsError = msg(itemsRoot ?? (errors.items as FieldError | undefined));

  const goNext = async () => {
    const ok = await trigger(STEP_FIELDS[step]);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const addProduct = () => {
    const p = products.data?.items.find((x) => x.id === pickId);
    if (!p) return;
    const current = getValues('items');
    if (current.some((i) => i.productId === p.id) || current.length >= MAX_ITEMS) return;
    append({ productId: p.id, slug: p.slug, sku: p.sku, name: p.name, quantity: 1 });
    setPickId('');
  };

  const onValid = async (values: FormValues) => {
    setSubmitError(null);
    setSubmitting(true);
    const payload: InquiryCreateInput = {
      name: values.name,
      countryCode: values.countryCode,
      mobile: values.mobile,
      language: values.language,
      city: values.city,
      vehicle: { make: values.make, model: values.model, year: Number(values.year) },
      items: values.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      material: values.material === '' ? null : values.material,
      colour: values.colour === '' ? null : values.colour,
      message: values.message,
      consentMarketing: values.consent,
      website: values.website,
      formStartedAt: values.formStartedAt,
    };
    try {
      const r = await api.createInquiry(payload);
      basket.clear();
      setReceipt(r);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_FAILED' && Array.isArray(err.details)) {
        let firstStep: number | null = null;
        for (const d of err.details as Array<{ path?: string; message?: string }>) {
          const field = serverFieldFor(d.path ?? '');
          if (!field) continue;
          setError(field, { type: 'server', message: d.message ?? t('errors.VALIDATION_FAILED') });
          const s = stepOf(field);
          firstStep = firstStep === null ? s : Math.min(firstStep, s);
        }
        if (firstStep !== null) setStep(firstStep);
        setSubmitError(t('errors.VALIDATION_FAILED'));
      } else {
        const code = err instanceof ApiError ? err.code : 'NETWORK';
        setSubmitError(t(`errors.${(KNOWN_ERROR_CODES as readonly string[]).includes(code) ? code : 'generic'}`));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startAnother = () => {
    reset({
      ...getValues(),
      name: '',
      mobile: '',
      city: '',
      make: '',
      model: '',
      year: '',
      items: [],
      material: '',
      colour: '',
      message: '',
      consent: false,
      formStartedAt: Date.now(),
    });
    setReceipt(null);
    setStep(0);
  };

  if (receipt) {
    const followUp = buildWhatsAppUrl(settings.whatsappNumber, t('whatsapp.quoteFollowUp', { reference: receipt.reference }));
    return (
      <>
        <Seo title={t('seo.quoteTitle')} description={t('seo.quoteDescription')} path="/request-quote" />
        <div className="mx-auto max-w-2xl px-4 py-12 md:px-6 md:py-20">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="glass rounded-3xl p-8 text-center md:p-12"
            role="status"
          >
            <motion.span
              initial={reduced ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-on-primary"
              aria-hidden
            >
              <Check size={32} />
            </motion.span>
            <h1 className="t-h2 mt-6">{t('quote.success.title')}</h1>
            <p className="mt-2 text-muted">{t('quote.success.body')}</p>
            <div className="mt-8 rounded-2xl border border-line bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">{t('quote.success.reference')}</p>
              <p className="mt-2">
                <CountUpReference reference={receipt.reference} />
              </p>
            </div>
            {api.mode === 'demo' ? (
              <p className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm text-muted">{t('quote.success.demo')}</p>
            ) : null}
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {followUp ? (
                <Button variant="whatsapp" icon={<MessageCircle size={18} aria-hidden />} onClick={() => window.open(followUp, '_blank', 'noopener,noreferrer')}>
                  {t('quote.success.whatsapp')}
                </Button>
              ) : null}
              <Button variant="secondary" onClick={startAnother}>
                {t('quote.success.new')}
              </Button>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  const values = watch();
  const materialLabel = values.material ? localized(MATERIAL_META[values.material].label, lang) : t('quote.fields.anyMaterial');
  const colourOption = COLOUR_OPTIONS.find((c) => c.code.toLowerCase() === values.colour.toLowerCase());
  const colourLabel = colourOption ? localized(colourOption.name, lang) : t('quote.fields.anyColour');
  const selectedIds = new Set(watchedItems.map((i) => i.productId));
  const availableProducts = (products.data?.items ?? []).filter((p) => !selectedIds.has(p.id));
  const stepVariants = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 } };

  return (
    <>
      <Seo title={t('seo.quoteTitle')} description={t('seo.quoteDescription')} path="/request-quote" />
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
        <header>
          <h1 className="t-h2 gradient-text">{t('quote.title')}</h1>
          <p className="mt-2 text-muted">{t('quote.subtitle')}</p>
        </header>

        <nav aria-label={t('quote.progress', { current: step + 1, total: STEPS.length })} className="mt-8">
          <p className="mb-3 text-sm font-semibold" aria-live="polite">
            {t('quote.progress', { current: step + 1, total: STEPS.length })}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-line" aria-hidden>
            <motion.div
              className="h-full origin-left rounded-full bg-gradient-to-r from-primary to-accent"
              animate={{ scaleX: (step + 1) / STEPS.length }}
              transition={{ type: 'spring', stiffness: 260, damping: 32 }}
              style={{ width: '100%' }}
            />
          </div>
          <ol className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-semibold md:text-sm">
            {STEPS.map((s, i) => (
              <li key={s} aria-current={i === step ? 'step' : undefined} className={i <= step ? 'text-ink' : 'text-muted'}>
                <span
                  className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
                    i < step ? 'border-accent bg-accent text-on-primary' : i === step ? 'border-accent text-accent' : 'border-line text-muted'
                  }`}
                  aria-hidden
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </span>
                {t(`quote.steps.${s}`)}
              </li>
            ))}
          </ol>
        </nav>

        {prefillNotice ? (
          <p role="alert" className="mt-6 rounded-xl border border-line bg-card p-4 text-sm text-sale">
            {t('quote.errors.prefill')}
          </p>
        ) : null}

        <form
          noValidate
          className="glass mt-8 rounded-3xl p-5 md:p-8"
          onSubmit={handleSubmit(onValid, () => {
            // Validation failed on the review step: jump to the first step that has an error.
            const firstBad = Object.keys(errors)
              .map((k) => stepOf(k))
              .sort((a, b) => a - b)[0];
            if (firstBad !== undefined) setStep(firstBad);
          })}
        >
          {/* Honeypot: hidden from people and screen readers. Bots tend to fill it in. */}
          <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
            <label>
              {t('quote.fields.website')}
              <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
            </label>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }} className="space-y-5">
              {step === 0 ? (
                <>
                  <h2 className="t-h3">{t('quote.steps.customer')}</h2>
                  <Field label={t('quote.fields.name')} error={msg(errors.name)}>
                    {(p) => <input id={p.id} {...register('name')} autoComplete="name" className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} />}
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
                    <Field label={t('quote.fields.countryCode')} error={msg(errors.countryCode)}>
                      {(p) => <input id={p.id} {...register('countryCode')} inputMode="tel" autoComplete="tel-country-code" className={inputClass} aria-invalid={p.invalid} />}
                    </Field>
                    <Field label={t('quote.fields.mobile')} error={msg(errors.mobile)}>
                      {(p) => <input id={p.id} {...register('mobile')} type="tel" inputMode="tel" autoComplete="tel-national" className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} />}
                    </Field>
                  </div>
                  <Field label={t('quote.fields.language')} error={msg(errors.language)}>
                    {(p) => (
                      <select id={p.id} {...register('language')} className={inputClass} aria-invalid={p.invalid}>
                        <option value="en">English</option>
                        <option value="hi">हिन्दी</option>
                      </select>
                    )}
                  </Field>
                  <Field label={t('quote.fields.city')} error={msg(errors.city)}>
                    {(p) => <input id={p.id} {...register('city')} autoComplete="address-level2" className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} />}
                  </Field>
                </>
              ) : null}

              {step === 1 ? (
                <>
                  <h2 className="t-h3">{t('quote.steps.vehicle')}</h2>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={t('quote.fields.make')} error={msg(errors.make)}>
                      {(p) => <input id={p.id} {...register('make')} autoComplete="off" className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} />}
                    </Field>
                    <Field label={t('quote.fields.model')} error={msg(errors.model)}>
                      {(p) => <input id={p.id} {...register('model')} autoComplete="off" className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} />}
                    </Field>
                  </div>
                  <Field label={t('quote.fields.year')} error={msg(errors.year)} hint={`${MIN_YEAR}–${MAX_YEAR}`}>
                    {(p) => <input id={p.id} {...register('year')} inputMode="numeric" maxLength={4} className={`${inputClass} sm:max-w-[10rem]`} aria-describedby={p.describedBy} aria-invalid={p.invalid} />}
                  </Field>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <h2 className="t-h3">{t('quote.steps.products')}</h2>
                  <fieldset className="space-y-3">
                    <legend className="mb-1 text-sm font-semibold text-ink">{t('quote.labels.products')}</legend>
                    {fields.length === 0 ? <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">{t('quote.items.empty')}</p> : null}
                    <ul className="space-y-3">
                      {fields.map((f, i) => (
                        <motion.li
                          key={f.id}
                          initial={reduced ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-ink">{localized(f.name, lang)}</p>
                            <p className="font-mono text-xs text-muted">{f.sku}</p>
                          </div>
                          <label className="flex items-center gap-2 text-sm font-semibold">
                            <span>{t('quote.fields.quantity')}</span>
                            <input
                              type="number"
                              min={1}
                              max={500}
                              inputMode="numeric"
                              className={`${inputClass} w-24`}
                              aria-invalid={Boolean(errors.items?.[i]?.quantity)}
                              {...register(`items.${i}.quantity`, { valueAsNumber: true })}
                            />
                          </label>
                          <button type="button" onClick={() => remove(i)} className="tap-target rounded-lg px-3 text-sm font-semibold text-sale hover:bg-surface">
                            {t('quote.items.remove')}
                            <span className="sr-only"> {localized(f.name, lang)}</span>
                          </button>
                          {errors.items?.[i]?.quantity ? <p className="w-full text-sm font-medium text-sale">{msg(errors.items[i]?.quantity)}</p> : null}
                        </motion.li>
                      ))}
                    </ul>
                    {itemsError ? <p className="text-sm font-medium text-sale">{itemsError}</p> : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label htmlFor="add-product" className="mb-2 block text-sm font-semibold">{t('quote.fields.product')}</label>
                        <select id="add-product" className={inputClass} value={pickId} onChange={(e) => setPickId(e.target.value)} disabled={fields.length >= MAX_ITEMS}>
                          <option value="">{t('quote.fields.chooseProduct')}</option>
                          {availableProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {localized(p.name, lang)} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button type="button" variant="secondary" onClick={addProduct} disabled={!pickId || fields.length >= MAX_ITEMS}>
                        {t('quote.items.add')}
                      </Button>
                    </div>
                  </fieldset>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={t('quote.fields.material')} error={msg(errors.material)}>
                      {(p) => (
                        <select id={p.id} {...register('material')} className={inputClass} aria-invalid={p.invalid}>
                          <option value="">{t('quote.fields.anyMaterial')}</option>
                          {MATERIALS.map((m) => (
                            <option key={m} value={m}>{localized(MATERIAL_META[m].label, lang)}</option>
                          ))}
                        </select>
                      )}
                    </Field>
                    <Field label={t('quote.fields.colour')} error={msg(errors.colour)}>
                      {(p) => (
                        <select id={p.id} {...register('colour')} className={inputClass} aria-invalid={p.invalid}>
                          <option value="">{t('quote.fields.anyColour')}</option>
                          {COLOUR_OPTIONS.map((c) => (
                            <option key={c.id} value={c.code}>{localized(c.name, lang)}</option>
                          ))}
                        </select>
                      )}
                    </Field>
                  </div>

                  <Field label={t('quote.fields.message')} error={msg(errors.message)} hint={`${watchedMessage.length}/1000`}>
                    {(p) => <textarea id={p.id} {...register('message')} rows={4} maxLength={1000} className={inputClass} aria-describedby={p.describedBy} aria-invalid={p.invalid} />}
                  </Field>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <h2 className="t-h3">{t('quote.review.title')}</h2>
                  <p className="rounded-xl border border-line bg-card p-4 text-sm text-muted">{t('quote.review.notice')}</p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 text-sm">
                    <dt className="font-semibold text-ink">{t('quote.labels.name')}</dt>
                    <dd>{values.name}</dd>
                    <dt className="font-semibold text-ink">{t('quote.labels.mobile')}</dt>
                    <dd>{values.countryCode} {values.mobile}</dd>
                    <dt className="font-semibold text-ink">{t('quote.labels.language')}</dt>
                    <dd>{values.language === 'hi' ? 'हिन्दी' : 'English'}</dd>
                    <dt className="font-semibold text-ink">{t('quote.labels.city')}</dt>
                    <dd>{values.city}</dd>
                    <dt className="font-semibold text-ink">{t('quote.labels.vehicle')}</dt>
                    <dd>{values.make} {values.model} ({values.year})</dd>
                    <dt className="font-semibold text-ink">{t('quote.labels.products')}</dt>
                    <dd>
                      <ul className="space-y-1">
                        {watchedItems.map((i) => (
                          <li key={i.productId}>{localized(i.name as LocalizedText, lang)} × {i.quantity}</li>
                        ))}
                      </ul>
                    </dd>
                    <dt className="font-semibold text-ink">{t('quote.labels.material')}</dt>
                    <dd>{materialLabel}</dd>
                    <dt className="font-semibold text-ink">{t('quote.labels.colour')}</dt>
                    <dd>{colourLabel}</dd>
                    {values.message ? (
                      <>
                        <dt className="font-semibold text-ink">{t('quote.labels.message')}</dt>
                        <dd className="whitespace-pre-line break-words">{values.message}</dd>
                      </>
                    ) : null}
                  </dl>
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" className="mt-1 h-5 w-5 accent-primary" {...register('consent')} />
                    <span>{t('quote.fields.consent')}</span>
                  </label>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>

          {submitError ? (
            <p role="alert" className="mt-5 rounded-xl border border-sale bg-card p-4 text-sm font-semibold text-sale">
              {submitError}
            </p>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 0 ? (
              <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={submitting} icon={<ArrowLeft size={18} aria-hidden />}>
                {t('quote.actions.back')}
              </Button>
            ) : (
              <Link to="/products" className="text-sm font-semibold text-muted no-underline hover:text-ink">
                {t('product.back')}
              </Link>
            )}
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext} icon={<ArrowRight size={18} aria-hidden />}>
                {t('quote.actions.next')}
              </Button>
            ) : (
              <Button type="submit" disabled={submitting} aria-busy={submitting}>
                {submitting ? t('quote.actions.submitting') : t('quote.actions.submit')}
              </Button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
