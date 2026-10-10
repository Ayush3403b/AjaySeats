import { useTranslation } from 'react-i18next';
import { Seo } from '../components/Seo.js';
import { LinkButton } from '../components/motion/Button.js';
import { WordReveal } from '../components/motion/WordReveal.js';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <>
      <Seo title={t('seo.notFoundTitle')} description={t('notFound.body')} path="/404" />
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center md:px-6">
        <p className="gradient-text text-7xl font-extrabold" aria-hidden>404</p>
        <WordReveal as="h1" text={t('notFound.title')} className="t-h2 mt-4" onLoad />
        <p className="mt-4 text-muted">{t('notFound.body')}</p>
        <div className="mt-8">
          <LinkButton to="/">{t('notFound.home')}</LinkButton>
        </div>
      </div>
    </>
  );
}
