// "An agent can't break a rule that's been proven." — the solution section
// directly below the Problem. A left-aligned intro (heading + lede) echoing
// the Problem section, followed by a numbered list of the five build stages,
// each a row of number / title / description separated by hairline rules.

const STEPS = [
  {
    title: "Ingest",
    body: "We take in the full corpus; every rule, regulator guidance, internal policy, and edge case a compliance team argues over. Nothing is summarized.",
  },
  {
    title: "Formalize",
    body: "Every constraint is rewritten by hand in Lean, for a precise logical specification. Ambiguity isn't approximated away; it's resolved until the specification is complete and correct.",
  },
  {
    title: "Compile",
    body: "Every specification is compiled to a decision kernel, where inconsistencies and contradictions are resolved. A machine-checked proof establishes correctness, covering every possible input, not just the ones in a test suite.",
  },
  {
    title: "Deploy",
    body: "The kernel runs in tandem with your existing systems, taking in the same inputs and consistently producing the same outputs. Microsecond latency, no model inference in the decision.",
  },
  {
    title: "Audit",
    body: "Every verdict is fully auditable, with a complete proof trace of reasoning. Regulators get access to mathematical objects that can be independently verified, not a summary of what a model claims it did.",
  },
];

export function Solution() {
  return (
    <section className="solution" id="solution">
      <div className="solution-inner">
        <p className="section-label">The Solution</p>
        <h2 className="solution-title">An agent can't break a rule that's been proven.</h2>
        <p className="solution-lede">
          No model inference is ever responsible for a decision. Every policy
          is formalized by hand into Lean, then compiled into a deterministic
          decision kernel that is mathematically proven correct. There's no
          way for an agent to bypass, hallucinate around, or drift outside the
          rules, because enforcement isn't a judgment call the model makes —
          it's a proof the kernel checks. The result returns a deterministic
          PROVED or REFUTED verdict, fully auditable, at microsecond latency.
        </p>

        <ol className="solution-steps">
          {STEPS.map((step, i) => (
            <li className="solution-step" key={step.title}>
              <span className="solution-step-num">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="solution-step-title">{step.title}</h3>
              <p className="solution-step-body">{step.body}</p>
            </li>
          ))}
        </ol>

        {/* Callout — the one hard guarantee worth setting apart from the rest */}
        <div className="solution-callout">
          <div className="solution-callout-bar" aria-hidden="true" />
          <p className="solution-callout-text">
            Every kernel returns a machine-checked <strong>PROVED</strong> or{" "}
            <strong>REFUTED</strong> — never a probability, never a case it
            silently skipped.
          </p>
        </div>
      </div>
    </section>
  );
}
