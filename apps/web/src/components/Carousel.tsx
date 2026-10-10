import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';

/**
 * Horizontal snap carousel driven by Framer drag="x". Snaps to the nearest slide on release
 * and shows pagination dots. Mobile-first: on desktop it is used only where a grid is not better.
 */
export function Carousel({ children, label }: { children: ReactNode; label: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [limit, setLimit] = useState(0);
  const [index, setIndex] = useState(0);
  const count = Children.count(children);

  useEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      if (!viewport || !track) return;
      setLimit(Math.max(0, track.scrollWidth - viewport.clientWidth));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (viewportRef.current) observer.observe(viewportRef.current);
    if (trackRef.current) observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, [count]);

  const slideStep = () => {
    const track = trackRef.current;
    if (!track || track.children.length < 2) return 0;
    const first = track.children[0] as HTMLElement;
    const second = track.children[1] as HTMLElement;
    return second.offsetLeft - first.offsetLeft;
  };

  const snapTo = (nextIndex: number) => {
    const clamped = Math.min(count - 1, Math.max(0, nextIndex));
    const target = -Math.min(limit, clamped * slideStep());
    setIndex(clamped);
    animate(x, target, { type: 'spring', stiffness: 380, damping: 40 });
  };

  const onDragEnd = () => {
    const step = slideStep();
    if (!step) return;
    const nearest = Math.round(-x.get() / step);
    snapTo(nearest);
  };

  return (
    <section aria-roledescription="carousel" aria-label={label} className="relative">
      <div ref={viewportRef} className="overflow-hidden">
        <motion.div
          ref={trackRef}
          drag="x"
          dragConstraints={{ left: -limit, right: 0 }}
          dragElastic={0.08}
          onDragEnd={onDragEnd}
          style={{ x }}
          className="flex cursor-grab gap-4 active:cursor-grabbing"
        >
          {Children.map(children, (child) => (
            <div className="w-[78%] shrink-0 sm:w-[46%] lg:w-[32%]" role="group" aria-roledescription="slide">
              {child}
            </div>
          ))}
        </motion.div>
      </div>
      {count > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2" role="group" aria-label={label}>
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} / ${count}`}
              aria-current={i === index}
              onClick={() => snapTo(i)}
              className="tap-target relative inline-flex items-center justify-center"
            >
              <span className={`h-2 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-primary' : 'w-2 bg-muted/60'}`} />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
