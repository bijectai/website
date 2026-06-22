import { useEffect, useRef, useState } from "react";
import { PartnerDrawer } from "./PartnerDrawer";

// The persistent glass top bar that sits above all page content.
//
// The logo and the "Request a demo" CTA live in their own layer
// (.topbar-corners) pinned to the top of the screen. During the hero they
// float on their own in the top corners; the glass pill (.topbar) starts
// lower with the links centered (flexible spacers on both sides). As the
// page scrolls, the sticky pill rises and locks at the same --bar-gap inset,
// sliding in behind the corner items so the bar "catches" the logo + CTA —
// and at that moment the links slide from centered to a right-aligned group
// hugging the CTA, and persist there.
export function TopBar() {
  const barRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const [partnerOpen, setPartnerOpen] = useState(false);

  useEffect(() => {
    const bar = barRef.current;
    const cta = ctaRef.current;
    if (!bar || !cta) return;

    // Reserve exactly the CTA's width (plus a gap) so the right-aligned
    // links clear the CTA once it's caught into the bar's right slot.
    const setClearance = () => {
      const w = cta.getBoundingClientRect().width;
      bar.style.setProperty("--cta-clearance", `${Math.ceil(w + 24)}px`);
    };

    // The bar is "stuck" once it has risen to its --bar-gap top inset.
    let raf = 0;
    let travel = 1;
    const update = () => {
      raf = 0;
      const gap = parseFloat(getComputedStyle(bar).top) || 0;
      const top = bar.getBoundingClientRect().top;
      const stuck = top <= gap + 1;
      bar.classList.toggle("is-stuck", stuck);
      // Drive the glass fade + link spread from scroll position: --stuck-progress
      // runs from 0 (resting in the hero) to 1 (locked at the top). While not yet
      // stuck the bar's resting document offset (top + scrollY) is constant, so
      // the scroll distance left before it locks is that offset minus the gap.
      if (!stuck) travel = Math.max(top + window.scrollY - gap, 1);
      const progress = stuck ? 1 : Math.min(Math.max(window.scrollY / travel, 0), 1);
      bar.style.setProperty("--stuck-progress", progress.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    setClearance();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", setClearance);
    window.addEventListener("resize", onScroll);
    // The CTA's width depends on the web font; remeasure once it's ready.
    document.fonts?.ready.then(setClearance);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", setClearance);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className="topbar-corners">
        <div className="topbar-corners-inner">
          <a className="brand" href="/" aria-label="biject — home">
            <img className="brand-logo" src="/logo.png" alt="biject" />
          </a>
          <button
            type="button"
            className="nav-cta"
            ref={ctaRef}
            onClick={() => setPartnerOpen(true)}
          >
            Partner with Us
          </button>
        </div>
      </div>

      <header className="topbar" id="topbar" ref={barRef}>
        <nav className="topbar-inner" aria-label="Primary">
          <span className="nav-spacer nav-spacer-left" aria-hidden="true" />
          <div className="nav-links">
            <a href="https://arxiv.org/abs/2604.01483" className="nl-hide">Research</a>
            <a href="/#demo" className="nl-hide">Solutions</a>
            <a href="/about" className="nl-hide">About us</a>
            <a href="/careers" className="nl-hide">Careers</a>
          </div>
          <span className="nav-spacer nav-spacer-right" aria-hidden="true" />
        </nav>
      </header>

      <PartnerDrawer
        open={partnerOpen}
        onClose={() => setPartnerOpen(false)}
      />
    </>
  );
}
