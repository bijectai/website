import { useEffect, useState, type CSSProperties } from "react";

// How long each industry stays highlighted before auto-advancing.
const ROTATE_MS = 5000;

// "See it in your domain." — the demo section directly below the Solution.
// A left-aligned header, then a split: two stacked lede paragraphs on the left
// and a vertical stack of industry selectors on the right (one expanded +
// green-outlined, the rest collapsed), with a countdown bar running alongside
// them that fills before the highlight auto-advances.
const INDUSTRIES = [
  {
    name: "Finance",
    body: "SEC Rule 15c3-5 (Market Access Rule), FINRA Rule 3110, MiFID II algorithmic trading controls, and internal risk management mandates.",
  },
  {
    name: "Pharmaceutical",
    body: "21 CFR Part 211 (cGMP), EudraLex Volume 4, ICH Q7, and internal QA/QC batch release protocols.",
  },
  {
    name: "Manufacturing",
    body: "ISO 9001 quality management standards, AS9100 aerospace criteria, and internal engineering change order (ECO) validation rules.",
  },
  {
    name: "Other",
    body: "Various industry-specific regulations and internal policies. If something needs to be checked before a critical action, we can help automate it. Just ask.",
  },
];

export function Demo() {
  const [active, setActive] = useState(0);

  // Auto-advance through the industries. Keying the timer off `active` means a
  // manual click also resets the countdown, so the clicked tab gets its full
  // 5 seconds before the rotation moves on.
  useEffect(() => {
    const id = setTimeout(() => {
      setActive((current) => (current + 1) % INDUSTRIES.length);
    }, ROTATE_MS);
    return () => clearTimeout(id);
  }, [active]);

  return (
    <section className="demo" id="demo">
      <div className="demo-inner">
        <p className="section-label">In Your Domain</p>
        <h2 className="demo-title">Personalized for your domain.</h2>

        <div className="demo-split">
          {/* Left: the two lede paragraphs, stacked one on top of the other. */}
          <div className="demo-lede">
            <p className="demo-lede-col">
              We're aiming to be the most flexible and customizable solution
              on the market. We understand that the over-reliance on manual
              review and fragmented tools don't solve the overarching problem:
              Efficiency. Our platform is designed to adapt to your
              specifications, with a level of rigor you cant trust.
            </p>
            <p className="demo-lede-col">
              Our initial deployments are focused on data-dense, heavily
              audited field where decisions are high-stakes. We provide
              a singular solution that ensures decisions are
              defensible, auditable, and monitored. We
              pride ourselves on eliminating ambiguity and ensuring that
              your workflows only execute when everything is in order.
            </p>
          </div>

          {/* Right: the four industry selectors, with the countdown bar sitting
              outside the stack so it reads as a single timer for the rotation. */}
          <div className="demo-panel">
            <span
              // Remounting on each switch (key) restarts the fill animation;
              // duration is fed in so it tracks ROTATE_MS.
              key={active}
              className="demo-timer"
              style={{ "--timer-duration": `${ROTATE_MS}ms` } as CSSProperties}
              aria-hidden="true"
            />

            <div className="demo-tabs" role="tablist" aria-label="Industries">
              {INDUSTRIES.map((industry, i) => {
                const isActive = i === active;
                return (
                  <button
                    key={industry.name}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`demo-tab${isActive ? " is-active" : ""}`}
                    onClick={() => setActive(i)}
                  >
                    <span className="demo-tab-name">{industry.name}</span>
                    {/* Always rendered so it can slide open/closed; the wrapper
                        animates its row from 0fr to 1fr when the tab is active. */}
                    <div className="demo-tab-bodywrap">
                      <p className="demo-tab-body">{industry.body}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Closing — mirrors the About page's right-aligned sign-off, giving
            the homepage a deliberate final beat instead of just stopping. */}
        <div className="demo-close">
          <p className="demo-close-text">An agent can't argue with a proof.</p>
          <p className="demo-close-sub">Let's build your kernel.</p>
        </div>
      </div>
    </section>
  );
}
