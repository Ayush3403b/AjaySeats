import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/** True when the user asked for less motion. Disables parallax, tilt, marquee, cursor and looping effects. */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export function useIsCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)');
}

/** Desktop = fine pointer and at least 1024px wide. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(pointer: fine) and (min-width: 1024px)');
}

/** Cursor-following effects run only on desktop and only when motion is allowed. */
export function useCursorEffects(): boolean {
  const reduced = useReducedMotion();
  const desktop = useIsDesktop();
  return desktop && !reduced;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Magnetic pull, capped at `max` px (6px default). Returns handlers to spread on the element. */
export function useMagnetic(max = 6) {
  const enabled = useCursorEffects();
  const x = useSpring(0, { stiffness: 260, damping: 18, mass: 0.6 });
  const y = useSpring(0, { stiffness: 260, damping: 18, mass: 0.6 });

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    x.set(clamp(dx * 0.2, -max, max));
    y.set(clamp(dy * 0.2, -max, max));
  };
  const onPointerLeave = () => {
    x.set(0);
    y.set(0);
  };
  return { x, y, enabled, handlers: { onPointerMove, onPointerLeave } };
}

/** Mouse-position 3D tilt, ±maxDeg (8° default). Disabled on touch and reduced motion. */
export function useTilt(maxDeg = 8) {
  const enabled = useCursorEffects();
  const rotateX = useSpring(0, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 200, damping: 20 });

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(clamp(px * 2 * maxDeg, -maxDeg, maxDeg));
    rotateX.set(clamp(-py * 2 * maxDeg, -maxDeg, maxDeg));
  };
  const onPointerLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };
  return { rotateX, rotateY, enabled, handlers: { onPointerMove, onPointerLeave } };
}

/** Pointer position relative to a container, for the cursor-following radial glow. */
export function useCursorGlow() {
  const enabled = useCursorEffects();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  };
  return { x: x as MotionValue<number>, y: y as MotionValue<number>, enabled, onPointerMove };
}

/** Scroll direction with a small threshold, for hiding and revealing bars. */
export function useScrollDirection(threshold = 8): { direction: 'up' | 'down'; atTop: boolean } {
  const [state, setState] = useState<{ direction: 'up' | 'down'; atTop: boolean }>({ direction: 'up', atTop: true });
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < threshold) return;
      const direction = y > lastY ? 'down' : 'up';
      lastY = y;
      setState({ direction, atTop: y < 24 });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return state;
}
