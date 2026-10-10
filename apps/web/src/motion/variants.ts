import type { Transition, Variants } from 'framer-motion';

/** Motion system: only transform, opacity and filter are animated. */
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

export const pageTransition: Transition = { duration: 0.3, ease: 'easeOut' };

/** Route transitions: fade + 16px slide, 300ms, easeOut. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: pageTransition },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOutExpo } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: easeOutExpo } },
};

export const slideInX = (direction: 1 | -1 = 1): Variants => ({
  hidden: { opacity: 0, x: 24 * direction },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: easeOutExpo } },
});

/** Blur-in uses filter. Text stays opaque so it can be painted immediately (LCP-friendly). */
export const blurIn: Variants = {
  hidden: { opacity: 1, filter: 'blur(8px)', y: 10 },
  show: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: 0.6, ease: easeOutExpo } },
};

export const staggerContainer = (stagger = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});

export const staggerItem: Variants = fadeUp;

/** Used in place of movement when prefers-reduced-motion is set: a simple fade only. */
export const reducedFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
};

export const reducedContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0 } },
};
