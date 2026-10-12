import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Plus } from 'lucide-react';
import { SectionHeading } from '../../components/Section.js';
import { LinkButton } from '../../components/motion/Button.js';
import { RevealItem, RevealSection } from '../../components/motion/Reveal.js';
import { buildWhatsAppUrl } from '../../lib/whatsapp.js';
import { useSettings } from '../../lib/useSettings.js';

export interface FaqItem {
  q: string;
  a: string;
}

/** FAQPage structured data. Built from the same strings the accordion shows, so it always matches the page. */
export function faqJsonLd(items: FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * One question. The answer stays in the DOM when collapsed (crawlers read it); `invisible` hides it
 * from screen readers and the grid-rows transition animates the height.
 */
function FaqRow({ item, index, open, onToggle }: { item: FaqItem; index: number; open: boolean; onToggle: () => void }) {
  const id = `faq-${index}`;
  return (
    <li className="border-b border-line last:border-b-0">
      <h3>
        <button
          type="button"
          id={`${id}-q`}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          onClick={onToggle}
          className="tap-target flex w-full items-center gap-4 py-5 text-left text-lg font-semibold leading-snug text-ink transition-colors hover:text-primary"
        >
          <span className="numeral w-6 shrink-0 text-sm text-primary" aria-hidden>
            {pad(index + 1)}
          </span>
          <span className="flex-1">{item.q}</span>
          <span
            aria-hidden
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-[transform,background-color,border-color,color] duration-300 motion-reduce:transition-none ${
              open ? 'rotate-45 border-primary bg-primary text-on-primary' : 'border-line bg-surface text-ink'
            }`}
          >
            <Plus size={16} />
          </span>
        </button>
      </h3>
      <div
        id={`${id}-a`}
        role="region"
        aria-labelledby={`${id}-q`}
        className={`grid transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none ${open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <p className="pb-6 pl-10 pr-4 leading-relaxed text-muted md:pr-12">{item.a}</p>
        </div>
      </div>
    </li>
  );
}

export function Faq({ items }: { items: FaqItem[] }) {
  const { t } = useTranslation();
  const settings = useSettings();
  const whatsapp = buildWhatsAppUrl(settings.whatsappNumber, t('whatsapp.general'));
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section aria-labelledby="faq-title" className="border-y border-line bg-mist py-20 md:py-24">
      <RevealSection className="mx-auto grid max-w-7xl gap-12 px-4 md:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <RevealItem className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading id="faq-title" eyebrow={t('home.faq.eyebrow')} title={t('home.faq.title')} subtitle={t('home.faq.subtitle')} />
          <div className="card-soft mt-8 p-6">
            <p className="font-heading text-lg font-semibold text-ink">{t('home.faq.more')}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {whatsapp ? (
                <LinkButton to={whatsapp} external variant="whatsapp" icon={<MessageCircle size={18} aria-hidden />}>
                  {t('home.whatsappCta')}
                </LinkButton>
              ) : null}
              <LinkButton to="/contact" variant="secondary">
                {t('home.faq.contact')}
              </LinkButton>
            </div>
          </div>
        </RevealItem>
        <RevealItem>
          <ul className="card-soft !rounded-[1.75rem] px-5 md:px-8">
            {items.map((item, i) => (
              <FaqRow key={item.q} item={item} index={i} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
            ))}
          </ul>
        </RevealItem>
      </RevealSection>
    </section>
  );
}
