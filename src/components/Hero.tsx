// The first screen, one centered column: the copy in the upper middle, then
// the stage the attractor frames itself to (see STAGE_SELECTOR in
// AizawaAttractor), running down to the nav bar's resting slot. Behind both,
// the ProofField covers the top of the screen and fades out before it reaches
// the attractor.
//
// Paint order, back to front: ProofField, attractor canvas, copy (Hero). App
// renders them in that order; the field and the canvas share z-index 0, so
// document order keeps the type under the particles.

export const PAPER_URL = "https://arxiv.org/abs/2604.01483";

export function Hero() {
  return (
    <div className="hero">
      <div className="wrap hero-copy">
        <h1 className="hero-title">
          <span className="hero-line">An agent can’t argue</span>{" "}
          <span className="hero-line">with a proof.</span>
        </h1>
        <p className="hero-sub">
          Type-checked guardrails for AI agents. Now piloting with select teams,
          apply below.
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
      <div className="wrap hero-stage" aria-hidden="true" />
    </div>
  );
}
