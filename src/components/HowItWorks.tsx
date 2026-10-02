import { Code, type CodeLine } from "./Code";

// Three steps split by hairlines (title | body). Still an <ol>, since the
// order is the point, but the steps carry no printed numbers: the hairlines
// and the reading order already say "in sequence". Step one shows the Lean
// behind the SDK preview's DENY so the policy is something you can read, not
// a box on a diagram.
const POLICY: CodeLine[] = [
  [["com", "-- policies/no_test_tampering.lean"]],
  [["kw", "def"], ["plain", " noTestTampering (a : Action) : Prop :="]],
  [["plain", "  a.path.startsWith "], ["str", '"tests/"'], ["plain", " → a.kind = .read"]],
];

const STEPS = [
  {
    title: "Encode the policy in Lean 4",
    body: "We formalize your rules by hand as Lean 4 definitions and review them with you. Nothing is generated from prose. The Lean file is the policy.",
    code: POLICY,
  },
  {
    title: "Gate every tool call through the proof kernel",
    body: "Before a tool call runs, the gate asks the kernel whether the action satisfies the policy. It is a check, not a judgment. Same action, same policy, same verdict.",
  },
  {
    title: "Get a signed verdict on an append-only audit chain",
    body: "Each verdict names the rule that decided it, carries an ed25519 signature, and links to the verdict before it. The record can be verified later by someone who wasn’t there.",
  },
];

export function HowItWorks() {
  return (
    <section className="how" id="how-it-works" aria-labelledby="how-title">
      <div className="wrap">
        <h2 className="h2" id="how-title">
          Safeguard every tool call.
        </h2>

        <ol className="steps">
          {STEPS.map((step) => (
            <li className="step" key={step.title}>
              <h3 className="step-title">{step.title}</h3>
              <div className="step-body">
                <p>{step.body}</p>
                {step.code && <Code lines={step.code} label="Lean 4 policy" />}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
