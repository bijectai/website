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
          {/* What you get, told through the snippet's own example. The why
              (judge vs. kernel) and the how (Lean, signatures) live on the
              About page, so they stay out of here. */}
          <h2 className="h2 h2-set" id="sdk-title">
            <span className="h2-line">Your rules hold.</span>{" "}
            <span className="h2-line">Every time.</span>
          </h2>
          <p className="body">
            Say your coding agent must never touch your tests. Add one check
            before it uses a tool. When it tries to edit tests/, the edit is
            blocked and you’re told which rule stopped it.
          </p>
          <p className="body">
            Not most of the time. Not until someone finds the right words.
            Every time, with a signed record to prove it.
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
