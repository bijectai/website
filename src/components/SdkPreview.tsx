import { Code, type CodeLine } from "./Code";

// The first thing under the hero: what calling the gate looks like. Copy on
// the left, the snippet on the right.
//
// The card is headed by a filename rather than a language tag or a "preview"
// label: a reader who writes Python already knows what they're looking at, and
// agent.py says where this goes — their own agent — without claiming it.
const SNIPPET: CodeLine[] = [
  [["kw", "from"], ["plain", " biject "], ["kw", "import"], ["plain", " Gate"]],
  [],
  [["plain", "gate = Gate.load("], ["str", '"policies/no_test_tampering.lean"'], ["plain", ")"]],
  [["plain", "verdict = gate.check(action)  "], ["com", "# before the tool runs"]],
  [["verdict", "# DENY  rule: tests/ is read-only for this agent"]],
  [["com", "# sig:  ed25519:9f3a…  chain: merkle:41c0…"]],
];

export function SdkPreview() {
  return (
    <section className="sdk" id="sdk" aria-labelledby="sdk-title">
      <div className="wrap sdk-grid">
        <div className="sdk-copy">
          {/* Plain words first: what the gate does, before any of how. */}
          <h2 className="h2 h2-set" id="sdk-title">
            <span className="h2-line">Check every action</span>{" "}
            <span className="h2-line">before it runs.</span>
          </h2>
          <p className="body">
            You tell us your rules. Before your agent uses a tool, biject
            checks the action against them and answers ALLOW or DENY.
          </p>
          <p className="body">
            On DENY, the tool call never happens. Every answer names the rule
            that decided it and is signed, so you have a record you can prove
            later.
          </p>
        </div>

        <figure className="sdk-figure">
          <div className="code-card">
            <div className="code-head">
              <span className="code-file">agent.py</span>
            </div>
            <Code lines={SNIPPET} label="agent.py" />
          </div>
        </figure>
      </div>
    </section>
  );
}
