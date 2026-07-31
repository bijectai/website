import { CountUp } from "./CountUp";

// "The Hidden Cost of Manual Review" — the first content section below the
// hero. A centered intro (heading + lede) followed by a three-up row of
// placeholder cards that will later highlight specific cases.
export function Problem() {
  return (
    <section className="problem" id="problem">
      <div className="problem-inner">
        <p className="section-label">The Problem</p>
        <h2 className="problem-title">The Hidden Cost of Manual Review</h2>
        <p className="problem-lede">
          Regulated organizations still rely on a fragmented web of systems,
          where the consequences go beyond catastrophic failures. The constant
          drag of manual review, false positives, and inconsistent decisions
          hinders performance every day. Even after routine inspections and
          thoroughly tested software, the cost of mistakes can outweigh the time
          and effort spent on the current process.
        </p>

        <div className="problem-cards">
          <article className="problem-card">
            <p className="problem-card-metric">
              <CountUp from={0} to={80} prefix="60–" suffix="%" />
            </p>
            <p className="problem-card-context">
              of FDA drug GMP warning letters cite data integrity
            </p>
            <hr className="problem-card-rule" />
            <p className="problem-card-body">
              Data integrity deficiencies — missing audit trails, shared login
              credentials, backdated records, and audit trails generated but
              never reviewed — are the single most cited category of FDA GMP
              violation, a trend that has continued through 2026.
            </p>
            <p className="problem-card-ref">
              <a
                className="problem-card-ref-link"
                href="https://www.certivo.io/blog/fda-warning-letters-data-integrity"
                target="_blank"
                rel="noopener noreferrer"
              >
                CERTIVO
              </a>
            </p>
          </article>

          <article className="problem-card">
            <p className="problem-card-metric">
              <CountUp from={0} to={20} suffix="×" />
            </p>
            <p className="problem-card-context">more defects missed</p>
            <hr className="problem-card-rule" />
            <p className="problem-card-body">
              In a quality-inspection case study, manual review let 6.0% of
              defects slip through, against just 0.3% under automated inspection; twenty times as many escapes. Opting for manual over automated
              checks drops accuracy from 99.7% to 94.0% and multiplies the
              defects that reach the next stage.
            </p>
            <p className="problem-card-ref">InductionLabs</p>
          </article>

          <article className="problem-card">
            <p className="problem-card-metric">
              <CountUp from={0} to={216.7} decimals={1} prefix="+" suffix="%" />
            </p>
            <p className="problem-card-context">more false positives</p>
            <hr className="problem-card-rule" />
            <p className="problem-card-body">
              In manufacturing, even small false positive rates create outsized
              operational costs: teams waste time on unnecessary inspections,
              rework, and scrap, while throughput slows down and operators get
              pulled into avoidable manual checks. Staying with manual review
              pushes false positives from 1.2% up to 3.8%, which is more than triple the
              avoidable noise.
            </p>
            <p className="problem-card-ref">
              <a
                className="problem-card-ref-link"
                href="http://www.issplc.com/upload/pdf/2025/12/30Research%20on%20Intelligent%20Manufacturing%20Quality%20Inspection%20System%20Based%20on%20Computer%20Vision.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                SVCST
              </a>
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
