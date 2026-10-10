import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/**
 * Inline SVG car seat. Fills animate when the colour changes (fill is tweened by Framer).
 * Decorative in most places; labelled when used as the colour preview.
 */
export function SeatSvg({
  cushion = '#1f1f1f',
  back = '#1f1f1f',
  className = '',
  label,
}: {
  cushion?: string;
  back?: string;
  className?: string;
  label?: string;
}) {
  const { t } = useTranslation();
  const accessible = label !== undefined;
  return (
    <svg
      viewBox="0 0 240 220"
      className={className}
      role={accessible ? 'img' : undefined}
      aria-label={accessible ? label : undefined}
      aria-hidden={accessible ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id="seat-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d="M66 14 Q120 -2 174 14 Q186 18 184 36 L190 150 Q120 168 50 150 L56 36 Q54 18 66 14 Z"
        animate={{ fill: back }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />
      <path d="M66 14 Q120 -2 174 14 Q186 18 184 36 L190 150 Q120 168 50 150 L56 36 Q54 18 66 14 Z" fill="url(#seat-sheen)" />
      <path
        d="M88 46 L152 46 M86 74 L154 74 M84 102 L156 102"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeDasharray="5 5"
        fill="none"
      />
      <motion.path
        d="M30 146 Q120 124 210 146 L224 196 Q120 214 16 196 Z"
        animate={{ fill: cushion }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />
      <path d="M30 146 Q120 124 210 146 L224 196 Q120 214 16 196 Z" fill="url(#seat-sheen)" />
      <path
        d="M40 170 Q120 152 200 170"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeDasharray="5 5"
        fill="none"
      />
      <title>{accessible ? label : t('home.seatCushion')}</title>
    </svg>
  );
}
