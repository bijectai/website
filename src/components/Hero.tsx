// The first screen, one centered column: the copy in the upper middle, then
// the stage the attractor frames itself to (see STAGE_SELECTOR in
// AizawaAttractor), running down to the nav bar's resting slot. Behind both,
// "proof, not probability." repeats in rows of small type across the top of
// the screen and fades out before it reaches the attractor.
//
// Paint order, back to front: lettering (HeroBackdrop), attractor canvas,
// copy (Hero). App renders them in that order; the backdrop and the canvas
// share z-index 0, so document order keeps the lettering under the particles.

export const PAPER_URL = "https://arxiv.org/abs/2604.01483";

const PHRASE = "proof, not probability.";
const ROWS = 32;
// Enough repeats to cross a 2560px screen at the largest type size.
const ROW_TEXT = Array(14).fill(PHRASE).join("   ");

// Texture, not content: the headline carries the meaning for assistive tech.
// Rows are staggered by a few characters each so the phrase never lines up
// into columns.
export function HeroBackdrop() {
  return (
    <div className="hero-backdrop" aria-hidden="true">
      {Array.from({ length: ROWS }, (_, i) => (
        <p className="hero-backdrop-row" key={i} style={{ marginLeft: `${-((i * 7) % 11) * 1.3}ch` }}>
          {ROW_TEXT}
        </p>
      ))}
    </div>
  );
}

export function Hero() {
  return (
    <div className="hero">
      <div className="wrap hero-copy">
        <h1 className="hero-title">
          <span className="hero-line">An agent can’t argue</span>{" "}
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
      <div className="wrap hero-stage" aria-hidden="true" />
    </div>
  );
}
