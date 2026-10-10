import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/index.js';
import { Seo } from '../components/Seo.js';
import { LinkButton } from '../components/motion/Button.js';
import { AdminSessionProvider, AdminGuard } from './session.js';
import { AdminLayout } from './AdminLayout.js';

const LoginPage = lazy(() => import('./LoginPage.js'));
const ProductsPage = lazy(() => import('./ProductsPage.js'));
const ProductFormPage = lazy(() => import('./ProductFormPage.js'));
const InquiriesPage = lazy(() => import('./InquiriesPage.js'));
const InquiryDetailPage = lazy(() => import('./InquiryDetailPage.js'));
const CustomersPage = lazy(() => import('./CustomersPage.js'));
const CampaignsPage = lazy(() => import('./CampaignsPage.js'));
const CampaignFormPage = lazy(() => import('./CampaignFormPage.js'));
const CampaignDetailPage = lazy(() => import('./CampaignDetailPage.js'));

/**
 * Shown instead of the admin when there is no live API. Admin saves are never simulated, so the
 * demo build cannot appear to save a price or a status that was not stored.
 */
function DemoModeNotice() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Seo title={t('admin.demo.title')} description={t('admin.demo.title')} path="/admin" noindex />
      <section aria-labelledby="admin-demo-title" className="glass w-full max-w-lg space-y-4 rounded-3xl p-6 md:p-8">
        <h1 id="admin-demo-title" className="t-h2">
          {t('admin.demo.title')}
        </h1>
        <p role="status" className="rounded-xl border border-accent/50 bg-accent/10 p-3 text-sm font-semibold text-accent">
          {t('admin.demo.badge')}
        </p>
        <p className="text-muted">{t('admin.demo.body')}</p>
        <LinkButton to="/" variant="secondary">
          {t('admin.demo.home')}
        </LinkButton>
      </section>
    </main>
  );
}

function AdminFallback() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t('states.loading')} className="p-10 text-center text-muted">
      …
    </div>
  );
}

/** Admin area. Lives outside the public Layout (no public navigation or footer). */
export default function AdminApp() {
  if (api.mode === 'demo') return <DemoModeNotice />;
  return (
    <AdminSessionProvider>
      <Suspense fallback={<AdminFallback />}>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<AdminGuard />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="products" replace />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/new" element={<ProductFormPage />} />
              <Route path="products/:id/edit" element={<ProductFormPage />} />
              <Route path="inquiries" element={<InquiriesPage />} />
              <Route path="inquiries/:id" element={<InquiryDetailPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="campaigns" element={<CampaignsPage />} />
              <Route path="campaigns/new" element={<CampaignFormPage />} />
              <Route path="campaigns/:id" element={<CampaignDetailPage />} />
              <Route path="campaigns/:id/edit" element={<CampaignFormPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </AdminSessionProvider>
  );
}
