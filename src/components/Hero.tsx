import { useEffect, useRef, useState } from "react";

const BLURB =
  "The Aizawa attractor never repeats, yet every point obeys the same deterministic equations. Chaos with structure underneath. That's the world biject operates in.";

export function Hero() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Only active while the hero is still in view
      if (window.scrollY > vh) return;

      const dx = Math.abs(e.clientX - vw / 2) / (vw / 2);
      const dy = Math.abs(e.clientY - vh / 2) / (vh / 2);
      const nearCenter = dx < 0.32 && dy < 0.32;

      setVisible(nearCenter);
      if (nearCenter) {
        setPos({ x: e.clientX, y: e.clientY });
      }

      // Hide if the mouse lingers outside the zone
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!nearCenter) {
        timerRef.current = setTimeout(() => setVisible(false), 120);
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="hero-copy" ref={containerRef}>
      <h1 className="hero-title">
        <span className="hero-line">Conquering Ambiguity </span>
        <span className="hero-line hero-subline">in Every Workflow.</span>
      </h1>

      {/* Attractor tooltip — appears near cursor when hovering the center zone */}
      <div
        className={`attractor-blurb${visible ? " attractor-blurb--visible" : ""}`}
        style={{ "--bx": `${pos.x}px`, "--by": `${pos.y}px` } as React.CSSProperties}
        aria-hidden="true"
      >
        {BLURB}
      </div>
    </div>
  );
}
