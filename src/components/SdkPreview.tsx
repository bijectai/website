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
          {/* Plain words, but the claim only a proof check can make: the
              rule holds no matter what the action says. */}
          <h2 className="h2 h2-set" id="sdk-title">
            <span className="h2-line">Rules your agent</span>{" "}
            <span className="h2-line">can’t talk around.</span>
          </h2>
          <p className="body">
            Most guardrails ask an AI model whether an action looks safe, and
            a model can be talked into yes.
          </p>
          <p className="body">
            biject writes your rules in Lean 4, the language mathematicians
            use to check proofs. Before every tool call, a proof kernel checks
            the action against them. If the rules don’t hold, the call doesn’t
            run.
          </p>
          <p className="body">
            Same action, same answer, every time. Each answer names the rule
            and is signed, so you can show why later.
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
