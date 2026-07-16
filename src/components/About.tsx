import { Footer } from "./Footer";
import { TopBar } from "./TopBar";

export function About() {
  return (
    <>
      <div className="topbar-gap" aria-hidden="true" />
      <TopBar />

      <main className="about">
        <div className="about-inner">

          {/* Opening — label + headline */}
          <p className="about-label">R&amp;P Lab</p>
          <h1 className="about-heading">
            Trust what<br />
            you can <em>prove.</em>
          </h1>

          {/* Two-column body */}
          <div className="about-body">
            <p className="about-body-text">
              Biject is founded under a simple primitive: if you can't prove it,
              you can't trust it. Our goal is to become the operational backbone
              of the world — starting with formally verified guardrails that
              return machine-checked proofs, not probabilities.
            </p>
            <p className="about-body-text">
              Every deployment generates hand-written and verified Lean
              formalizations. This is the foundational dataset the industry
              lacks — and we're building it one proof at a time.
            </p>
          </div>

          {/* Callout — the long-term model */}
          <div className="about-callout">
            <div className="about-callout-bar" aria-hidden="true" />
            <p className="about-callout-text">
              In the long term, these formalizations power our in-house{" "}
              <strong>auto formalization model</strong> — closing the loop
              between real-world operations and machine-verified reasoning at
              scale.
            </p>
          </div>

          {/* Closing */}
          <div className="about-close">
            <p className="about-close-text">Ambiguity ends here.</p>
            <p className="about-close-sub">Let's formalize the world.</p>
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
