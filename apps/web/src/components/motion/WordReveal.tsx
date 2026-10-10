import { motion } from 'framer-motion';
import { blurIn, reducedFade, staggerContainer } from '../../motion/variants.js';
import { useReducedMotion } from '../../motion/hooks.js';

/**
 * Headline that blur-reveals word by word. Words stay opaque from the first paint so the
 * text can be the Largest Contentful Paint without waiting for the animation.
 * Set `onLoad` for above-the-fold headings; otherwise it reveals when scrolled into view.
 */
export function WordReveal({
  text,
  as = 'h2',
  className = '',
  onLoad = false,
  delay = 0,
}: {
  text: string;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  onLoad?: boolean;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  const words = text.split(' ');
  const container = reduced ? { hidden: {}, show: {} } : staggerContainer(0.06, delay);
  const wordVariants = reduced ? reducedFade : blurIn;
  const triggerProps = onLoad
    ? { initial: 'hidden', animate: 'show' }
    : { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '-15%' } as const };

  return (
    <Tag className={className} variants={container} aria-label={text} {...triggerProps}>
      {words.map((word, i) => (
        <motion.span key={`${word}-${i}`} variants={wordVariants} className="mr-[0.25em] inline-block" aria-hidden>
          {word}
        </motion.span>
      ))}
    </Tag>
  );
}
