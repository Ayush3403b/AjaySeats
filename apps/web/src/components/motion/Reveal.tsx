import type { ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import { fadeUp, reducedContainer, reducedFade, staggerContainer } from '../../motion/variants.js';
import { useReducedMotion } from '../../motion/hooks.js';

const VIEWPORT = { once: true, margin: '-15%' } as const;

/** Section wrapper: children reveal in a stagger when scrolled into view (once). */
export function RevealSection({
  children,
  className = '',
  stagger = 0.08,
  as = 'div',
  id,
  'aria-labelledby': labelledBy,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  as?: 'div' | 'section' | 'footer' | 'article';
  id?: string;
  'aria-labelledby'?: string;
}) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      id={id}
      aria-labelledby={labelledBy}
      className={className}
      variants={reduced ? reducedContainer : staggerContainer(stagger)}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
    >
      {children}
    </Tag>
  );
}

/** Item inside RevealSection. Under reduced motion it only fades. */
export function RevealItem({
  children,
  className = '',
  variants,
}: {
  children: ReactNode;
  className?: string;
  variants?: Variants;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div className={className} variants={reduced ? reducedFade : (variants ?? fadeUp)}>
      {children}
    </motion.div>
  );
}
