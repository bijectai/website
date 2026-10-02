// The first screen, one centered column: the copy in the upper middle, then
// the stage the attractor frames itself to (see STAGE_SELECTOR in
// AizawaAttractor), running down to the nav bar's resting slot. Behind both,
// the ProofField covers the top of the screen and fades out before it reaches
// the attractor.
//
// The copy is the headline alone: no sub-line, no buttons of its own. The top
// bar's "Get started" is the one call to action on the first screen. The stage
// takes the room that leaves, so the attractor sits larger.
//
// Paint order, back to front: ProofField, attractor canvas, copy (Hero). App
// renders them in that order; the field and the canvas share z-index 0, so
// document order keeps the type under the particles.

export function Hero() {
  return (
    <div className="hero">
      <div className="wrap hero-copy">
        <h1 className="hero-title">
          <span className="hero-line">Conquering Ambiguity</span>{" "}
          <span className="hero-line">in Every Workflow.</span>
        </h1>
      </div>
      <div className="wrap hero-stage" aria-hidden="true" />
    </div>
  );
}
