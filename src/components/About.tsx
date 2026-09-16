import { useState } from "react";
import type { CSSProperties } from "react";

import { Footer } from "./Footer";
import { TopBar } from "./TopBar";

// Where the team comes from. Each entry expects an optional logo at
// /logos/<file>.svg; until that file exists the name renders as a typographic
// wordmark instead, so the row is never half-empty.
//
// `scale` multiplies the row's base logo height. The marks disagree about how
// much of their box is artwork — a one-line wordmark is nearly all cap height,
// a stacked wordmark splits it over two lines, and a circular seal spends most
// of its box on the ring — so a single shared height makes the wide wordmarks
// shout and the seal vanish. These factors even out the optical weight.
const ORIGINS = [
  { name: "Cornell University", file: "cornell", scale: 0.8 },
  { name: "Indian Institute of Technology Madras", file: "iit-madras", scale: 0.9 },
  { name: "University of Chicago", file: "uchicago", scale: 1.25 },
  { name: "New York University", file: "nyu", scale: 0.85 },
  { name: "Ohio State University", file: "osu", scale: 0.9 },
];

function OriginMark({
  name,
  file,
  scale,
}: {
  name: string;
  file: string;
  scale: number;
}) {
  // Keyed on load, not error: vercel.json rewrites every unmatched path to
  // index.html, so a missing logo answers 200 with HTML rather than 404.
  const [hasLogo, setHasLogo] = useState(false);

  // Not lazy-loaded: the image starts hidden, and a lazy image that is never
  // in the viewport never loads, so onLoad would never fire.

  return (
    <li className="about-origins-item">
      <img
        className="about-origins-logo"
        style={{ "--logo-scale": scale } as CSSProperties}
        src={`/logos/${file}.svg`}
        alt={name}
        hidden={!hasLogo}
        onLoad={() => setHasLogo(true)}
      />
      {!hasLogo && <span className="about-origins-name">{name}</span>}
    </li>
  );
}

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

          {/* Provenance — where the team comes from */}
          <div className="about-origins">
            <p className="about-origins-label">Brought to you by minds from</p>
            <ul className="about-origins-list">
              {ORIGINS.map((o) => (
                <OriginMark
                  key={o.file}
                  name={o.name}
                  file={o.file}
                  scale={o.scale}
                />
              ))}
            </ul>
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
