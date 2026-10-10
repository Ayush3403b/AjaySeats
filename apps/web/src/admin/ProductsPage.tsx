import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import type { AdminProduct } from '@pcs/shared';
import { adminApi } from '../api/admin.js';
import { Seo } from '../components/Seo.js';
import { MaterialBadge } from '../components/MaterialBadge.js';
import { Button, LinkButton } from '../components/motion/Button.js';
import { inputClass } from '../components/Field.js';
import { useAsync } from '../lib/useAsync.js';
import { currentLang, localized } from '../lib/format.js';
import { isRupeeAmount, paiseToRupees, rupeesToPaise } from './productForm.js';
import { adminErrorKey } from './messages.js';
import { AdminHeading, AsyncBlock, Notice, PagerButtons, StatusBadge, type Tone } from './ui.js';

const PAGE_SIZE = 20;
type StatusFilter = '' | 'published' | 'draft' | 'archived';

function productState(p: AdminProduct): { tone: Tone; key: string } {
  if (p.archived) return { tone: 'neutral', key: 'admin.products.archived' };
  if (p.published) return { tone: 'good', key: 'admin.products.published' };
  return { tone: 'warn', key: 'admin.products.draft' };
}

/** Regular and sale price editor. Saving PATCHes the stored price, so the public site shows it right away. */
function PriceEditor({ product, disabled, onSave }: { product: AdminProduct; disabled: boolean; onSave: (regular: number, sale: number | null) => void }) {
  const { t } = useTranslation();
  const [regular, setRegular] = useState(paiseToRupees(product.priceMinor));
  const [sale, setSale] = useState(product.salePriceMinor === null ? '' : paiseToRupees(product.salePriceMinor));
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!isRupeeAmount(regular)) return setLocalError(t('admin.errors.price'));
    if (sale.trim() !== '') {
      if (!isRupeeAmount(sale)) return setLocalError(t('admin.errors.price'));
      if (rupeesToPaise(sale) >= rupeesToPaise(regular)) return setLocalError(t('admin.errors.saleBelowRegular'));
    }
    setLocalError(null);
    onSave(rupeesToPaise(regular), sale.trim() === '' ? null : rupeesToPaise(sale));
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor={`reg-${product.id}`} className="mb-1 block text-xs font-semibold text-muted">
          {t('admin.products.regular')} (₹)
        </label>
        <input id={`reg-${product.id}`} inputMode="decimal" className={`${inputClass} w-36`} value={regular} onChange={(e) => setRegular(e.target.value)} />
      </div>
      <div>
        <label htmlFor={`sale-${product.id}`} className="mb-1 block text-xs font-semibold text-muted">
          {t('admin.products.sale')} (₹)
        </label>
        <input id={`sale-${product.id}`} inputMode="decimal" placeholder={t('admin.products.noSale')} className={`${inputClass} w-36`} value={sale} onChange={(e) => setSale(e.target.value)} />
      </div>
      <Button type="submit" variant="secondary" disabled={disabled} className="min-h-[44px]">
        {t('admin.products.savePrices')}
      </Button>
      {localError ? (
        <p role="alert" className="w-full text-sm font-semibold text-sale">
          {localError}
        </p>
      ) : null}
    </form>
  );
}

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const statusParam = params.get('status');
  const status: StatusFilter = statusParam === 'published' || statusParam === 'draft' || statusParam === 'archived' ? statusParam : '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);
  const [notice, setNotice] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const key = params.toString();

  const list = useAsync(
    () => adminApi.listProducts({ page, pageSize: PAGE_SIZE, q: q || undefined, status: status || undefined }),
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

  const run = async (id: string, action: () => Promise<unknown>, doneKey: string) => {
    setBusyId(id);
    setNotice(null);
    try {
      await action();
      setNotice({ tone: 'good', text: t(doneKey) });
      list.reload();
    } catch (err) {
      setNotice({ tone: 'bad', text: t(adminErrorKey(err)) });
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  const data = list.data;
  const totalPages = data?.totalPages ?? 1;

  return (
    <>
      <Seo title={t('admin.products.title')} description={t('admin.products.title')} path="/admin/products" noindex />
      <AdminHeading
        title={t('admin.products.title')}
        actions={
          <LinkButton to="/admin/products/new" icon={<Plus size={18} aria-hidden />}>
            {t('admin.products.new')}
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_14rem]">
        <div>
          <label htmlFor="admin-product-search" className="sr-only">
            {t('admin.products.search')}
          </label>
          <input
            id="admin-product-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.products.searchPlaceholder')}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="admin-product-status" className="sr-only">
            {t('admin.products.statusFilter')}
          </label>
          <select id="admin-product-status" className={inputClass} value={status} onChange={(e) => update({ status: e.target.value || undefined })}>
            <option value="">{t('admin.products.statusAll')}</option>
            <option value="published">{t('admin.products.published')}</option>
            <option value="draft">{t('admin.products.draft')}</option>
            <option value="archived">{t('admin.products.archived')}</option>
          </select>
        </div>
      </div>

      <div aria-live="polite">{notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}</div>

      <AsyncBlock
        loading={list.loading && !list.data}
        error={list.error}
        onRetry={list.reload}
        empty={!!data && data.items.length === 0}
        emptyTitle={t('admin.products.empty')}
        emptyAction={<LinkButton to="/admin/products/new">{t('admin.products.new')}</LinkButton>}
      >
        <p className="mb-3 text-sm text-muted">{t('admin.products.count', { n: data?.total ?? 0 })}</p>
        <ul className="space-y-4">
          {(data?.items ?? []).map((p) => {
            const state = productState(p);
            const busy = busyId === p.id;
            return (
              <li key={p.id} className="glass rounded-2xl p-4 md:p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={state.tone}>{t(state.key)}</StatusBadge>
                      <MaterialBadge material={p.material} />
                    </div>
                    <h2 className="mt-2 break-words text-lg font-bold">{localized(p.name, lang)}</h2>
                    <p className="break-words text-xs text-muted">
                      <span className="font-mono">{p.sku}</span> · {localized(p.category.name, lang)} · /products/{p.slug}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <LinkButton to={`/admin/products/${p.id}/edit`} variant="secondary" className="min-h-[40px] px-4 py-2">
                      {t('admin.products.edit')}
                    </LinkButton>
                    {!p.archived ? (
                      <Button
                        variant="secondary"
                        className="min-h-[40px] px-4 py-2"
                        disabled={busy}
                        onClick={() => run(p.id, () => adminApi.setPublished(p.id, !p.published), p.published ? 'admin.products.unpublished' : 'admin.products.published_done')}
                      >
                        {p.published ? t('admin.products.unpublish') : t('admin.products.publish')}
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      className="min-h-[40px] px-4 py-2"
                      disabled={busy}
                      onClick={() => run(p.id, () => adminApi.setArchived(p.id, !p.archived), p.archived ? 'admin.products.restored' : 'admin.products.archived_done')}
                    >
                      {p.archived ? t('admin.products.restore') : t('admin.products.archive')}
                    </Button>
                    {confirmId === p.id ? (
                      <>
                        <Button variant="secondary" className="min-h-[40px] px-4 py-2" onClick={() => setConfirmId(null)}>
                          {t('admin.products.cancel')}
                        </Button>
                        <Button
                          className="min-h-[40px] bg-sale px-4 py-2 text-on-primary"
                          disabled={busy}
                          onClick={() => run(p.id, () => adminApi.deleteProduct(p.id), 'admin.products.deleted')}
                        >
                          {t('admin.products.confirmDelete')}
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" className="min-h-[40px] px-4 py-2 text-sale" disabled={busy} onClick={() => setConfirmId(p.id)}>
                        {t('admin.products.delete')}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-4 border-t border-line pt-4">
                  <PriceEditor
                    key={`${p.id}:${p.updatedAt}`}
                    product={p}
                    disabled={busy}
                    onSave={(regular, sale) =>
                      run(p.id, () => adminApi.updateProduct(p.id, { priceMinor: regular, salePriceMinor: sale }), 'admin.products.priceSaved')
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
        {totalPages > 1 ? <PagerButtons page={page} totalPages={totalPages} onPage={(p) => update({ page: String(p) })} /> : null}
      </AsyncBlock>
    </>
  );
}
