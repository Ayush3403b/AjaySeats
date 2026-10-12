import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, MessageCircle, FileText } from 'lucide-react';
import { Seo } from '../components/Seo.js';
import { PageHeader } from '../components/Section.js';
import { Button, LinkButton } from '../components/motion/Button.js';
import { RevealItem, RevealSection } from '../components/motion/Reveal.js';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';
import { useSettings } from '../lib/useSettings.js';

export default function Contact() {
  const { t } = useTranslation();
  const settings = useSettings();
  const link = buildWhatsAppUrl(settings.whatsappNumber, t('whatsapp.general'));

  return (
    <>
      <Seo title={t('seo.contactTitle')} description={t('seo.contactDescription')} path="/contact" />
      <PageHeader eyebrow={t('contact.eyebrow')} title={t('contact.title')} subtitle={t('contact.subtitle')} width="max-w-5xl" />
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-12 md:px-6 md:pt-16">
        <RevealSection className="grid gap-6 md:grid-cols-2">
          <RevealItem className="card-soft card-hover flex h-full flex-col gap-4 !rounded-[1.75rem] p-7 md:p-8">
            <span className="icon-tile !h-14 !w-14 !rounded-2xl" style={{ '--tile': '#128c4a' } as CSSProperties} aria-hidden>
              <MessageCircle size={26} />
            </span>
            <h2 className="t-h3 text-ink">{t('contact.whatsappTitle')}</h2>
            <p className="leading-relaxed text-muted">{t('contact.whatsappBody')}</p>
            <div className="mt-auto pt-2">
              {link ? (
                <Button variant="whatsapp" icon={<MessageCircle size={18} aria-hidden />} onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}>
                  {t('contact.whatsappCta')}
                </Button>
              ) : (
                <p className="text-sm font-medium text-muted">{t('contact.whatsappMissing')}</p>
              )}
            </div>
          </RevealItem>

          <RevealItem className="card-soft card-hover flex h-full flex-col gap-4 !rounded-[1.75rem] p-7 md:p-8">
            <span className="icon-tile !h-14 !w-14 !rounded-2xl" aria-hidden>
              <FileText size={26} />
            </span>
            <h2 className="t-h3 text-ink">{t('contact.quoteTitle')}</h2>
            <p className="leading-relaxed text-muted">{t('contact.quoteBody')}</p>
            <div className="mt-auto pt-2">
              <LinkButton to="/request-quote" icon={<ArrowRight size={18} aria-hidden />}>
                {t('contact.quoteCta')}
              </LinkButton>
            </div>
          </RevealItem>
        </RevealSection>
      </div>
    </>
  );
}
