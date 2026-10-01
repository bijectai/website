// The first screen. Back to front: the oversized background lettering
// (HeroBackdrop), the attractor canvas, then the headline and actions (Hero).
// App renders them in that order; the backdrop and canvas share z-index 0, so
// document order is what keeps the lettering underneath the particles.

export const PAPER_URL = "https://arxiv.org/abs/2604.01483";

// Texture, not content: the headline carries the meaning for assistive tech.
// Each phrase is its own span so the break between them is chosen per
// breakpoint in CSS rather than left to wrapping.
export function HeroBackdrop() {
  return (
    <div className="hero-backdrop" aria-hidden="true">
      <p className="hero-backdrop-text">
        <span>proof,</span> <span>not</span> <span>probability.</span>
      </p>
    </div>
  );
}

export function Hero() {
  return (
    <div className="hero-copy">
      <h1 className="hero-title">
        <span className="hero-line">An agent can’t argue </span>
        <span className="hero-line">with a proof.</span>
      </h1>
      <p className="hero-sub">
        Type-checked guardrails for AI agents. Now piloting with a small group
        of teams.
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
  );
}
