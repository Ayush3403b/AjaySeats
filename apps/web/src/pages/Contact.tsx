import { useTranslation } from 'react-i18next';
import { MessageCircle, FileText } from 'lucide-react';
import { Seo } from '../components/Seo.js';
import { Button, LinkButton } from '../components/motion/Button.js';
import { RevealItem, RevealSection } from '../components/motion/Reveal.js';
import { WordReveal } from '../components/motion/WordReveal.js';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';
import { useSettings } from '../lib/useSettings.js';

export default function Contact() {
  const { t } = useTranslation();
  const settings = useSettings();
  const link = buildWhatsAppUrl(settings.whatsappNumber, t('whatsapp.general'));

  return (
    <>
      <Seo title={t('seo.contactTitle')} description={t('seo.contactDescription')} path="/contact" />
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-16">
        <header className="max-w-2xl">
          <WordReveal as="h1" text={t('contact.title')} className="t-display gradient-text" onLoad />
          <p className="mt-4 text-lg text-muted">{t('contact.subtitle')}</p>
        </header>

        <RevealSection className="mt-12 grid gap-6 md:grid-cols-2">
          <RevealItem className="glass flex h-full flex-col gap-4 rounded-3xl p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-whatsapp text-[#04130A]" aria-hidden>
              <MessageCircle size={24} />
            </span>
            <h2 className="t-h3">{t('contact.whatsappTitle')}</h2>
            <p className="text-muted">{t('contact.whatsappBody')}</p>
            <div className="mt-auto pt-2">
              {link ? (
                <Button variant="whatsapp" onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}>
                  {t('contact.whatsappCta')}
                </Button>
              ) : (
                <p className="text-sm font-medium text-muted">{t('contact.whatsappMissing')}</p>
              )}
            </div>
          </RevealItem>

          <RevealItem className="glass flex h-full flex-col gap-4 rounded-3xl p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-on-primary" aria-hidden>
              <FileText size={24} />
            </span>
            <h2 className="t-h3">{t('contact.quoteTitle')}</h2>
            <p className="text-muted">{t('contact.quoteBody')}</p>
            <div className="mt-auto pt-2">
              <LinkButton to="/request-quote" variant="secondary">{t('contact.quoteCta')}</LinkButton>
            </div>
          </RevealItem>
        </RevealSection>
      </div>
    </>
  );
}
