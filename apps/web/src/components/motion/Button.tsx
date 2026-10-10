import { useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion';
import { useMagnetic, useReducedMotion } from '../../motion/hooks.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'whatsapp';

const BASE =
  'relative inline-flex min-h-[44px] select-none items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-3 text-base font-semibold no-underline transition-colors duration-200 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'sheen bg-primary text-on-primary shadow-[0_12px_30px_-12px_var(--primary)] hover:brightness-110',
  secondary: 'border border-line bg-card text-ink hover:bg-surface',
  ghost: 'text-ink hover:bg-card',
  whatsapp: 'sheen bg-whatsapp text-[#04130A] shadow-[0_12px_30px_-14px_var(--whatsapp)] hover:brightness-105',
};

interface Ripple {
  id: number;
  x: number;
  y: number;
}

let rippleId = 0;

interface CommonProps {
  variant?: ButtonVariant;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

function Inner({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="relative z-10 inline-flex items-center gap-2">
      {icon ? (
        <motion.span className="inline-flex" whileHover={{ x: 3 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
          {icon}
        </motion.span>
      ) : null}
      {children}
    </span>
  );
}

/** Button with magnetic pull (desktop fine pointer only), press scale, and ripple on primary. */
export function Button({
  variant = 'primary',
  icon,
  className = '',
  children,
  ...rest
}: CommonProps & Omit<HTMLMotionProps<'button'>, 'children'>) {
  const magnet = useMagnetic(6);
  const reduced = useReducedMotion();
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (variant !== 'primary' || reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ripple = { id: (rippleId += 1), x: event.clientX - rect.left, y: event.clientY - rect.top };
    setRipples((r) => [...r, ripple]);
  };

  return (
    <motion.button
      type="button"
      {...rest}
      style={{ x: magnet.x, y: magnet.y }}
      whileTap={{ scale: 0.96 }}
      onPointerMove={magnet.handlers.onPointerMove}
      onPointerLeave={magnet.handlers.onPointerLeave}
      onPointerDown={onPointerDown}
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
    >
      <Inner icon={icon}>{children}</Inner>
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            aria-hidden
            className="pointer-events-none absolute z-0 h-6 w-6 rounded-full bg-white/60"
            style={{ left: r.x - 12, top: r.y - 12 }}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 9, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            onAnimationComplete={() => setRipples((list) => list.filter((x) => x.id !== r.id))}
          />
        ))}
      </AnimatePresence>
    </motion.button>
  );
}

/** Router link styled as a button, with the same magnetic and press behaviour. */
export function LinkButton({
  to,
  variant = 'primary',
  icon,
  className = '',
  children,
  external,
}: CommonProps & { to: string; external?: boolean }) {
  const magnet = useMagnetic(6);
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;
  return (
    <motion.span
      style={{ x: magnet.x, y: magnet.y }}
      whileTap={{ scale: 0.96 }}
      onPointerMove={magnet.handlers.onPointerMove}
      onPointerLeave={magnet.handlers.onPointerLeave}
      className="inline-flex"
    >
      {external ? (
        <a href={to} target="_blank" rel="noopener noreferrer" className={classes}>
          <Inner icon={icon}>{children}</Inner>
        </a>
      ) : (
        <Link to={to} className={classes}>
          <Inner icon={icon}>{children}</Inner>
        </Link>
      )}
    </motion.span>
  );
}
