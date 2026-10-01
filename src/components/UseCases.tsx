// What the gate is built for. Not customer stories. Coding agents lead, wide,
// because they are the case the SDK preview already shows; MCP and CI stack
// beside it. Each carries the kind of rule it would enforce.
const LEAD = {
  title: "Coding agents",
  body: "An agent under pressure to pass will sometimes edit the test instead of the code. The policy makes tests, graders, and CI config read-only for the agent. The gate denies the write and the verdict says which rule fired.",
  rule: "DENY  rule: tests/ is read-only for this agent",
};

const OTHERS = [
  {
    title: "MCP tool gating",
    body: "Put the gate between the agent and its MCP servers. Each tool call is checked before the server receives it: which tool, which arguments, which resource.",
    rule: "DENY  rule: fs.write outside ./workspace",
  },
  {
    title: "Pre-merge checks in CI",
    body: "Run the same policies as a CI step over the diff an agent proposes. A DENY fails the check, and the signed verdict goes into the build log.",
    rule: "DENY  rule: .github/workflows/ is not agent-writable",
  },
];

export function UseCases() {
  return (
    <section className="uses" id="use-cases" aria-labelledby="uses-title">
      <div className="wrap">
        <h2 className="h2" id="uses-title">
          Built for agents with write access.
        </h2>

        <div className="uses-grid">
          <article className="use use-lead">
            <h3 className="use-title">{LEAD.title}</h3>
            <p className="body">{LEAD.body}</p>
            <p className="use-rule">{LEAD.rule}</p>
          </article>

          <div className="uses-side">
            {OTHERS.map((use) => (
              <article className="use" key={use.title}>
                <h3 className="use-title">{use.title}</h3>
                <p className="body">{use.body}</p>
                <p className="use-rule">{use.rule}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
