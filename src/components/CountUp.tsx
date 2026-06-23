import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  from: number;
  to: number;
  /** Decimal places to render (e.g. 1 for "99.7"). */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Animation length in ms. */
  duration?: number;
};

// A number that animates from `from` to `to` the first time it scrolls into
// view, then locks at the final value. The count is driven off scroll (via an
// IntersectionObserver) rather than mount, so it never fires unseen while the
// visitor is still up in the hero. Honors prefers-reduced-motion by snapping
// straight to the final value.
export function CountUp({
  from,
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1400,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(from);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }

    let raf = 0;
    let started = false;

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        // easeOutCubic — quick out of the gate, gently settling onto the value.
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(from + (to - from) * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started) {
          started = true;
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [from, to, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
