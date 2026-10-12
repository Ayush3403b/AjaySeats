import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Seo } from '../components/Seo.js';
import { LanguageSwitch } from '../components/LanguageSwitch.js';
import { Logo } from '../components/Navbar.js';
import { Button } from '../components/motion/Button.js';
import { useAdminSession } from './session.js';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `tap-target inline-flex items-center rounded-full px-4 text-sm font-semibold no-underline transition-colors ${
    isActive ? 'bg-primary text-on-primary' : 'text-ink hover:bg-primary-soft hover:text-primary'
  }`;

export function AdminLayout() {
  const { t } = useTranslation();
  const session = useAdminSession();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    await session.signOut().catch(() => undefined);
    navigate('/admin/login', { replace: true });
  };

  return (
    <>
      <Seo title={t('admin.title')} description={t('admin.title')} path="/admin/products" noindex />
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/90 shadow-soft backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
            <Logo compact />
            <Link to="/admin/products" className="eyebrow no-underline">
              {t('admin.title')}
            </Link>
            <nav aria-label={t('admin.nav.label')} className="flex flex-wrap gap-2">
              <NavLink to="/admin/products" className={linkClass}>
                {t('admin.nav.products')}
              </NavLink>
              <NavLink to="/admin/inquiries" className={linkClass}>
                {t('admin.nav.inquiries')}
              </NavLink>
              <NavLink to="/admin/customers" className={linkClass}>
                {t('admin.nav.customers')}
              </NavLink>
              <NavLink to="/admin/campaigns" className={linkClass}>
                {t('admin.nav.campaigns')}
              </NavLink>
            </nav>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <LanguageSwitch />
              {session.user ? (
                <span className="hidden text-sm text-muted lg:inline">
                  {session.user.name} · {t(`admin.role.${session.user.role}`)}
                </span>
              ) : null}
              <Button variant="secondary" onClick={signOut} disabled={signingOut} className="min-h-[40px] px-4 py-2">
                {t('admin.nav.signOut')}
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <Outlet />
        </main>
      </div>
    </>
  );
}
