import { PAPER_URL } from "./Hero";

// The published work, kept separate from the product. One citation, set
// large, with a line making clear the paper is research and the SDK is what
// pilot teams use.
export function Research() {
  return (
    <section className="research" id="research" aria-labelledby="research-title">
      <div className="wrap">
        <div className="research-grid">
          <h2 className="mono-label" id="research-title">
            Research
          </h2>
          <div className="research-body">
            <a
              className="research-title"
              href={PAPER_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Type-Checked Compliance
            </a>
            <p className="research-meta">Preprint, arXiv:2604.01483</p>
            <p className="body">
              The research the gate grew out of. The SDK in private beta is the
              product, and its API will not match the paper line for line.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
