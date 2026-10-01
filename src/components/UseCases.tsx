// What the gate is used for. There's no catalog: every policy is formalized
// for the domain it governs. The lead says so, wide; beside it, three shapes
// a rule can take in any domain, each with the kind of verdict it produces.
// Not customer stories.
const LEAD = {
  title: "Formalized with you",
  body: "There’s no catalog of prebuilt policies. We formalize the rules your agents operate under, whatever your domain, and review them with the people who own them. The gate enforces exactly those rules. If a rule can be stated precisely, it can be checked.",
};

const SHAPES = [
  {
    title: "Limits",
    body: "A ceiling the agent can’t cross, per action or across a period. Amounts, quantities, rates.",
    rule: "DENY  rule: amount exceeds per-transaction limit",
  },
  {
    title: "Permissions",
    body: "Which records, systems, and tools the agent may touch, and what it may do there.",
    rule: "DENY  rule: agent may read records/, not write them",
  },
  {
    title: "Order of operations",
    body: "Steps that can’t run until the steps they depend on have happened and been approved.",
    rule: "DENY  rule: release requires a recorded sign-off",
  },
];

export function UseCases() {
  return (
    <section className="uses" id="use-cases" aria-labelledby="uses-title">
      <div className="wrap">
        <h2 className="h2" id="uses-title">
          Built for your domain.
        </h2>

        <div className="uses-grid">
          <article className="use use-lead">
            <h3 className="use-title">{LEAD.title}</h3>
            <p className="body">{LEAD.body}</p>
          </article>

          <div className="uses-side">
            {SHAPES.map((shape) => (
              <article className="use" key={shape.title}>
                <h3 className="use-title">{shape.title}</h3>
                <p className="body">{shape.body}</p>
                <p className="use-rule">{shape.rule}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
