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
  [["plain", "verdict = gate.check(action)"]],
  [["verdict", "# DENY  rule: tests/ is read-only for this agent"]],
  [["com", "# sig:  ed25519:9f3a…  chain: merkle:41c0…"]],
];

export function SdkPreview() {
  return (
    <section className="sdk" id="sdk" aria-labelledby="sdk-title">
      <div className="wrap sdk-grid">
        <div className="sdk-copy">
          {/* The gate as its signature. aria-label spells the formula out, so
              the section isn't announced as "times, right arrow". */}
          <h2
            className="h2 h2-set"
            id="sdk-title"
            aria-label="Policy and action map to a signed verdict."
          >
            <span className="h2-line">Policy × Action</span>{" "}
            <span className="h2-line">→ Signed verdict.</span>
          </h2>
          <p className="body">
            Load a policy written in Lean 4. Pass the action your agent is
            about to take. The gate answers ALLOW or DENY, names the rule that
            decided it, and signs the result.
          </p>
          <p className="body">
            The check runs before the tool call. On DENY, the call doesn’t
            happen.
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
