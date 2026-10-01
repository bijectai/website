// The first screen, laid out in zones that never overlap: the copy, the
// stage the attractor frames itself to (see STAGE_SELECTOR in
// AizawaAttractor), and the background lettering in a band along the bottom,
// just above the nav bar's resting slot.
//
// Paint order, back to front: lettering (HeroBackdrop), attractor canvas,
// copy (Hero). App renders them in that order; the backdrop and the canvas
// share z-index 0, so document order keeps the lettering under the particles.

export const PAPER_URL = "https://arxiv.org/abs/2604.01483";

// Texture, not content: the headline carries the meaning for assistive tech.
// Each phrase is its own span so where the lines break is chosen per
// breakpoint in CSS rather than left to wrapping.
export function HeroBackdrop() {
  return (
    <div className="hero-backdrop" aria-hidden="true">
      <p className="wrap hero-backdrop-text">
        <span>proof,</span> <span>not probability.</span>
      </p>
    </div>
  );
}

export function Hero() {
  return (
    <div className="hero">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <h1 className="hero-title">
            <span className="hero-line">An agent can’t argue</span>{" "}
            <span className="hero-line">with a proof.</span>
          </h1>
          <p className="hero-sub">
            Type-checked guardrails for AI agents. Now piloting with a small
            group of teams.
          </p>
          <div className="hero-actions">
            <a className="nav-cta hero-cta" href="#early-access">
              Request early access
            </a>
            <a className="hero-link" href={PAPER_URL} target="_blank" rel="noopener noreferrer">
              Read the paper
            </a>
          </div>
        </div>
        <div className="hero-stage" aria-hidden="true" />
      </div>
    </div>
  );
}
