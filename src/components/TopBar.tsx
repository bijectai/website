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
  // The mobile nav: the centered links collapse into a corner button below a
  // breakpoint (see .nav-toggle / .nav-menu in style.css) and open this panel.
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on Escape, and whenever the viewport grows wide
  // enough that the inline links are back (the toggle is hidden there, so a
  // lingering open panel would have no way to be dismissed).
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const mq = window.matchMedia("(min-width: 901px)");
    const onChange = () => mq.matches && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
    };
  }, [menuOpen]);

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
          {/* Corner menu button — only shown below the mobile breakpoint, where
              the inline links + CTA are hidden. */}
          <button
            type="button"
            className={`nav-toggle${menuOpen ? " is-open" : ""}`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="nav-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="nav-toggle-box" aria-hidden="true">
              <span className="nav-toggle-bar" />
              <span className="nav-toggle-bar" />
              <span className="nav-toggle-bar" />
            </span>
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

      {/* Mobile menu: a glass dropdown holding the nav links + the CTA,
          opened by the corner toggle. Hidden (display:none) on desktop. */}
      <div className={`nav-menu${menuOpen ? " is-open" : ""}`} id="nav-menu">
        <button
          type="button"
          className="nav-menu-backdrop"
          aria-label="Close menu"
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
        />
        <div className="nav-menu-inner">
          <nav className="nav-menu-panel" aria-label="Primary">
            <a href="https://arxiv.org/abs/2604.01483" onClick={() => setMenuOpen(false)}>Research</a>
            <a href="/#demo" onClick={() => setMenuOpen(false)}>Solutions</a>
            <a href="/about" onClick={() => setMenuOpen(false)}>About us</a>
            <a href="/careers" onClick={() => setMenuOpen(false)}>Careers</a>
            <button
              type="button"
              className="nav-menu-cta"
              onClick={() => {
                setMenuOpen(false);
                setPartnerOpen(true);
              }}
            >
              Partner with Us
            </button>
          </nav>
        </div>
      </div>

      <PartnerDrawer
        open={partnerOpen}
        onClose={() => setPartnerOpen(false)}
      />
    </>
  );
}
