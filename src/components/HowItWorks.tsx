// The home page's three-step strip, split by hairlines (title | body). Still
// an <ol>, since the order is the point, but the steps carry no printed
// numbers: the hairlines and the reading order already say "in sequence".
const STEPS = [
  {
    title: "Write it.",
    body: "Policy, regulation, statute. Plain English.",
  },
  {
    title: "Formalize it.",
    body: "We translate it to Lean 4 and verify the translation, not just the output.",
  },
  {
    title: "Enforce it.",
    body: "A proof kernel checks every tool call. Every verdict is signed.",
  },
];

export function HowItWorks() {
  return (
    <section className="how" id="how-it-works" aria-label="How it works">
      <div className="wrap">
        <ol className="steps">
          {STEPS.map((step) => (
            <li className="step" key={step.title}>
              <h2 className="step-title">{step.title}</h2>
              <div className="step-body">
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
