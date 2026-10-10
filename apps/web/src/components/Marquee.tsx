import type { ReactNode } from 'react';

/** Looping strip. Pauses on hover; CSS disables the loop under reduced motion. Duplicate copy is aria-hidden. */
export function Marquee({ items, label }: { items: ReactNode[]; label: string }) {
  return (
    <div className="marquee relative overflow-hidden py-3" role="region" aria-label={label}>
      <div className="marquee-track gap-4">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 gap-4 pr-4" aria-hidden={copy === 1 ? true : undefined}>
            {items.map((item, i) => (
              <span key={i} className="shrink-0">
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
