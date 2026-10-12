import { useTranslation } from 'react-i18next';
import { Seo } from '../components/Seo.js';
import { LinkButton } from '../components/motion/Button.js';
import { WordReveal } from '../components/motion/WordReveal.js';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <>
      <Seo title={t('seo.notFoundTitle')} description={t('notFound.body')} path="/404" noindex />
      <div className="relative isolate mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center md:px-6">
        <div aria-hidden className="bg-grid absolute inset-0 -z-10" />
        <p className="numeral text-[7rem] text-primary drop-shadow-[0_18px_30px_rgba(48,38,179,0.25)] md:text-[9rem]" aria-hidden>404</p>
        <WordReveal as="h1" text={t('notFound.title')} className="t-h2 mt-2 text-ink" onLoad />
        <span aria-hidden className="accent-bar mx-auto mt-5" />
        <p className="mt-5 text-lg text-muted">{t('notFound.body')}</p>
        <div className="mt-8">
          <LinkButton to="/">{t('notFound.home')}</LinkButton>
        </div>
      </div>
    </>
  );
}
