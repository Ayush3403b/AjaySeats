import { MATERIAL_META, type Material } from '@pcs/shared';
import { useTranslation } from 'react-i18next';
import { localized } from '../lib/format.js';
import type { UiLanguage } from '../i18n/index.js';

/** Material chip. Colour is decorative; the text label always carries the meaning. */
export function MaterialBadge({ material, className = '' }: { material: Material; className?: string }) {
  const { i18n } = useTranslation();
  const lang = (i18n.language === 'hi' ? 'hi' : 'en') as UiLanguage;
  const meta = MATERIAL_META[material];
  return (
    <span
      className={`inline-flex min-h-[28px] items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-ink ${className}`}
      style={{
        background: `color-mix(in srgb, var(${meta.token}) 12%, white)`,
        border: `1px solid color-mix(in srgb, var(${meta.token}) 40%, white)`,
      }}
    >
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: `var(${meta.token})` }} />
      {localized(meta.label, lang)}
    </span>
  );
}
