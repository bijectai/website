// "We embed and build your kernel by hand." — the solution section directly
// below the Problem. A left-aligned intro (heading + lede) echoing the Problem
// section, followed by a numbered list of the five build stages, each a row of
// number / title / description separated by hairline rules.

const STEPS = [
  {
    title: "Ingest",
    body: "We take in the full corpus; all your rules, regulator guidance, internal policies, and edge cases your compliance team argues over. Nothing is summarized.",
  },
  {
    title: "Formalize",
    body: "Every constraint is rewritted by hand in Lean, for precise logical specification. Ambiguities are resolved by working with your compliance team to ensure the specification is complete and correct.",
  },
  {
    title: "Compile",
    body: "Every specification is compiled to a decision kernel, where inconsistencies and contradictions are resolved. A machine-checked proof establishes correctness, so that every test suite and more, is guaranteed correct.",
  },
  {
    title: "Deploy",
    body: "The kernel runs in tandem with your existing systems, responsible for taking in the same inputs, and consistently producing the same outputs. With microsecond latency, and no model inference.",
  },
  {
    title: "Audit",
    body: "Every verdict is fully auditable, with a complete proof trace of reasoning. Regulators can be given access to mathematical objects that can be independently verified. We take care of logging and monitoring, so you can focus on your business.",
  },
];

export function Solution() {
  return (
    <section className="solution" id="solution">
      <div className="solution-inner">
        <h2 className="solution-title">We embed and build your kernel by hand.</h2>
        <p className="solution-lede">
          We ensure that no model inference is ever responsible for a decision.
          Our engineers work with you to deploy a deterministic decision kernel
          that is provably correct. Working alongside your existing compliance
          and engineering teams, we write the Lean specification by hand,
          ensuring every obligation is captured, debated, and formalized with
          the people who know the business best. The resulting kernel is fully
          auditable, and built to cover every angle of your rules.
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
      </div>
    </section>
  );
}
