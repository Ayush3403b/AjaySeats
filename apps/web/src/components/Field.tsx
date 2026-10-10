import { useId, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../motion/hooks.js';

/**
 * Labelled field wrapper. When an error appears the field shakes (transform only), the message is
 * announced via aria-live, and the colour is paired with text so it is not the only signal.
 */
export function Field({
  label,
  error,
  hint,
  children,
  id,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  id?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const reduced = useReducedMotion();
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <motion.div
      key={error ?? 'ok'}
      className="flex flex-col gap-1.5"
      animate={error && !reduced ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.35 }}
    >
      <label htmlFor={fieldId} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children({ id: fieldId, describedBy, invalid: Boolean(error) })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      <p id={errorId} aria-live="polite" className="min-h-[1.25rem] text-sm font-medium text-sale">
        {error ?? ''}
      </p>
    </motion.div>
  );
}

export const inputClass =
  'min-h-[44px] w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-muted focus-visible:outline-accent aria-[invalid=true]:border-sale';
