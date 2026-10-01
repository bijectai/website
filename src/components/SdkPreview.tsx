import { Code, type CodeLine } from "./Code";

// The first thing under the hero: what calling the gate looks like. Copy on
// the left, the snippet on the right. The snippet is illustrative and the
// caption says so; the SDK is in private beta and its API is still moving.
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
          <h2 className="h2 h2-set" id="sdk-title">
            <span className="h2-line">Policy in.</span>{" "}
            <span className="h2-line">Action in.</span>{" "}
            <span className="h2-line">Signed verdict out.</span>
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
              <span className="mono-label">SDK preview</span>
              <span className="code-lang">python</span>
            </div>
            <Code lines={SNIPPET} label="SDK preview, Python" />
          </div>
          <figcaption className="caption">
            Illustrative. API subject to change during beta.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
